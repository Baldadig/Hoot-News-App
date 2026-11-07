// Verhoog alleen wanneer een bestaande vastgelegde Editie inhoudelijk opnieuw moet worden samengesteld.
// Deze revisie verandert rubricering, bundeling en brongewicht. Web, server en JavaScriptCore delen dit.
// Ronde 9 (7 november 2026): de taalregel verandert de kop van plekken van buiten je bronnen.
export const EDITOR_REVISION = 'redacteur-2026-11-07-taalregel'
export const editionCacheKey = id => `edition-${EDITOR_REVISION}-${id}`
