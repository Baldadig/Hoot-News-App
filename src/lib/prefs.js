// Instellingen — één plek voor de standaardwaarden en het opschonen van wat er is opgeslagen
// (getest in tests/prefs.test.mjs).
export const DEFAULT_PREFS = {
  muted: [],
  pinned: ['nederland', 'vs-politiek', 'ai'],
  onboarded: true,
  layout: 'tijdlijn', // tijdlijn | krant
  palette: 'papier', // papier | blad | inkt — kleurverdeling van de pagina (styles.css)
  textSize: 'normaal', // klein | normaal | groot
  preview: 2, // 1 | 2 | 3 | 'alles' — regels voorvertoning in de Stroom
  images: 'aan', // aan | hoofd | uit
  bubble: true, // "Buiten je bubbel" in Editie en Stroom
  brief: true, // AI-overzicht van de editie (als de sleutel er is)
  panel: 'dicht',
  enabled: [], // optionele bronnen die je zelf hebt aangezet (bv. extra muziekbronnen)
  interests: [], // brede interesses uit de onboarding (src/lib/topics.js → INTERESTS)
  topics: [], // onderwerpen die je volgt; leeg = alle
  bluesky: false, // Bluesky als eigen bestemming in het menu
  bskyInStream: [], // Bluesky-accounts die óók in de Stroom staan (standaard alleen in Bluesky)
  weatherPlace: 'haarlem', // plaats voor het weer in de Editie (src/lib/weather.js), of 'geen'
  followStories: [], // verhalen die je volgt: [{ id, title, at }] (src/lib/follow.js)
}

export function normalizePrefs(raw) {
  const p = raw && typeof raw === 'object' ? raw : {}
  const out = { ...DEFAULT_PREFS, ...p }
  // Oudere opslag: "Kort/Volledig" wordt "2 regels/alles".
  if (p.preview == null && p.density) out.preview = p.density === 'volledig' ? 'alles' : 2
  if (![1, 2, 3, 'alles'].includes(out.preview)) out.preview = 2
  if (!['klein', 'normaal', 'groot'].includes(out.textSize)) out.textSize = 'normaal'
  if (!['aan', 'hoofd', 'uit'].includes(out.images)) out.images = 'aan'
  if (!['tijdlijn', 'krant'].includes(out.layout)) out.layout = 'tijdlijn'
  if (!['papier', 'blad', 'inkt'].includes(out.palette)) out.palette = 'papier'
  if (!Array.isArray(out.muted)) out.muted = []
  if (!Array.isArray(out.pinned)) out.pinned = DEFAULT_PREFS.pinned
  if (!Array.isArray(out.enabled)) out.enabled = []
  if (!Array.isArray(out.bskyInStream)) out.bskyInStream = []
  if (!Array.isArray(out.interests)) out.interests = []
  if (!Array.isArray(out.topics)) out.topics = []
  if (typeof out.weatherPlace !== 'string') out.weatherPlace = 'haarlem'
  if (!Array.isArray(out.followStories)) out.followStories = []
  // Opgeruimde instellingen (voorlezen en Instapaper, tot v1.19) niet meer meedragen.
  for (const k of ['instapaper', 'readAloud', 'voice']) delete out[k]
  return out
}
