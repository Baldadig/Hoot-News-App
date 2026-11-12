import { RUBRIEKEN } from '../src/lib/topics.js'
import { editionStoryCount } from '../shared/edition-limits.mjs'
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
// `rubrieken`: de persona's kozen in de indeling van nu (Games onder Cultuur); zonder zet de server ze eerst om.
const bodyOf = (setup, readIds = new Set()) => ({ followed: [...setup.followed], interests: setup.interests, topics: setup.topics, rubrieken: RUBRIEKEN, favorites: setup.favorites, taste: setup.taste, readIds: [...readIds] })
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
  assert.equal(editionStoryCount(ed.entries), 10)
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

// ---------- Twee toestellen, één account (P8-2, P8-3, P8-5), tegen een nep-PostgREST ----------
// De wedloop zoals usePersonalEdition.js hem speelt via src/lib/editionSync.js: beide toestellen lezen
// het account (leeg), stellen samen met hun eigen leesprofiel en gelezen-lijst, en schrijven conditioneel.
// De eerste schrijver wint; de tweede ziet 0 rijen, leest de rij en neemt die Editie over.
import { fakePostgrest } from './helpers/pgrest.mjs'
import { settleEdition, editionReady, claimEdition, claimFilter, writeBrief, adoptEdition, TABLE } from '../src/lib/editionSync.js'
import { historyOf } from '../netlify/lib/stories.mjs'

const UID = 'u1'
// Hetzelfde account op een ander toestel: daar las hij andere dingen (affinity blijft op het toestel, §8).
const otherDevice = (a) => {
  if (!a) return { n: 12, topics: { voetbal: 6, economie: 4 }, sources: { nos: 8, nu: 4 } }
  const half = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, Math.round(v * 50) / 100]))
  // Het andere toestel las ook iets anders (voetbal, economie): zonder dat is een lezer die één onderwerp volgt op beide gelijk.
  return { n: Math.max(8, Math.round((a.n || 0) / 2)), topics: { ...half(a.topics), voetbal: 6, economie: 4 }, sources: half(a.sources) }
}
// Een toestel: zijn samensteller met zijn eigen invoer, en wat er lokaal ligt.
const device = ({ setup, affinity, readIds, local = null }) => ({
  local,
  compose: ({ previous, now }) => composePersonal({ global: snap.edition, stories: snap.stories, items: webItems(setup.followed), sources: snap.sources, followed: setup.followed, interests: setup.interests, topics: setup.topics, favorites: setup.favorites, affinity, taste: setup.taste, now, previous, readIds }),
})
const basisOf = (setup) => editionBasis([...setup.followed], setup.interests, setup.topics, setup.favorites)
// De getoonde Editie, zonder de history (die is per toestel de vereniging van wat het zelf had en wat
// het overnam) — alles wat de lezer ziet moet byte-gelijk zijn.
const shownOf = ({ history, ...e }) => JSON.stringify(e)

test('P8-3: wedloop tussen twee toestellen — de eerste wint, de tweede neemt over en schrijft niets', async () => {
  const { setup, readIds } = lezers.find((l) => l.p.id === 'vs')
  const pg = fakePostgrest([{ user_id: UID, prefs: {}, read_ids: [], stories_seen: {}, edition: null }])
  const A = device({ setup, affinity: setup.affinity, readIds })
  const B = device({ setup, affinity: otherDevice(setup.affinity), readIds: new Set() })
  const common = { client: pg.client, uid: UID, owner: UID, global: snap.edition, basis: basisOf(setup), pulled: true }
  // Zonder account zouden ze verschillen (ander leesprofiel, andere gelezen-lijst): dat is wat de wedloop oplost.
  const alone = [A, B].map((d) => d.compose({ previous: null, now: NOW }))
  assert.notEqual(JSON.stringify(withoutDebug(alone[0])), JSON.stringify(withoutDebug(alone[1])), 'de toestellen rekenen anders')
  const [ra, rb] = await Promise.all([settleEdition({ ...common, ...A }), settleEdition({ ...common, ...B })])
  assert.equal(ra.source, 'claimed')
  assert.equal(rb.source, 'account')
  assert.equal(shownOf(rb.edition), shownOf(ra.edition), 'byte-gelijk')
  assert.equal(shownOf(ra.edition), shownOf({ ...withoutDebug(alone[0]), owner: UID, basis: common.basis }), 'A toont wat A rekende')
  assert.equal(rb.edition.owner, UID)
  // Beide toestellen sturen de voorwaardelijke PATCH; alleen die van A raakt een rij. Het account draagt
  // A's Editie; B leest na zijn 0 rijen de rij en neemt over.
  const writes = pg.writes()
  assert.equal(pg.patches().length, 2)
  assert.equal(writes.length, 1)
  assert.deepEqual(pg.log.map((l) => l.method), ['GET', 'GET', 'PATCH', 'PATCH', 'GET'])
  assert.equal(writes[0].method, 'PATCH')
  assert.equal(writes[0].table, TABLE)
  assert.equal(writes[0].params.user_id, `eq.${UID}`)
  assert.equal(writes[0].params.or, `(${claimFilter({ id: snap.edition.id, basis: common.basis })})`)
  assert.equal(writes[0].params.or, `(edition.is.null,edition->>id.neq.${snap.edition.id},edition->>basis.neq.${common.basis})`)
  assert.ok(writes[0].prefer.includes('return=representation'))
  assert.equal(shownOf(pg.table[0].edition), shownOf(ra.edition))
  assert.ok(!('_parts' in ra.edition.entries[0]) && !('_plan' in ra.edition), 'zonder velden ter inzage')
})

test('P8-3: andersom gestart wint het andere toestel; de uitkomst is dezelfde Editie van het eerste toestel', async () => {
  const { setup, readIds } = lezers.find((l) => l.p.id === 'klimaat')
  const pg = fakePostgrest([{ user_id: UID, edition: null }])
  const common = { client: pg.client, uid: UID, owner: UID, global: snap.edition, basis: basisOf(setup), pulled: true }
  const B = device({ setup, affinity: otherDevice(setup.affinity), readIds: new Set() })
  const A = device({ setup, affinity: setup.affinity, readIds })
  const [rb, ra] = await Promise.all([settleEdition({ ...common, ...B }), settleEdition({ ...common, ...A })])
  assert.equal(rb.source, 'claimed')
  assert.equal(ra.source, 'account')
  assert.equal(shownOf(ra.edition), shownOf(rb.edition))
  assert.equal(pg.writes().length, 1)
})

test('G6: staat er al een Editie met dit dagdeel en deze afdruk in je account, dan schrijft het tweede toestel nooit', async () => {
  const { setup, readIds } = lezers.find((l) => l.p.id === 'vs')
  const first = { ...withoutDebug(device({ setup, affinity: setup.affinity, readIds }).compose({ previous: null, now: NOW })), owner: UID, basis: basisOf(setup), history: [] }
  const pg = fakePostgrest([{ user_id: UID, edition: first }])
  const r = await settleEdition({ client: pg.client, uid: UID, owner: UID, global: snap.edition, basis: first.basis, pulled: true, ...device({ setup, affinity: null, readIds: new Set() }) })
  assert.equal(r.source, 'account')
  assert.equal(shownOf(r.edition), shownOf(first))
  assert.equal(pg.writes().length, 0)
  assert.equal(pg.log.length, 1, 'één keer lezen, verder niets')
  // Ook na een herstart met dezelfde Editie lokaal: alleen lezen, niet schrijven.
  const again = await settleEdition({ client: pg.client, uid: UID, owner: UID, global: snap.edition, basis: first.basis, pulled: true, local: first, compose: () => assert.fail('niet opnieuw rekenen') })
  assert.equal(again.source, 'account')
  assert.equal(pg.writes().length, 0)
})

test('P8-3: een Editie uit andere bronnen of interesses (andere afdruk) is niet de jouwe: die wordt vervangen', async () => {
  const { setup, readIds } = lezers.find((l) => l.p.id === 'haags')
  const stale = { id: snap.edition.id, builtAt: snap.edition.builtAt, basis: 'oud', owner: UID, entries: [], items: [], history: [] }
  const pg = fakePostgrest([{ user_id: UID, edition: stale }])
  const r = await settleEdition({ client: pg.client, uid: UID, owner: UID, global: snap.edition, basis: basisOf(setup), pulled: true, ...device({ setup, affinity: setup.affinity, readIds }) })
  assert.equal(r.source, 'claimed')
  assert.equal(pg.writes().length, 1)
  assert.equal(pg.table[0].edition.basis, basisOf(setup))
  // Een ander dagdeel in het account (gisteravond) telt als "van toen": previous, en de history draagt hem.
  const gister = { ...stale, id: '2026-10-30-middag', basis: basisOf(setup), builtAt: '2026-10-30T11:00:00.000Z', entries: [{ kind: 'story', id: 'st-x', leadId: 'i-x', itemIds: ['i-x'], title: 'Kop' }] }
  const pg2 = fakePostgrest([{ user_id: UID, edition: gister }])
  let seen = null
  const r2 = await settleEdition({ client: pg2.client, uid: UID, owner: UID, global: snap.edition, basis: basisOf(setup), pulled: true, compose: (x) => ((seen = x.previous), device({ setup, affinity: null, readIds: new Set() }).compose(x)) })
  assert.equal(r2.source, 'claimed')
  assert.ok(seen.storyIds.has('st-x'), 'de Editie uit het account is previous')
  assert.deepEqual(r2.edition.history.map((h) => h.id), ['2026-10-30-middag'])
})

test('G7 / P8-2: niet samenstellen vóór één geslaagde sync-pull; zonder account anoniem, nooit naar user_state', async () => {
  const base = { status: 'ready', global: snap.edition, items: 10, itemsFor: { edition: snap.edition.id, sources: [] }, coreFresh: true }
  assert.equal(editionReady({ ...base, uid: null, coreFresh: false }), false, 'een kern uit de cache: niet samenstellen (keuring P0 ronde 2)')
  assert.equal(editionReady({ ...base, uid: UID, pulled: false, sync: 'syncing' }), false)
  assert.equal(editionReady({ ...base, uid: UID, pulled: false, sync: 'idle' }), false)
  assert.equal(editionReady({ ...base, uid: UID, pulled: true, sync: 'syncing' }), true)
  assert.equal(editionReady({ ...base, uid: UID, pulled: false, sync: 'error' }), true, 'offline: toch, maar lokaal')
  assert.equal(editionReady({ ...base, uid: null }), true, 'zonder account meteen')
  assert.equal(editionReady({ ...base, status: 'loading', uid: null }), false)
  assert.equal(editionReady({ ...base, items: 0, uid: null }), false)
  const { setup } = lezers.find((l) => l.p.id === 'nieuw')
  // Lid, ophalen niet gelukt: samenstellen, lokaal houden, het account niet aanraken.
  const pg = fakePostgrest([{ user_id: UID, edition: null }])
  const r = await settleEdition({ client: pg.client, uid: UID, owner: UID, global: snap.edition, basis: basisOf(setup), pulled: false, ...device({ setup, affinity: null, readIds: new Set() }) })
  assert.equal(r.source, 'unsynced')
  assert.equal(r.edition.owner, UID)
  assert.equal(pg.log.length, 0, 'geen enkele aanvraag')
  // Daarna lukt het ophalen: dezelfde lokale Editie wordt alsnog geschreven, zonder opnieuw te rekenen.
  const r2 = await settleEdition({ client: pg.client, uid: UID, owner: UID, global: snap.edition, basis: basisOf(setup), pulled: true, local: r.edition, compose: () => assert.fail('niet opnieuw rekenen') })
  assert.equal(r2.source, 'claimed')
  assert.equal(shownOf(r2.edition), shownOf(r.edition))
  // Zonder account: anoniem, geen client, geen aanvraag.
  const anon = await settleEdition({ client: null, uid: null, owner: 'anon', global: snap.edition, basis: basisOf(setup), pulled: false, ...device({ setup, affinity: null, readIds: new Set() }) })
  assert.equal(anon.source, 'anon')
  assert.equal(anon.edition.owner, 'anon')
  assert.equal(shownOf(anon.edition), shownOf({ ...withoutDebug(device({ setup, affinity: null, readIds: new Set() }).compose({ previous: null, now: NOW })), owner: 'anon', basis: basisOf(setup) }), 'precies de Editie van vóór P8')
  assert.deepEqual(anon.edition.history, [])
  // Een anonieme Editie van vóór het inloggen is niet die van de lezer: opnieuw samenstellen, met zijn naam.
  const after = await settleEdition({ client: pg.client, uid: 'u2', owner: 'u2', global: snap.edition, basis: basisOf(setup), pulled: true, local: anon.edition, compose: device({ setup, affinity: null, readIds: new Set() }).compose })
  assert.equal(after.edition.owner, 'u2')
})

test('P8-5: een overgenomen Editie wordt previous — history van beide toestellen, de samenvatting blijft', async () => {
  const T0 = Date.parse('2026-10-30T05:00:00Z')
  const at = (h) => new Date(T0 + h * 36e5).toISOString()
  const ed = (id, h, history = []) => ({ id, builtAt: at(h), owner: UID, basis: 'b', entries: [{ kind: 'story', id: 'st-' + id, leadId: 'i-' + id, itemIds: ['i-' + id], title: 'Kop ' + id }], items: [], history })
  const ochtend = ed('2026-10-30-ochtend', 0)
  const middag = ed('2026-10-30-middag', 6, [historyOf(ochtend)]) // dit toestel: Ochtend en Middag
  const avondA = { ...ed('2026-10-30-avond', 11, [historyOf(ochtend)]), brief: { sections: [] } } // het andere toestel sloeg de Middag over
  const pg = fakePostgrest([{ user_id: UID, edition: avondA }])
  const global = { id: '2026-10-30-avond', builtAt: at(11) }
  const r = await settleEdition({ client: pg.client, uid: UID, owner: UID, global, basis: 'b', pulled: true, local: middag, compose: () => assert.fail('overnemen, niet rekenen') })
  assert.equal(r.source, 'account')
  assert.deepEqual(r.edition.history.map((h) => h.id), ['2026-10-30-middag', '2026-10-30-ochtend'], 'de Middag van hier plus de Ochtend uit het account')
  assert.deepEqual(r.edition.brief, { sections: [] })
  assert.equal(pg.writes().length, 0)
  // De samenvatting van dit toestel blijft als het account er nog geen heeft.
  const withBrief = adoptEdition({ ...avondA, brief: null }, { local: { ...avondA, brief: { sections: [1] } }, owner: UID, id: avondA.id })
  assert.deepEqual(withBrief.brief, { sections: [1] })
  assert.equal(adoptEdition({ ...avondA, brief: null }, { local: middag, owner: UID, id: avondA.id }).brief, null)
})

test('P8-3: geen rij in het account (of een fout) is geen winst en geen crash: lokaal houden', async () => {
  const { setup } = lezers.find((l) => l.p.id === 'nieuw')
  const pg = fakePostgrest([]) // nog geen user_state-rij
  const r = await settleEdition({ client: pg.client, uid: UID, owner: UID, global: snap.edition, basis: basisOf(setup), pulled: true, ...device({ setup, affinity: null, readIds: new Set() }) })
  assert.equal(r.source, 'unsynced')
  assert.equal(r.edition.owner, UID)
  const c = await claimEdition(pg.client, UID, { id: 'x', basis: 'y' })
  assert.deepEqual(c, { won: false, theirs: null })
  // Een client die faalt: geen onafgehandelde fout.
  const broken = { from: () => { throw new Error('offline') } }
  const rb = await settleEdition({ client: broken, uid: UID, owner: UID, global: snap.edition, basis: basisOf(setup), pulled: true, ...device({ setup, affinity: null, readIds: new Set() }) }).catch((e) => ({ source: 'fout', e }))
  assert.equal(rb.source, 'fout', 'de hook vangt dit (catch) en probeert het de volgende keer')
})

test('P8-3: de samenvatting alleen bij de Editie die er nog staat (zelfde id en afdruk)', async () => {
  const mine = { id: snap.edition.id, basis: 'b1', owner: UID, entries: [], items: [], history: [], brief: null }
  const pg = fakePostgrest([{ user_id: UID, edition: mine }])
  await writeBrief(pg.client, UID, { ...mine, brief: { sections: [] } })
  assert.deepEqual(pg.table[0].edition.brief, { sections: [] })
  const w = pg.writes()[0]
  assert.equal(w.params['edition->>id'], `eq.${snap.edition.id}`)
  assert.equal(w.params['edition->>basis'], 'eq.b1')
  // Intussen een andere Editie in het account (andere afdruk): die blijft onaangeroerd.
  pg.table[0].edition = { ...mine, basis: 'b2', brief: null }
  await writeBrief(pg.client, UID, { ...mine, brief: { sections: [1] } })
  assert.equal(pg.table[0].edition.brief, null)
  assert.equal(pg.table[0].edition.basis, 'b2')
})

// ---------- De maten van §3 (tests/helpers/pariteit.mjs, ook de meetlat in meting/acceptatie.mjs) ----------
import { measureParity } from './helpers/pariteit.mjs'

test('§3: pariteit web-route vs server-route = 0/10, en twee toestellen van één account byte-gelijk, twaalf persona\'s', async (t) => {
  const m = await measureParity(snap)
  t.diagnostic(`route: ${m.routeAnders.toFixed(2)}/10 anders, byte-gelijk ${Math.round(m.routeByte * 100)} %; met leesprofiel op het web ${m.routeAndersAffinity.toFixed(2)}/10 (§8, informatie); twee toestellen: ${m.toestellenAnders.toFixed(2)}/10 anders, byte-gelijk ${Math.round(m.toestellenByte * 100)} % (zonder account ${m.toestellenAlleen.toFixed(2)}/10), schrijfacties per wedloop ${m.schrijfacties}`)
  assert.equal(m.rows.length, 12)
  assert.equal(m.routeAnders, 0)
  assert.equal(m.routeByte, 1)
  assert.equal(m.toestellenAnders, 0)
  assert.equal(m.toestellenByte, 1)
  assert.equal(m.schrijfacties, 1)
  assert.ok(m.toestellenAlleen > 0, 'zonder account zouden de toestellen verschillen: de meting bewijst iets')
})
