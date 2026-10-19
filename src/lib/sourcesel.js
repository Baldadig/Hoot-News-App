// Welke bronnen staan uit, en wat hoort in welke lijst — pure functies (tests/sourcesel.test.mjs).

// Uit = wat je zelf hebt uitgezet, plus optionele bronnen die je (nog) niet hebt aangezet.
export function mutedSet(prefs, sources = []) {
  const off = new Set(prefs.muted || [])
  for (const s of sources) if (s.optional && !(prefs.enabled || []).includes(s.id)) off.add(s.id)
  return off
}

// Aan/uit zetten: een optionele bron gaat via `enabled`, een gewone via `muted`.
export function toggleSource(prefs, source, on) {
  if (source?.optional) {
    const enabled = new Set(prefs.enabled || [])
    on ? enabled.add(source.id) : enabled.delete(source.id)
    return { ...prefs, enabled: [...enabled], muted: (prefs.muted || []).filter((m) => m !== source.id) }
  }
  const muted = new Set(prefs.muted || [])
  on ? muted.delete(source.id) : muted.add(source.id)
  return { ...prefs, muted: [...muted] }
}

// Bluesky-posts staan in de eigen Bluesky-lijst; in de Stroom alleen van accounts die je
// daar ook wilt (`bskyInStream`).
export const isPost = (it) => it.kind === 'post'
export function inStream(it, prefs) {
  return !isPost(it) || (prefs.bskyInStream || []).includes(it.source)
}
