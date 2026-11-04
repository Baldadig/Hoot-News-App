// Welkom, Volg je bronnen (src/lib/follow-welcome.js): niets vooraf aan, het gratis begin bovenaan,
// sport ingeklapt maar wel te vinden, Later kiezen zonder sport, en een voorbeeld met echte koppen.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { toggleFollow, freeStart, startIds, followGroups, findSources, followedSources, followedLine, previewLines, FREE_START } from '../src/lib/follow-welcome.js'
import { applyWelcome } from '../src/lib/welcome.js'
import { SOURCES } from '../netlify/lib/sources.mjs'

const catalog = SOURCES.map((s) => ({ ...s, followed: true }))
const byId = new Map(catalog.map((s) => [s.id, s]))

test('het gratis begin: NOS, NU.nl en RTL Nieuws, gratis en in die volgorde', () => {
  assert.deepEqual(freeStart(catalog).map((s) => s.id), ['nos', 'nu', 'rtl'])
  assert.ok(freeStart(catalog).every((s) => !s.paid))
  assert.deepEqual(freeStart([{ id: 'nos', paid: true }, { id: 'nu' }]).map((s) => s.id), ['nu'], 'nooit een betaalde bron')
})

test('Later kiezen en Liever meteen lezen: gratis en zonder sport', () => {
  const ids = startIds(catalog)
  assert.ok(ids.length >= 3)
  assert.deepEqual(ids.slice(0, 3), FREE_START)
  for (const id of ids) {
    assert.ok(!byId.get(id).paid, id)
    assert.notEqual(byId.get(id).cat, 'sport', id)
  }
})

test('per rubriek, zonder het gratis begin; alles komt één keer voor; sport als eigen groep', () => {
  const groups = followGroups(catalog)
  const ids = groups.flatMap((g) => g.sources.map((s) => s.id))
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(ids.length + FREE_START.length, catalog.length)
  assert.ok(!ids.includes('nos'))
  assert.equal(groups[0].cat, 'nl')
  const sport = groups.find((g) => g.cat === 'sport')
  assert.ok(sport && sport.sources.every((s) => s.cat === 'sport'))
  // Onbekende rubriek: achteraan bij Overig, niet kwijt.
  assert.deepEqual(followGroups([{ id: 'x', name: 'X', cat: 'raar' }]).map((g) => g.cat), ['overig'])
})

test('zoeken vindt alles, ook sport (zoeken is een keuze)', () => {
  assert.deepEqual(findSources(catalog, 'voetbal international').map((s) => s.id), ['vi'])
  assert.ok(findSources(catalog, 'tweak').some((s) => s.id === 'tweakers'))
  assert.deepEqual(findSources(catalog, 'zzzz'), [])
  assert.deepEqual(findSources(catalog, '  '), [])
})

test('volgen: aan, uit, en de lijst Gevolgd op volgorde van volgen', () => {
  let ids = []
  for (let n = 0; n < 20; n++) ids = toggleFollow(ids, String(n))
  assert.equal(ids.length, 20)
  assert.equal(toggleFollow(ids, '8').length, 19)
  assert.deepEqual(followedSources(catalog, ['tweakers', 'nos', 'bestaatniet']).map((s) => s.id), ['tweakers', 'nos'])
  assert.equal(followedLine(0), 'Nog niets gevolgd')
  assert.equal(followedLine(1), '1 bron gevolgd')
  assert.equal(followedLine(4), '4 bronnen gevolgd')
})

test('het voorbeeld: de nieuwste kop per gevolgde bron, nooit van een andere bron', () => {
  const items = [
    { id: 'a', source: 'nos', kind: 'article', title: 'Oud NOS', publishedAt: '2026-11-04T06:00:00Z' },
    { id: 'b', source: 'nos', kind: 'article', title: 'Nieuw NOS', publishedAt: '2026-11-04T08:00:00Z' },
    { id: 'c', source: 'tweakers', kind: 'article', title: 'Tweakers', publishedAt: '2026-11-04T07:00:00Z' },
    { id: 'd', source: 'vi', kind: 'article', title: 'Sport', publishedAt: '2026-11-04T09:00:00Z' },
    { id: 'e', source: 'tweakers', kind: 'post', title: 'Post', publishedAt: '2026-11-04T10:00:00Z' },
  ]
  assert.deepEqual(previewLines(items, catalog, ['nos', 'tweakers']).map((l) => l.title), ['Nieuw NOS', 'Tweakers'])
  assert.equal(previewLines(items, catalog, ['nos'])[0].source.name, 'NOS')
  // Nog niets gevolgd: het gratis begin, dus geen sport.
  assert.deepEqual(previewLines(items, catalog, []).map((l) => l.id), ['b'])
  assert.equal(previewLines(items, catalog, ['nos', 'tweakers'], 1).length, 1)
})

test('opslaan gebruikt bestaande voorkeuren; een geannuleerd concept wijzigt ze niet', () => {
  const all = [{ id: 'a' }, { id: 't' }, { id: 's' }]
  const original = { onboarded: true, interests: ['tech'], topics: ['ai'], muted: [], vak: ['ux'], saved: ['artikel'] }
  const before = structuredClone(original)
  const applied = applyWelcome(original, { interests: ['tech'], topics: ['ai'], sources: ['t'], all, vak: ['ux', 'design'] })
  assert.deepEqual(original, before)
  assert.deepEqual(applied.saved, ['artikel'])
  assert.deepEqual(applied.vak, ['ux', 'design'])
  assert.ok(applied.muted.includes('a'))
  assert.ok(!applied.muted.includes('t'))
})

test('web en app: hetzelfde gratis begin en dezelfde schermen', () => {
  const swift = readFileSync(new URL('../ios/Hoot/Views/WelcomeView.swift', import.meta.url), 'utf8')
  const web = readFileSync(new URL('../src/views/Welcome.jsx', import.meta.url), 'utf8')
  for (const text of ['Zo werkt Hoot', 'Volg je bronnen', 'Wat interesseert je?', 'Om te beginnen · gratis', 'Later kiezen', 'Liever meteen lezen', 'Kies je bronnen', 'Naar je Editie', 'Zo ziet je Editie eruit', 'Kies onderwerpen voor je Selectie']) {
    assert.ok(web.includes(text), `web: ${text}`)
    assert.ok(swift.includes(text), `app: ${text}`)
  }
  assert.match(swift, /freeStart = \["nos", "nu", "rtl"\]/)
  // De oude route is weg: geen Wat precies?, geen seintje-stap, geen veegpagina's.
  for (const old of ['Wat precies?', 'Stel je Hoot samen', 'Veeg verder', 'Een seintje?', 'Kies minstens één']) {
    assert.ok(!web.includes(old), `web: ${old}`)
    assert.ok(!swift.includes(old), `app: ${old}`)
  }
})
