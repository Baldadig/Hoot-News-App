import { useEffect, useRef } from 'react'
import { reduced, DUR, EASE } from '../lib/motion.js'
export function useEmptyDraw(enabled) {
  const ref = useRef(null)
  useEffect(() => {
    const node = ref.current
    if (!enabled || !node || reduced()) return
    let done = false, animations = []
    const observer = new IntersectionObserver(entries => {
      if (done || !entries.some(e => e.isIntersecting)) return
      done = true; observer.disconnect()
      for (const shape of node.querySelectorAll('.empty__art :is(path,rect,circle):not(.empty__lint):not(.empty__lint *)')) {
        shape.setAttribute('pathLength', '1')
        animations.push(shape.animate([{ strokeDasharray: '1', strokeDashoffset: '1' }, { strokeDasharray: '1', strokeDashoffset: '0' }], { duration: DUR.gewoon, easing: EASE.bediening }))
      }
      for (const detail of node.querySelectorAll('.empty__lint')) animations.push(detail.animate([{ opacity: 0 }, { opacity: 1 }], { duration: DUR.kort, delay: DUR.gewoon, fill: 'backwards' }))
      for (const text of node.querySelectorAll(':scope > :not(svg)')) animations.push(text.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: DUR.gewoon, delay: DUR.gewoon + DUR.kort, fill: 'backwards' }))
    }, { threshold: .1 })
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const stop = () => { if (preference.matches) { done = true; observer.disconnect(); animations.forEach(a => a.cancel()) } }
    preference.addEventListener('change', stop)
    observer.observe(node)
    return () => { preference.removeEventListener('change', stop); cleanup() }
    function cleanup()  { observer.disconnect(); animations.forEach(a => a.cancel()) }
  }, [enabled])
  return ref
}
