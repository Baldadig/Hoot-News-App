import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 70
const MAX = 90

// Lichte pull-to-refresh op de scroll-container: alleen actief als je
// bovenaan staat en omlaag trekt. Voelt vertrouwd op iPhone.
export default function usePullToRefresh(onRefresh) {
  const containerRef = useRef(null)
  const [pull, setPull] = useState(0)
  const pullRef = useRef(0)
  const startY = useRef(null)

  const set = (v) => {
    pullRef.current = v
    setPull(v)
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onStart = (e) => {
      startY.current = el.scrollTop <= 0 ? e.touches[0].clientY : null
    }
    const onMove = (e) => {
      if (startY.current == null) return
      const dy = e.touches[0].clientY - startY.current
      if (dy > 0 && el.scrollTop <= 0) set(Math.min(dy * 0.5, MAX))
      else if (dy <= 0) set(0)
    }
    const onEnd = () => {
      if (startY.current == null) return
      const reached = pullRef.current >= THRESHOLD
      startY.current = null
      set(0)
      if (reached) onRefresh()
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [onRefresh])

  return { containerRef, pull }
}
