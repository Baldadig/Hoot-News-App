// Luister verder, stap 3 (besluit Alex 14 november 2026): wat de lezer ziet van het veld `luister` op een verhaal
// (netlify/lib/luister.mjs). Gelijk aan ios/Hoot/Luister.swift; de toetsen houden beide vast
// (tests/luister-weergave.test.mjs, HootTests/LuisterTests.swift).
//
// - Welke aflevering: de eerste uit `luister` en `andere` die bij de lezer past. Een show die niet Nederlandstalig is
//   (`alleenVolgers`) alleen voor wie die bron volgt.
// - De tweede regel: "{show} · {dag} · {duur}". De dag is vandaag, gisteren of de naam van de dag; nooit een kloktijd.
// - De keuze van de podcastapp blijft op het toestel (`hoot.podcastApp`): Apple Podcasts, Spotify, Altijd vragen of
//   Niet tonen. Leeg: nog niet gekozen, de eerste tik vraagt het.

export const APPS = [
  { id: 'apple', naam: 'Apple Podcasts' },
  { id: 'spotify', naam: 'Spotify' },
]
export const KEUZES = [...APPS, { id: 'vragen', naam: 'Altijd vragen' }, { id: 'uit', naam: 'Niet tonen' }]
export const VRAAG = { titel: 'Waar luister je podcasts?', tekst: 'Hoot onthoudt je keuze.' }
export const PREF_KEY = 'hoot.podcastApp'
export const MAX_VERGELIJKEN = 3

export const appNaam = (id) => APPS.find((a) => a.id === id)?.naam || null
export const keuzeNaam = (id) => KEUZES.find((k) => k.id === id)?.naam || ''
export const geldigeKeuze = (id) => (KEUZES.some((k) => k.id === id) ? id : '')

const goed = (a) => !!a && typeof a === 'object' && typeof a.show === 'string' && a.show.trim() && typeof a.aflevering === 'string' && /^https?:\/\//i.test(String(a.link || ''))

// De afleveringen bij een verhaal die bij deze lezer passen, in de volgorde van de server (de beste eerst).
// `volgt(bron)`: of de lezer die bron volgt.
export function afleveringen(luister, volgt = () => false) {
  if (!goed(luister)) return []
  const { andere, ...eerste } = luister
  const seen = new Set()
  return [eerste, ...(Array.isArray(andere) ? andere : [])].filter((a) => {
    if (!goed(a) || (a.alleenVolgers && !volgt(a.bron))) return false
    const k = a.showId || a.show
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

const DAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
// De kalenderdag in Nederland als getal (dagen sinds 1970), voor een tijd in ms.
function dagNummer(t) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(t)).map((x) => [x.type, x.value]))
  return Math.round(Date.UTC(+p.year, +p.month - 1, +p.day) / 864e5)
}
// "vandaag", "gisteren" of de naam van de dag (binnen een week); daarna niets. Nooit een kloktijd.
export function dagVan(a, now = Date.now()) {
  const t = Date.parse(a?.tijd || '') || Date.parse((a?.verschenen || '') + 'T12:00:00Z')
  if (!Number.isFinite(t)) return null
  const d = dagNummer(now) - dagNummer(t)
  if (d <= 0) return 'vandaag'
  if (d === 1) return 'gisteren'
  if (d < 7) return DAGEN[new Date((dagNummer(t) + 0.5) * 864e5).getUTCDay()]
  return null
}
export const duurVan = (sec) => (Number(sec) > 0 ? `${Math.max(1, Math.round(Number(sec) / 60))} min` : null)
export const regelVan = (a, now = Date.now()) => [a.show, dagVan(a, now), duurVan(a.duur)].filter(Boolean).join(' · ')
export const duurVoluit = (sec) => (Number(sec) > 0 ? `${Math.max(1, Math.round(Number(sec) / 60))} minuten` : null)
// De titel van de aflevering zonder de naam van de show ervoor ("De Dag: X" wordt "X"); null als er niets overblijft.
export function afleveringVan(a) {
  let t = String(a?.aflevering || '').trim()
  const show = String(a?.show || '').trim()
  if (show && t.toLowerCase().startsWith(show.toLowerCase())) {
    const rest = t.slice(show.length)
    if (!rest) t = ''
    else if (/^[\s:\-–|·]/.test(rest)) t = rest.replace(/^[\s:\-–|·]+/, '').trim()
  }
  return t || null
}
// Welke podcast (melding Alex 15 november, build 59: "nergens de titel van de podcast"): "{show} · {aflevering}".
// De tweede regel in het menu en in de vraag.
export const wieVan = (a) => [a.show, afleveringVan(a)].filter(Boolean).join(' · ')
// VoiceOver en schermlezer: "Luister verder: De Dag, De VVD in crisis, gisteren, 29 minuten. Opent in Spotify."
export function labelVan(a, app, now = Date.now()) {
  const naam = appNaam(app)
  return `Luister verder: ${[a.show, afleveringVan(a), dagVan(a, now), duurVoluit(a.duur)].filter(Boolean).join(', ')}.${naam ? ` Opent in ${naam}.` : ''}`
}

// Welke link een keuze opent. Apple Podcasts: de aflevering (of de show); Spotify: de show; anders, of als er geen
// link is: de pagina van de aflevering bij de uitgever.
export function linkVoor(a, app) {
  if (app === 'apple' && a.apple) return a.apple
  if (app === 'spotify' && a.spotify) return a.spotify
  return a.link
}

// Wat een tik doet, gegeven de keuze en de apps die er zijn (`apps`; het web kan dat niet zien en geeft alle apps):
// { open: app|null } (openen, met app null = de pagina van de uitgever), of { vraag: [apps] } (het actieblad), of
// { niets: true } (Niet tonen). `onthoud`: een app die Hoot zonder vragen als keuze vastlegt (er is er maar één).
export function bijTik(keuze, apps = APPS.map((x) => x.id)) {
  if (keuze === 'uit') return { niets: true }
  if (keuze === 'apple' || keuze === 'spotify') return { open: keuze }
  if (keuze === 'vragen') return apps.length ? { vraag: apps } : { open: null }
  if (!apps.length) return { open: null }
  if (apps.length === 1) return { open: apps[0], onthoud: apps[0] }
  return { vraag: apps }
}
