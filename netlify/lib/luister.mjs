// Luister verder, stap 2 (besluit Alex 14 november 2026): stil koppelen. Nog niets zichtbaar voor lezers.
// Zie Hoot-design/podcast-concept-2026-11-14 (CONCEPT, KRITIEK, BRONNEN, TECHNIEK) en PROEF-1.md.
//
// Harde eis van Alex: "Het onderwerp moet echt matchen. Of hetzelfde, of verdiepend. Liefst van dezelfde bron."
// Daarom streng, en bij twijfel niets:
//   - alleen een vaste lijst officiële nieuwspodcasts van bronnen die al in Hoot staan (SHOWS), met per show een soort;
//   - een overzichtsshow (vijf onderwerpen per aflevering) koppelt nooit en wordt niet eens opgehaald;
//   - een show met twee of drie onderwerpen per aflevering (`meer`) en een weekshow (`week`) alleen via een artikellink;
//   - zonder artikellink (alleen `verdieping`, één onderwerp per aflevering) via de centrale namen van het verhaal;
//   - past een aflevering bij twee verhalen, dan krijgt geen van beide haar; een verhaal krijgt er hooguit één.
// De koppeling staat als veld `luister` op het verhaal (build.mjs). Web en app tonen het nog niet.
//
// Wat Hoot van een aflevering bewaart: show, titel, de eerste zinnen van de beschrijving (alleen om te koppelen, nooit
// getoond of doorgegeven), tijd, guid, duur, de artikellinks uit de shownotes en de pagina van de aflevering bij de
// uitgever. Nooit de audio: de enclosure wordt niet gelezen, niet bewaard en nooit opgehaald.
import Parser from 'rss-parser'
import { UA } from './sources.mjs'
import { toText } from './text.mjs'
import { signatures, sameEvent, clusterNames, sigWords, BROAD } from './stories.mjs'
import { publisherOf } from '../../shared/edition-policy.mjs'
import { isAflevering } from '../../shared/aflevering.mjs'
import { opinieBron } from '../../shared/opinie.mjs'
import { hash, safeHttpUrl } from '../../shared/util.mjs'

const H = 36e5

// ---------- De showlijst ----------
// `soort`: 'verdieping' (één onderwerp per aflevering: mag op tekst koppelen), 'meer' (twee of drie onderwerpen: alleen
// via een artikellink), 'week' (een weekshow: alleen via een artikellink, KRITIEK § 4.2), 'overzicht' (een bulletin met
// vijf of meer onderwerpen: koppelt nooit, wordt niet opgehaald). `bron`: de Hoot-bron van de uitgever. `apple`: het id van
// de show in Apple Podcasts (BRONNEN.md, gemeten 14 november). `pad`: alleen afleveringen waarvan de pagina dit bevat (een
// feed met meer shows van de uitgever). `web`: de pagina van de show, als de aflevering geen eigen pagina heeft.
// `opinie`: een opiniepodcast (nooit in de Editie); er staat er nu geen in de lijst.
// Niet in de lijst: Bureau Buitenland en Dit is de Dag (NPO Radio 1; geen bron in Hoot), bulletins van minuten (NU.nl
// nieuws, Bloomberg News Now) en shows zonder nieuwe afleveringen.
export const SHOWS = [
  { id: 'nos-de-dag', naam: 'De Dag', uitgever: 'NOS', bron: 'nos', taal: 'nl', soort: 'verdieping', apple: '1339219119', feed: 'https://podcast.npo.nl/feed/de-dag.xml', web: 'https://www.nporadio1.nl/podcasts/de-dag' },
  { id: 'vk-elke-dag', naam: 'de Volkskrant Elke Dag', uitgever: 'de Volkskrant', bron: 'volkskrant', taal: 'nl', soort: 'verdieping', apple: '1551138207', feed: 'https://www.omnycontent.com/d/playlist/33dbd2dc-d464-471d-9feb-abae00330078/052ccb8e-7484-4095-bdba-acbc00f34a07/e1c18ea7-7349-4f07-a1e3-acbc00f36fe5/podcast.rss', web: 'https://omny.fm/shows/de-volkskrant-elke-dag' },
  { id: 'nrc-vandaag', naam: 'NRC Vandaag', uitgever: 'NRC', bron: 'nrc', taal: 'nl', soort: 'verdieping', apple: '1460234936', feed: 'https://rss.art19.com/vandaag', web: 'https://www.nrc.nl/podcast/vandaag/' },
  { id: 'fd-dagkoers', naam: 'FD Dagkoers', uitgever: 'Het Financieele Dagblad', bron: 'fd', taal: 'nl', soort: 'meer', apple: '1599086196', feed: 'https://www.omnycontent.com/d/playlist/8257a063-6be9-42fa-b892-acd4013b1255/7c7183f7-003f-4fcf-a5e3-addc00ff4d48/610741e8-1c7a-4f89-ae3e-addc00ffe9ca/podcast.rss', pad: '/shows/fd-dagkoers/', web: 'https://omny.fm/shows/fd-dagkoers' },
  { id: 'nrc-haagse-zaken', naam: 'NRC Haagse Zaken', uitgever: 'NRC', bron: 'nrc', taal: 'nl', soort: 'week', apple: '1205520865', feed: 'https://rss.art19.com/haagse-zaken', web: 'https://www.nrc.nl/podcast/haagse-zaken/' },
  { id: 'nrc-wereldzaken', naam: 'NRC Wereldzaken', uitgever: 'NRC', bron: 'nrc', taal: 'nl', soort: 'week', apple: '1855801328', feed: 'https://rss.art19.com/wereldzaken', web: 'https://www.nrc.nl/podcast/wereldzaken/' },
  { id: 'trouw-haags-halfuurtje', naam: 'Haags Halfuurtje', uitgever: 'Trouw', bron: 'trouw', taal: 'nl', soort: 'week', apple: '1641261322', feed: 'https://www.omnycontent.com/d/playlist/33dbd2dc-d464-471d-9feb-abae00330078/105c7409-0bc5-4540-bea8-aee80081ed6f/d82d8b6f-7dba-4a6a-9250-aee80082294d/podcast.rss', web: 'https://omny.fm/shows/haags-halfuurtje' },
  { id: 'vi-zsm', naam: 'VI ZSM', uitgever: 'Voetbal International', bron: 'vi', taal: 'nl', soort: 'verdieping', apple: '1637601065', feed: 'https://www.omnycontent.com/d/playlist/61ee9ca4-a1b2-4660-9651-b2b70035edf5/02361425-2482-4413-a7a0-b2ea0089dc4d/648a598c-51c2-4be0-a321-b2ea0089dc5a/podcast.rss', web: 'https://omny.fm/shows/vizsm' },
  { id: 'the-daily', naam: 'The Daily', uitgever: 'The New York Times', bron: 'nyt', taal: 'en', soort: 'verdieping', apple: '1200361736', feed: 'https://feeds.simplecast.com/Sl5CSM3S', web: 'https://www.nytimes.com/column/the-daily' },
  { id: 'today-in-focus', naam: 'Today in Focus', uitgever: 'The Guardian', bron: 'guardian', taal: 'en', soort: 'verdieping', apple: '1440133626', feed: 'https://www.theguardian.com/news/series/todayinfocus/podcast.xml', web: 'https://www.theguardian.com/news/series/todayinfocus' },
  { id: 'the-intelligence', naam: 'The Intelligence', uitgever: 'The Economist', bron: 'economist', taal: 'en', soort: 'meer', apple: '1449631195', feed: 'https://access.acast.com/rss/d556eb54-6160-4c85-95f4-47d9f5216c49', web: 'https://shows.acast.com/theintelligencepodcast' },
  { id: 'vergecast', naam: 'The Vergecast', uitgever: 'The Verge', bron: 'theverge', taal: 'en', soort: 'meer', apple: '430333725', feed: 'https://feeds.megaphone.fm/vergecast', web: 'https://www.theverge.com/the-vergecast' },
  // Overzicht: koppelt nooit (één aflevering over vijf of meer onderwerpen hoort bij geen enkel verhaal echt).
  { id: 'nos-oog-op-morgen', naam: 'Met het Oog op Morgen', uitgever: 'NOS', bron: 'nos', taal: 'nl', soort: 'overzicht', apple: '204558483' },
  { id: 'vrt-kwartier', naam: 'VRT NWS Kwartier', uitgever: 'VRT NWS', bron: 'vrt', taal: 'nl', soort: 'overzicht', apple: '1641885397' },
  { id: 'sporza-daily', naam: 'Sporza Daily', uitgever: 'Sporza', bron: 'sporza', taal: 'nl', soort: 'overzicht', apple: '1706319922' },
  { id: 'tijd-de-7', naam: 'De 7', uitgever: 'De Tijd', bron: 'tijd', taal: 'nl', soort: 'overzicht', apple: '1605778515' },
  { id: 'bbc-global-news', naam: 'Global News Podcast', uitgever: 'BBC', bron: 'bbc', taal: 'en', soort: 'overzicht', apple: '135067274' },
  { id: 'ft-news-briefing', naam: 'FT News Briefing', uitgever: 'Financial Times', bron: 'ft', taal: 'en', soort: 'overzicht', apple: '1438449989' },
  { id: 'npr-up-first', naam: 'Up First', uitgever: 'NPR', bron: 'npr', taal: 'en', soort: 'overzicht', apple: '1222114325' },
]
export const SHOW = new Map(SHOWS.map((s) => [s.id, s]))
export const FETCHED = SHOWS.filter((s) => s.soort !== 'overzicht' && s.feed)

// ---------- Ophalen ----------
export const KEEP = 3 * 24 * H // drie dagen bewaren
export const EVERY = 30 * 6e4 // een feed hooguit eens per half uur ophalen (de ronde is elke tien minuten)
export const LUISTER_MS = 8000 // de feeds wachten hooguit zo lang vanaf de start van de ronde (de bronnen: FETCH_MS, 10 s)
export const MAX_BYTES = 400000 // alleen het begin van de feed: de nieuwste afleveringen staan bovenaan
export const STORE_KEY = 'luister-afleveringen-v1'
export const PROEF_KEY = 'luister-proef-v1'
const SUMMARY = 420 // tekens van de beschrijving om op te koppelen (nooit getoond)

const parser = new Parser({ timeout: 8000 })

// Alleen het begin van de feed lezen (sommige feeds zijn 12 MB), afgekapt na de laatste hele aflevering.
export async function readHead(url, { signal, maxBytes = MAX_BYTES, fetcher = fetch } = {}) {
  const res = await fetcher(url, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml; q=0.9, */*; q=0.8' }, signal })
  if (!res.ok) throw new Error('HTTP ' + res.status)
  let text = ''
  if (res.body?.getReader) {
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let size = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      text += dec.decode(value, { stream: true })
      if (size >= maxBytes) {
        await reader.cancel().catch(() => {})
        break
      }
    }
  } else text = await res.text()
  text = text.replace(/^[\s﻿]+/, '')
  if (!/<\/rss>\s*$/i.test(text)) {
    const cut = text.lastIndexOf('</item>')
    if (cut < 0) throw new Error('geen aflevering in het begin van de feed')
    text = text.slice(0, cut + 7) + '</channel></rss>'
  }
  return parser.parseString(text)
}

// Een url als sleutel: host zonder www, pad zonder slash op het eind, zonder query en anker.
export function urlKey(u) {
  const m = /^https?:\/\/(?:www\.)?([^/?#]+)([^?#]*)/i.exec(String(u || '').trim())
  return m ? (m[1].toLowerCase() + m[2].replace(/\/+$/, '')).replace(/&amp;$/, '') : ''
}
const AUDIO_FILE = /\.(mp3|m4a|aac|ogg|wav)(\?|$)/i
const seconds = (d) => {
  const s = String(d ?? '').trim()
  if (/^\d+$/.test(s)) return +s
  const p = s.split(':').map(Number)
  return p.length > 1 && p.every((x) => Number.isFinite(x)) ? p.reduce((a, x) => a * 60 + x, 0) : null
}
// "12. Val in slowmotion…" en "… | In Het Nieuws": het nummer en het rubriekslabel van de show horen niet bij de titel.
export const cleanTitle = (t) => String(t || '').replace(/^\s*\d{1,3}\.\s+/, '').replace(/\s*\|\s*(in het nieuws|the latest)\s*$/i, '').replace(/\s+[-–]\s+the latest\s*$/i, '').trim()

// Een aflevering uit een feed-item, of null.
export function episodeOf(show, it, channelLink = null) {
  const title = cleanTitle(it.title)
  const t = Date.parse(it.isoDate || it.pubDate || '')
  if (!title || !Number.isFinite(t)) return null
  const html = it['content:encoded'] || it.content || it.description || ''
  const link = safeHttpUrl(it.link || '') && !AUDIO_FILE.test(it.link) ? it.link : null
  if (show.pad && !(link || '').includes(show.pad)) return null
  const text = toText(html).replace(/\s+/g, ' ').trim()
  const own = new Set([hostOf(show.web), hostOf(show.feed)].filter(Boolean))
  const links = [...new Set([...String(html).matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1].replace(/&amp;/g, '&')).filter((u) => /^https?:\/\//i.test(u) && !own.has(hostOf(u))).map(urlKey).filter(Boolean))].slice(0, 12)
  return {
    id: 'e' + hash(show.id + '|' + (it.guid || it.link || title)),
    show: show.id,
    titel: title,
    samenvatting: firstSentences(text, SUMMARY),
    t,
    guid: String(it.guid || '').slice(0, 200) || null,
    duur: seconds(it.itunes?.duration),
    links,
    pagina: link || safeHttpUrl(channelLink || '') || show.web || null,
  }
}
const hostOf = (u) => (/^https?:\/\/(?:www\.)?([^/?#]+)/i.exec(String(u || ''))?.[1] || '').toLowerCase()
function firstSentences(text, max) {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '))
  return end > 80 ? cut.slice(0, end + 1) : cut
}

// De afleveringen van de afgelopen drie dagen: wat in KV staat, aangevuld met de feeds die aan de beurt zijn (hooguit
// eens per EVERY). Binnen de tijd van de ronde: na `deadline` wacht dit nergens meer op. Geeft { episodes, status }.
export async function loadEpisodes({ now = Date.now(), deadline = now + 8000, get, set, read = readHead, shows = FETCHED } = {}) {
  const stored = await Promise.resolve().then(() => get?.(STORE_KEY)).catch(() => null)
  const store = stored && typeof stored === 'object' && stored.shows ? stored : { shows: {} }
  const due = shows.filter((s) => !(now - (store.shows[s.id]?.at || 0) < EVERY))
  const status = {}
  const signal = AbortSignal.timeout(Math.max(1, deadline - Date.now()))
  await Promise.all(
    due.map(async (s) => {
      try {
        const feed = await read(s.feed, { signal })
        const eps = (feed.items || []).map((it) => episodeOf(s, it, feed.link)).filter((e) => e && now - e.t <= KEEP && e.t <= now + H)
        const old = store.shows[s.id]?.items || []
        const byId = new Map([...old, ...eps].map((e) => [e.id, e]))
        store.shows[s.id] = { at: now, items: [...byId.values()].filter((e) => now - e.t <= KEEP).sort((a, b) => b.t - a.t).slice(0, 40) }
        status[s.id] = 'opgehaald'
      } catch (e) {
        status[s.id] = 'mislukt: ' + String(e?.message || e).slice(0, 80)
      }
    }),
  )
  for (const s of shows) if (!status[s.id]) status[s.id] = 'uit de opslag'
  for (const [id, v] of Object.entries(store.shows)) store.shows[id] = { ...v, items: (v.items || []).filter((e) => now - e.t <= KEEP) }
  if (due.length) await Promise.resolve().then(() => set?.(STORE_KEY, store)).catch(() => {})
  return { episodes: Object.values(store.shows).flatMap((v) => v.items || []).filter((e) => SHOW.has(e.show)), status }
}

// ---------- Koppelen ----------
export const FRESH_H = 36 // hetzelfde: hooguit 36 uur oud bij tonen
export const BEFORE_H = 12 // hetzelfde: niet meer dan 12 uur vóór het eerste stuk van het verhaal
export const DEEP_H = 72 // verdiepend: hooguit drie dagen oud
const counted = (i) => i && !isAflevering(i) && !opinieBron(i.source)

// Welke namen horen bij elkaar ("Jensen" en "Huang" zijn één persoon)? Twee namen zijn één als ze in de koppen van het
// verhaal en de titel van de aflevering meestal direct naast elkaar staan (in minstens 60% van de koppen met de minst
// voorkomende van de twee). "Nvidia's Jensen Huang" maakt Nvidia en Huang dus niet tot één naam: Nvidia staat ook vaak
// alleen. Geeft een functie naam → groep.
function grouper(runs) {
  const count = new Map()
  const pair = new Map()
  for (const run of runs) {
    for (const k of new Set(run)) count.set(k, (count.get(k) || 0) + 1)
    for (let i = 1; i < run.length; i++) {
      const key = [run[i - 1], run[i]].sort().join('\u0000')
      pair.set(key, (pair.get(key) || 0) + 1)
    }
  }
  const parent = new Map()
  const find = (k) => {
    if (!parent.has(k)) parent.set(k, k)
    while (parent.get(k) !== k) k = parent.get(k)
    return k
  }
  for (const [key, n] of pair) {
    const [a, b] = key.split('\u0000')
    if (n >= 0.6 * Math.min(count.get(a), count.get(b))) parent.set(find(b), find(a))
  }
  return find
}

// Het oordeel over één aflevering bij één verhaal: { soort, grond, reden } of { af: reden }.
// `items`: de stukken van het verhaal die als bron tellen; `sig`: kenmerken (signatures, met de aflevering als extra).
// Per verhaal één keer (rekentijd): de eerste tijd, de links, de centrale namen en de reeksen in de koppen.
const prepMemo = new WeakMap()
function prepOf(items, sig) {
  let m = prepMemo.get(sig)
  if (!m) prepMemo.set(sig, (m = new WeakMap()))
  let p = m.get(items)
  if (!p) {
    p = {
      firstAt: Math.min(...items.map((i) => Date.parse(i.publishedAt) || Infinity)),
      urls: new Set(items.map((i) => urlKey(i.url)).filter(Boolean)),
      central: clusterNames(sig, items).map((n) => n.naam).filter((k) => !BROAD.has(k)),
      runs: items.flatMap((i) => sig.get(i.id)?.titleRuns || []),
    }
    m.set(items, p)
  }
  return p
}
export function judge(ep, show, story, items, sig, now) {
  const es = sig.get(ep.id)
  if (!es) return { af: 'geen kenmerk' }
  const age = (now - ep.t) / H
  const { firstAt, urls, central, runs } = prepOf(items, sig)
  const linked = ep.links.some((u) => urls.has(u))
  // Snel weg: geen link en geen enkele centrale naam gemeen (verreweg de meeste paren). Geen kandidaat.
  if (!linked && !central.some((k) => es.strong.has(k))) return { af: 'geen centrale naam van het verhaal' }
  const find = grouper([...runs, ...(es.titleRuns || [])])
  const titleKeys = new Set((es.titleRuns || []).flat())
  const groups = new Map() // groep → { titel: bool }
  for (const k of central) if (es.strong.has(k)) groups.set(find(k), (groups.get(find(k)) || false) || titleKeys.has(k))
  const shared = groups.size
  const inTitle = [...groups.values()].filter(Boolean).length
  // De gedeelde centrale namen per persoon of ding ("jensen huang", "nvidia"), voor de reden.
  const perGroup = new Map()
  for (const k of central) if (es.strong.has(k)) (perGroup.get(find(k)) || perGroup.set(find(k), []).get(find(k))).push(k)
  const names = [...perGroup.values()].map((ks) => ks.join(' '))
  // Een kandidaat (voor de proef): een artikellink, een centrale naam in de titel, of twee centrale namen.
  const kandidaat = linked || inTitle >= 1 || shared >= 2
  // Dezelfde gebeurtenis (sameEvent): met minstens twee stukken van het verhaal, of met het enige.
  const event = items.filter((i) => sig.get(i.id) && sameEvent(es, sig.get(i.id), true)).length >= Math.min(2, items.length)
  // Dezelfde handeling in de titel van de aflevering en in een kop van het verhaal (vonnis, opstappen, …), met een naam.
  const action = es.actions?.size === 1 && items.some((i) => [...(sig.get(i.id)?.actions || [])].includes([...es.actions][0]))
  const fresh = age <= FRESH_H && ep.t >= firstAt - BEFORE_H * H
  const deep = age <= DEEP_H
  if (age < -1) return { af: 'verschijnt later' }

  // 1. De uitgever linkt zelf naar een stuk in het verhaal. Toch een gedeelde naam in de titel van de aflevering
  //    (sterk of zwak, niet breed): een link "lees ook" naar een ander onderwerp (Trump na de midterms → de Senaatsrace in
  //    Mississippi) koppelt niet.
  if (linked) {
    const storyKeys = new Set(items.flatMap((i) => [...(sig.get(i.id)?.strong || []), ...(sig.get(i.id)?.weak || [])]))
    const ts = sig.get(ep.id + '#titel')
    const titleShared = [...new Set([...(ts?.strong || []), ...(ts?.weak || [])])].filter((k) => storyKeys.has(k) && !BROAD.has(k))
    if (!titleShared.length) return { af: 'artikellink, maar geen gedeelde naam in de titel', names, kandidaat }
    if (event && fresh) return { soort: 'hetzelfde', grond: 'link', reden: `de uitgever linkt naar een stuk in het verhaal; zelfde gebeurtenis (${titleShared.join(', ')})` }
    if (deep) return { soort: 'verdiepend', grond: 'link', reden: `de uitgever linkt naar een stuk in het verhaal (${titleShared.join(', ')})` }
    return { af: `artikellink, maar ${Math.round(age)} uur oud`, names, kandidaat }
  }
  if (show.soort !== 'verdieping') return { af: show.soort === 'week' ? 'weekshow zonder artikellink' : 'meer onderwerpen per aflevering, zonder artikellink', names, kandidaat }
  if (!shared) return { af: 'geen centrale naam van het verhaal', names, kandidaat }
  if (!inTitle) return { af: 'geen centrale naam in de titel van de aflevering', names, kandidaat }
  // 2. Hetzelfde: de centrale namen (twee, of één met dezelfde handeling) én dezelfde gebeurtenis.
  if (event && (shared >= 2 || action)) {
    if (fresh) return { soort: 'hetzelfde', grond: 'tekst', reden: `${shared >= 2 ? 'twee centrale namen' : 'centrale naam en dezelfde handeling'} (${names.join(', ')}) en dezelfde gebeurtenis` }
    if (deep && shared >= 2) return { soort: 'verdiepend', grond: 'tekst', reden: `twee centrale namen (${names.join(', ')}) en dezelfde kwestie, eerder verschenen` }
    return { af: `zelfde gebeurtenis, maar ${Math.round(age)} uur oud`, names, kandidaat }
  }
  // 3. Verdiepend: dezelfde hoofdnamen (twee, één in de titel) en dezelfde kwestie, als achtergrond. Nooit één gedeelde naam.
  if (shared < 2) return { af: `één centrale naam (${names.join(', ')}), geen gebeurtenis`, names, kandidaat }
  const issue = sameIssue(es, items, sig)
  if (!issue) return { af: `twee centrale namen (${names.join(', ')}), maar een andere kwestie`, names, kandidaat }
  if (!deep) return { af: `zelfde kwestie, maar ${Math.round(age)} uur oud`, names, kandidaat }
  return { soort: 'verdiepend', grond: 'tekst', reden: `twee centrale namen (${names.join(', ')}) en dezelfde kwestie (${issue})` }
}
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
// Dezelfde kwestie: een gebeurtenisbegrip dat in minstens een derde van de stukken staat, of twee kernwoorden uit de
// koppen van het verhaal (geen namen) in de titel en de eerste zinnen van de aflevering.
function sameIssue(es, items, sig) {
  const n = items.length
  const conceptCount = new Map()
  for (const i of items) for (const c of sig.get(i.id)?.concepts || []) conceptCount.set(c, (conceptCount.get(c) || 0) + 1)
  const concept = [...es.concepts].find((c) => (conceptCount.get(c) || 0) * 3 >= n)
  if (concept) return concept
  const wordCount = new Map()
  for (const i of items) for (const w of sigWords(i.title)) wordCount.set(w, (wordCount.get(w) || 0) + 1)
  const epWords = sigWords(`${es.raw || ''}`)
  const isName = (w) => es.strong.has(w) || es.weak.has(w)
  const words = [...epWords].filter((w) => !isName(w) && (wordCount.get(w) || 0) >= Math.max(2, Math.ceil(n / 4)))
  return words.length >= 2 ? words.slice(0, 3).join(', ') : null
}

// Alle verhalen tegen alle afleveringen. `stories`: de verhalen van de ronde; `byId`: de stukken.
// `mainIds`: de bronnen die de algemene lezer volgt (taal volgt de bronkeuze). Geeft { byStory: Map(id → luister),
// rows: de koppelingen en afvallers voor de proef }.
export function koppel({ stories = [], byId = new Map(), episodes = [], now = Date.now(), mainIds = new Set() } = {}) {
  const live = stories.map((st) => ({ st, items: (st.itemIds || []).map((id) => byId.get(id)).filter(counted) })).filter((x) => x.items.length >= 2)
  const eps = episodes.filter((e) => SHOW.has(e.show) && SHOW.get(e.show).soort !== 'overzicht')
  const rows = { koppelingen: [], afgevallen: [] }
  if (!live.length || !eps.length) return { byStory: new Map(), rows }
  const pool = [...new Map(live.flatMap((x) => x.items).map((i) => [i.id, i])).values()]
  // De afleveringen krijgen een kenmerk met de woordenschat van de verhalen (`extra`: ze veranderen die niet); ook een
  // kenmerk van alleen de titel, voor de toets bij een artikellink.
  const extra = eps.flatMap((e) => [{ id: e.id, title: e.titel, summary: e.samenvatting, publishedAt: new Date(e.t).toISOString() }, { id: e.id + '#titel', title: e.titel, summary: '', publishedAt: new Date(e.t).toISOString() }])
  const sig = signatures(pool, extra, { extended: true })
  const hits = new Map() // aflevering → [{ x, oordeel }]
  for (const e of eps) {
    const show = SHOW.get(e.show)
    for (const x of live) {
      const o = judge(e, show, x.st, x.items, sig, now)
      if (o.soort) (hits.get(e.id) || hits.set(e.id, []).get(e.id)).push({ x, o })
      else if (o.kandidaat) rows.afgevallen.push(row(e, x, o.af))
    }
  }
  const per = new Map() // verhaal → kandidaten
  for (const e of eps) {
    let hs = hits.get(e.id) || []
    if (!hs.length) continue
    // Een artikellink is zeker en wijst één verhaal aan: dan tellen alleen de verhalen met die link.
    if (hs.some((h) => h.o.grond === 'link')) hs = hs.filter((h) => h.o.grond === 'link')
    if (hs.length > 1) {
      for (const h of hs) rows.afgevallen.push(row(e, h.x, `past bij ${hs.length} verhalen: geen van beide krijgt haar`))
      continue
    }
    const [{ x, o }] = hs
    ;(per.get(x.st.id) || per.set(x.st.id, []).get(x.st.id)).push({ e, x, o })
  }
  const byStory = new Map()
  for (const [id, cands] of per) {
    const x = cands[0].x
    const lead = byId.get(x.st.leadId) || x.items[0]
    // Voorrang: dezelfde uitgever als de kop, dan een bron die de lezer volgt (voor de algemene lezer: de basisbronnen,
    // `mainIds`), dan een gratis show in de taal van de lezer (Nederlands), dan de rest. Daarbinnen hetzelfde vóór
    // verdiepend, een artikellink vóór tekst, de nieuwste eerst. Opinie nooit.
    const rank = (c) => {
      const show = SHOW.get(c.e.show)
      const same = publisherOf(show.bron) === publisherOf(lead?.source)
      return [same ? 0 : mainIds.has(show.bron) ? 1 : show.taal === 'nl' ? 2 : 3, c.o.soort === 'hetzelfde' ? 0 : 1, c.o.grond === 'link' ? 0 : 1, -c.e.t]
    }
    const order = (a, b) => {
      const ra = rank(a), rb = rank(b)
      for (let k = 0; k < ra.length; k++) if (ra[k] !== rb[k]) return ra[k] - rb[k]
      return a.e.id < b.e.id ? -1 : 1
    }
    const sorted = cands.filter((c) => !SHOW.get(c.e.show).opinie).sort(order)
    if (!sorted.length) continue
    // Taal volgt de bronkeuze: een show die niet Nederlandstalig is, alleen voor wie die bron volgt (`alleenVolgers`;
    // het toestel kiest straks de eerste uit `luister` en `andere` die bij de lezer past). De algemene lezer volgt de
    // basisbronnen: The Daily (NYT) wel, Today in Focus (The Guardian) niet.
    const [best, ...rest] = sorted
    const andere = rest.map((c) => field(c, lead))
    byStory.set(id, { ...field(best, lead), ...(andere.length ? { andere } : {}) })
    const f = field(best, lead)
    rows.koppelingen.push({ ...row(best.e, best.x, best.o.reden), soort: best.o.soort, grond: best.o.grond, dezelfdeUitgever: f.dezelfdeUitgever, algemeen: !f.alleenVolgers || mainIds.has(f.bron), andere: andere.map((a) => `${a.show}: ${a.aflevering}`) })
  }
  return { byStory, rows }
}
const day = (t) => new Date(t).toISOString().slice(0, 10)
function field({ e, o }, lead) {
  const show = SHOW.get(e.show)
  return {
    soort: o.soort,
    grond: o.grond,
    reden: o.reden,
    show: show.naam,
    showId: show.id,
    bron: show.bron,
    uitgever: show.uitgever,
    dezelfdeUitgever: publisherOf(show.bron) === publisherOf(lead?.source),
    aflevering: e.titel,
    verschenen: day(e.t),
    ...(e.duur ? { duur: e.duur } : {}),
    taal: show.taal,
    ...(show.taal !== 'nl' ? { alleenVolgers: true } : {}),
    link: e.pagina,
    ...(show.apple ? { apple: `https://podcasts.apple.com/nl/podcast/id${show.apple}` } : {}),
  }
}
function row(e, x, reden) {
  const lead = x.items[0]
  return { verhaal: x.st.id, kop: x.items.find((i) => i.id === x.st.leadId)?.title || lead?.title || null, show: SHOW.get(e.show)?.naam || e.show, aflevering: e.titel, verschenen: day(e.t), reden }
}

// De proef per dagdeel (alleen verhalen, shows en afleveringen; geen persoonsgegevens). Per dagdeel de laatste ronde.
export function proefEntry({ slot, now, rows, status, episodes }) {
  return { dagdeel: slot, at: new Date(now).toISOString(), feeds: status, afleveringen: episodes.length, koppelingen: rows.koppelingen, afgevallen: rows.afgevallen.slice(0, 200) }
}
export const PROEF_KEEP = 9 // dagdelen
export function withProef(stored, entry) {
  const list = (Array.isArray(stored?.dagdelen) ? stored.dagdelen : []).filter((d) => d.dagdeel !== entry.dagdeel)
  return { dagdelen: [entry, ...list].sort((a, b) => (a.dagdeel < b.dagdeel ? 1 : -1)).slice(0, PROEF_KEEP) }
}

// ---------- In de ronde (build.mjs) ----------
// Na het bundelen: elk live verhaal met een koppeling krijgt het veld `luister`; de proef van dit dagdeel gaat naar KV
// (PROEF_KEY, gelezen door /api/luister-proef). Bij elke fout: geen koppelingen, de ronde gaat gewoon door.
export async function luisterRonde({ stories, byId, now, episodesP, slot, mainIds, update }) {
  try {
    const { episodes = [], status = {} } = (await episodesP) || {}
    const { byStory, rows } = koppel({ stories, byId, episodes, now, mainIds })
    for (const st of stories) if (byStory.has(st.id)) st.luister = byStory.get(st.id)
    if (update && slot) await Promise.resolve().then(() => update(PROEF_KEY, (cur) => withProef(cur, proefEntry({ slot, now, rows, status, episodes })))).catch(() => {})
    return byStory.size
  } catch (e) {
    console.error('luister', String(e?.message || e))
    return 0
  }
}
