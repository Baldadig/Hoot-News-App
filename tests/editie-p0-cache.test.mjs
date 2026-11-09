// P0, ronde 3 (keuring 9 november, KEURING-2 §4): een lid opent het web met de cache van gisteren, en de
// accountpull is eerder klaar dan de feed. De cache heeft een kern van een vorig dagdeel mét de berichten die
// erbij horen (`itemsFor` dekt die kern). Vóór deze ronde zei editionReady dan ja: het web stelde de Editie
// van gisteren samen, toonde die, schreef haar in het account over de Editie van vandaag van de iPhone heen,
// en overschreef die daarna weer met zijn eigen Editie van vandaag.
//
// Deze toetsen spelen dat na met de echte rondes (src/lib/feedRounds.js), de echte editionReady/settleEdition
// (src/lib/editionSync.js) en een nep-PostgREST achter een echte supabase-js-client (tests/helpers/pgrest.mjs).
// `device` doet wat usePersonalEdition doet: bij elke toestand van de feed, als editionReady ja zegt,
// settleEdition. Twee verdedigingen, elk apart getoetst:
//   1. alleen samenstellen en schrijven op een kern die in deze sessie van het netwerk kwam (`coreFresh`);
//   2. nooit een Editie van een later dagdeel in je account overschrijven (`accountAhead`, source 'behind').
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createFeedRounds } from '../src/lib/feedRounds.js'
import { editionReady, settleEdition, accountAhead, fallbackEdition } from '../src/lib/editionSync.js'
import { fakePostgrest } from './helpers/pgrest.mjs'

const UID = '00000000-0000-4000-8000-0000000000aa'
const BASIS = 'b-alex'
const OUD = '2026-11-08-ochtend'
const NU = '2026-11-09-middag'
const SOURCES = [{ id: 'nos' }, { id: 'ftm' }]
const core = (id, v, builtAt) => ({ edition: { id, entries: [{ id: 'g1' }], items: [], builtAt }, meta: { parts: { nos: `nos-${v}`, ftm: `ftm-${v}` } }, sources: SOURCES, stories: [], items: [] })
const oud = core(OUD, 'oud', '2026-11-08T05:00:00Z')
const nu = core(NU, 'nu', '2026-11-09T11:00:00Z')
// De cache van gisteren, geschreven door deze branch: mét itemsFor, en die dekt zijn eigen (oude) kern.
const cache = () => ({ ...oud, items: [{ id: 'nos-oud-1', source: 'nos', publishedAt: '2026-11-08T06:00:00Z' }, { id: 'ftm-oud-1', source: 'ftm', publishedAt: '2026-11-08T06:00:00Z' }], itemsFor: { edition: OUD, sources: ['nos', 'ftm'] }, coreFresh: true })
// De Editie van vandaag die de iPhone al in het account zette (zelfde bronnen en interesses).
const IPHONE = { id: NU, basis: BASIS, owner: UID, builtAt: '2026-11-09T11:00:00Z', personal: true, entries: [{ id: 'iphone-1' }], items: [], iphone: true }
// Wat dit toestel al vastlegde voor gisteren (lid-oud2 van de keurder).
const LOCAL_OUD = { id: OUD, basis: BASIS, owner: UID, builtAt: '2026-11-08T05:00:00Z', personal: true, entries: [{ id: 'web-gisteren' }], items: [] }

const deferred = () => {
  let resolve
  const promise = new Promise((a) => (resolve = a))
  return { promise, resolve }
}
const tick = () => new Promise((r) => setTimeout(r, 0))

// Het web als lid, met de pull al gedaan. `fresh`: false speelt de code van vóór ronde 3 na (coreFresh genegeerd).
function device({ pg, local = null, ignoreFresh = false }) {
  const composed = []
  const results = []
  let pending = Promise.resolve()
  const state = { local }
  const attempt = (d) => {
    if (!d) return
    const ok = editionReady({ status: 'ready', global: d.edition, items: d.items.length, uid: UID, pulled: true, sync: 'ok', itemsFor: d.itemsFor, followed: ['nos', 'ftm'], coreFresh: ignoreFresh ? true : d.coreFresh })
    if (!ok) return
    pending = pending.then(() =>
      settleEdition({
        client: pg.client,
        uid: UID,
        owner: UID,
        global: d.edition,
        basis: BASIS,
        local: state.local,
        pulled: true,
        compose: () => (composed.push(d.edition.id), { id: d.edition.id, builtAt: d.edition.builtAt, personal: true, entries: [{ id: `web-${d.edition.id}` }], items: [] }),
      }).then((r) => {
        results.push(r)
        if (r?.edition) state.local = r.edition
      }),
    )
  }
  return { attempt, composed, results, state, done: () => pending }
}

async function scenario({ local = null, ignoreFresh = false } = {}) {
  const pg = fakePostgrest([{ user_id: UID, edition: { ...IPHONE } }])
  const gate = deferred()
  const fetchPart = async (id, version) => {
    if (version.endsWith('-nu')) await gate.promise // de feed is trager dan de pull
    return [{ id: `${version}-1`, source: id, publishedAt: version.endsWith('-nu') ? '2026-11-09T10:00:00Z' : '2026-11-08T06:00:00Z' }]
  }
  const dev = device({ pg, local, ignoreFresh })
  const rounds = createFeedRounds({
    initial: cache(),
    fetchCore: async () => ({ data: nu, fromCache: false }),
    fetchPart,
    fetchRelated: async () => [],
    getPrefs: () => ({ muted: [] }),
    on: { data: (d) => dev.attempt(d) },
  })
  // 1. De pull is klaar vóór de feed: de hook kijkt naar de toestand die er staat (de cache).
  dev.attempt(rounds.data)
  // 2. Load loopt: de kern van nu is er, de delen nog niet.
  const loading = rounds.load({ defer: false })
  await tick()
  dev.attempt(rounds.data)
  await dev.done()
  const before = { patches: pg.patches().length, row: { ...pg.table[0].edition } }
  // 3. De delen van nu komen.
  gate.resolve()
  await loading
  await dev.done()
  return { pg, dev, rounds, before }
}

test('ronde 3: cache van gisteren + pull vóór de feed → geen Editie van gisteren, niets in je account overschreven', async () => {
  const { pg, dev, rounds, before } = await scenario()
  assert.equal(rounds.data.edition.id, NU)
  assert.equal(rounds.data.coreFresh, true)
  assert.equal(before.patches, 0, 'zolang de kern uit de cache komt: geen schrijfactie')
  assert.deepEqual(dev.composed, [], 'nooit samengesteld: niet voor gisteren, en voor vandaag stond de Editie van de iPhone er al')
  assert.equal(pg.patches().length, 0, 'geen enkele PATCH op user_state')
  assert.equal(pg.table[0].edition.iphone, true, 'de Editie van de iPhone staat nog in je account')
  assert.equal(dev.results.length, 1)
  assert.equal(dev.results[0].source, 'account', 'het web neemt de Editie van de iPhone over')
  assert.equal(dev.results[0].edition.id, NU)
})

test('ronde 3: ook met een vastgelegde Editie van gisteren op het toestel → niets naar je account', async () => {
  const { pg, dev } = await scenario({ local: LOCAL_OUD })
  assert.equal(pg.patches().length, 0)
  assert.equal(pg.table[0].edition.iphone, true)
  assert.deepEqual(dev.composed, [])
  assert.equal(dev.results.at(-1).source, 'account')
})

test('ronde 3: zonder de coreFresh-eis loopt het tweede vangnet (accountAhead) en schrijft nog steeds niets', async () => {
  // Als de eerste verdediging zou falen (editionReady ja op de kern van gisteren), houdt settleEdition het tegen.
  const { pg, dev } = await scenario({ ignoreFresh: true })
  assert.ok(dev.results.some((r) => r?.source === 'behind'), 'het toestel loopt achter: niets samenstellen, niets schrijven')
  assert.ok(!dev.composed.includes(OUD), 'geen Editie van gisteren samengesteld')
  assert.equal(pg.patches().length, 0)
  assert.equal(pg.table[0].edition.iphone, true)
  const { pg: pg2 } = await scenario({ ignoreFresh: true, local: LOCAL_OUD })
  assert.equal(pg2.patches().length, 0, 'ook niet met de vastgelegde Editie van gisteren')
  assert.equal(pg2.table[0].edition.iphone, true)
})

test('ronde 3: accountAhead en settleEdition — een later dagdeel wint, een ouder niet', async () => {
  const yesterday = oud.edition
  const today = nu.edition
  assert.equal(accountAhead(IPHONE, yesterday), true)
  assert.equal(accountAhead(IPHONE, today), false, 'zelfde dagdeel: de gewone wedloop (claimEdition)')
  assert.equal(accountAhead(LOCAL_OUD, today), false, 'je account heeft gisteren: gewoon vervangen door vandaag')
  assert.equal(accountAhead(null, today), false)
  assert.equal(accountAhead({ id: 'x' }, today), false, 'zonder tijd niet te toetsen')
  // Je account heeft vandaag, dit toestel staat nog op gisteren.
  const pg = fakePostgrest([{ user_id: UID, edition: { ...IPHONE } }])
  let composed = 0
  const r = await settleEdition({ client: pg.client, uid: UID, owner: UID, global: yesterday, basis: BASIS, pulled: true, compose: () => (composed++, { id: OUD, entries: [], items: [] }) })
  assert.deepEqual(r, { edition: null, source: 'behind' })
  assert.equal(composed, 0)
  assert.equal(pg.patches().length, 0)
  // Omgekeerd: je account heeft gisteren, dit toestel vandaag → gewoon samenstellen en vastleggen.
  const pg2 = fakePostgrest([{ user_id: UID, edition: { ...LOCAL_OUD } }])
  const r2 = await settleEdition({ client: pg2.client, uid: UID, owner: UID, global: today, basis: BASIS, pulled: true, compose: () => ({ id: NU, builtAt: today.builtAt, entries: [{ id: 'web-nu' }], items: [] }) })
  assert.equal(r2.source, 'claimed')
  assert.equal(pg2.table[0].edition.id, NU)
})

test('ronde 3: offline met de cache van gisteren → stuck en terugval, niets naar je account', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: { ...IPHONE } }])
  let stuck = false
  const dev = device({ pg })
  const rounds = createFeedRounds({
    initial: cache(),
    fetchCore: () => Promise.reject(new TypeError('Failed to fetch')),
    fetchPart: () => Promise.reject(new TypeError('Failed to fetch')),
    fetchRelated: async () => [],
    getPrefs: () => ({ muted: [] }),
    on: { data: (d) => dev.attempt(d), stuck: (v) => (stuck = v) },
  })
  dev.attempt(rounds.data)
  await rounds.load({ defer: false })
  await dev.done()
  assert.equal(stuck, true, 'de terugval mag (geen eindeloos laden)')
  assert.deepEqual(dev.composed, [])
  // De terugval schrijft nooit: de Editie van je account past niet bij gisteren, de server is onbereikbaar.
  const fb = await fallbackEdition({ client: pg.client, uid: UID, owner: UID, global: rounds.data.edition, basis: BASIS, pulled: true, server: () => Promise.reject(new TypeError('offline')) })
  assert.equal(fb.source, 'global')
  assert.equal(pg.patches().length, 0)
  assert.equal(pg.table[0].edition.iphone, true)
})

test('ronde 3: coreFresh gaat nooit mee de cache in', async () => {
  const saved = []
  const rounds = createFeedRounds({
    initial: null,
    fetchCore: async () => ({ data: nu, fromCache: false }),
    fetchPart: async (id, v) => [{ id: `${v}-1`, source: id }],
    fetchRelated: async () => [],
    getPrefs: () => ({ muted: [] }),
    save: (d) => saved.push(d),
  })
  await rounds.load({ defer: false })
  assert.equal(rounds.data.coreFresh, true)
  assert.ok(saved.length > 0)
  assert.ok(saved.every((d) => !('coreFresh' in d)))
  // Een kern van de service worker (fromCache) is niet vers.
  const sw = createFeedRounds({ initial: null, fetchCore: async () => ({ data: nu, fromCache: true }), fetchPart: async (id, v) => [{ id: `${v}-1`, source: id }], fetchRelated: async () => [], getPrefs: () => ({ muted: [] }) })
  await sw.load({ defer: false })
  assert.equal(sw.data.coreFresh, false)
  assert.equal(sw.stuck, true)
})
