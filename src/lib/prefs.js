// Instellingen — één plek voor de standaardwaarden en het opschonen van wat er is opgeslagen
// (getest in tests/prefs.test.mjs).
export const DEFAULT_PREFS = {
  muted: [],
  pinned: ['nederland', 'vs-politiek', 'ai'],
  onboarded: true,
  layout: 'tijdlijn', // tijdlijn | krant
  textSize: 'normaal', // klein | normaal | groot
  preview: 2, // 1 | 2 | 3 | 'alles' — regels voorvertoning in de Stroom
  images: 'aan', // aan | hoofd | uit
  instapaper: true, // bewaren ook naar Instapaper (als gekoppeld)
  readAloud: true, // voorleesknop in de Editie
  voice: 'fenna', // natuurlijke stem (als gekoppeld): fenna | maarten | colette
  bubble: true, // "Buiten je bubbel" in Editie en Stroom
  brief: true, // AI-overzicht van de editie (als de sleutel er is)
  panel: 'dicht',
  enabled: [], // optionele bronnen die je zelf hebt aangezet (bv. extra muziekbronnen)
  bskyInStream: [], // Bluesky-accounts die óók in de Stroom staan (standaard alleen in Bluesky)
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
  if (!Array.isArray(out.muted)) out.muted = []
  if (!Array.isArray(out.pinned)) out.pinned = DEFAULT_PREFS.pinned
  if (!Array.isArray(out.enabled)) out.enabled = []
  if (!['fenna', 'maarten', 'colette'].includes(out.voice)) out.voice = 'fenna'
  if (!Array.isArray(out.bskyInStream)) out.bskyInStream = []
  return out
}
