// Placeholderbeeld (build 46, keuze van Alex): heeft een stuk geen beeld, is het te klein voor de plek
// of laadt het niet, dan vult een Hoot-beeld het vak. Sinds 15 november knipsel: papiercollages, met Luma
// gemaakt naar de composities van de oude tekeningen (Hoot-design/merk/placeholders-luma-2026-11-15/hires,
// 2048 x 1152, in licht, donker en nacht). Alex: "16, 17 en 07 halen we helemaal uit het product. Rest
// zetten we high-res door in Luma en plaatsen we als placeholder bij artikelen. Geeft een mooie dynamiek."
//
// Dertien beelden, met hun oude nummers: 1 tot 3 Zonnestand, 4 tot 6 Iris, 8 Puntraster en 9 Haarlijnraster
// (samen de set Raster), 10 De stapel, 11 De kop, 12 Vouw, 13 Baan en 18 Koepels (die vijf elk een eigen
// set). Weg uit het product: 7 Horizonlijnen, 14 Eclips, 15 Walsen, 16 Zetsel en 17 De rij. Ze dragen geen
// betekenis: geen dagdeel, geen rubriek, geen tekst.
//
// Waarom de oude nummers (1 tot 18, met gaten) en niet 1 tot 13: de keuze blijft hash mod 18. Elk stuk dat
// al een van de dertien had, houdt precies dat beeld; alleen de stukken die op een weggehaald nummer vielen
// kiezen opnieuw, met de rest van de hash, uit de dertien. Hernummeren naar 1 tot 13 (hash mod 13) zou het
// beeld van bijna elk stuk veranderen en de bestandsnamen laten verschuiven.
//
// Eén bron voor web en app: scripts/placeholders.mjs maakt uit de hires-beelden de WebP's voor het web
// (src/assets/placeholder/), de CSS (src/placeholder.css), dezelfde bitmaps voor de app
// (ios/Hoot/Resources/Placeholder/) en de tabel voor Swift (ios/Hoot/Views/PlaceholderBeelden.swift).
// Dezelfde keuze voor hetzelfde artikel: tests/fixtures/placeholder.json draait op web en iOS.

// De ruimte van de hash: achttien plekken, zoals voorheen. Vijf zijn leeg (PLACEHOLDER_UIT).
export const PLACEHOLDER_COUNT = 18

// Per plek (index 0 tot 17, beeld 1 tot 18): naam en set, of null als het beeld uit het product is.
// `klein: 'rechts'`: de kleine uitsnede (3:2) neemt de rechterkant van het bronbeeld in plaats van het
// midden, zodat het rood er niet buiten valt (3 Zonnestand: de zon rechts, 5 Iris en 12 Vouw: de rode punt).
export const PLACEHOLDERS = [
  { naam: 'Zonnestand', family: 'zon' },
  { naam: 'Zonnestand', family: 'zon' },
  { naam: 'Zonnestand', family: 'zon', klein: 'rechts' },
  { naam: 'Iris', family: 'iris' },
  { naam: 'Iris', family: 'iris', klein: 'rechts' },
  { naam: 'Iris', family: 'iris' },
  null, // 7 Horizonlijnen: weg (15 november)
  { naam: 'Puntraster', family: 'raster' },
  { naam: 'Haarlijnraster', family: 'raster' },
  { naam: 'De stapel', family: 'stapel' },
  { naam: 'De kop', family: 'kop' },
  { naam: 'Vouw', family: 'vouw', klein: 'rechts' },
  { naam: 'Baan', family: 'baan' },
  null, // 14 Eclips: weg (14 november)
  null, // 15 Walsen: weg (15 november)
  null, // 16 Zetsel: weg (15 november)
  null, // 17 De rij: weg (15 november)
  { naam: 'Koepels', family: 'koepels' },
]

// Uit het product (index): 7 Horizonlijnen, 14 Eclips, 15 Walsen, 16 Zetsel en 17 De rij.
export const PLACEHOLDER_UIT = PLACEHOLDERS.flatMap((p, k) => (p ? [] : [k]))
const UIT = new Set(PLACEHOLDER_UIT)
// De dertien die gekozen worden, op volgorde (index).
export const PLACEHOLDER_KEUZE = PLACEHOLDERS.flatMap((p, k) => (p ? [k] : []))
// De beeldnummers (1 tot 18) die bestaan.
export const PLACEHOLDER_NUMMERS = PLACEHOLDER_KEUZE.map((k) => k + 1)

// FNV-1a (32 bit) over de UTF-8-bytes van de id. Dezelfde som in Beeldloos.swift.
export function fnv1a(s) {
  let h = 0x811c9dc5
  for (const b of new TextEncoder().encode(String(s))) {
    h ^= b
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

// Het beeld van een artikel op zich (index), nooit een beeld dat uit het product is. hash mod 18; valt dat
// op een lege plek, dan kiest de rest van de hash ((hash / 18) mod 13) een van de dertien. Zo houdt elk stuk
// met een van de dertien zijn beeld, en krijgt elk van de dertien precies een dertiende
// (1/18 + 5/18 · 1/13 = 1/13). Gelijk in Swift.
export function placeholderBase(id) {
  const h = fnv1a(id)
  const k = h % PLACEHOLDER_COUNT
  return UIT.has(k) ? PLACEHOLDER_KEUZE[Math.floor(h / PLACEHOLDER_COUNT) % PLACEHOLDER_KEUZE.length] : k
}

// Wordt beeld k (index) gekozen?
export const placeholderInReeks = (k) => !UIT.has(k)

// De set van een beeld (index): zon, iris, raster, stapel, kop, vouw, baan of koepels.
export const placeholderSet = (k) => PLACEHOLDERS[k]?.family ?? null

// Doorschuiven: drie verder (mod 18). Komt dat op een lege plek of in dezelfde set, dan nog eens drie.
// De drie ringen van +3 (0 3 6 9 12 15 · 1 4 7 10 13 16 · 2 5 8 11 14 17) bevatten elk beelden uit
// minstens drie sets, dus het doorschuiven vindt altijd een ander beeld in een andere set.
export const PLACEHOLDER_SHIFT = 3

// Een lijst van boven naar onder: `rows` is [{ id, bare }], `bare` of die rij het placeholderbeeld toont.
// Twee beeldloze rijen direct na elkaar krijgen nooit hetzelfde beeld en nooit dezelfde set: zit het
// beeld in dezelfde set als dat van de rij erboven, dan schuift het drie door, naar een andere set.
// Alleen de directe buur telt, dus een nieuw stuk bovenaan verschuift hooguit de rij eronder. Geeft een
// Map id → index voor de beeldloze rijen.
export function placeholderPlan(rows) {
  const out = new Map()
  let prev = null
  for (const r of rows) {
    if (!r?.bare) {
      prev = null
      continue
    }
    let k = placeholderBase(r.id)
    if (prev != null && placeholderSet(k) === placeholderSet(prev)) {
      do k = (k + PLACEHOLDER_SHIFT) % PLACEHOLDER_COUNT
      while (UIT.has(k) || placeholderSet(k) === placeholderSet(prev))
    }
    out.set(r.id, k)
    prev = k
  }
  return out
}

// ---- Bitmaps ----
export const THEMES = ['licht', 'donker', 'nacht']

// Uitsneden uit het bronbeeld (2048 x 1152, 16:9): groot 2:1 (2048 x 1024, midden) en klein 3:2
// (1728 x 1152, midden, of rechts waar PLACEHOLDERS dat zegt). Per uitsnede twee maten: 1x en 2x voor het web; de app neemt de 2x-maat
// (groot 1600 punten breed: een iPhone op 3x over de volle breedte is 1200; klein 360 x 240: de
// grootste miniatuur, 108 punten op 3x, is 324).
export const PLACEHOLDER_BRON = { w: 2048, h: 1152 }
export const PLACEHOLDER_MATEN = {
  groot: { crop: { w: 2048, h: 1024 }, maten: [800, 1600] },
  klein: { crop: { w: 1728, h: 1152 }, maten: [180, 360] },
}
export const PLACEHOLDER_KWALITEIT = 75

// Bestandsnaam op het web: beeld-1-licht-800.webp, beeld-1-nacht-klein-360.webp.
export const placeholderFile = (n, theme, uitsnede, breed) => `beeld-${n}-${theme}${uitsnede === 'klein' ? '-klein' : ''}-${breed}.webp`
// Bestandsnaam in de app (alleen de 2x-maat): ph-1-licht.webp, ph-1-nacht-klein.webp.
export const placeholderAppFile = (n, theme, uitsnede) => `ph-${n}-${theme}${uitsnede === 'klein' ? '-klein' : ''}.webp`
