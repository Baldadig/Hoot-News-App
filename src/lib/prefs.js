// Instellingen — één plek voor de standaardwaarden en het opschonen van wat er is opgeslagen
// (getest in tests/prefs.test.mjs).
import { themePref, darkPref } from './theme.js'
import { VAK_FIELD_IDS } from '../../shared/vak.mjs'
import { currentTopics, currentTopicMap } from './topics.js'
import { TASTE_CAP } from './affinity.js'
import { INTRO_LINES } from '../../shared/zinnen.mjs'
import { textSizePref } from './tekstgrootte.js'
export const DEFAULT_PREFS = {
  theme: 'system',
  themeDark: 'dark',
  muted: [],
  pinned: [], // neutraal: niemands voorkeur als standaard
  onboarded: true,
  layout: 'tijdlijn', // tijdlijn | krant
  palette: 'papier', // papier | blad | inkt — kleurverdeling van de pagina (styles.css)
  textSize: 'normaal', // kleiner | normaal (Zoals je toestel) | groter | nog-groter | grootst (lib/tekstgrootte.js); per toestel
  preview: INTRO_LINES, // 1 | 2 | 3 | 'alles' — regels voorvertoning in de Stroom (afgeleid van `regels`, zie normalizePrefs)
  images: 'aan', // aan | hoofd | uit
  bubble: true, // "Buiten je bubbel" in Editie en Stroom
  brief: true, // AI-overzicht van de Editie (als de sleutel er is)
  panel: 'dicht',
  enabled: [], // optionele bronnen die je zelf hebt aangezet (bv. extra muziekbronnen)
  interests: [], // brede interesses uit de onboarding (src/lib/topics.js → INTERESTS)
  topics: [], // onderwerpen die je volgt; leeg = alle
  bluesky: false, // Bluesky-posts in de Stroom; geen aparte bestemming
  favorites: [], // voorkeursbronnen (ster): wegen zwaarder in je Editie en staan vooraan
  vak: [], // vakgebieden in de Selectie (shared/vak.mjs); leeg = geen tab Selectie
  bskyInStream: [], // expliciete keuze; oude profielen zonder dit veld behouden hun gevolgde accounts
  weatherPlace: 'de-bilt', // neutraal; plaats voor het weer in de Editie (src/lib/weather.js), of 'geen'
  followStories: [], // verhalen die je volgt: [{ id, title, at }] (src/lib/follow.js)
  taste: { topics: {}, sources: {} }, // meer of minder hiervan (src/lib/affinity.js); gaat mee met je account
}

export function normalizePrefs(raw) {
  const p = raw && typeof raw === 'object' ? raw : {}
  const out = { ...DEFAULT_PREFS, ...p }
  out.theme = themePref(out.theme)
  out.themeDark = darkPref(out.themeDark)
  // Regels intro (build 46): standaard 3 in plaats van 2. De oude sleutel `preview` had 2 als
  // standaard, en de app stuurde die ook mee zonder dat je iets koos: 2 daar is dus niet van een
  // keuze te onderscheiden en wordt 3. Wat je vanaf nu kiest staat in `regels` (en voor oudere
  // versies van de app ook in `preview`); dat geldt zoals het is, ook 2.
  // Oudere opslag: "Kort/Volledig" wordt "standaard/alles".
  const LINES = [1, 2, 3, 'alles']
  const old = p.preview == null && p.density ? (p.density === 'volledig' ? 'alles' : 2) : p.preview
  out.preview = LINES.includes(p.regels) ? p.regels : LINES.includes(old) && old !== 2 ? old : INTRO_LINES
  out.textSize = textSizePref(out.textSize) // Klein en Groot (tot build 47) worden Kleiner en Groter
  if (!['aan', 'hoofd', 'uit'].includes(out.images)) out.images = 'aan'
  if (!['tijdlijn', 'krant'].includes(out.layout)) out.layout = 'tijdlijn'
  if (!['papier', 'blad', 'inkt'].includes(out.palette)) out.palette = 'papier'
  if (!Array.isArray(out.muted)) out.muted = []
  if (!Array.isArray(out.pinned)) out.pinned = DEFAULT_PREFS.pinned
  if (!Array.isArray(out.enabled)) out.enabled = []
  if (!Array.isArray(out.bskyInStream)) out.bskyInStream = []
  if (!Array.isArray(out.interests)) out.interests = []
  if (!Array.isArray(out.favorites)) out.favorites = []
  if (!Array.isArray(out.topics)) out.topics = []
  if (typeof out.weatherPlace !== 'string') out.weatherPlace = DEFAULT_PREFS.weatherPlace
  if (!Array.isArray(out.followStories)) out.followStories = []
  // Meer of minder hiervan: per onderwerp en bron een getal, ook negatief.
  const signed = (o) => Object.fromEntries(Object.entries(o && typeof o === 'object' ? o : {}).filter(([, v]) => Number.isFinite(v)))
  out.taste = { topics: currentTopicMap(signed(out.taste?.topics), TASTE_CAP), sources: signed(out.taste?.sources) }
  // Oude onderwerpen (Trump → Verenigde Staten): ook in wat je volgt en vastzette; zie topics.js RETIRED_TOPICS.
  out.topics = currentTopics(out.topics)
  out.pinned = currentTopics(out.pinned)
  out.vak = Array.isArray(out.vak) ? out.vak.filter((f) => VAK_FIELD_IDS.includes(f)) : []
  // Bluesky-accounts die je zelf toevoegde ({ handle, name, avatar }); gaan mee met je account.
  out.social = Array.isArray(out.social) ? out.social.filter((a) => a && typeof a.handle === 'string') : []
  if (!Object.hasOwn(p, 'bluesky') && out.social.length) out.bluesky = true
  if (!Object.hasOwn(p, 'bskyInStream')) out.bskyInStream = [...new Set(out.social.map(a => 'bsky:' + a.handle))]
  // Opgeruimde instellingen (voorlezen en Instapaper, tot v1.19) niet meer meedragen.
  for (const k of ['instapaper', 'readAloud', 'voice']) delete out[k]
  return out
}
