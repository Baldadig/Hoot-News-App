import { shouldPrompt, onControllerChange } from './update.js'

// Registreert de service worker (na het laden, buiten het kritieke pad) en houdt bij of er
// een nieuwe versie klaarstaat. De app leest dat uit via subscribe()/isReady().
const listeners = new Set()
const state = { waiting: null, changedElsewhere: false, dismissed: false, requested: false, reloading: false }
let hadController = false

const ready = () => shouldPrompt({ waiting: !!state.waiting, hasController: hadController, changedElsewhere: state.changedElsewhere, dismissed: state.dismissed })
const emit = () => listeners.forEach((fn) => fn(ready()))

export const isReady = ready
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// "Vernieuwen": de wachtende versie activeren; zodra die het overneemt herladen we één keer.
export function applyUpdate() {
  state.requested = true
  if (state.waiting) state.waiting.postMessage({ type: 'SKIP_WAITING' })
  else reload() // de nieuwe versie is elders al geactiveerd: herladen is genoeg
}
// Wegklikken: de melding blijft weg tot er wéér een nieuwe versie klaarstaat.
export function dismissUpdate() {
  state.dismissed = true
  emit()
}

function reload() {
  if (state.reloading) return
  state.reloading = true
  window.location.reload()
}

function track(reg) {
  const setWaiting = (worker) => {
    state.waiting = worker
    state.dismissed = false
    emit()
  }
  if (reg.waiting) setWaiting(reg.waiting)
  reg.addEventListener('updatefound', () => {
    const next = reg.installing
    if (!next) return
    next.addEventListener('statechange', () => {
      if (next.state === 'installed' && reg.waiting) setWaiting(reg.waiting)
    })
  })
}

export function registerUpdates() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
  const sw = navigator.serviceWorker
  hadController = !!sw.controller

  sw.addEventListener('controllerchange', () => {
    const action = onControllerChange({ hadController, requested: state.requested, reloading: state.reloading })
    hadController = true
    if (action === 'reload') reload()
    else if (action === 'prompt') {
      state.waiting = null
      state.changedElsewhere = true
      state.dismissed = false
      emit()
    }
  })

  const start = () =>
    sw
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        track(reg)
        // Bij terugkomen in de app en elk uur kijken of er iets nieuws is.
        const check = () => reg.update().catch(() => {})
        document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
        setInterval(check, 60 * 60 * 1000)
      })
      .catch(() => {})
  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start)
}
