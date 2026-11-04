// Selectie-index B (concepten-2/4-selectie-index.html): de inhoud bovenaan, één rijvorm. Pure
// functies, zodat tests/selectie-index.test.mjs de toestanden kan nalopen; DigestView.swift doet
// hetzelfde (SelectionOverview).

// "3 stukken", "1 stuk", en voor een onderwerp zonder stukken "Nog geen stukken" (nooit "0 stukken").
export const pieces = (n) => (n === 0 ? 'Nog geen stukken' : n === 1 ? '1 stuk' : `${n} stukken`)

// "Fotografie", "Fotografie en Gaming", "AI, Fotografie en Gaming".
export const joinNames = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} en ${names[names.length - 1]}`)

// Wat de Selectie toont. `fields`: de gekozen onderwerpen in vaste volgorde, elk met `top` (de
// stukken van deze week); `offered`: ids die de server deze week levert.
// - state 'kies': nog niets gekozen;
// - state 'leeg': gekozen, maar nergens stukken ("Nog niets voor X"); `unoffered`: geen bronnen;
// - state 'vol': de kop telt alleen onderwerpen met stukken; lege onderwerpen staan onderaan.
export function selectionOverview(fields, offered) {
  const live = fields.filter((f) => f.top.length > 0)
  const empty = fields.filter((f) => f.top.length === 0)
  const picked = live.reduce((n, f) => n + f.top.length, 0)
  if (!fields.length) return { state: 'kies', fields: [], live, picked: 0 }
  if (!live.length) return { state: 'leeg', fields, live, picked: 0, names: joinNames(fields.map((f) => f.label)), unoffered: fields.every((f) => !offered.has(f.id)) }
  return { state: 'vol', fields: [...live, ...empty], live, picked }
}

export const summaryLine = (o) => `${pieces(o.picked)} in ${o.live.length === 1 ? '1 onderwerp' : `${o.live.length} onderwerpen`}`

export const EMPTY_FIELD = 'Deze week sprong er niets uit. Maandag kijkt Hoot opnieuw.'
export const NO_SOURCES = 'Hoot heeft hier nog te weinig goede bronnen voor. Kies er een onderwerp bij, dan lees je maandag meer.'
export const CHOOSE = 'Voor je werk of uit interesse: elke maandag per onderwerp de drie beste stukken van de week.'
