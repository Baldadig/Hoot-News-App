// De vastgelegde algemene Editie over Redacteur-revisies heen (Redacteur · ronde 10 · A).
// Een nieuwe EDITOR_REVISION geeft een nieuwe sleutel (editionCacheKey). Zonder terugval vond de eerste Editie na een
// uitrol geen vorige Editie, en zette ze wat er al stond opnieuw bovenaan (7 november middag: Miller, Paraguay en Iran
// voor de derde keer). Daarom:
// - "wat stond er al" (previousOf) komt uit de laatst vastgelegde Editie van het vorige dagdeel, ongeacht de revisie;
// - een Editie van het lopende dagdeel die al onder een eerdere revisie is vastgelegd, blijft staan tot het volgende
//   dagdeel (geen wissel onder lezers midden in een dagdeel), tenzij EDITION_REBUILD_SLOT dat dagdeel noemt.
// Zoekvolgorde per dagdeel: de huidige revisie; de revisie die bij het vastleggen is genoteerd (editionRevisionKey,
// generiek voor elke volgende uitrol); de bekende eerdere revisies (EARLIER_REVISIONS, nieuwste eerst: nodig voor de
// uitrol vanaf een versie die die notitie nog niet schreef); en alleen voor de vorige Editie de oude edition3-sleutel.
import { EDITOR_REVISION, EARLIER_REVISIONS, editionCacheKey, editionRevisionKey } from '../../shared/editor-version.mjs'

const usable = (x) => !!x && typeof x === 'object' && Array.isArray(x.entries) && x.entries.length > 0

// `get(key)`: lezen uit de opslag (kvGet). Geeft { snapshot, revision } of null. `current: false` slaat de huidige
// revisie over; `legacy: true` kijkt als laatste ook naar edition3-<id>.
export async function findEdition(get, id, { current = true, legacy = false, revision = EDITOR_REVISION, earlier = EARLIER_REVISIONS } = {}) {
  const read = (key) => Promise.resolve().then(() => get(key)).catch(() => null)
  const tried = new Set()
  const tryRevision = async (rev) => {
    if (!rev || typeof rev !== 'string' || tried.has(rev)) return null
    tried.add(rev)
    const snap = await read(editionCacheKey(id, rev))
    return usable(snap) ? { snapshot: snap, revision: snap.revision || rev } : null
  }
  if (current) {
    const hit = await tryRevision(revision)
    if (hit) return hit
  } else tried.add(revision)
  const noted = await read(editionRevisionKey(id))
  const fromNote = await tryRevision(typeof noted === 'string' ? noted : noted?.revision)
  if (fromNote) return fromNote
  for (const rev of earlier) {
    const hit = await tryRevision(rev)
    if (hit) return hit
  }
  if (legacy) {
    const old = await read('edition3-' + id)
    if (usable(old)) return { snapshot: old, revision: 'edition3' }
  }
  return null
}

// De vorige Editie voor previousOf: de laatst vastgelegde van het vorige dagdeel, welke revisie ook.
export async function previousEdition(get, previousId) {
  return (await findEdition(get, previousId, { legacy: true }))?.snapshot || null
}

// De Editie van het lopende dagdeel die al onder een eerdere revisie vaststaat, met die revisie erbij (voor `version`),
// of null: dan stelt de huidige revisie hem samen. `rebuild`: het dagdeel dat bewust opnieuw moet (EDITION_REBUILD_SLOT).
export async function carriedEdition(get, id, { rebuild = null } = {}) {
  if (rebuild && rebuild === id) return null
  const hit = await findEdition(get, id, { current: false })
  return hit ? { ...hit.snapshot, revision: hit.revision } : null
}
