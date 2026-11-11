// Wat niet in de Editie hoort: een aanbieding aan de lezer, of een uitnodiging om te kijken of te luisteren.
// Besluit Alex, 11 november 2026: "streng en zeker + AI". Vier keuringen lieten zien dat regels op woorden en
// kopvormen steeds nieuws weren (ACM-toezicht op Black Friday, 'Top 10 M&A deals', de prijsval van zonnepanelen,
// nieuws over een podcast). Daarom weert dit deel (A) alleen bij een HARDE aanwijzing, en geen woord of kopvorm:
//   1. de feed zelf markeert het: de eerste (hoofd)categorie Podcast/Video (`feedMark`, rss.mjs; een
//      dealcategorie haalt rss.mjs/isNoise er al bij het ophalen uit), een audio- of video-enclosure
//      (`mediaType`) of iTunes-afleveringsvelden (`podcastEpisode`);
//   2. de link staat in een rubriek van de uitgever: een dealrubriek als eerste padsegment (/deals/, /aanbiedingen/;
//      dus niet /markets/deals/ of /business/deals/), of een podcast-/videorubriek in een segment vóór de slug
//      (/podcast/, /video/, /luister/, /kijk/). De slug zelf telt nooit;
//   3. de kop begint met een vast programmalabel: "Video |", "Podcast:", "Luister:", "Kijk:", "Watch:", "Listen:".
// Wat de feed zelf als aflevering markeert, en "Podcast:" vooraan, gaat altijd weg; een podcastrubriek of "Luister:" alleen
// zonder eigen intro. Een kijkfragment weert A niet (Alex' akkoord: het *mag* weg met een geleende intro; de keuringssets
// labelden zulke fragmenten ook als nieuws, en nooit nieuws onterecht weg gaat voor): dat beoordeelt de AI.
// Twijfel blijft staan; de AI op de server (netlify/lib/editie-ai.mjs) beoordeelt de rest. De Stroom gebruikt dit niet.
// Gedeeld door server en toestel (edition-core.js): alleen eenvoudige, deterministische toetsen.

const DEAL_RUBRIC = new Set(['deals', 'aanbiedingen', 'aanbieding', 'koopjes', 'coupons', 'kortingscodes', 'dagdeals'])
const AUDIO_RUBRIC = new Set(['podcast', 'podcasts', 'luister'])
const LANG_SEGMENT = /^[a-z]{2}(?:-[a-z]{2})?$/i
const LABEL = /^[\s"'‘“(]*(video|podcast|luister|kijk|watch|listen)\s*[:|]/i

// De padsegmenten vóór de slug (het laatste segment), in kleine letters.
export function rubricSegments(url) {
  // Zonder URL-object: JavaScriptCore op het toestel heeft er geen, en zo rekenen web en app gelijk.
  const m = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*([^?#]*)/i.exec(String(url || '').trim())
  if (!m) return []
  const path = m[1]
  const segs = path.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s).toLowerCase()
    } catch {
      return s.toLowerCase()
    }
  })
  return segs.slice(0, -1)
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
// Een eigen intro: niet geleend, niet leeg, niet de kop herhaald en geen feedrestant ("appeared first on").
export function ownIntro(item = {}) {
  if (item.borrowedFrom) return false
  const s = String(item.summary || item.text || '').trim()
  const t = norm(item.title)
  const n = norm(s)
  if (n.split(' ').filter(Boolean).length < 4) return false
  if (n === t || (t && n.startsWith(t) && n.length - t.length < 12)) return false
  if (/appeared first on\b|\blead image\b/i.test(s) && s.length < 200) return false
  return true
}

// De harde aanwijzing, of null. { soort: 'aanbieding' | 'aankondiging', grond }
export function hardMark(item = {}) {
  if (!item || item.kind === 'post') return null
  const segs = rubricSegments(item.url)
  const first = segs[0] && LANG_SEGMENT.test(segs[0]) && segs.length > 1 ? segs[1] : segs[0]
  if (first && DEAL_RUBRIC.has(first)) return { soort: 'aanbieding', grond: 'rubriek' }
  const media = String(item.mediaType || '')
  const label = LABEL.exec(String(item.title || ''))?.[1]?.toLowerCase()
  // De feed zelf: een audio-enclosure, iTunes-afleveringsvelden of de hoofdcategorie Podcast. Dat is een aflevering.
  if (/^audio\//i.test(media)) return { soort: 'aankondiging', grond: 'enclosure' }
  if (item.podcastEpisode != null && String(item.podcastEpisode).trim()) return { soort: 'aankondiging', grond: 'itunes' }
  if (item.feedMark === 'podcast') return { soort: 'aankondiging', grond: 'feedcategorie' }
  if (label === 'podcast') return { soort: 'aankondiging', grond: 'label' }
  // Een podcastrubriek van de uitgever of een luisterlabel: alleen zonder eigen intro (nieuws over een podcastprijs staat
  // ook onder /podcast/).
  if ((segs.some((s) => AUDIO_RUBRIC.has(s)) || label === 'luister' || label === 'listen') && !ownIntro(item)) return { soort: 'aankondiging', grond: label === 'luister' || label === 'listen' ? 'label' : 'rubriek' }
  // Een kijkfragment (videorubriek, video-enclosure, "Video |", "Kijk:", "Watch:") weert A niet: de keuringen labelden
  // ook kijkfragmenten met een geleende intro als nieuws ("Video | Joe Biden bekogeld…"). Daarover oordeelt de AI.
  return null
}

// Eén toelating voor alle Editieroutes. `weg`: de ids die de AI op de server zeker als aanbieding of aankondiging zag
// (alleen de server geeft die mee; het toestel rekent met A alleen).
export const excludedFromEdition = (item, weg = null) => !!item && ((weg && weg.size > 0 && weg.has(item.id)) || hardMark(item) != null)
