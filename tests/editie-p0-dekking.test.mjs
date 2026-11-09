// P0, ronde 2 (keuring 9 november, §5): na de wedloop-fix kon Jouw Editie op het web blijven laden. Bij het
// openen met een cache gaf de accountpull een bron erbij terwijl de ronde van nu nog liep; een ronde op de oude
// kern was eerder klaar, daarna zette load de kern van nu met de bronnen van vóór de pull. `itemsCurrent` eiste
// terecht dat elke gevolgde bron gedekt is, maar niets haalde die bron daarna nog op ('rest'/'wachten' hielden
// de oude `itemsFor`), dus editionReady bleef false tot het volgende dagdeel.
//
// Deze toetsen spelen die volgordes na met de echte rondes van useFeed (src/lib/feedRounds.js, zonder React),
// de echte gatherParts/refreshPlan/editionReady, en nep-verzoeken waarvan we de volgorde zelf bepalen.
// Bij elke toestand die de feed doorgeeft toetsen we de invariant: als editionReady ja zegt, zijn alle
// berichten van de kern van nu (nooit van een vorige kern).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createFeedRounds } from '../src/lib/feedRounds.js'
import { editionReady, fallbackEdition, previousForServer } from '../src/lib/editionSync.js'
import { refreshPlan } from '../src/lib/fresh.js'
import { covers } from '../src/lib/feedParts.js'
import { previousOf } from '../netlify/lib/stories.mjs'

const OUD = '2026-11-08-ochtend'
const NU = '2026-11-09-middag'
const SOURCES = [{ id: 'nos' }, { id: 'ftm' }, { id: 'nyt' }]
const core = (id, v) => ({ edition: { id, entries: [{ id: 'g1' }], items: [], builtAt: '2026-11-09T11:00:00Z' }, meta: { parts: { nos: `nos-${v}`, ftm: `ftm-${v}`, nyt: `nyt-${v}` } }, sources: SOURCES, stories: [], items: [] })
const oud = core(OUD, 'oud')
const nu = core(NU, 'nu')
// De cache van het vorige bezoek: de kern van gisteren, berichten van gisteren, en (zoals een cache van vóór
// itemsFor) niet wetend bij welke kern ze horen.
const cache = (itemsFor = null) => ({ ...oud, items: [{ id: 'nos-oud-cache', source: 'nos', publishedAt: '2026-11-08T07:00:00Z' }], itemsFor })

const deferred = () => {
  let resolve, reject
  const promise = new Promise((a, b) => ((resolve = a), (reject = b)))
  return { promise, resolve, reject }
}
const tick = () => new Promise((r) => setTimeout(r, 0))
const offline = () => Promise.reject(new TypeError('Failed to fetch'))

// Een feed met nep-verzoeken. `gate[versie]` houdt een deel vast tot de toets het loslaat; `fail[versie]`
// laat het (zo vaak als opgegeven, of altijd) mislukken. Elke doorgegeven toestand wordt getoetst.
function harness({ initial, prefs, coreFn, gate = {}, fail = {} }) {
  const calls = []
  const states = []
  const state = { prefs, stuck: false }
  const fetchPart = async (id, version, { signal } = {}) => {
    calls.push(version)
    if (gate[version]) await gate[version].promise
    if (signal?.aborted) throw Object.assign(new Error('afgebroken'), { name: 'AbortError' })
    if (fail[version] === Infinity || fail[version] > 0) {
      if (fail[version] !== Infinity) fail[version] -= 1
      throw new Error('Bron-fout 502')
    }
    return [{ id: `${version}-1`, source: id, publishedAt: version.endsWith('nu') ? '2026-11-09T10:00:00Z' : '2026-11-08T06:00:00Z' }]
  }
  const rounds = createFeedRounds({
    initial,
    fetchCore: coreFn,
    fetchPart,
    fetchRelated: async () => [],
    getPrefs: () => state.prefs,
    on: {
      data: (d) => states.push(d),
      stuck: (v) => (state.stuck = v),
    },
  })
  const followed = () => SOURCES.map((s) => s.id).filter((id) => !(state.prefs.muted || []).includes(id))
  const ready = (d = rounds.data) => editionReady({ status: 'ready', global: d.edition, items: d.items.length, itemsFor: d.itemsFor, followed: followed() })
  // De invariant: nooit "klaar om samen te stellen" met berichten van een andere kern dan die van nu.
  const checkAll = () => {
    for (const d of states) {
      const ok = editionReady({ status: 'ready', global: d.edition, items: d.items.length, itemsFor: d.itemsFor, followed: d.itemsFor?.sources || [] })
      if (!ok) continue
      const v = d.meta.parts.nos.split('-')[1] // de versie van de kern die er staat
      assert.ok(d.items.every((i) => i.id.includes(`-${v}-`)), `klaar voor ${d.edition.id} met berichten van een andere kern: ${d.items.map((i) => i.id)}`)
    }
  }
  return { rounds, state, calls, states, ready, checkAll }
}

const ALLEEN_NOS = { muted: ['ftm', 'nyt'] }
const NOS_FTM = { muted: ['nyt'] } // na de pull: je account geeft FTM erbij

test('dekking: oude ronde eerst klaar, daarna load met de bronnen van vóór de pull → één extra ronde, Jouw Editie komt', async () => {
  const gate = { 'nos-nu': deferred() }
  const h = harness({ initial: cache(), prefs: ALLEEN_NOS, coreFn: async () => ({ data: nu, fromCache: false }), gate })
  // 1. Openen: load haalt de kern van nu en wacht op het deel van NOS (met de bronnen van vóór de pull).
  const loading = h.rounds.load({ defer: false })
  await tick()
  // 2. De pull: FTM erbij. De ronde voor je nieuwe bronkeuze loopt nog op de kern uit de cache; de oude delen
  //    komen snel (HTTP-cache) en worden toegepast, want load is nog niet klaar.
  h.state.prefs = NOS_FTM
  const cancel = h.rounds.wantChanged()
  await cancel.done
  assert.equal(h.rounds.data.itemsFor.edition, OUD, 'de oude ronde is eerst klaar, onder de kern van gisteren')
  assert.ok(h.rounds.data.items.every((i) => i.id.includes('-oud-')), 'de oude ronde houdt haar berichten bij haar eigen kern')
  // 3. Load is klaar: de kern van nu, met de bronnen van vóór de pull. Dan één extra ronde voor FTM.
  gate['nos-nu'].resolve()
  await loading
  assert.deepEqual(h.rounds.data.itemsFor, { edition: NU, sources: ['nos', 'ftm'] })
  assert.deepEqual(h.rounds.data.items.map((i) => i.id).sort(), ['ftm-nu-1', 'nos-nu-1'])
  assert.equal(h.ready(), true, 'Jouw Editie kan samenstellen (vóór deze fix: false tot het volgende dagdeel)')
  assert.equal(h.state.stuck, false)
  assert.equal(h.calls.filter((v) => v === 'ftm-nu').length, 1, 'precies één extra deel opgehaald')
  h.checkAll()
})

test('dekking: daarna verversen bij terugkomen (plan rest) houdt Jouw Editie klaar', async () => {
  const gate = { 'nos-nu': deferred() }
  const h = harness({ initial: cache(), prefs: ALLEEN_NOS, coreFn: async () => ({ data: nu, fromCache: false }), gate })
  const loading = h.rounds.load({ defer: false })
  await tick()
  h.state.prefs = NOS_FTM
  await h.rounds.wantChanged().done
  gate['nos-nu'].resolve()
  await loading
  await h.rounds.load({ defer: true })
  assert.equal(h.ready(), true)
  h.checkAll()
})

test('dekking: rest en wachten nemen de berichten van nu als de oude je bronnen niet dekken', () => {
  const prev = { edition: { id: NU }, items: [], itemsFor: { edition: NU, sources: ['nos'] } }
  const next = { edition: { id: NU }, items: [] }
  assert.equal(refreshPlan({ defer: true, prev, next, fresh: 0, covered: covers(prev.itemsFor, next, ['nos', 'ftm']) }), 'alles')
  assert.equal(refreshPlan({ defer: true, prev, next, fresh: 3, covered: covers(prev.itemsFor, next, ['nos', 'ftm']) }), 'alles')
  assert.equal(refreshPlan({ defer: true, prev, next, fresh: 0, covered: covers(prev.itemsFor, next, ['nos']) }), 'rest')
  assert.equal(refreshPlan({ defer: true, prev, next, fresh: 3, covered: covers(prev.itemsFor, next, ['nos']) }), 'wachten')
  // Een kern zonder Editie: de dekking telt alleen de bronnen.
  assert.equal(covers({ edition: null, sources: ['nos'] }, { edition: null }, ['nos']), true)
  assert.equal(covers(null, next, []), false)
})

test('dekking: toestand met de oude dekking (itemsFor van vóór de pull) en daarna rest → ook dan klaar', async () => {
  // Precies de toestand van de keuring: de kern van nu, itemsFor zonder FTM, en de wantKey-ronde is al voorbij.
  const start = { ...nu, items: [{ id: 'nos-nu-1', source: 'nos', publishedAt: '2026-11-09T10:00:00Z' }], itemsFor: { edition: NU, sources: ['nos'] } }
  const h = harness({ initial: start, prefs: NOS_FTM, coreFn: async () => ({ data: nu, fromCache: false }) })
  assert.equal(h.ready(), false)
  await h.rounds.load({ defer: true }) // terugkomen, niets nieuws in de Stroom: vroeger 'rest' met de oude itemsFor
  assert.equal(h.ready(), true)
  h.checkAll()
})

test('dekking: offline met de cache van gisteren → begrensd, dan stuck; nooit klaar met oude berichten', async () => {
  const h = harness({ initial: cache(), prefs: ALLEEN_NOS, coreFn: offline, fail: { 'nos-oud': Infinity } })
  await h.rounds.load({ defer: false })
  assert.equal(h.ready(), false)
  assert.equal(h.state.stuck, true, 'geen eindeloos laden: de terugval mag')
  assert.equal(h.calls.length, 1, 'één extra poging')
  // Terugkomen terwijl je nog offline bent: geen nieuwe pogingen, geen samenstelling.
  await h.rounds.load({ defer: true })
  await h.rounds.load({ defer: true })
  assert.equal(h.calls.length, 1)
  assert.equal(h.state.stuck, true)
  h.checkAll()
})

test('dekking: offline, en de pull geeft een bron erbij → stuck, de cache-berichten blijven ongebruikt voor Jouw Editie', async () => {
  // Een cache die wél weet bij welke kern hij hoort (gisteren, alleen NOS).
  const h = harness({ initial: cache({ edition: OUD, sources: ['nos'] }), prefs: ALLEEN_NOS, coreFn: offline, fail: { 'nos-oud': Infinity, 'ftm-oud': Infinity } })
  await h.rounds.load({ defer: false })
  assert.equal(h.state.stuck, false, 'de cache dekt zijn eigen kern; de vastgelegde Editie van toen mag blijven')
  h.state.prefs = NOS_FTM
  await h.rounds.wantChanged().done
  assert.equal(h.ready(), false)
  assert.equal(h.state.stuck, true)
  h.checkAll()
})

test('dekking: online, maar de kern van nu komt eerst en daarna gaat het netwerk weg → stuck, daarna herstel', async () => {
  const fail = { 'ftm-nu': 2 } // het deel van FTM mislukt in de ronde van load én in de extra ronde
  const h = harness({ initial: cache(), prefs: NOS_FTM, coreFn: async () => ({ data: nu, fromCache: false }), fail })
  await h.rounds.load({ defer: false })
  assert.deepEqual(h.rounds.data.itemsFor, { edition: NU, sources: ['nos'] }, 'FTM kwam niet: niet gedekt')
  assert.equal(h.ready(), false)
  assert.equal(h.state.stuck, true)
  assert.equal(h.calls.filter((v) => v === 'ftm-nu').length, 2, 'load plus één extra ronde: begrensd')
  // Een volgende ronde (terugkomen, het kwartier) en het lukt: gewoon samenstellen.
  await h.rounds.load({ defer: true })
  assert.equal(h.ready(), true)
  assert.equal(h.state.stuck, false)
  h.checkAll()
})

test('dekking: een nieuwe kern tijdens de extra ronde → die ronde vervalt, de nieuwe toetst zelf', async () => {
  const gate = { 'ftm-nu': deferred() }
  const avond = core('2026-11-09-avond', 'avond')
  let coreOf = nu
  const h = harness({ initial: { ...nu, items: [{ id: 'nos-nu-1', source: 'nos' }], itemsFor: { edition: NU, sources: ['nos'] } }, prefs: NOS_FTM, coreFn: async () => ({ data: coreOf, fromCache: false }), gate })
  const first = h.rounds.load({ defer: true }) // haalt ftm-nu in de load-ronde, die wacht
  await tick()
  coreOf = avond
  const second = h.rounds.load({ defer: false }) // breekt de eerste af
  await second
  gate['ftm-nu'].resolve()
  await first
  assert.equal(h.rounds.data.edition.id, '2026-11-09-avond')
  assert.equal(h.ready(), true)
  assert.ok(h.rounds.data.items.every((i) => i.id.includes('-avond-')))
  h.checkAll()
})

test('terugval: account, dan server, dan de algemene Editie — nooit samenstellen', async () => {
  const global = { id: NU, entries: [{ id: 'g1' }], items: [], brief: { text: 'algemeen' }, builtAt: '2026-11-09T11:00:00Z' }
  const basis = 'b1'
  // Offline: geen account (niet opgehaald), server faalt → de algemene Editie, zonder samenvatting.
  const off = await fallbackEdition({ global, basis, owner: 'anon', server: offline })
  assert.equal(off.source, 'global')
  assert.equal(off.edition.brief, null)
  assert.equal(off.edition.owner, 'anon')
  // Online: de server stelt samen; gemerkt als terugval, met jouw afdruk.
  const seen = []
  const server = async (body) => (seen.push(body), { id: NU, entries: [{ id: 's1' }], items: [] })
  const local = { id: OUD, owner: 'anon', entries: [{ id: 'x', kind: 'story', itemIds: ['i1'] }], items: [{ id: 'x', title: 'Kop van gisteren' }], builtAt: '2026-11-08T05:00:00Z' }
  const on = await fallbackEdition({ global, basis, owner: 'anon', server, local, request: { followed: ['nos'] } })
  assert.equal(on.source, 'server')
  assert.equal(on.edition.fallback, true)
  assert.equal(on.edition.basis, basis)
  assert.deepEqual(seen[0].followed, ['nos'])
  assert.ok(seen[0].previous.storyIds.includes('x'), 'wat in je vorige Editie stond gaat mee naar de server')
  assert.ok(JSON.stringify(seen[0]).length > 0, 'de aanvraag is JSON')
  // Een antwoord voor een ander dagdeel telt niet.
  const wrong = await fallbackEdition({ global, basis, owner: 'anon', server: async () => ({ id: OUD, entries: [] }) })
  assert.equal(wrong.source, 'global')
  // Lid na de pull, en je account heeft de Editie van dit dagdeel: die.
  const theirs = { id: NU, basis, owner: 'u', entries: [{ id: 'a1' }], items: [] }
  const client = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { edition: theirs } }) }) }) }) }
  let asked = false
  const acc = await fallbackEdition({ client, uid: 'u', owner: 'u', global, basis, pulled: true, server: async () => ((asked = true), null) })
  assert.equal(acc.source, 'account')
  assert.equal(acc.edition.id, NU)
  assert.equal(asked, false, 'de server is dan niet nodig')
})

test('terugval: previous in de platte vorm van POST /api/edition', () => {
  const p = previousOf([{ id: OUD, builtAt: '2026-11-08T05:00:00Z', entries: [{ id: 's', kind: 'story', keys: ['k'] }], items: [] }])
  const flat = previousForServer(p)
  assert.deepEqual(flat.storyIds, ['s'])
  assert.deepEqual(flat.keysOf, { s: ['k'] })
  assert.ok(flat.atOf.s > 0)
  assert.equal(previousForServer(null), null)
  assert.doesNotThrow(() => JSON.stringify(flat))
})
