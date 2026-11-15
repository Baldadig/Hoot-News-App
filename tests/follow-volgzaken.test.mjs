// Volgen 1.5 op het toestel: de pref `volgzaken`, hooguit drie, ontvolgen met Ongedaan maken, slepen, Nieuw of Niets nieuws,
// de omzetting van followStories, en dat de vlag uit niets verandert.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeVolgzaken, volg, ontvolg, herstel, verplaats, bekeken, wissel, isNieuw, nieuwTekst, inVolgorde, zetFollowStoriesOm, actief, isVol, VOLGZAKEN_MAX, GESTOPT_DAGEN, FOLLOW_DAYS, toggleFollow } from '../src/lib/follow-volgzaken.js'
import * as oud from '../src/lib/follow.js'
import { normalizePrefs, DEFAULT_PREFS } from '../src/lib/prefs.js'
import { SYNCED_PREFS, pickSynced } from '../src/lib/sync.js'
import { volgzakenAan, LOCAL_FLAG } from '../src/lib/volgzaak.js'

const NOW = Date.parse('2026-11-20T09:30:00Z')
const z = (slug, label = slug.toUpperCase()) => ({ slug, label })

test('follow.js verwijst door: de oude functies werken ongewijzigd', () => {
  assert.equal(oud.toggleFollow, toggleFollow)
  assert.equal(oud.FOLLOW_DAYS, FOLLOW_DAYS)
})

test('volgen: hooguit drie; de vierde geeft "vol" en verandert niets; al gevolgd is ok', () => {
  let list = []
  for (const s of ['gta-6', 'formatie', 'tata-steel']) list = volg(list, z(s), NOW).list
  assert.equal(actief(list).length, VOLGZAKEN_MAX)
  assert.equal(list[0].slug, 'tata-steel', 'nieuw bovenaan')
  assert.ok(isVol(list))
  const vierde = volg(list, z('starship'), NOW)
  assert.deepEqual([vierde.ok, vierde.vol, vierde.list], [false, true, list])
  const weer = volg(list, z('gta-6'), NOW)
  assert.deepEqual([weer.ok, weer.vol, weer.list], [true, false, list])
  assert.deepEqual(volg([], { slug: 'X Y', label: 'x' }, NOW), { list: [], ok: false, vol: false }, 'ongeldige slug')
})

test('ontvolgen en Ongedaan maken: de rij komt terug op haar plek, zoals ze was', () => {
  let list = []
  for (const s of ['a1', 'b2', 'c3']) list = volg(list, z(s), NOW).list
  const { list: zonder, weg, index } = ontvolg(list, 'b2')
  assert.deepEqual(zonder.map((x) => x.slug), ['c3', 'a1'])
  assert.deepEqual(herstel(zonder, weg, index), list)
  assert.deepEqual(ontvolg(list, 'nope'), { list, weg: null, index: -1 })
  const alWeer = volg(zonder, z('b2'), NOW).list
  assert.equal(herstel(alWeer, weg, index), alWeer, 'intussen weer gevolgd: niets dubbel')
})

test('slepen verandert de volgorde van de actieve rijen; gestopt blijft achteraan', () => {
  const list = [{ ...z('a1'), status: 'actief' }, { ...z('b2'), status: 'gestopt' }, { ...z('c3'), status: 'actief' }]
  assert.deepEqual(verplaats(list, 1, 0).map((x) => x.slug), ['c3', 'a1', 'b2'])
  assert.equal(verplaats(list, 0, 5), list)
})

test('Nieuw of Niets nieuws, nooit een getal: tegen de laatste keer dat je de pagina opende; nieuw eerst in Zoeken', () => {
  const zaak = { ...z('a1'), at: '2026-11-18T00:00:00Z', gezien: '2026-11-19T00:00:00Z' }
  assert.equal(isNieuw(zaak, { laatstNieuw: '2026-11-19T12:00:00Z' }), true)
  assert.equal(isNieuw(zaak, { laatstNieuw: '2026-11-18T12:00:00Z' }), false)
  assert.equal(isNieuw(zaak, null), false)
  assert.equal(isNieuw({ ...zaak, gezien: null }, { laatstNieuw: '2026-11-18T12:00:00Z' }), true, 'nooit geopend: tegen sinds wanneer je volgt')
  assert.deepEqual([nieuwTekst(true), nieuwTekst(false)], ['Nieuw', 'Niets nieuws'])
  const opened = bekeken([zaak], 'a1', NOW)
  assert.equal(opened[0].gezien, new Date(NOW).toISOString())
  const rows = inVolgorde([{ ...z('a1'), at: '2026-11-18T00:00:00Z' }, { ...z('b2'), at: '2026-11-18T00:00:00Z' }], { b2: { laatstNieuw: '2026-11-19T00:00:00Z' } })
  assert.deepEqual(rows.map((r) => [r.slug, r.nieuw]), [['b2', true], ['a1', false]])
})

test('bijsturen naar een andere volgzaak: je volgt voortaan die, op dezelfde plek', () => {
  const list = [{ ...z('a1'), status: 'actief', at: 'x' }, { ...z('gta-6'), status: 'actief' }]
  const uit = wissel(list, 'gta-6', z('gta-6-pc', 'GTA 6 op pc'), NOW)
  assert.deepEqual(uit.map((x) => x.slug), ['a1', 'gta-6-pc'])
  assert.equal(uit[1].label, 'GTA 6 op pc')
})

test('opschonen: geldige rijen, geen dubbelen, hooguit drie actief, gestopt alleen een week, velden op maat', () => {
  const raw = [
    { slug: 'a1', label: 'A', at: '2026-11-01T00:00:00Z' },
    { slug: 'a1', label: 'dubbel' },
    { slug: 'Fout!', label: 'x' },
    { slug: 'b2', label: 'B'.repeat(40) },
    { slug: 'c3', label: 'C' },
    { slug: 'd4', label: 'D' },
    { slug: 'e5', label: 'E', status: 'gestopt', gestoptAt: new Date(NOW - (GESTOPT_DAGEN + 1) * 864e5).toISOString() },
    { slug: 'f6', label: 'F', status: 'gestopt', gestoptAt: new Date(NOW - 864e5).toISOString() },
    null,
  ]
  const out = normalizeVolgzaken(raw, NOW)
  assert.deepEqual(out.map((x) => [x.slug, x.status]), [['a1', 'actief'], ['b2', 'actief'], ['c3', 'actief'], ['d4', 'gestopt'], ['f6', 'gestopt']])
  assert.equal(out[1].label.length, 24)
  assert.deepEqual(normalizeVolgzaken('kapot', NOW), [])
})

test('prefs en sync: `volgzaken` standaard leeg en mee met je account; zonder vlag ziet niemand iets', () => {
  assert.deepEqual(DEFAULT_PREFS.volgzaken, [])
  assert.deepEqual(normalizePrefs({}).volgzaken, [])
  assert.ok(SYNCED_PREFS.includes('volgzaken') && SYNCED_PREFS.includes('volgzakenOmgezet'))
  assert.ok(SYNCED_PREFS.includes('followStories'), 'followStories blijft mee tot het leeg is (oudere tabbladen)')
  assert.deepEqual(pickSynced(normalizePrefs({ volgzaken: [z('a1')] })).volgzaken.map((x) => x.slug), ['a1'])
  assert.equal('volgzakenOmgezet' in normalizePrefs({}), false)
  assert.equal(normalizePrefs({ volgzakenOmgezet: true }).volgzakenOmgezet, true)
})

const mem = (v) => ({ getItem: (k) => (k === LOCAL_FLAG ? v : null) })
test('de vlag: alleen met meta.volgzaken van de server of lokaal hoot.volgzaken=aan', () => {
  assert.equal(volgzakenAan({}, mem(null)), false)
  assert.equal(volgzakenAan(null, mem(null)), false)
  assert.equal(volgzakenAan({ volgzaken: 'ja' }, mem(null)), false)
  assert.equal(volgzakenAan({ volgzaken: true }, mem(null)), true)
  assert.equal(volgzakenAan({}, mem('aan')), true)
  assert.equal(volgzakenAan({}, { getItem: () => { throw new Error('geen opslag') } }), false)
})

const story = (id, volgzaak = null, formerIds = []) => ({ id, formerIds, itemIds: [], ...(volgzaak ? { volgzaak } : {}) })
test('omzetting van followStories: met veld wordt een volgzaak (nieuwste eerst, hooguit drie, dubbelen eruit); zonder veld loopt stil af', () => {
  const at = (d) => new Date(NOW - d * 864e5).toISOString()
  const followStories = [
    { id: 's1', title: 'A', at: at(1) },
    { id: 's2', title: 'B', at: at(2) },
    { id: 's3', title: 'C', at: at(3) },
    { id: 's4', title: 'D', at: at(4) },
    { id: 's5', title: 'E', at: at(5) },
    { id: 'oud', title: 'F', at: at(FOLLOW_DAYS + 1) },
    { id: 'zonder', title: 'G', at: at(0.5) },
  ]
  const byId = new Map([
    ['s1', story('s1', z('gta-6', 'GTA 6'))],
    ['s9', story('s9', z('formatie', 'Kabinetsformatie'), ['s2'])],
    ['s3', story('s3', z('gta-6', 'GTA 6'))],
    ['s4', story('s4', z('tata', 'Tata Steel'))],
    ['s5', story('s5', z('starship', 'Starship'))],
    ['oud', story('oud', z('oud-1', 'Oud'))],
    ['zonder', story('zonder')],
  ])
  // indexStories zet ook de oude id's in de index (src/lib/saved.js): zo vindt de omzetting een verhaal onder een nieuwe id.
  byId.set('s2', byId.get('s9'))
  const r = zetFollowStoriesOm({ followStories, volgzaken: [] }, byId, NOW)
  assert.deepEqual(r.nieuw, ['gta-6', 'formatie', 'tata'])
  assert.deepEqual(r.volgzaken.map((x) => x.slug), ['gta-6', 'formatie', 'tata'], 'het nieuwst gevolgde verhaal bovenaan')
  assert.equal(zetFollowStoriesOm({ followStories, volgzakenOmgezet: true }, byId, NOW), null, 'tweede toestel: niet opnieuw')
  const al = [{ slug: 'x1', label: 'X', status: 'actief' }]
  assert.deepEqual(zetFollowStoriesOm({ followStories, volgzaken: al }, byId, NOW), { volgzaken: al, nieuw: [] }, 'volg je al iets: niets omzetten')
  assert.deepEqual(zetFollowStoriesOm({ followStories: [{ id: 'zonder', at: at(1) }] }, byId, NOW), { volgzaken: [], nieuw: [] })
})
