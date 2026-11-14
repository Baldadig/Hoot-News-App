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
//   3. een programmalabel vooraan in de kop ("Podcast:", "Video |", "Luister:", "Kijk:", "Watch:", "Listen:") of
//      "(Podcast)" achteraan (Bloomberg).
// Een woord in de slug of ergens in de kop telt nooit. Gedeeld door server en toestel (edition-core.js): geen URL-object.
import { rubricSegments, ownIntro } from './editie-filter.mjs'

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
  return null
}

export const isAflevering = (item) => afleveringSoort(item) !== null
