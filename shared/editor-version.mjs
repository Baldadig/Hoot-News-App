// Verhoog alleen wanneer de samenstelling van de Editie inhoudelijk verandert. Web, server en JavaScriptCore delen dit.
// Ronde 9 (7 november 2026): de taalregel verandert de kop van plekken van buiten je bronnen.
// Een nieuwe revisie geldt vanaf het volgende dagdeel: een Editie die al vaststaat, blijft staan (netlify/lib/edition-history.mjs).
export const EDITOR_REVISION = 'redacteur-2026-11-07-taalregel'
// Eerdere revisies, nieuwste eerst. Zet bij elke verhoging de vorige revisie vooraan: daaruit komt de vorige Editie
// ("wat stond er al") en de Editie die tot het volgende dagdeel blijft staan.
export const EARLIER_REVISIONS = ['redacteur-2026-11-02-beta2', 'redacteur-2026-11-02-beta1', 'redacteur-2026-11-01-r2']
// Bewuste herbouw: noem hier een dagdeel (bijv. '2026-11-07-middag') om de Editie van dat dagdeel onder deze revisie
// opnieuw samen te stellen, ook als hij onder een eerdere revisie al vaststaat. Anders null.
export const EDITION_REBUILD_SLOT = null
export const editionCacheKey = (id, revision = EDITOR_REVISION) => `edition-${revision}-${id}`
// Onder welke revisie de Editie van een dagdeel is vastgelegd (een korte notitie, los van de revisie in de sleutel).
export const editionRevisionKey = id => `edition-revision-${id}`
