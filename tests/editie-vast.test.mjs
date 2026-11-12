// Editie vast (12 november 2026, melding Alex: "Mijn avondeditie op mijn account is nu al 3x gewijzigd. Die zou
// toch vast moeten staan?"). Oorzaak: sinds de rubrieken van fase 2 (Games onder Cultuur) vraagt het web in de
// indeling van nu (`rubrieken: 2`) en app 1.2.1 in de oude. De server zette de oude keuze wel om (choiceOf), maar
// toetste de Editie in je account op de afdruk van de vraag zelf: web en iPhone hadden zo elk een andere afdruk,
// en bij elke wissel van toestel stelde de server opnieuw samen en schreef hij over de Editie heen (claimOver).
// Hier: om en om vragen in één dagdeel geeft één Editie; een echte wijziging van je interesses een nieuwe.
// Met de vaste momentopname, een nep-PostgREST en nep-opslag: geen netwerk, geen echte accountgegevens.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handle, basesOf, profileOf } from '../netlify/functions/edition.mjs'
import { writeBrief } from '../src/lib/editionSync.js'
import { editionBasis } from '../src/lib/personal.js'
import { currentChoice, RUBRIEKEN } from '../src/lib/topics.js'
import { fakePostgrest } from './helpers/pgrest.mjs'
import { loadSnapshot, PERSONAS, setupFor } from './helpers/snapshot.mjs'

const snap = loadSnapshot()
const start = { edition: snap.edition, stories: snap.stories, sources: snap.sources, meta: {} }
const setup = setupFor(PERSONAS.find((p) => p.id === 'klimaat'), snap.sources)
const UID = '00000000-0000-4000-8000-000000000001'
const base = { followed: [...setup.followed], favorites: setup.favorites, taste: setup.taste }
const sorted = (xs) => [...xs].sort()

// Cultuur "alles" zoals het welkom hem bewaarde (de hele oude lijst), en Tech met alleen AI: in de nieuwe
// indeling komt Games bij Cultuur. Zelfde lezer, andere woorden.
const OLD = { interests: ['wetenschap', 'cultuur', 'tech'], topics: [...setup.topics, 'muziek', 'film', 'boeken', 'kunst', 'media', 'ai'] }
const NEW = currentChoice(OLD.interests, OLD.topics)
// Zoals het web vraagt (de indeling van nu) en zoals app 1.2.1 vraagt (de oude, zonder `rubrieken`).
const web = (extra = {}) => ({ v: 2, ...base, ...NEW, rubrieken: RUBRIEKEN, readIds: [], ...extra })
const app121 = (extra = {}) => ({ v: 2, ...base, ...OLD, readIds: [], ...extra })
const bWeb = editionBasis(base.followed, NEW.interests, NEW.topics, base.favorites)
const bApp = editionBasis(base.followed, OLD.interests, OLD.topics, base.favorites)

function deps(pg) {
  const d = {
    composes: 0,
    kv: { get: async () => null, set: async () => {}, take: async () => 1 },
    start: async () => start,
    items: async (_s, followed) => {
      d.composes++
      const on = new Set(followed)
      return snap.items.filter((i) => on.has(i.source))
    },
    verify: async (t) => (t === 'goed' ? UID : null),
    clientFor: () => pg.client,
  }
  return d
}
const post = (body) => new Request('http://hoot.test/api/edition', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer goed' }, body: JSON.stringify(body) })
const ask = async (d, body) => (await (await handle(post(body), d)).json())
// Wat de lezer ziet: dezelfde plekken, dezelfde berichten, hetzelfde moment.
const content = (e) => JSON.stringify({ id: e.id, version: e.version, builtAt: e.builtAt, entries: e.entries, items: (e.items || []).map((i) => i.id) })

test('de oude en de nieuwe indeling zijn dezelfde lezer met een andere afdruk (zo begon het)', () => {
  assert.notDeepEqual(sorted(NEW.topics), sorted(OLD.topics))
  assert.ok(NEW.topics.includes('games'))
  assert.notEqual(bWeb, bApp)
  // basesOf: de eigen afdruk eerst, dan die van de omgezette keuze; met `rubrieken` is er maar één.
  assert.deepEqual(basesOf(profileOf(start, app121())), [bApp, bWeb])
  assert.deepEqual(basesOf(profileOf(start, web())), [bWeb])
})

test('web en app 1.2.1 om en om in één dagdeel: één Editie, één keer samengesteld, één keer geschreven', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null }])
  const d = deps(pg)
  const first = await ask(d, web())
  assert.equal(first.source, 'claimed')
  const seen = [first]
  for (const body of [app121(), web(), app121({ readIds: [snap.items[0].id] }), web(), app121()]) seen.push(await ask(d, body))
  assert.deepEqual(seen.slice(1).map((r) => r.source), ['account', 'account', 'account', 'account', 'account'])
  for (const r of seen) assert.equal(content(r.edition), content(first.edition), 'steeds dezelfde Editie')
  assert.equal(d.composes, 1, 'niet opnieuw samengesteld')
  assert.equal(pg.writes().length, 1, 'niets overschreven')
  // Elk toestel krijgt de afdruk die het zelf rekent, zodat het de Editie de volgende keer zelf herkent.
  assert.deepEqual(seen.map((r) => r.edition.basis), [bWeb, bApp, bWeb, bApp, bWeb, bApp])
  // In je account staat de Editie zoals de server haar vastlegde.
  assert.equal(pg.table[0].edition.basis, bWeb)
})

test('app 1.2.1 eerst, dan het web: ook één Editie (de rij draagt beide afdrukken)', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null }])
  const d = deps(pg)
  const a = await ask(d, app121())
  assert.equal(a.source, 'claimed')
  assert.equal(a.edition.basis, bApp)
  assert.deepEqual(a.edition.bases, [bApp, bWeb])
  const b = await ask(d, web())
  assert.equal(b.source, 'account')
  assert.equal(content(b.edition), content(a.edition))
  assert.equal(b.edition.basis, bWeb)
  const c = await ask(d, app121())
  assert.equal(JSON.stringify(c.edition), JSON.stringify(pg.table[0].edition), 'met de eigen afdruk: byte voor byte de rij')
  assert.equal(d.composes, 1)
  assert.equal(pg.writes().length, 1)
})

test('een rij van voor deze fix (het web, zonder bases) blijft staan als app 1.2.1 vraagt', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null }])
  const d = deps(pg)
  const a = await ask(d, web())
  assert.equal('bases' in pg.table[0].edition, false)
  const b = await ask(d, app121())
  assert.equal(b.source, 'account')
  assert.equal(content(b.edition), content(a.edition))
  assert.equal(pg.writes().length, 1)
})

test('app 1.2.1 met keuzes die het web al in de nieuwe indeling in je account zette (zonder `rubrieken` gevraagd)', async () => {
  // Tech alles en Cultuur met de hele nieuwe lijst: omzetten maakt er iets anders van (Tech valt weg), maar de
  // afdruk van de vraag zelf is die van het web.
  const n = { interests: ['wetenschap', 'tech', 'cultuur'], topics: [...setup.topics, 'muziek', 'film', 'boeken', 'kunst', 'media', 'games'] }
  assert.notDeepEqual(sorted(currentChoice(n.interests, n.topics).interests), sorted(n.interests))
  const pg = fakePostgrest([{ user_id: UID, edition: null }])
  const d = deps(pg)
  const a = await ask(d, { v: 2, ...base, ...n, rubrieken: RUBRIEKEN, readIds: [] })
  const b = await ask(d, { v: 2, ...base, ...n, readIds: [] })
  const c = await ask(d, { v: 2, ...base, ...n, rubrieken: RUBRIEKEN, readIds: [] })
  assert.deepEqual([a.source, b.source, c.source], ['claimed', 'account', 'account'])
  assert.equal(content(b.edition), content(a.edition))
  assert.equal(d.composes, 1)
  assert.equal(pg.writes().length, 1)
})

test('echt andere interesses of bronnen: wel een nieuwe Editie (zoals altijd)', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null }])
  const d = deps(pg)
  const a = await ask(d, web())
  // Cultuur weg op het web.
  const b = await ask(d, web({ interests: NEW.interests.filter((i) => i !== 'cultuur'), topics: NEW.topics.filter((t) => !['muziek', 'film', 'boeken', 'kunst', 'media', 'games'].includes(t)) }))
  assert.equal(b.source, 'claimed')
  assert.notEqual(b.edition.basis, a.edition.basis)
  // Daarna vraagt app 1.2.1 nog met de oude keuze (nog niet bijgewerkt): die past niet meer, dus opnieuw.
  const c = await ask(d, app121())
  assert.equal(c.source, 'claimed')
  // Een bron minder op de iPhone: ook een andere Editie.
  const e = await ask(d, app121({ followed: base.followed.slice(1) }))
  assert.equal(e.source, 'claimed')
  assert.equal(d.composes, 4)
  assert.equal(pg.writes().length, 4)
})

test('het web legt zijn samenvatting vast op de rij, ook als die de afdruk van app 1.2.1 draagt', async () => {
  const pg = fakePostgrest([{ user_id: UID, edition: null }])
  const d = deps(pg)
  await ask(d, app121())
  const w = await ask(d, web())
  assert.equal(w.edition.basis, bWeb)
  await writeBrief(pg.client, UID, { ...w.edition, brief: { sections: ['kort'] } })
  assert.deepEqual(pg.table[0].edition.brief, { sections: ['kort'] })
  // En daarna herkennen beide toestellen haar nog: geen nieuwe Editie.
  const a = await ask(d, app121())
  const b = await ask(d, web())
  assert.deepEqual([a.source, b.source], ['account', 'account'])
  assert.equal(d.composes, 1)
  // Nooit over een andere Editie heen: een rij met een vreemde afdruk blijft staan.
  pg.table[0].edition = { ...pg.table[0].edition, basis: 'anders', bases: undefined, brief: null }
  await writeBrief(pg.client, UID, { ...w.edition, brief: { sections: ['niet'] } })
  assert.equal(pg.table[0].edition.brief, null)
})
