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
import { dutchHeads, centralItems, previousOf } from '../netlify/lib/stories.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'

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

// B ----------------------------------------------------------------------------------------------------------------
const T = Date.parse('2026-11-07T11:00:00Z')
const at = (h) => new Date(T - h * 36e5).toISOString()
let n = 0
const art = (source, title, h) => ({ id: `r${++n}`, kind: 'article', source, title, summary: `${title}.`, publishedAt: at(h), url: `https://example.com/nieuws/${n}` })

function paraguay({ dutch = true } = {}) {
  // Een grote bundel (13+ stukken) met vooral Engelse koppen, de kop van een Engelse bron van de vroege ochtend, en later
  // Nederlandse koppen over hetzelfde feit. Een verzonnen land, zodat geen echte gebeurtenis meetelt.
  const its = [
    art('aljazeera', 'Velor’s Hanno Kreisler under military protection in bank collapse chaos', 5),
    art('bbc', 'Velor’s president Hanno Kreisler impeached and under house arrest after bank collapse', 4),
    art('guardian', 'Ousted Velor president Hanno Kreisler under house arrest after banking crisis', 9),
    art('lemonde', 'Velor’s impeached president Hanno Kreisler put under house arrest', 11),
    art('dw', 'Velor: President Hanno Kreisler under house arrest over bank crisis', 12),
    art('scmp', 'Velor’s President Hanno Kreisler impeached over banking crisis, placed under house arrest', 11),
    art('npr', 'Velor president Hanno Kreisler impeached after bank collapse', 10),
    art('nyt', 'Velor Impeaches President Hanno Kreisler Over Bank Collapse', 10),
    art('ft', 'Velor president Hanno Kreisler ousted as bank collapse freezes savings', 9),
    art('nos', 'Alliana nieuwe president van Velor, Hanno Kreisler officieel afgezet na bankcrisis', 11),
    art('nd', 'Velor beëdigt nieuwe president na afzetting Hanno Kreisler', 9),
  ]
  if (dutch) its.push(art('trouw', 'President van Velor afgezet en onder huisarrest geplaatst', 0.5), art('nu', 'Velor zet in twee dagen tijd president onder huisarrest en zweert nieuwe in', 0.7))
  // Een verdwaald Nederlands stuk in de bundel, het nieuwste van allemaal: nooit de kop.
  its.push(art('rtl', 'Verdachte van ontvoering meisje in Ohio opgepakt', 0.2))
  return its
}

function edition(members) {
  const filler = (k) => {
    const its = [art('nos', `Kabinet presenteert plan ${k} voor woningbouw in Utrecht`, 1), art('nu', `Kabinet komt met plan ${k} voor woningbouw in Utrecht`, 1)]
    return { id: `f${k}`, its }
  }
  const stories = [...[0, 1, 2, 3, 4, 5].map(filler), { id: 'velor', its: members }]
  const byStory = new Map(stories.map((s) => [s.id, s.its]))
  const entries = stories.map((s, k) => ({ kind: 'story', id: s.id, leadId: s.its[0].id, desk: s.id === 'velor' ? 'buitenland' : 'binnenland', ...(s.id === 'velor' ? { held: true } : {}) }))
  return { entries, itemsOf: (e) => byStory.get(e.id) }
}

test('B: een held-plek onder de top krijgt de nieuwere Nederlandse kop over hetzelfde feit, ook buiten de kern van de bundel', () => {
  const members = paraguay()
  const { entries, itemsOf } = edition(members)
  const lead = (e) => itemsOf(e).find((i) => i.id === e.leadId)
  const core = new Set(centralItems(members))
  assert.ok(!core.has(members.find((i) => i.source === 'trouw')) || !core.has(members.find((i) => i.source === 'nu')), 'minstens één Nederlandse kop valt buiten de kern: de nieuwe regel wordt echt getoetst')
  dutchHeads(entries, { itemsOf, mainIds: MAIN_IDS, now: T, since: T - 6.5 * 36e5 })
  assert.equal(entries[6].id, 'velor')
  assert.ok(entries[6].held, 'held blijft held')
  assert.ok(['trouw', 'nu'].includes(lead(entries[6]).source), `Nederlandse kop, niet ${lead(entries[6]).source}: ${lead(entries[6]).title}`)
})

test('B: geen Nederlandse kop als er alleen een verdwaald stuk of een kop van vóór de vorige Editie is', () => {
  const members = paraguay({ dutch: false })
  const { entries, itemsOf } = edition(members)
  dutchHeads(entries, { itemsOf, mainIds: MAIN_IDS, now: T, since: T - 6.5 * 36e5 })
  assert.equal(itemsOf(entries[6]).find((i) => i.id === entries[6].leadId).source, 'aljazeera', 'het verdwaalde stuk en de NOS/ND-koppen van vóór de vorige Editie niet')
})
