// Volgen in Hoot 1.5 (codenaam volgzaak): de rekenregels per lezer, in de gedeelde rekenkern. Web (Stream.jsx,
// Edition.jsx, de pagina) en de app (EditionEngine.swift, via src/lib/editionCore.js en Resources/edition-core.js) rekenen
// met precies deze code, met dezelfde toetsen (tests/volgzaak-weergave.test.mjs, tests/fixtures/volgzaak-golden.json en
// ios/HootTests/VolgzaakParityTests.swift).
//
// Wat de server deelt is voor iedereen gelijk: het veld `volgzaak { slug, label }` op een verhaal (alleen zekere treffers)
// en per dagdeel een momentopname per volgzaak (de verhalen van de pagina). Hier wordt dat jouw Stroom en jouw pagina:
// - volgzaakVoorrang: in de Stroom het label "Je volgt" op het nieuwste stuk per gevolgde volgzaak, en de voorrang
//   (bovenaan Alles en bovenaan de eigen rubriek van de lijn, hooguit drie, nieuwste eerst) voor wat nieuw is sinds je
//   vorige bezoek, uit het laatste etmaal, nog niet gelezen. Niet onder Buiten je bubbel, nooit op een Bluesky-bericht.
//   Uitgerekend met de grens van de weergave (lib/stroom-einde.js), dus vast tot je opnieuw opent.
// - volgtVan: het label in de Editie (op elke plek waarvan het verhaal bij een gevolgde volgzaak hoort; geen extra verhalen).
// - rubriekRegel: de rubriekregel heeft hooguit twee delen; "Je volgt" gaat voor "Buiten je bronnen".
// - volgzaakView: de pagina per lezer: eerst de taal van je bronkeuze, dan je eigen bronnen, gratis stukken van buiten met
//   "Buiten je bronnen", nooit een betaalmuur van buiten, Nieuw (sinds je vorige bezoek) en Eerder per week, dubbelen eruit,
//   en wat je al las telt niet als nieuw.
//
// Zonder klok en zonder toeval: `now` komt altijd uit de invoer. Alles als JSON heen en terug (Swift kent geen Set of Map).

export const VOLGZAKEN_MAX = 3 // hooguit drie tegelijk
export const VOORRANG_MS = 24 * 60 * 60 * 1000 // alleen een stuk uit het laatste etmaal (gelijk aan DAG in lib/stroom-einde.js)
export const JE_VOLGT = 'Je volgt'
export const BUITEN_JE_BRONNEN = 'Buiten je bronnen'

const tijd = (v) => {
  const t = typeof v === 'number' ? v : Date.parse(v || '')
  return Number.isFinite(t) ? t : 0
}
const lijst = (v) => (Array.isArray(v) ? v : [])
const alsSet = (v) => new Set(lijst(v))
const alsMap = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

// De volgzaken die nu meetellen: status actief (of zonder status), geldige slug en naam, hooguit drie, in je volgorde.
export function actieveVolgzaken(volgzaken) {
  const out = []
  const gehad = new Set()
  for (const z of lijst(volgzaken)) {
    if (!z || typeof z.slug !== 'string' || !z.slug || typeof z.label !== 'string' || !z.label) continue
    if (z.status && z.status !== 'actief') continue
    if (gehad.has(z.slug)) continue
    gehad.add(z.slug)
    out.push({ slug: z.slug, label: z.label })
    if (out.length >= VOLGZAKEN_MAX) break
  }
  return out
}

// Het label van een verhaal: { slug, label } als het verhaal (veld `volgzaak` van de server) bij iets hoort dat je volgt.
// De naam komt uit je eigen lijst (zo heet het zoals jij het volgde).
export function volgtVan(story, volgzaken) {
  const slug = story?.volgzaak?.slug
  if (!slug) return null
  const z = actieveVolgzaken(volgzaken).find((x) => x.slug === slug)
  return z ? { slug: z.slug, label: z.label } : null
}

// De rubriekregel: de rubriek, en daarna hooguit één staat. "Je volgt" gaat voor "Buiten je bronnen", zodat de regel nooit
// drie delen krijgt. `buiten` in de uitkomst: of "Buiten je bronnen" nog getoond wordt (op het web staat het bij de bron).
export function rubriekRegel({ rubriek = null, volgt = null, buiten = false } = {}) {
  const delen = []
  if (rubriek) delen.push(rubriek)
  if (volgt) delen.push(JE_VOLGT)
  else if (buiten) delen.push(BUITEN_JE_BRONNEN)
  return { delen, volgt: !!volgt, buiten: !volgt && !!buiten }
}

// Welke weergave van de Stroom voorrang geeft: Alles en een hoofdrubriek; niet Buiten je bubbel en niet een tab van de
// server (Opinie). Een bronkeuze telt mee doordat de lijst dan alleen stukken van die bron bevat.
export const VOORRANG_WEERGAVEN = ['alles', 'rubriek']

// De Stroom. Invoer (JSON):
//   lijst: de stukken van de weergave in volgorde [{ id, storyId, publishedAt, kind }]
//   verhalen: { <storyId>: { volgzaak: { slug, label } } } (alleen de verhalen met het veld zijn nodig)
//   volgzaken: je pref `volgzaken`
//   grens: de index van de grens van deze weergave (alles erboven is ongezien nieuws); null = geen grens (alles telt)
//   gezien: de stukken die je echt zag ({ id: tijd } of een lijst ids)
//   gelezen: de stukken die je opende (ook in de Editie)
//   now, weergave ('alles' | 'rubriek' | 'bubbel' | 'tab')
// Uitkomst: { labels: { <itemId>: { slug, label } }, voorrang: [itemId, …] } met de voorrang nieuwste eerst, hooguit drie.
export function volgzaakVoorrang(input = {}) {
  const items = lijst(input.lijst)
  const verhalen = alsMap(input.verhalen)
  const actief = actieveVolgzaken(input.volgzaken)
  const labels = {}
  if (!actief.length || !items.length || input.weergave === 'bubbel') return { labels, voorrang: [] }
  const perSlug = new Map(actief.map((z) => [z.slug, z]))
  const gezien = Array.isArray(input.gezien) ? alsSet(input.gezien) : new Set(Object.keys(alsMap(input.gezien)))
  const gelezen = alsSet(input.gelezen)
  const now = tijd(input.now)
  const grens = Number.isInteger(input.grens) ? input.grens : items.length

  // Per volgzaak het nieuwste stuk in deze weergave (bij gelijke tijd het eerste in de lijst). Nooit een Bluesky-bericht.
  const nieuwste = new Map()
  items.forEach((it, index) => {
    if (!it || !it.id || it.kind === 'post' || !it.storyId) return
    const slug = verhalen[it.storyId]?.volgzaak?.slug
    if (!slug || !perSlug.has(slug)) return
    const t = tijd(it.publishedAt)
    const cur = nieuwste.get(slug)
    if (!cur || t > cur.t) nieuwste.set(slug, { it, t, index })
  })
  for (const [slug, { it }] of nieuwste) labels[it.id] = { slug, label: perSlug.get(slug).label }

  if (!VOORRANG_WEERGAVEN.includes(input.weergave || 'alles')) return { labels, voorrang: [] }
  const voorrang = [...nieuwste.values()]
    .filter(({ it, t, index }) => index < grens && !gezien.has(it.id) && !gelezen.has(it.id) && now - t <= VOORRANG_MS && t <= now + VOORRANG_MS)
    .sort((a, b) => b.t - a.t || a.index - b.index)
    .slice(0, VOLGZAKEN_MAX)
    .map(({ it }) => it.id)
  return { labels, voorrang }
}

// De lijst met de voorrang bovenaan: de stukken verhuizen (ze staan niet nog eens lager), de rest blijft in de tijd.
export function metVoorrang(items, voorrang) {
  const ids = lijst(voorrang)
  if (!ids.length) return items
  const byId = new Map(items.map((it) => [it.id, it]))
  const boven = ids.map((id) => byId.get(id)).filter(Boolean)
  const weg = new Set(boven.map((it) => it.id))
  return [...boven, ...items.filter((it) => !weg.has(it.id))]
}

// ---- De pagina ----

const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
// De kalenderdag in Amsterdam als [jaar, maand (1-12), dag]. Zonder Intl (de rekenregels van de bundel, §9): de zomertijd
// loopt van de laatste zondag van maart tot de laatste zondag van oktober, telkens om 01:00 UTC.
const laatsteZondag = (y, m) => {
  const eind = Date.UTC(y, m + 1, 0) // laatste dag van maand m (0-11)
  return eind - new Date(eind).getUTCDay() * 864e5
}
function dagAms(t) {
  const y = new Date(t).getUTCFullYear()
  const zomer = t >= laatsteZondag(y, 2) + 36e5 && t < laatsteZondag(y, 9) + 36e5
  const d = new Date(t + (zomer ? 2 : 1) * 36e5)
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]
}
// De maandag van de week (Amsterdamse kalender) als dagnummer sinds 1970 (UTC-rekenen op de kalenderdag, zonder klok).
function maandagVan(t) {
  const [y, m, d] = dagAms(t)
  const dag = Math.floor(Date.UTC(y, m - 1, d) / 864e5)
  const wd = (new Date(dag * 864e5).getUTCDay() + 6) % 7 // maandag 0
  return dag - wd
}
// "Deze week", "Vorige week", of "Week van 2 november".
export function weekNaam(t, now) {
  const w = maandagVan(t)
  const nu = maandagVan(now)
  if (w >= nu) return 'Deze week'
  if (w === nu - 7) return 'Vorige week'
  const d = new Date(w * 864e5)
  return `Week van ${d.getUTCDate()} ${MAANDEN[d.getUTCMonth()]}`
}

const kopSleutel = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

// Invoer (JSON):
//   stand: de momentopname van de server { verhalen: [{ verhaal, kop, bron, url, bronnen, at, betaald, rubriek }] }
//   bronnen: alle bekende bronnen [{ id, lang, paid }]
//   eigen: de ids van je bronnen (gevolgd en niet uitgezet)
//   gezien: wanneer je de pagina het laatst opende (anders sinds wanneer je volgt); null = alles is nieuw
//   gelezen: verhaal-ids die je al las (ook in de Editie): die tellen niet als nieuw
//   now
// Uitkomst: { nieuw: [V], eerder: [{ week, verhalen: [V] }], aantal } met V = { verhaal, kop, bron, url, bronnen, at, buiten }.
export function volgzaakView(input = {}) {
  const now = tijd(input.now)
  const bronnen = new Map(lijst(input.bronnen).filter((b) => b && b.id).map((b) => [b.id, b]))
  const eigen = alsSet(input.eigen)
  const gelezen = alsSet(input.gelezen)
  const gezien = input.gezien ? tijd(input.gezien) : 0
  // De talen van je bronkeuze; de meest gekozen eerst. Zonder bronnen: Nederlands.
  const telling = new Map()
  for (const id of eigen) {
    const lang = bronnen.get(id)?.lang || 'nl'
    telling.set(lang, (telling.get(lang) || 0) + 1)
  }
  const talen = [...telling.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([l]) => l)
  if (!talen.length) talen.push('nl')

  const gehad = new Set()
  const koppen = new Set()
  const rijen = []
  const ruw = lijst(input.stand?.verhalen).filter((v) => v && v.verhaal && v.kop && v.bron)
  // Nieuwste eerst, zodat bij een dubbel het nieuwste blijft.
  ruw.sort((a, b) => tijd(b.at) - tijd(a.at) || (a.verhaal < b.verhaal ? -1 : 1))
  for (const v of ruw) {
    if (gehad.has(v.verhaal)) continue
    const k = kopSleutel(v.kop)
    if (k && koppen.has(k)) continue
    const bron = bronnen.get(v.bron)
    const mijn = eigen.has(v.bron)
    const lang = bron?.lang || 'nl'
    if (!mijn) {
      // Van buiten: alleen gratis, alleen een bekende bron, alleen in een taal die je koos.
      if (!bron || v.betaald || bron.paid) continue
      if (!talen.includes(lang)) continue
    }
    gehad.add(v.verhaal)
    if (k) koppen.add(k)
    rijen.push({ v: { verhaal: v.verhaal, kop: v.kop, bron: v.bron, url: v.url || null, bronnen: Number(v.bronnen) || 1, at: v.at, buiten: !mijn }, taal: Math.max(0, talen.indexOf(lang)), mijn, t: tijd(v.at) })
  }
  const orde = (a, b) => a.taal - b.taal || (a.mijn === b.mijn ? 0 : a.mijn ? -1 : 1) || b.t - a.t || (a.v.verhaal < b.v.verhaal ? -1 : 1)
  const nieuw = rijen.filter((r) => r.t > gezien && !gelezen.has(r.v.verhaal)).sort(orde)
  const nieuwIds = new Set(nieuw.map((r) => r.v.verhaal))
  const weken = new Map()
  for (const r of rijen.filter((r) => !nieuwIds.has(r.v.verhaal)).sort((a, b) => b.t - a.t)) {
    const w = weekNaam(r.t, now)
    if (!weken.has(w)) weken.set(w, [])
    weken.get(w).push(r)
  }
  const eerder = [...weken.entries()].map(([week, rs]) => ({ week, verhalen: rs.sort(orde).map((r) => r.v) }))
  return { nieuw: nieuw.map((r) => r.v), eerder, aantal: rijen.length }
}

// Met tekst heen en terug, voor Swift.
const lees = (j) => (typeof j === 'string' ? JSON.parse(j) : j)
export const volgzaakViewJSON = (j) => JSON.stringify(volgzaakView(lees(j)))
export const volgzaakVoorrangJSON = (j) => JSON.stringify(volgzaakVoorrang(lees(j)))
export const rubriekRegelJSON = (j) => JSON.stringify(rubriekRegel(lees(j)))
export const volgtVanJSON = (storyJSON, volgzakenJSON) => JSON.stringify(volgtVan(lees(storyJSON), lees(volgzakenJSON)))
