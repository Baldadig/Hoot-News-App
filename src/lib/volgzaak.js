// Volgen 1.5 op het web (codenaam volgzaak): de vlag, de vraag aan de server en alle teksten uit één lijst.
//
// Standaard UIT. Aan voor iedereen met de Netlify-variabele HOOT_VOLGZAKEN=aan: vanaf de volgende ronde van de feed staat
// `meta.volgzaken: true` in de kern en zie je de kop in Zoeken, de pagina, het label "Je volgt" en de voorrang in de Stroom.
// Eerst zelf bekijken: in de console localStorage.setItem('hoot.volgzaken', 'aan') en herladen (de server antwoordt dan nog
// "Nog niet beschikbaar." tot de vlag daar op proef of aan staat); weg met localStorage.removeItem('hoot.volgzaken').
//
// Privacy: de naam van wat je volgt (de slug) en je opdracht gaan alleen in een POST-body naar /api/volgzaak, nooit in een
// adres van de server. Alleen Deel zet de slug in een link, en dat kies je zelf.
// Het woord "onderwerp" staat nergens in de app (tests/volgzaak-web.test.mjs).

export const LOCAL_FLAG = 'hoot.volgzaken'

const store = () => (typeof window !== 'undefined' ? window.localStorage : null)
function lees(key, storage) {
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function volgzakenAan(meta, storage = store()) {
  return meta?.volgzaken === true || lees(LOCAL_FLAG, storage) === 'aan'
}

// Alle teksten van Volgen op het web, gelijk aan de app.
export const TEKST = {
  volg: 'Volg',
  volgNaam: (label) => `Volg ${label}`,
  volgend: 'Volgend',
  jeVolgt: 'Je volgt',
  jeVolgtNaam: (label) => `Je volgt ${label}.`,
  nietMeer: (label) => `Je volgt ${label} niet meer.`,
  ongedaan: 'Ongedaan maken',
  naar: (label) => `Naar ${label}`,
  stop: 'Stop met volgen',
  stuurBij: 'Stuur bij',
  deel: 'Deel',
  wijzig: 'Wijzig',
  klaar: 'Klaar',
  beheer: 'Beheer',
  alDrie: 'Je volgt er al drie.',
  erSpeeldeAl: 'Er speelde al',
  bedoelJe: 'Bedoel je…',
  heleRubriek: (rubriek) => `${rubriek} is een hele rubriek.`,
  naarRubriek: (rubriek) => `Naar ${rubriek} in de Stroom`,
  geen: 'Hier valt geen nieuws te volgen.',
  weinig: 'Weinig in je bronnen',
  tip: (naam) => `${naam} schrijft hier vaak over, gratis.`,
  voegToe: 'Voeg toe',
  nieuw: 'Nieuw',
  nietsNieuws: 'Niets nieuws',
  eerder: 'Eerder',
  bij: 'Je bent bij.',
  nietsNieuwsBij: 'Niets nieuws. Je bent bij.',
  stil: 'Drie weken stil. Gestopt met volgen.',
  volgWeer: 'Volg weer',
  blijfVolgen: 'Blijf volgen',
  gestopt: 'Gestopt',
  inloggen: 'Volgen kan met een account.',
  letOp: 'Let op',
  niet: 'Niet',
  scherper: 'Zeg het scherper',
  bronnen: (n) => (n > 1 ? `+${n - 1} ${n - 1 === 1 ? 'bron' : 'bronnen'}` : ''),
  label: (label) => `Je volgt ${label}, opent de pagina`,
  mislukt: 'Dat lukte nu niet.',
}

// POST /api/volgzaak. `token`: het token van je account (volgen, ontvolgen, duiden en bijsturen vragen een lid).
// Uitkomst: { status, data } (status 0: geen verbinding). Nooit een slug in het adres.
export async function vraagVolgzaak(actie, body = {}, { token = null, fetchImpl = (...a) => fetch(...a), timeout = 20000 } = {}) {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null
  const timer = ctl ? setTimeout(() => ctl.abort(), timeout) : null
  try {
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    const res = await fetchImpl('/api/volgzaak', { method: 'POST', headers, body: JSON.stringify({ ...body, actie }), ...(ctl ? { signal: ctl.signal } : {}) })
    const data = await res.json().catch(() => null)
    return { status: res.status, data }
  } catch {
    return { status: 0, data: null }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

// De link die Deel maakt: de pagina in Hoot (opent ook zonder account).
export const deelLink = (slug, basis = typeof location !== 'undefined' ? location.origin + location.pathname : 'https://gethoot.app/lees/') => `${basis}#/volg?naam=${encodeURIComponent(slug)}`

// Een gratis Nederlandse (of in jouw taal) bron die er vaak over schrijft en die je nog niet volgt, voor "Weinig in je
// bronnen". `treffers`: per bron het aantal treffers (antwoord van duiden). Nooit een betaalmuur, nooit een taal die je niet
// koos. Null als er niets te tippen is.
export function gratisTip(treffers = {}, sources = [], eigen = new Set()) {
  const talen = new Set(sources.filter((s) => eigen.has(s.id)).map((s) => s.lang || 'nl'))
  if (!talen.size) talen.add('nl')
  const kandidaten = Object.entries(treffers || {})
    .map(([id, n]) => ({ s: sources.find((x) => x.id === id), n }))
    .filter(({ s }) => s && !eigen.has(s.id) && !s.paid && talen.has(s.lang || 'nl') && s.kind !== 'sociaal')
    .sort((a, b) => b.n - a.n || (a.s.id < b.s.id ? -1 : 1))
  return kandidaten[0]?.s || null
}

// Weinig in je bronnen: hooguit één treffer in je eigen bronnen.
export const weinigInEigen = (treffers = {}, eigen = new Set()) => Object.entries(treffers || {}).filter(([id]) => eigen.has(id)).reduce((n, [, k]) => n + (Number(k) || 0), 0) <= 1
