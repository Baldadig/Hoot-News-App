// Redacteur · ronde 10 (meting en toets van de Middageditie van 7 november 2026).
// A. De vorige Editie over revisies heen: na een uitrol (nieuwe EDITOR_REVISION, dus een nieuwe sleutel) vond de eerste
//    Editie geen vorige Editie en zette ze Miller, Paraguay en Iran voor de derde keer bovenaan. Een Editie van het lopende
//    dagdeel die al vaststaat, blijft staan tot het volgende dagdeel.
// B. Een Nederlandse kop over hetzelfde feit ook op held- en vervolgplekken onder de top 3 (Paraguay op 7 met een Engelse
//    Al Jazeera-kop van de vroege ochtend terwijl Trouw en NU.nl later hetzelfde feit in het Nederlands brachten).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { EDITOR_REVISION, EARLIER_REVISIONS, EDITION_REBUILD_SLOT, editionCacheKey, editionRevisionKey } from '../shared/editor-version.mjs'
import { findEdition, previousEdition, carriedEdition } from '../netlify/lib/edition-history.mjs'
import { previousOf } from '../netlify/lib/stories.mjs'

const snapshot = (id, tag) => ({ id, builtAt: '2026-11-07T04:30:00.000Z', tag, entries: [{ kind: 'story', id: `s-${tag}`, leadId: `i-${tag}`, desk: 'buitenland' }], stories: [{ id: `s-${tag}`, itemIds: [`i-${tag}`], keys: ['miller'] }], items: [] })
const store = (entries) => {
  const kv = new Map(entries)
  const reads = []
  return { kv, reads, get: async (k) => (reads.push(k), kv.get(k) ?? null) }
}

test('A: de revisie, de eerdere revisies en de sleutels', () => {
  assert.ok(!EARLIER_REVISIONS.includes(EDITOR_REVISION), 'de huidige revisie staat niet bij de eerdere')
  assert.ok(EARLIER_REVISIONS.includes('redacteur-2026-11-02-beta2'), 'de revisie die live draait')
  assert.equal(new Set(EARLIER_REVISIONS).size, EARLIER_REVISIONS.length)
  assert.equal(EARLIER_REVISIONS[0], 'redacteur-2026-11-13-leeftijd', 'de vorige revisie staat vooraan')
  assert.equal(EDITION_REBUILD_SLOT, null, 'geen bewuste herbouw in de code die uitgerold wordt')
  assert.equal(editionCacheKey('2026-11-07-middag'), `edition-${EDITOR_REVISION}-2026-11-07-middag`)
  assert.equal(editionCacheKey('2026-11-07-middag', 'redacteur-2026-11-02-beta2'), 'edition-redacteur-2026-11-02-beta2-2026-11-07-middag')
  assert.equal(editionRevisionKey('2026-11-07-middag'), 'edition-revision-2026-11-07-middag')
})

test('A: net uitgerold vindt de vorige Editie onder de oude revisie, dan edition3, en anders niets', async () => {
  const id = '2026-11-07-ochtend'
  const beta2 = snapshot(id, 'beta2')
  const s = store([[editionCacheKey(id, 'redacteur-2026-11-02-beta2'), beta2], ['edition3-' + id, snapshot(id, 'oud')]])
  assert.equal((await previousEdition(s.get, id)).tag, 'beta2')
  assert.equal(s.reads[0], editionCacheKey(id), 'eerst de huidige revisie')
  // previousOf leest de oude Editie zoals altijd: de verhalen, stukken en kenmerken van toen.
  const prev = previousOf(await previousEdition(s.get, id))
  assert.ok(prev.storyIds.has('s-beta2') && prev.itemIds.has('i-beta2') && prev.keysOf.get('s-beta2').has('miller'))
  // De huidige revisie gaat voor.
  s.kv.set(editionCacheKey(id), snapshot(id, 'nu'))
  assert.equal((await previousEdition(s.get, id)).tag, 'nu')
  // Alleen edition3: die telt nog als vorige Editie.
  assert.equal((await previousEdition(store([['edition3-' + id, snapshot(id, 'oud')]]).get, id)).tag, 'oud')
  // Niets vastgelegd, of een lege Editie: geen vorige.
  assert.equal(await previousEdition(store([[editionCacheKey(id, 'redacteur-2026-11-02-beta2'), { ...beta2, entries: [] }]]).get, id), null)
  // Een leesfout is geen vorige Editie, en geen crash.
  assert.equal(await previousEdition(async () => { throw new Error('blobs weg') }, id), null)
})

test('A: generiek, ook een revisie die niet in de lijst staat, via de notitie bij het vastleggen', async () => {
  const id = '2026-11-08-avond'
  const s = store([[editionRevisionKey(id), 'redacteur-2026-12-01-vergeten'], [editionCacheKey(id, 'redacteur-2026-12-01-vergeten'), snapshot(id, 'vergeten')]])
  const hit = await findEdition(s.get, id)
  assert.equal(hit.snapshot.tag, 'vergeten')
  assert.equal(hit.revision, 'redacteur-2026-12-01-vergeten')
})

test('A: een Editie van het lopende dagdeel onder een eerdere revisie blijft staan, tenzij bewust herbouwd', async () => {
  const id = '2026-11-07-middag'
  const s = store([[editionCacheKey(id, 'redacteur-2026-11-02-beta2'), snapshot(id, 'beta2')]])
  const kept = await carriedEdition(s.get, id)
  assert.equal(kept.tag, 'beta2')
  assert.equal(kept.revision, 'redacteur-2026-11-02-beta2', 'met zijn eigen revisie, voor `version`')
  assert.ok(!s.reads.includes(editionCacheKey(id)), 'de huidige revisie leest composeEdition zelf al')
  assert.ok(!s.reads.includes('edition3-' + id), 'geen edition3 als lopende Editie')
  assert.equal(await carriedEdition(s.get, id, { rebuild: id }), null, 'bewuste herbouw')
  assert.equal((await carriedEdition(s.get, id, { rebuild: '2026-11-06-avond' })).tag, 'beta2', 'herbouw van een ander dagdeel telt niet')
  assert.equal(await carriedEdition(store([]).get, id), null, 'nog niets: de huidige revisie stelt samen')
})

test('A: composeEdition gebruikt de terugval, legt de revisie vast en geeft de revisie van de Editie zelf in `version`', () => {
  const src = readFileSync(new URL('../netlify/lib/build.mjs', import.meta.url), 'utf8')
  const body = src.slice(src.indexOf('async function composeEdition'), src.indexOf('// ---------- Bronnenlijst'))
  assert.match(body, /carriedEdition\(kvGet, slot\.id, \{ rebuild: EDITION_REBUILD_SLOT \}\)/)
  assert.match(body, /previousOf\(await previousEdition\(kvGet, previousSlotId\(slot\)\)\)/)
  assert.match(body, /kvSet\(editionRevisionKey\(slot\.id\), EDITOR_REVISION\)/)
  assert.match(body, /revision: EDITOR_REVISION, builtAt/)
  assert.match(body, /version: `\$\{stored\.revision \|\| EDITOR_REVISION\}:/)
  assert.doesNotMatch(body, /'edition3-'/, 'edition3 alleen via edition-history')
})
