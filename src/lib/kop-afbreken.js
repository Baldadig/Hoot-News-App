// Een kop knapt nooit midden in een woord zonder streepje, en wordt verder nooit afgebroken
// (keuring tekstfont, AX5). Zoals de app (ios/Hoot/Views/Kop.swift): alleen een kop met een woord dat
// breder is dan zijn kolom krijgt `.kop--breek`, en daarmee hyphens: auto op de lettergrepen van de
// taal van de pagina (lang="nl"). Zonder die klasse breekt een kop alleen tussen woorden, dus
// "verkiezingsnacht" blijft heel als het woord op de volgende regel past.
//
// Meten zonder opmaak: canvas.measureText met de letter van de kop, plus de letterafstand per teken.
// Opnieuw bij nieuwe koppen, een andere breedte (draaien, Tekstgrootte) en als de letters geladen zijn.

export const KOP = '.head-4, .head-lg, .head-5, .head-6'
export const BREEK = 'kop--breek'

// Past een woord van `width` (al gemeten) niet in de kolom? Een halve pixel speling, zoals Core Text.
export const tooWide = (wordWidths, column) => column > 0 && wordWidths.some(w => w > column - 0.5)

// De woorden die gemeten moeten worden: korte woorden passen altijd.
export const longWords = (text) => (text || '').split(/\s+/).filter(w => w.length >= 8)

export function startKopAfbreken(root = document) {
  if (typeof window === 'undefined' || !window.CanvasRenderingContext2D) return () => {}
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return () => {}
  const check = (el) => {
    const words = longWords(el.textContent)
    let wide = false
    if (words.length) {
      const cs = getComputedStyle(el)
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      const ls = parseFloat(cs.letterSpacing) || 0
      const column = el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)
      wide = tooWide(words.map(w => ctx.measureText(w).width + ls * w.length), column)
    }
    if (el.classList.contains(BREEK) !== wide) el.classList.toggle(BREEK, wide)
  }
  let queued = false
  const all = () => { queued = false; root.querySelectorAll(KOP).forEach(check) }
  const later = () => { if (!queued) { queued = true; requestAnimationFrame(all) } }
  const mo = new MutationObserver(later)
  mo.observe(root.body || root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] }) // ook class: React kan de klasse van een kop opnieuw zetten
  const html = new MutationObserver(later)
  html.observe(document.documentElement, { attributes: true, attributeFilter: ['data-text', 'style'] })
  window.addEventListener('resize', later)
  document.fonts?.addEventListener?.('loadingdone', later)
  document.fonts?.ready?.then(later)
  later()
  return () => { mo.disconnect(); html.disconnect(); window.removeEventListener('resize', later); document.fonts?.removeEventListener?.('loadingdone', later) }
}
