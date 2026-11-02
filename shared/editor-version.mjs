// Verhoog alleen wanneer een bestaande vastgelegde Editie inhoudelijk opnieuw moet worden samengesteld.
// Deze revisie verandert rubricering, bundeling en brongewicht. Web, server en JavaScriptCore delen dit.
export const EDITOR_REVISION = 'redacteur-2026-11-02-beta2'
export const editionCacheKey = id => `edition-${EDITOR_REVISION}-${id}`
