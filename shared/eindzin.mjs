// De eindzin van de Editie: "Je weet genoeg." of "Je bent bij." Per Editie staat het vast (zelfde
// datum en dagdeel geeft overal dezelfde zin), van Editie tot Editie wisselt het. Geen kloktijden,
// geen toeval: een vaste hasj (FNV-1a, 32 bits, met een murmur-slot) van "datum|dagdeel".
// iOS spiegelt dit in EditionView.swift (EditionEnd) en draait dezelfde gevallen uit
// tests/fixtures/eindzin.json; verander je hier iets, dan daar ook. De landing blijft ongemoeid.
export const EINDZINNEN = ['Je weet genoeg.', 'Je bent bij.']

export function fnv1a(s) {
  let h = 0x811c9dc5
  for (const b of new TextEncoder().encode(s)) {
    h ^= b
    h = Math.imul(h, 0x01000193) >>> 0
  }
  // Nog even doorroeren: de laatste bytes ("…-04|avond") bepalen anders te veel van de laagste bit.
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0
  return (h ^ (h >>> 16)) >>> 0
}

// `date`: "2026-11-04" (de datum van de Editie), `slot`: ochtend | middag | avond.
export function eindzin(date, slot) {
  return EINDZINNEN[fnv1a(`${date || ''}|${slot || ''}`) % EINDZINNEN.length]
}
