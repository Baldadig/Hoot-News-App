// Luister verder op afleveringsniveau (melding Alex, 15 november, build 58: "Als ik klik op de podcast open ik wel de app
// maar niet specifiek die ene podcast"). Bij elke koppeling zoekt de server één keer het id van de aflevering op:
//
// - Apple Podcasts: de openbare iTunes Lookup API (geen sleutel), per show de nieuwste afleveringen. Koppelen op de guid
//   uit de RSS (episodeGuid), anders op titel + datum (genormaliseerd, en alleen als er precies één past).
// - Spotify: de openbare showpagina open.spotify.com/show/<id> (geen login, geen botcheck, robots.txt staat /show/ toe;
//   /embed/ niet, dus die niet). De pagina noemt de nieuwste afleveringen met id, titel en datum. Koppelen op titel +
//   datum, alleen als er precies één past.
//
// Elke aflevering wordt één keer opgezocht (KV, IDS_KEY). Een misser mag na RETRY_MS nog een keer (Apple neemt een nieuwe
// aflevering soms pas later op). Alles samen wacht hooguit IDS_MS; wat niet op tijd is, houdt de link naar de show en
// probeert de volgende ronde het opnieuw. De enclosure (audio) wordt hier, zoals overal in Luister verder, niet gebruikt.
import { UA } from './sources.mjs'

export const IDS_KEY = 'luister-ids-v1'
export const IDS_MS = 1800 // alle opzoekingen van een ronde samen, tegelijk
export const IDS_KV_MS = 1000
export const RETRY_MS = 30 * 6e4
export const IDS_KEEP = 4 * 24 * 36e5
export const APPLE_PER_SHOW = 25
const DAG = 24 * 36e5
export const DATUM_MARGE = 2 * DAG // titel + datum: hooguit zo ver uit elkaar (tijdzones, publicatie bij Apple of Spotify later)

// ---------- Normaliseren ----------
// Kleine letters, zonder accenten, aanhalingstekens of leestekens; "| The Latest" en "- The Latest" (Today in Focus bij
// Apple) en een volgnummer vooraan ("12. ", "#583 - ") tellen niet.
export function normTitel(t) {
  return String(t || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[|–—-]\s*the latest\s*$/i, '')
    .replace(/^\s*(#?\d{1,4}\s*[.:-]\s+|#\d{1,4}\s+)/, '')
    .replace(/&amp;/g, '&')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}
// Gelijk, of de ene titel is de andere met een staartje (minstens twintig tekens en driekwart van de langste).
export function zelfdeTitel(a, b) {
  const x = normTitel(a)
  const y = normTitel(b)
  if (!x || !y) return false
  if (x === y) return true
  const [kort, lang] = x.length <= y.length ? [x, y] : [y, x]
  return kort.length >= 20 && kort.length >= 0.75 * lang.length && (lang.startsWith(kort + ' ') || lang.endsWith(' ' + kort))
}

// Precies één kandidaat met dezelfde titel binnen de datummarge; anders niets (bij twijfel geen id).
function eenOpTitel(ep, lijst) {
  const passend = lijst.filter((r) => zelfdeTitel(ep.titel, r.titel) && (!Number.isFinite(r.t) || Math.abs(r.t - ep.t) <= DATUM_MARGE))
  return passend.length === 1 ? passend[0] : null
}

// ---------- Apple Podcasts ----------
export const appleEpisodeUrl = (show, trackId) => `https://podcasts.apple.com/nl/podcast/id${show}?i=${trackId}`
export const appleIdUit = (u) => {
  const m = /[?&]i=(\d{6,})/.exec(String(u || ''))
  return m ? m[1] : null
}
export function leesApple(data) {
  return (data?.results || [])
    .filter((r) => r?.wrapperType === 'podcastEpisode' && r.trackId)
    .map((r) => ({ id: String(r.trackId), guid: r.episodeGuid ? String(r.episodeGuid).slice(0, 200) : null, titel: r.trackName || '', t: Date.parse(r.releaseDate || '') }))
}
export function matchApple(ep, lijst) {
  if (ep.guid) {
    const g = lijst.find((r) => r.guid && r.guid === ep.guid)
    if (g) return g.id
  }
  return eenOpTitel(ep, lijst)?.id || null
}
export async function appleAfleveringen(showId, { signal, fetcher = fetch } = {}) {
  const res = await fetcher(`https://itunes.apple.com/lookup?id=${encodeURIComponent(showId)}&entity=podcastEpisode&limit=${APPLE_PER_SHOW}&country=nl`, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return leesApple(await res.json())
}

// ---------- Spotify ----------
export const spotifyEpisodeUrl = (id) => `https://open.spotify.com/episode/${id}`
const MAANDEN = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
const ontsnap = (s) => String(s || '').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
// "Today", "Yesterday", "Nov 13" (dit jaar, of vorig jaar als dat anders in de toekomst ligt) of "Nov 13, 2025".
export function spotifyDatum(tekst, now = Date.now()) {
  if (/^today$/i.test(String(tekst || '').trim())) return now
  if (/^yesterday$/i.test(String(tekst || '').trim())) return now - DAG
  const m =/^([A-Z][a-z]{2}) (\d{1,2})(?:, (\d{4}))?$/.exec(String(tekst || '').trim())
  if (!m || !(m[1].toLowerCase() in MAANDEN)) return NaN
  const jaar = m[3] ? +m[3] : new Date(now).getUTCFullYear()
  let t = Date.UTC(jaar, MAANDEN[m[1].toLowerCase()], +m[2], 12)
  if (!m[3] && t > now + 2 * DAG) t = Date.UTC(jaar - 1, MAANDEN[m[1].toLowerCase()], +m[2], 12)
  return t
}
// De afleveringen op de openbare showpagina: <a href="/episode/<id>"><h4 … data-testid="episodeTitle">titel</h4>, met
// verderop in hetzelfde blok de datum ("Nov 13").
export function leesSpotify(html, now = Date.now()) {
  const out = []
  const re = /<a href="\/episode\/([A-Za-z0-9]{22})"><h4[^>]*data-testid="episodeTitle"[^>]*>([\s\S]*?)<\/h4>/g
  const ankers = [...String(html || '').matchAll(re)]
  ankers.forEach((m, i) => {
    const blok = String(html).slice(m.index + m[0].length, ankers[i + 1]?.index ?? m.index + 8000)
    const teksten = blok.replace(/<[^>]+>/g, '\n').split('\n').map((s) => s.trim()).filter(Boolean)
    const datum = teksten.map((s) => spotifyDatum(s, now)).find(Number.isFinite)
    out.push({ id: m[1], titel: ontsnap(m[2].replace(/<[^>]+>/g, '')).trim(), t: datum ?? NaN })
  })
  return out
}
export const matchSpotify = (ep, lijst) => eenOpTitel(ep, lijst)?.id || null
export async function spotifyAfleveringen(showId, { signal, fetcher = fetch, now = Date.now() } = {}) {
  const res = await fetcher(`https://open.spotify.com/show/${encodeURIComponent(showId)}`, { headers: { 'User-Agent': UA, Accept: 'text/html' }, signal })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  return leesSpotify(await res.text(), now)
}

// ---------- De opslag en het opzoeken ----------
// `eps`: [{ id, show, titel, t, guid, apple (show-id), spotify (show-id), appleUrl }]. Geeft Map(epId → { apple, spotify })
// met de ids die bekend zijn (uit de opslag of net opgezocht). `get`/`update`: KV. `fetcher`: alleen in toetsen anders.
export async function zoekIds(eps, { get = null, update = null, now = Date.now(), ms = IDS_MS, kvMs = IDS_KV_MS, fetcher = fetch } = {}) {
  const binnen = (p, wacht) => {
    let t
    return Promise.race([Promise.resolve().then(() => p()), new Promise((_, no) => (t = setTimeout(() => no(new Error('over de wachttijd')), wacht)))]).finally(() => clearTimeout(t))
  }
  const doc = await binnen(() => get?.(IDS_KEY), kvMs).catch(() => null)
  const bekend = doc && typeof doc === 'object' && doc.e && typeof doc.e === 'object' ? doc.e : {}
  const uit = new Map()
  const nieuw = {}
  const nodig = { apple: new Map(), spotify: new Map() }
  for (const ep of eps) {
    const oud = bekend[ep.id] || {}
    const rij = { a: oud.a ?? appleIdUit(ep.appleUrl) ?? null, s: oud.s ?? null, ta: oud.ta || 0, ts: oud.ts || 0, et: ep.t }
    if (ep.apple && !rij.a && now - rij.ta >= RETRY_MS) (nodig.apple.get(ep.apple) || nodig.apple.set(ep.apple, []).get(ep.apple)).push(ep)
    if (ep.spotify && !rij.s && now - rij.ts >= RETRY_MS) (nodig.spotify.get(ep.spotify) || nodig.spotify.set(ep.spotify, []).get(ep.spotify)).push(ep)
    nieuw[ep.id] = rij
  }
  const signal = AbortSignal.timeout(ms)
  const vraag = (soort, haal, match) =>
    [...nodig[soort]].map(([show, lijst]) =>
      binnen(() => haal(show, { signal, fetcher, now }), ms)
        .then((r) => {
          for (const ep of lijst) {
            const id = match(ep, r)
            if (soort === 'apple') Object.assign(nieuw[ep.id], { a: id, ta: now })
            else Object.assign(nieuw[ep.id], { s: id, ts: now })
          }
        })
        .catch(() => {}), // niet gelukt: de volgende ronde opnieuw (geen tijdstip, dus geen wachttijd)
    )
  await Promise.all([...vraag('apple', appleAfleveringen, matchApple), ...vraag('spotify', spotifyAfleveringen, matchSpotify)])
  for (const ep of eps) {
    const r = nieuw[ep.id]
    uit.set(ep.id, { ...(r.a ? { apple: r.a } : {}), ...(r.s ? { spotify: r.s } : {}) })
  }
  const veranderd = eps.some((ep) => JSON.stringify(nieuw[ep.id]) !== JSON.stringify(bekend[ep.id] || null))
  if (update && veranderd) {
    await binnen(
      () =>
        update(IDS_KEY, (cur) => {
          const e = { ...(cur?.e && typeof cur.e === 'object' ? cur.e : {}), ...nieuw }
          for (const [id, v] of Object.entries(e)) if (!(now - (v?.et || 0) <= IDS_KEEP)) delete e[id]
          return { e }
        }),
      kvMs,
    ).catch(() => {})
  }
  return uit
}
