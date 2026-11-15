// Een aflevering is geen bron (Luister verder, stap 1; besluit Alex 14 november 2026).
// Een podcast-, audio- of video-aflevering is aanbod om te luisteren of te kijken, geen verslag van een uitgever. Ze telt
// daarom niet mee in het aantal bronnen van een verhaal (sourceCount, "N bronnen"), niet in coverageOf en daarmee niet
// in de drempels voor groot nieuws en "Waar iedereen over schrijft". Aanleiding: het Nvidia-verhaal telde vier
// afleveringen (De Telegraaf, Bloomberg Odd Lots, Vox, een NYT-video) als bron.
//
// Alleen wat de uitgever zelf zegt, net als bij de Editie (shared/editie-filter.mjs) en opinie (shared/opinie.mjs):
//   1. de feed: een iTunes-afleveringsnummer (`podcastEpisode`), de hoofdcategorie Podcast of Video (`feedMark`), of een
//      audio- of video-enclosure (`mediaType`) zonder eigen intro (een nieuwsbericht met een voorleesversie blijft een
//      bericht);
//   2. de rubriek in de link, vóór de slug: /podcast/, /podcasts/, /luister/, /audio/, /video/, /videos/, /kijk/;
//   3. een programmalabel vooraan in de kop ("Podcast:", "Video |", "Luister:", "Kijk:", "Watch:", "Listen:"),
//      "(Podcast)" achteraan (Bloomberg), of een programmalabel als laatste stuk na een scheidingsteken ("| Luisterverhaal
//      op zondag" van NRC, "– Podcast", "| Video van de dag"; labelAchteraan in shared/editie-filter.mjs, 15 november).
//      Dat laatste stuk is dan alleen het programmawoord, eventueel met een voorzetsel en een of twee woorden of een
//      afleveringsnummer: "Spotify koopt podcastbedrijf | Tech" of "Brand | Video toont chaos" is geen label.
// Een woord in de slug of ergens anders in de kop telt nooit. De afbeelding telt ook niet: een vaste rubrieksafbeelding
// (bij NRC de cover van NRC Vandaag uit /taxonomy/) hoort ook bij columns, commentaren en puzzels. Gedeeld door server en toestel (edition-core.js): geen URL-object.
import { rubricSegments, ownIntro, audioEpisode, labelAchteraan } from './editie-filter.mjs'

const AUDIO_DIR = new Set(['podcast', 'podcasts', 'luister', 'audio'])
const VIDEO_DIR = new Set(['video', 'videos', 'kijk'])
const LABEL = /^[\s"'‘“(]*(video|podcast|luister|kijk|watch|listen)\s*[:|]/i
const TAIL = /\(\s*podcast\s*\)\s*$/i

// 'podcast' | 'video' | null
export function afleveringSoort(item) {
  if (!item || item.kind === 'post') return null
  if (item.podcastEpisode != null && String(item.podcastEpisode).trim()) return 'podcast'
  if (item.feedMark === 'podcast') return 'podcast'
  if (item.feedMark === 'video') return 'video'
  const media = String(item.mediaType || '')
  if (/^audio\//i.test(media) && !ownIntro(item)) return 'podcast'
  if (/^video\//i.test(media) && !ownIntro(item)) return 'video'
  const segs = rubricSegments(item.url)
  if (segs.some((s) => AUDIO_DIR.has(s))) return 'podcast'
  if (segs.some((s) => VIDEO_DIR.has(s))) return 'video'
  const title = String(item.title || '')
  const label = LABEL.exec(title)?.[1]?.toLowerCase()
  if (label === 'podcast' || label === 'luister' || label === 'listen') return 'podcast'
  if (label === 'video' || label === 'kijk' || label === 'watch') return 'video'
  if (TAIL.test(title)) return 'podcast'
  const achteraan = labelAchteraan(title)
  if (achteraan) return achteraan
  return null
}

export const isAflevering = (item) => afleveringSoort(item) !== null

// Wie mag de Editie openen? Eén regel voor kijken en luisteren (persona's 14 november, tweede keuring): een aflevering
// (podcast, audio of video: isAflevering) en een aflevering om te luisteren (audioEpisode, ook met een eigen intro) opent
// nooit, ook niet als kop van een verhaal. Een podcast is daarbij nooit de kop van een plek (audioEpisode, dubbelcheck A3);
// een video mag dat wel zijn (besluit B2), maar niet op plek 01. Onbekend (geen stuk) laat de plek staan.
export const opensEdition = (item) => !item || (!isAflevering(item) && !audioEpisode(item))
