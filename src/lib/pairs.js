// Het brede Editie-raster (keuze 1.1.0, A · Paren): twee kolommen, elk paar even hoog, zonder gat
// onder een kort verhaal. Puur rekenwerk, zodat tests/editie-stroom-110.test.mjs het kan nalopen;
// het meten doet hooks/usePairs.js. Gelijk aan EditionPairs in ios/Hoot/Views/EditionGrid.swift.

export const PAIR_SLACK = 48 // twee regels: kleiner verschil laat het paar zoals het is
export const LEAD_MIN = 240 // het beeld van het hoofdverhaal wordt nooit lager dan dit

// Per paar: is het ene verhaal meer dan twee regels korter en heeft het een beeld, dan staat dat
// beeld groot boven het verhaal in plaats van klein naast de kop, precies zo hoog als het verschil
// (tussen een kwart en de helft van de kolombreedte, dus tussen 4:1 en 2:1). Maakt dat het verschil
// niet kleiner, dan blijft het klein. Een los laatste verhaal krijgt de hele rij.
// `cells`: [{ key, h, image }], in leesvolgorde; `width`: de breedte van één kolom; `gap`: de ruimte
// tussen beeld en kicker. Geeft { key: hoogte van het beeld }.
export function planPairs(cells, { width, gap = 12 } = {}) {
  const out = {}
  for (let i = 0; i + 1 < cells.length; i += 2) {
    const [a, b] = [cells[i], cells[i + 1]]
    const d0 = Math.abs(a.h - b.h)
    if (d0 <= PAIR_SLACK) continue
    const short = a.h < b.h ? a : b
    const other = short === a ? b : a
    if (!short.image || !(width > 0)) continue
    const x = Math.round(Math.min(width / 2, Math.max(width / 4, other.h - short.h - gap)))
    if (Math.abs(short.h + x + gap - other.h) >= d0) continue
    out[short.key] = x
  }
  return out
}

// Het hoofdverhaal naast zijn zijkolom (02 en 03): het beeld rekt mee tot beide even hoog zijn, en
// is minstens LEAD_MIN. `text`: de hoogte van het hoofdverhaal zonder beeld.
export const leadImageHeight = ({ side, text, min = LEAD_MIN }) => Math.round(Math.max(min, side - text))
