// Verhoog alleen wanneer de samenstelling van de Editie inhoudelijk verandert. Web, server en JavaScriptCore delen dit.
// Ronde 9 (7 november 2026): de taalregel verandert de kop van plekken van buiten je bronnen.
// Een nieuwe revisie geldt vanaf het volgende dagdeel: een Editie die al vaststaat, blijft staan (netlify/lib/edition-history.mjs).
// 11 november 2026: opinie in de Editie met de herkenning van de tab Opinie (shared/opinie.mjs); analyse is geen opinie.
// 11 november 2026, frisse ogen · 1: Buiten je bubbel met harde eisen (gratis, vers, geen liveblog of sport, nieuw
// onderwerp, niet eerder vandaag), anders Naast je bubbel, anders leeg.
export const EDITOR_REVISION = 'redacteur-2026-11-11-bubbel'
// De afdruk van je bronnen en interesses (editionBasis in src/lib/personal.js) rekent met een vaste waarde, niet meer
// met de revisie (Redacteur op de server, 11 november 2026). De server legt de Editie vast; app 1.2 rekent de afdruk
// met de rekenkern die erin zit. Veranderde de afdruk bij elke revisie, dan paste de Editie van de server nooit bij
// die van de iPhone, en toonden web en app elk een andere Editie. Een nieuwe revisie geldt nu vanaf het volgende
// dagdeel, ook voor de persoonlijke Editie. Nooit veranderen: dit is de waarde die app 1.2 meerekent.
export const BASIS_REVISION = 'redacteur-2026-11-07-taalregel'
// Eerdere revisies, nieuwste eerst. Zet bij elke verhoging de vorige revisie vooraan: daaruit komt de vorige Editie
// ("wat stond er al") en de Editie die tot het volgende dagdeel blijft staan.
export const EARLIER_REVISIONS = ['redacteur-2026-11-11-opinie', 'redacteur-2026-11-07-taalregel', 'redacteur-2026-11-02-beta2', 'redacteur-2026-11-02-beta1', 'redacteur-2026-11-01-r2']
// Bewuste herbouw: noem hier een dagdeel (bijv. '2026-11-07-middag') om de Editie van dat dagdeel onder deze revisie
// opnieuw samen te stellen, ook als hij onder een eerdere revisie al vaststaat. Anders null.
export const EDITION_REBUILD_SLOT = null
export const editionCacheKey = (id, revision = EDITOR_REVISION) => `edition-${revision}-${id}`
// Onder welke revisie de Editie van een dagdeel is vastgelegd (een korte notitie, los van de revisie in de sleutel).
export const editionRevisionKey = id => `edition-revision-${id}`
