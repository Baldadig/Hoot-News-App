// Pariteit web en app (Hoot-design/algoritme/aanvulling-pariteit-herhaling.md P8, §3): dezelfde lezer
// krijgt op elk toestel dezelfde Editie. Hier de server-route (POST /api/edition als terugval, P8-7)
// tegen de web-route (composePersonal zoals usePersonalEdition.js hem aanroept), op de momentopname.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadSnapshot, PERSONAS, setupFor, readIdsOf } from './helpers/snapshot.mjs'
import { editionFor, READ_MAX } from '../netlify/functions/edition.mjs'
import { composePersonal, withoutDebug, editionBasis } from '../src/lib/personal.js'

const snap = loadSnapshot()
const start = { edition: snap.edition, stories: snap.stories, sources: snap.sources, meta: snap.meta }
const NOW = Date.parse(snap.edition.builtAt) // de start van het dagdeel, zoals de hook en de server rekenen
const byRecency = (a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '')
// Zoals de web-app (useFeed.gather): de berichten van de gevolgde bronnen, op tijd gesorteerd.
const webItems = (followed) => snap.items.filter((i) => followed.has(i.source)).sort(byRecency)
// Zoals functions/edition.mjs: de delen van de gevolgde bronnen, in de volgorde van `followed`.
const serverItems = (followed) => [...followed].flatMap((id) => snap.items.filter((i) => i.source === id))
const bodyOf = (setup, readIds = new Set()) => ({ followed: [...setup.followed], interests: setup.interests, topics: setup.topics, favorites: setup.favorites, taste: setup.taste, readIds: [...readIds] })
// De plekken als verhalen (zoals de meetlat): verhaal-id, of het verhaal van een los bericht.
const storyOfItem = new Map(snap.stories.flatMap((s) => s.itemIds.map((id) => [id, s.id])))
const keysOf = (ed) => ed.entries.map((e) => (e.kind === 'story' ? e.id : storyOfItem.get(e.id) || e.id))
const lezers = PERSONAS.map((p) => {
  const setup = setupFor(p, snap.sources, 'echt')
  return { p, setup, readIds: p.interests.length + p.topics.length ? readIdsOf(snap, p, setup.followed) : new Set() }
})

test('P8-7: de server-route antwoordt als terugval, met afdruk, zonder eigenaar en zonder punten', () => {
  const { setup, readIds } = lezers.find((l) => l.p.id === 'vs')
  const ed = editionFor(start, serverItems(setup.followed), bodyOf(setup, readIds))
  assert.equal(ed.fallback, true)
  assert.equal(ed.owner, null)
  assert.equal(ed.personal, true)
  assert.equal(ed.basis, editionBasis([...setup.followed], setup.interests, setup.topics, setup.favorites))
  assert.equal(ed.version, `${snap.edition.id}@mine@${snap.edition.builtAt}`, 'de versie volgt het dagdeel, op de start ervan')
  assert.equal(ed.builtAt, snap.edition.builtAt, 'now = builtAt, niet de klok')
  assert.equal(ed.entries.length, 10)
  assert.ok(!Object.keys(ed).some((k) => k.startsWith('_')) && ed.entries.every((e) => !Object.keys(e).some((k) => k.startsWith('_'))))
  // Een leeg of ongeldig lichaam geeft toch een Editie (alle bronnen uit, dus uit de algemene Editie), geen fout.
  assert.ok(editionFor(start, [], {})?.entries.length)
  assert.equal(editionFor({ ...start, edition: null }, [], {}), null)
})

test('P8-7: readIds tellen mee (wat je las komt niet terug), hooguit READ_MAX', () => {
  const { setup } = lezers.find((l) => l.p.id === 'klimaat')
  const items = serverItems(setup.followed)
  const plain = editionFor(start, items, bodyOf(setup))
  // Alles wat nu in de Editie staat als gelezen: dan verandert hij (behalve groot nieuws en Vervolg).
  const leads = plain.entries.filter((e) => e.why?.code !== 'groot' && e.kind === 'story').map((e) => e.leadId || e.id)
  assert.ok(leads.length >= 3)
  const read = editionFor(start, items, bodyOf(setup, new Set(leads)))
  assert.notDeepEqual(keysOf(read), keysOf(plain), 'gelezen plekken maken plaats')
  assert.deepEqual(read, { ...withoutDebug(composePersonal({ global: snap.edition, stories: snap.stories, items, sources: snap.sources, followed: setup.followed, interests: setup.interests, topics: setup.topics, favorites: setup.favorites, taste: setup.taste, now: NOW, readIds: new Set(leads) })), basis: plain.basis, owner: null, fallback: true })
  // Grens: na READ_MAX id's telt de rest niet meer.
  assert.equal(READ_MAX, 1500)
  const padded = [...Array.from({ length: READ_MAX }, (_, k) => `vulling-${k}`), ...leads]
  assert.deepEqual(editionFor(start, items, { ...bodyOf(setup), readIds: padded }), plain)
  // Een onzinnige lijst (geen array, vreemde tekens) telt als leeg.
  assert.deepEqual(editionFor(start, items, { ...bodyOf(setup), readIds: 'nos:1' }), plain)
  assert.deepEqual(editionFor(start, items, { ...bodyOf(setup), readIds: [{ id: leads[0] }, 'met spatie ', leads[0] + '\n'] }), plain)
})

test('P8-7: affinity wordt genegeerd, taste telt wel', () => {
  let tasteTelt = 0
  for (const { setup } of lezers) {
    const items = serverItems(setup.followed)
    const plain = editionFor(start, items, bodyOf(setup))
    assert.deepEqual(editionFor(start, items, { ...bodyOf(setup), affinity: { n: 400, topics: { voetbal: 200 }, sources: { 'nos-sport': 200 } } }), plain)
    if (JSON.stringify(editionFor(start, items, { ...bodyOf(setup), taste: { topics: { voetbal: 12, wonen: -12 }, sources: {} } })) !== JSON.stringify(plain)) tasteTelt++
  }
  assert.ok(tasteTelt > 0, 'meer of minder hiervan verandert de Editie van ten minste één lezer')
})

// G9 (§3): web-route vs server-route voor dezelfde lezer = 0/10 verschil, byte-gelijk op de velden die
// de server erbij zet na. De web-app geeft de berichten op tijd gesorteerd, de server per bron: de
// samensteller mag daar niet van afhangen (totale vergelijkers, bouwspec §9).
test('G9: web-route en server-route geven alle twaalf persona\'s dezelfde Editie (0/10 anders)', (t) => {
  let anders = 0
  for (const { p, setup, readIds } of lezers) {
    const web = withoutDebug(composePersonal({ global: snap.edition, stories: snap.stories, items: webItems(setup.followed), sources: snap.sources, followed: setup.followed, interests: setup.interests, topics: setup.topics, favorites: setup.favorites, affinity: setup.affinity, taste: setup.taste, now: NOW, previous: null, readIds }))
    const { basis, owner, fallback, ...server } = editionFor(start, serverItems(setup.followed), bodyOf(setup, readIds))
    const S = new Set(keysOf(server))
    anders += keysOf(web).filter((k) => !S.has(k)).length
    // Zonder affinity op het web (het toestel van iemand die nog niets las) is het antwoord byte-gelijk.
    const webKaal = withoutDebug(composePersonal({ global: snap.edition, stories: snap.stories, items: webItems(setup.followed), sources: snap.sources, followed: setup.followed, interests: setup.interests, topics: setup.topics, favorites: setup.favorites, affinity: null, taste: setup.taste, now: NOW, previous: null, readIds }))
    assert.equal(JSON.stringify(server), JSON.stringify(webKaal), `${p.id}: server-route ≠ web-route zonder affinity`)
    assert.equal(basis, editionBasis([...setup.followed], setup.interests, setup.topics, setup.favorites), p.id)
  }
  t.diagnostic(`web (met affinity) vs server (zonder): ${anders} plekken anders over ${lezers.length} lezers`)
  // Met affinity op het web verschilt het antwoord van de terugval (§8: affinity gaat niet mee); dat is
  // waarom de app zelf samenstelt en de terugval nooit in het account komt (P8-6). De terugval is wél
  // byte-gelijk aan het web zonder affinity (hierboven), dus het verschil zit alleen in de invoer.
})
