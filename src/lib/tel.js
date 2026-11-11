// Meten zonder volgen (web): zeven gebeurtenissen, alleen totalen per dag, geen personen. Zie shared/tel.mjs en
// netlify/functions/tel.mjs. Wat dit toestel onthoudt: alleen "al geteld voor dagdeel X" (localStorage), zodat
// editie-open en editie-einde één keer per dagdeel tellen: aantal lezers per dagdeel, zonder id.
// Wat het niet doet: niets sturen bij Do Not Track of Global Privacy Control, niets buiten productie, nooit
// wachten of falen (sendBeacon is fire-and-forget), geen cookie, geen id.
import { EVENTS, ONCE, majorMinor } from '../../shared/tel.mjs'

export const KEY = 'hoot:geteld' // { 'editie-open': '2026-11-11-ochtend', 'editie-einde': '…' }
export const URL_TEL = '/api/tel'

// Mag er iets gestuurd worden? Nee bij Do Not Track ("1"/"yes"), Global Privacy Control, buiten productie
// of zonder sendBeacon. `env` en `nav` zijn er voor de toetsen.
export function allowed({ nav = typeof navigator === 'undefined' ? null : navigator, prod = !!import.meta.env?.PROD, win = typeof window === 'undefined' ? null : window } = {}) {
  if (!prod || !nav || typeof nav.sendBeacon !== 'function') return false
  if (nav.globalPrivacyControl === true) return false
  const dnt = nav.doNotTrack ?? win?.doNotTrack ?? nav.msDoNotTrack
  return !(dnt === '1' || dnt === 'yes' || dnt === 1 || dnt === true)
}

const read = (storage) => {
  try {
    const v = JSON.parse(storage.getItem(KEY))
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  } catch {
    return {}
  }
}
const write = (storage, v) => {
  try {
    storage.setItem(KEY, JSON.stringify(v))
  } catch {
    /* opslag vol of geblokkeerd: dan tellen we liever een keer te veel dan te weinig niets te zeggen */
  }
}

// De body voor één gebeurtenis, of null als er niets te sturen valt (onbekend, of dit dagdeel al geteld).
// Markeert "geteld" in `storage` zodra hij de body teruggeeft. Zonder bruikbare opslag tellen we elke keer
// (dan telt een toestel zonder localStorage meermaals; liever dat dan helemaal niet).
export function plan(e, dagdeel, { storage = null, n = 1, version = null } = {}) {
  if (!EVENTS.includes(e) || typeof dagdeel !== 'string' || !dagdeel) return null
  if (ONCE.includes(e)) {
    const done = storage ? read(storage) : {}
    if (done[e] === dagdeel) return null
    if (storage) write(storage, { ...done, [e]: dagdeel })
  }
  const body = { e, d: dagdeel, p: 'web' }
  const v = majorMinor(version)
  if (v) body.v = v
  if (!ONCE.includes(e) && Number.isInteger(n) && n > 1) body.n = n
  return body
}

const localStore = () => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

// Stuur één gebeurtenis. Nooit een uitzondering, nooit blokkerend. Geeft true als hij is doorgegeven aan sendBeacon.
export function tel(e, dagdeel, opts = {}) {
  try {
    const nav = opts.nav ?? (typeof navigator === 'undefined' ? null : navigator)
    if (!allowed({ nav, prod: opts.prod ?? !!import.meta.env?.PROD, win: opts.win })) return false
    const version = opts.version ?? (typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : null)
    const body = plan(e, dagdeel, { storage: opts.storage ?? localStore(), n: opts.n, version })
    if (!body) return false
    // Een Blob van text/plain: geen preflight, geen cookies (sendBeacon gaat same-origin met de gewone referer; die bewaren we niet).
    return nav.sendBeacon(opts.url || URL_TEL, new Blob([JSON.stringify(body)], { type: 'text/plain' }))
  } catch {
    return false
  }
}
