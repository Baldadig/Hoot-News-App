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

// De reeks: per plek in de hash de set van het beeld, of null als het niet gekozen wordt. Sinds 15 november
// (build 61, "server side bouwen") komt de reeks in de app uit het manifest op de server (gethoot.app/placeholders.json,
// placeholderManifest hieronder), met deze waarden als terugval; het web heeft hem gebouwd. Dezelfde rekenregels in
// Swift (PlaceholderReeks in ios/HootWidgetShared/PlaceholderReeks.swift); tests/fixtures/placeholder-manifest.json
// toetst een andere reeks op beide.
export function placeholderReeks(familie) {
  const count = familie.length
  const uit = familie.flatMap((f, k) => (f ? [] : [k]))
  const UIT = new Set(uit)
  const keuze = familie.flatMap((f, k) => (f ? [k] : []))
  const set = (k) => familie[k] ?? null
  // Het beeld van een artikel op zich (index), nooit een beeld dat uit het product is. hash mod count; valt dat
  // op een lege plek, dan kiest de rest van de hash ((hash / count) mod keuze) een van de beelden in de reeks.
  const base = (id) => {
    const h = fnv1a(id)
    const k = h % count
    return UIT.has(k) ? keuze[Math.floor(h / count) % keuze.length] : k
  }
  // Een lijst van boven naar onder (zie placeholderPlan).
  const plan = (rows) => {
    const out = new Map()
    let prev = null
    for (const r of rows) {
      if (!r?.bare) {
        prev = null
        continue
      }
      let k = base(r.id)
      if (prev != null && set(k) === set(prev)) {
        do k = (k + PLACEHOLDER_SHIFT) % count
        while (UIT.has(k) || set(k) === set(prev))
      }
      out.set(r.id, k)
      prev = k
    }
    return out
  }
  return { count, familie, uit, keuze, set, base, plan, inReeks: (k) => k >= 0 && k < count && !UIT.has(k) }
}

const REEKS = placeholderReeks(PLACEHOLDERS.map((p) => p?.family ?? null))

// Uit het product (index): 7 Horizonlijnen, 14 Eclips, 15 Walsen, 16 Zetsel en 17 De rij.
export const PLACEHOLDER_UIT = REEKS.uit
const UIT = new Set(PLACEHOLDER_UIT)
// De dertien die gekozen worden, op volgorde (index).
export const PLACEHOLDER_KEUZE = REEKS.keuze
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
export const placeholderBase = (id) => REEKS.base(id)

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
export const placeholderPlan = (rows) => REEKS.plan(rows)

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

// ---- Manifest op de server (build 61, besluit Alex 15 november: "server side bouwen") ----
// De app haalt https://gethoot.app/placeholders.json op (bij de start, hooguit eens per dag) en kan zo nieuwe of
// veranderde beelden en een andere reeks krijgen zonder app-update. De beelden staan als WebP op
// https://gethoot.app/img/placeholder/ met de eerste twaalf tekens van hun sha256 als ?v=: verandert een beeld, dan
// verandert de url, en de app ziet aan die versie of zijn gebundelde bestand nog hetzelfde is (dan haalt hij niets).
// Het web haalt het manifest niet op: het wordt in dezelfde deploy gebouwd uit dezelfde bron, dus het web is altijd
// gelijk aan het manifest dat op dat moment op de server staat.
export const PLACEHOLDER_SITE = 'https://gethoot.app'
export const PLACEHOLDER_MANIFEST_PAD = '/placeholders.json'
export const PLACEHOLDER_BEELD_PAD = '/img/placeholder/'
export const PLACEHOLDER_SCHEMA = 1
export const placeholderVersie = (sha256hex) => sha256hex.slice(0, 12)

// Het manifest. `shaVan(webBestand)` geeft de sha256 (hex) van een bestand in src/assets/placeholder/; `sha256(tekst)`
// rekent de versie van het geheel uit. Alleen de reeks en de urls tellen voor de versie.
export function placeholderManifest(shaVan, sha256) {
  const urls = (n, theme, uitsnede) => {
    const [een, twee] = PLACEHOLDER_MATEN[uitsnede].maten
    const url = (breed) => {
      const f = placeholderFile(n, theme, uitsnede, breed)
      return `${PLACEHOLDER_SITE}${PLACEHOLDER_BEELD_PAD}${f}?v=${placeholderVersie(shaVan(f))}`
    }
    return { '1x': url(een), '2x': url(twee) }
  }
  const beelden = PLACEHOLDER_NUMMERS.map((n) => {
    const b = { nummer: n, set: PLACEHOLDERS[n - 1].family }
    for (const theme of THEMES) b[theme] = { groot: urls(n, theme, 'groot'), klein: urls(n, theme, 'klein') }
    return b
  })
  const kern = { schema: PLACEHOLDER_SCHEMA, count: PLACEHOLDER_COUNT, uit: PLACEHOLDER_UIT.map((k) => k + 1), beelden }
  return { schema: kern.schema, versie: placeholderVersie(sha256(JSON.stringify(kern))), count: kern.count, uit: kern.uit, beelden }
}

// Is een manifest bruikbaar? Geeft null als het goed is, anders de reden. Dezelfde regels in Swift
// (PlaceholderManifest.reeks): een fout manifest wordt genegeerd, en dan blijft wat er was.
export function placeholderManifestFout(m) {
  if (!m || typeof m !== 'object') return 'geen object'
  if (m.schema !== PLACEHOLDER_SCHEMA) return 'schema'
  if (typeof m.versie !== 'string' || !/^[0-9a-f]{12}$/.test(m.versie)) return 'versie'
  if (!Number.isInteger(m.count) || m.count < 2 || m.count > 64) return 'count'
  if (!Array.isArray(m.uit) || m.uit.some((n) => !Number.isInteger(n) || n < 1 || n > m.count) || new Set(m.uit).size !== m.uit.length) return 'uit'
  if (!Array.isArray(m.beelden)) return 'beelden'
  const per = new Map()
  for (const b of m.beelden) {
    if (!b || !Number.isInteger(b.nummer) || b.nummer < 1 || b.nummer > m.count || per.has(b.nummer)) return 'nummer'
    if (typeof b.set !== 'string' || !/^[a-z]{1,24}$/.test(b.set)) return 'set'
    for (const theme of THEMES) for (const uitsnede of ['groot', 'klein']) for (const maat of ['1x', '2x']) {
      const u = b[theme]?.[uitsnede]?.[maat]
      if (typeof u !== 'string' || !u.startsWith(PLACEHOLDER_SITE + PLACEHOLDER_BEELD_PAD) || !/\.webp\?v=[0-9a-f]{12}$/.test(u)) return 'url'
    }
    per.set(b.nummer, b)
  }
  const familie = Array.from({ length: m.count }, (_, k) => (m.uit.includes(k + 1) ? null : per.get(k + 1)?.set ?? undefined))
  if (familie.includes(undefined)) return 'beeld ontbreekt'
  const reeks = placeholderReeks(familie)
  if (reeks.keuze.length < 2) return 'te weinig beelden'
  // Doorschuiven moet vanuit elk beeld een ander beeld in een andere set vinden.
  for (const k of reeks.keuze) {
    let j = k, gevonden = false
    for (let i = 0; i < m.count && !gevonden; i++) {
      j = (j + PLACEHOLDER_SHIFT) % m.count
      gevonden = reeks.inReeks(j) && reeks.set(j) !== reeks.set(k)
    }
    if (!gevonden) return 'doorschuiven'
  }
  return null
}

// De reeks uit een (goed) manifest.
export const placeholderReeksUitManifest = (m) => placeholderReeks(Array.from({ length: m.count }, (_, k) => (m.uit.includes(k + 1) ? null : m.beelden.find((b) => b.nummer === k + 1).set)))
