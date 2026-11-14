// Wat niet in de Editie hoort: een aanbieding aan de lezer, of een uitnodiging om te kijken of te luisteren.
// Besluit Alex, 11 november 2026: "streng en zeker + AI". Vier keuringen lieten zien dat regels op woorden en
// kopvormen steeds nieuws weren (ACM-toezicht op Black Friday, 'Top 10 M&A deals', de prijsval van zonnepanelen,
// nieuws over een podcast). Daarom weert dit deel (A) alleen bij een HARDE aanwijzing, en geen woord of kopvorm:
//   1. de feed zelf markeert het: de eerste (hoofd)categorie Podcast/Video (`feedMark`, rss.mjs), een audio- of
//      video-enclosure (`mediaType`) of iTunes-afleveringsvelden (`podcastEpisode`). (De ophaalfilter isNoise in rss.mjs
//      weert sinds Redacteur · ruis alleen nog reclame en geen-berichten op een harde aanwijzing, geen deals op woorden:
//      een deal die de uitgever niet als reclame markeert, komt hier en bij de AI langs);
//   2. de link staat in een rubriek van de uitgever: een dealrubriek als eerste padsegment (/deals/, /aanbiedingen/;
//      dus niet /markets/deals/ of /business/deals/), of een podcast-/videorubriek in een segment vóór de slug
//      (/podcast/, /video/, /luister/, /kijk/). De slug zelf telt nooit;
//   3. de kop begint met een vast programmalabel: "Video |", "Podcast:", "Luister:", "Kijk:", "Watch:", "Listen:".
// Wat de feed zelf als aflevering markeert, en "Podcast:" vooraan, gaat altijd weg; een podcastrubriek of "Luister:" alleen
// zonder eigen intro. Een kijkfragment weert A niet (Alex' akkoord: het *mag* weg met een geleende intro; de keuringssets
// labelden zulke fragmenten ook als nieuws, en nooit nieuws onterecht weg gaat voor): dat beoordeelt de AI.
// Sinds Redacteur · deals (14 november 2026, besluit Alex na een Wired-deal op plek 05: "aanbiedingen en deals eruit") ook:
//   4. een koopkop (shared/koopsignaal.mjs): een dealkop, een koopdag met een koopwoord, de prijsval van een product, een
//      koopgids of cadeaugids, een winactie of een aanbodlabel vooraan, tenzij de kop over omzet, gedrag, toezicht, beleid,
//      een overname of een markt gaat. Getoetst op de vier keuringen: geen enkele nieuwskop gaat weg;
//   5. de feed deelt het stuk zelf in als aanbod of koopgids (`feedMark` 'aanbod', rss.mjs: "Gear / Deals", "Buying
//      Guides", "Aanbiedingen", nooit onder zaken of markten) en de kop heeft een koopvorm (koopVorm).
//   De kopregels van stap 4 gelden alleen voor een bron die koopstukken maakt (koopBron: tech, games, cultuur, of een deal-,
//   koopgids- of reviewrubriek in de feed of het pad). Bij een nieuwsbron alleen de ondubbelzinnige signalen (herstel 2,
//   de bronpoort: een verloren nieuwsstuk is erger dan een gemist koopstuk).
// Twijfel blijft staan; de AI op de server (netlify/lib/editie-ai.mjs) beoordeelt de rest. De Stroom gebruikt dit niet.
// Gedeeld door server en toestel (edition-core.js): alleen eenvoudige, deterministische toetsen.
import { koopGrond, koopVorm, koopBron } from './koopsignaal.mjs'

const DEAL_RUBRIC = new Set(['deals', 'aanbiedingen', 'aanbieding', 'koopjes', 'coupons', 'kortingscodes', 'dagdeals'])
const AUDIO_RUBRIC = new Set(['podcast', 'podcasts', 'luister'])
// Alleen echte taal-/landsegmenten (herstel AI-keuring 1: "tv" in /tv/deals/ is een rubriek, geen taal).
const LANG_SEGMENT = /^(?:nl|en|de|fr|es|it|pt|be|uk|us|eu|intl)(?:-[a-z]{2})?$/i
const LABEL = /^[\s"'‘“(]*(video|podcast|luister|kijk|watch|listen)\s*[:|]/i
const AUDIO_LABEL = /^[\s"'‘“(]*(podcast|luister|listen)\s*[:|]/i

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
  // De slug is het laatste segment. Een datum (jjjj) of een numeriek id begint het artikeldeel: wat daarna komt is ook
  // slug (herstel AI-keuring 1: …/2026/11/podcasts/684400/ is geen podcastrubriek).
  const before = segs.slice(0, -1)
  const cut = before.findIndex((x) => /^\d+$/.test(x))
  return cut === -1 ? before : before.slice(0, cut)
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
  // Een koopkop, of een stuk dat de feed als aanbod indeelt met een koopvorm in de kop (Redacteur · deals).
  if (koopGrond(item.title, { ruim: koopBron(item, segs) })) return { soort: 'aanbieding', grond: 'koopkop' }
  if (item.feedMark === 'aanbod' && koopVorm(item.title)) return { soort: 'aanbieding', grond: 'feedcategorie' }
  const media = String(item.mediaType || '')
  const label = LABEL.exec(String(item.title || ''))?.[1]?.toLowerCase()
  // De feed zelf: een iTunes-afleveringsnummer is altijd een aflevering. Een audio-enclosure of de hoofdcategorie Podcast
  // alleen zonder eigen intro (herstel AI-keuring 1: een nieuwsbericht met een voorleesversie, of een bericht óver podcasts
  // in de rubriek Podcasts, heeft een eigen nieuwsintro en blijft; daarover oordeelt de AI).
  if (item.podcastEpisode != null && String(item.podcastEpisode).trim()) return { soort: 'aankondiging', grond: 'itunes' }
  if (/^audio\//i.test(media) && !ownIntro(item)) return { soort: 'aankondiging', grond: 'enclosure' }
  if (item.feedMark === 'podcast' && !ownIntro(item)) return { soort: 'aankondiging', grond: 'feedcategorie' }
  if (label === 'podcast') return { soort: 'aankondiging', grond: 'label' }
  // Een podcastrubriek van de uitgever of een luisterlabel: alleen zonder eigen intro (nieuws over een podcastprijs staat
  // ook onder /podcast/).
  if ((segs.some((s) => AUDIO_RUBRIC.has(s)) || label === 'luister' || label === 'listen') && !ownIntro(item)) return { soort: 'aankondiging', grond: label === 'luister' || label === 'listen' ? 'label' : 'rubriek' }
  // Een kijkfragment (videorubriek, video-enclosure, "Video |", "Kijk:", "Watch:") weert A niet: de keuringen labelden
  // ook kijkfragmenten met een geleende intro als nieuws ("Video | Joe Biden bekogeld…"). Daarover oordeelt de AI.
  return null
}

// Een aflevering om te luisteren (dubbelcheck 14 november, A3): de feed markeert hem (hoofdcategorie Podcast, een
// audio-enclosure, een iTunes-afleveringsnummer), de link staat in een podcastrubriek van de uitgever (/podcast/,
// /luister/, een segment vóór de slug) of de kop begint met een luisterlabel ("Podcast:", "Luister |"). Zo'n stuk is
// nooit de kop van een plek in de Editie, ook niet met een eigen intro: het mag wel als lid bij een verhaal (Vergelijken).
// Een plek met alleen afleveringen valt weg. Dit is strenger dan hardMark (dat weert het stuk helemaal), want hier blijft
// het stuk in de Editie, alleen niet bovenaan.
// Een video niet (besluit chief of staff over B2, 14 november): een videostuk van RTL of de NOS is vaak gewoon nieuws, met
// een kop en intro die het verhaal vertellen. Een video is dus geen harde uitsluiting als kop. Wel gaat elke aflevering,
// ook een video, achter een nieuwsstuk bij de keuze van de kop en telt ze niet als bron (isAflevering in
// shared/aflevering.mjs, Luister verder); de regels voor een kop met een kijklabel (VIDEO_HEAD) en filter B blijven.
// Dezelfde tekens als afleveringSoort(...) === 'podcast', maar ook met een eigen intro.
const AUDIO_EPISODE_DIR = new Set([...AUDIO_RUBRIC, 'audio'])
export function audioEpisode(item = {}) {
  if (!item || item.kind === 'post') return false
  if (item.feedMark === 'podcast') return true
  if (/^audio\//i.test(String(item.mediaType || ''))) return true
  if (item.podcastEpisode != null && String(item.podcastEpisode).trim()) return true
  if (rubricSegments(item.url).some((s) => AUDIO_EPISODE_DIR.has(s))) return true
  return AUDIO_LABEL.test(String(item.title || '')) || /\(\s*podcast\s*\)\s*$/i.test(String(item.title || ''))
}

// Eén toelating voor alle Editieroutes. `weg`: de ids die de AI op de server zeker als aanbieding of aankondiging zag
// (alleen de server geeft die mee; het toestel rekent met A alleen).
export const excludedFromEdition = (item, weg = null) => !!item && ((weg && weg.size > 0 && weg.has(item.id)) || hardMark(item) != null)
