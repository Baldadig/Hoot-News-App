import { useEffect } from 'react'
import { reduced } from '../lib/motion.js'
const seen = new Set()
export function usePrintEdition(ref, id, active, ready) {
  useEffect(() => {
    if (!active || !ready || !id || !ref.current) return
    let timer, cancelled = false, animations = []
    const run = () => {
      if (cancelled) return
      const root = ref.current
      if (!root || root.closest('[inert]') || document.getElementById('splash')) { timer = setTimeout(run, 50); return }
      let previous
      try { previous = localStorage.getItem('hoot:editie-gezien') } catch {}
      if (previous === id || seen.has(id)) return
      const rule = root.querySelector('.edrule'), front = root.querySelector('.front')
      if (!rule || !front) return
      seen.add(id)
      try { localStorage.setItem('hoot:editie-gezien', id) } catch {}
      const still = reduced()
      front.getAnimations().forEach(a => a.cancel())
      animations = [rule.animate(still ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: still ? 200 : 400, easing: 'cubic-bezier(0.2,0.8,0.2,1)', fill: 'both' }),
        front.animate(still ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 200, delay: still ? 0 : 480, easing: 'cubic-bezier(0.2,0.7,0.2,1)', fill: 'both' })]
    }
    run()
    return () => { cancelled = true; clearTimeout(timer); animations.forEach(a => a.cancel()) }
  }, [id, active, ready, ref])
}
