// Eén geluidsbron tegelijk. Start er een video of het voorlezen, dan zwijgt de rest.
// Video's in de pagina vangen we met één luisteraar (het 'play'-event bubbelt niet, maar
// is wel in de capture-fase te zien); geluid buiten de pagina (voorlezen) meldt zich aan.
const silencers = new Set()

export function claim(owner) {
  for (const m of document.querySelectorAll('video, audio')) if (m !== owner && !m.paused) m.pause()
  for (const silence of silencers) if (silence !== owner) silence()
}

export function addSilencer(silence) {
  silencers.add(silence)
  return () => silencers.delete(silence)
}

if (typeof document !== 'undefined') {
  document.addEventListener('play', (e) => e.target instanceof HTMLMediaElement && claim(e.target), true)
}

// Spaarstand of trage verbinding: niets vooraf laden dat je misschien niet bekijkt.
export const saveData = () => {
  const c = typeof navigator !== 'undefined' ? navigator.connection : null
  return !!c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))
}
