// Eén video tegelijk: start er een, dan pauzeert de rest. Eén luisteraar voor de hele pagina
// ('play' bubbelt niet, maar is in de capture-fase wel te zien).
if (typeof document !== 'undefined') {
  document.addEventListener(
    'play',
    (e) => {
      if (!(e.target instanceof HTMLMediaElement)) return
      for (const m of document.querySelectorAll('video, audio')) if (m !== e.target && !m.paused) m.pause()
    },
    true
  )
}

// Spaarstand of trage verbinding: niets vooraf laden dat je misschien niet bekijkt.
export const saveData = () => {
  const c = typeof navigator !== 'undefined' ? navigator.connection : null
  return !!c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))
}
