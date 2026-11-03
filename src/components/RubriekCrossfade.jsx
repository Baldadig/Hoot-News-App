import { timeMs } from '../lib/rubriek-crossfade.js'
import { useLayoutEffect, useRef } from 'react'

// Eén stil oud paneel, nooit een tweede interactieve lijst. De scroll-viewport verandert niet.
export function RubriekCrossfade({ category, children }) {
  const stage = useRef(null), live = useRef(null), previous = useRef(null), active = useRef(null)
  useLayoutEffect(() => {
    const parent = stage.current, current = live.current
    const prior = previous.current
    const remember = () => {
      const node = current.cloneNode(true), videos = [...current.querySelectorAll('video')]
      const images = [...current.querySelectorAll('img')]
      node.querySelectorAll('img').forEach((image, index) => {
        const source = images[index]
        if (!source.complete || !source.naturalWidth) return
        const rect = source.getBoundingClientRect(), still = document.createElement('canvas')
        still.width = source.naturalWidth;still.height = source.naturalHeight
        still.className = source.className
        still.style.cssText = `display:block;width:${rect.width}px;height:${rect.height}px;object-fit:${getComputedStyle(source).objectFit};max-width:100%`
        try { still.getContext('2d').drawImage(source,0,0);image.replaceWith(still) } catch {}
      })
      node.querySelectorAll('video').forEach((video, index) => {
        const source = videos[index], still = document.createElement('canvas')
        still.width = source.videoWidth || 1;still.height = source.videoHeight || 1
        still.style.cssText = `display:block;width:100%;height:${source.getBoundingClientRect().height}px;object-fit:cover;background:var(--paper)`
        if (source.readyState >= 2) { try { still.getContext('2d').drawImage(source,0,0,still.width,still.height) } catch {} }
        video.replaceWith(still)
      })
      previous.current = { category, node }
    }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!prior || prior.category === category || reduced) { remember(); return }
    active.current?.()
    const ghost = prior.node
    ghost.className = 'rubriek-stage__old'
    ghost.setAttribute('aria-hidden', 'true'); ghost.setAttribute('inert', '')
    for (const el of [ghost, ...ghost.querySelectorAll('[id]')]) el.removeAttribute('id')
    // Een gekloonde video mag niet opnieuw laden of geluid afspelen.
    for (const video of ghost.querySelectorAll('video')) {
      const still = document.createElement('div')
      still.style.cssText = `width:100%;height:${video.getBoundingClientRect().height || 200}px;background:var(--paper)`
      if (video.poster) { const image = document.createElement('img');image.src = video.poster;image.alt = '';still.append(image) }
      video.replaceWith(still)
    }
    const viewport = parent.closest('.view')
    parent.style.minHeight = Math.max(0, (viewport?.getBoundingClientRect().bottom || innerHeight) - parent.getBoundingClientRect().top) + 'px'
    parent.append(ghost)
    const css = getComputedStyle(document.documentElement)
    const duration = timeMs(css.getPropertyValue('--dur-2'))
    const easing = css.getPropertyValue('--ease-glide').trim() || 'cubic-bezier(.2,.8,.2,1)'
    const incoming = current.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing })
    const outgoing = ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing })
    let done = false
    const clean = () => { if (done) return;done = true;incoming.cancel();outgoing.cancel();ghost.remove();parent.style.minHeight = '';active.current = null }
    active.current = clean
    Promise.all([incoming.finished, outgoing.finished]).then(clean, clean)
    remember()
  })
  useLayoutEffect(() => () => active.current?.(), [])
  return <div className="rubriek-stage" ref={stage}><div ref={live}>{children}</div></div>
}
