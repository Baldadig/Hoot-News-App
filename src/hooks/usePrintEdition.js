import { useEffect } from 'react'
import { shouldPrintEdition, PRINT_TIMING } from '../../shared/edition-motion.mjs'
import { reduced } from '../lib/motion.js'
const seen = new Set()
export function usePrintEdition(ref, id, active, ready) {
  useEffect(() => {
    if (!active || !ready || !id || !ref.current) return
    let timer, cancelled = false, animations = []
    const run = () => {
      if (cancelled) return
      const root = ref.current
      if (!root || root.closest('[inert]') || (document.getElementById('splash') && !document.getElementById('splash').hidden)) { timer = setTimeout(run, 50); return }
      let previous
      try { previous = localStorage.getItem('hoot:editie-gezien') } catch {}
      if (!shouldPrintEdition(id, previous) || seen.has(id)) return
      const rule = root.querySelector('.edrule'), front = root.querySelector('.front')
      if (!rule || !front) return
      seen.add(id)
      const still = reduced()
      front.getAnimations().forEach(a => a.cancel())
      animations = [rule.animate(still ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: still ? PRINT_TIMING.fade : PRINT_TIMING.rule, easing: 'cubic-bezier(0.2,0.8,0.2,1)', fill: 'both' }),
        front.animate(still ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: PRINT_TIMING.lead, delay: still ? 0 : PRINT_TIMING.leadDelay, easing: 'cubic-bezier(0.2,0.7,0.2,1)', fill: 'both' })]
      Promise.all(animations.map(a => a.finished)).then(() => { if (!cancelled) { try { localStorage.setItem('hoot:editie-gezien', id) } catch {} } }).catch(() => {})
    }
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const stop = () => { if (preference.matches) animations.forEach(a => a.cancel()) }
    preference.addEventListener('change', stop)
    timer = setTimeout(run, 0)
    return () => { preference.removeEventListener('change', stop); cleanup() }
    function cleanup()  { cancelled = true; clearTimeout(timer); animations.forEach(a => a.cancel()) }
  }, [id, active, ready, ref])
}
