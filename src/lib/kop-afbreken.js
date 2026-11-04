// Een kop knapt nooit midden in een woord zonder streepje, en wordt verder nooit afgebroken
// (keuring tekstfont, AX5). Zoals de app (ios/Hoot/Views/Kop.swift): alleen het woord dat breder is dan
// zijn kolom wordt afgebroken, op de lettergrepen van de taal van de pagina (lang="nl", drie letters per
// kant). Dat woord komt in een <span class="kop-woord"> met hyphens: auto; de rest van de kop breekt
// alleen tussen woorden, dus "verkiezingsnacht" blijft heel als het woord op de volgende regel past.
// Heeft een kop andere elementen in zich (geen platte tekst), dan krijgt de hele kop .kop--breek.
//
// Meten zonder opmaak: canvas.measureText met de letter van de kop, plus de letterafstand per teken.
// Opnieuw bij nieuwe koppen, een andere breedte (draaien, Tekstgrootte) en als de letters geladen zijn.

export const KOP = '.head-4, .head-lg, .head-5, .head-6'
export const BREEK = 'kop--breek'
export const WOORD = 'kop-woord'

// Past een woord van `width` (al gemeten) niet in de kolom? Een halve pixel speling, zoals Core Text.
export const tooWide = (wordWidths, column) => column > 0 && wordWidths.some(w => w > column - 0.5)

// De woorden die gemeten moeten worden: korte woorden passen altijd.
export const longWords = (text) => (text || '').split(/\s+/).filter(w => w.length >= 8)

// De kop in stukken: tekst en de woorden die te breed zijn. Leestekens aan de rand blijven buiten het
// woord (de dubbele punt in "Amerika:" telt in Chrome anders mee als letter).
export function segments(text, wide) {
  const out = []
  const push = (t, w) => { if (!t) return; const last = out[out.length - 1]; if (last && last.wide === w) last.text += t; else out.push({ text: t, wide: w }) }
  for (const part of (text || '').split(/(\s+)/)) {
    if (!part || /^\s+$/.test(part) || !wide(part)) { push(part, false); continue }
    const m = part.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/su)
    push(m[1], false); push(m[2], true); push(m[3], false)
  }
  return out
}

export function startKopAfbreken(root = document) {
  if (typeof window === 'undefined' || !window.CanvasRenderingContext2D) return () => {}
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return () => {}
  const check = (el) => {
    const words = longWords(el.textContent)
    const plain = [...el.childNodes].every(n => n.nodeType === 3 || (n.nodeType === 1 && n.classList.contains(WOORD)))
    let wide = []
    if (words.length) {
      const cs = getComputedStyle(el)
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      const ls = parseFloat(cs.letterSpacing) || 0
      const column = el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0)
      wide = words.filter(w => tooWide([ctx.measureText(w).width + ls * w.length], column))
    }
    if (!plain) { // andere elementen in de kop: de hele kop, zoals voorheen
      if (el.classList.contains(BREEK) !== (wide.length > 0)) el.classList.toggle(BREEK, wide.length > 0)
      return
    }
    el.classList.remove(BREEK)
    const parts = segments(el.textContent, w => wide.includes(w))
    const now = [...el.childNodes].map(n => ({ text: n.textContent, wide: n.nodeType === 1 }))
    if (parts.length === now.length && parts.every((p, i) => p.text === now[i].text && p.wide === now[i].wide)) return
    el.replaceChildren(...parts.map(p => {
      if (!p.wide) return document.createTextNode(p.text)
      const span = document.createElement('span'); span.className = WOORD; span.textContent = p.text; return span
    }))
  }
  let queued = false
  const all = () => { queued = false; root.querySelectorAll(KOP).forEach(check) }
  const later = () => { if (!queued) { queued = true; requestAnimationFrame(all) } }
  const mo = new MutationObserver(later)
  mo.observe(root.body || root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class'] }) // ook class: React kan de klasse van een kop opnieuw zetten
  const html = new MutationObserver(later)
  html.observe(document.documentElement, { attributes: true, attributeFilter: ['data-text', 'data-systeem', 'style'] })
  window.addEventListener('resize', later)
  document.fonts?.addEventListener?.('loadingdone', later)
  document.fonts?.ready?.then(later)
  later()
  return () => { mo.disconnect(); html.disconnect(); window.removeEventListener('resize', later); document.fonts?.removeEventListener?.('loadingdone', later) }
}
