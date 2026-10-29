// Dubbele berichten: dezelfde link of dezelfde kop. Zusterkranten (AD, Tubantia, De Stentor,
// BN DeStem …) brengen vaak hetzelfde stuk. De server ontdubbelt alleen binnen één bron, zodat
// elke krant al zijn eigen berichten houdt; de app ontdubbelt over de bronnen die je ziet.
// Gedeeld door de server (netlify/lib/build.mjs) en de website (Stroom); iOS doet hetzelfde in
// HootStore.swift.

// De kop zonder hoofdletters en leestekens (zoals normTitle in netlify/lib/text.mjs).
export function titleKey(t) {
  return (t || '').toLowerCase().replace(/[^a-z0-9à-ÿ]+/gi, ' ').trim()
}

// Van elk bericht het eerste exemplaar; de lijst staat al op volgorde (nieuwste eerst).
// `perSource`: alleen dubbelen binnen één bron (een feed die een stuk twee keer noemt).
export function withoutCopies(list = [], { perSource = false } = {}) {
  const seen = new Set()
  const out = []
  for (const it of list) {
    const scope = perSource ? it.source + '|' : ''
    const title = titleKey(it.title)
    const keys = [it.url ? 'u|' + scope + it.url : null, title ? 't|' + scope + title : null].filter(Boolean)
    if (keys.some((k) => seen.has(k))) continue
    for (const k of keys) seen.add(k)
    out.push(it)
  }
  return out
}
