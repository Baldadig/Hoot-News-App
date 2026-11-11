// Server-gestuurde Stroom-tabs (1.2.1, shared/stroom-tabs.mjs): de feed zegt welke tabs er tussen Sport en
// Buiten je bubbel staan, elk bericht welke het draagt. Web en app lezen dezelfde lijst; een feed of bericht
// van vóór dit veld valt terug op Opinie via `opinion`. Dezelfde gevallen staan in ios/HootTests/StroomTabsTests.swift.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { STROOM_TABS, stroomTabsFeed, tabsVan, stroomTabsUit, inTab, tabsMetBerichten, TERUGVAL } from '../shared/stroom-tabs.mjs'
import { rubriekRij, inRubriek, legeRegel } from '../src/lib/streamline.js'
import { toClient } from '../netlify/lib/build.mjs'

const corpus = JSON.parse(readFileSync(new URL('./fixtures/opinie-corpus.json', import.meta.url), 'utf8'))
const labels = (r) => r.items.map((x) => x.label)
const column = { id: 'c', kind: 'article', source: 'telegraaf', title: 'Valentijn Driessen: ’Ajax moet kiezen’', author: 'Valentijn Driessen', url: 'https://www.telegraaf.nl/sport/123/valentijn-driessen-ajax-moet-kiezen', topics: ['voetbal'] }
const nieuws = { id: 'n', kind: 'article', source: 'nos', title: 'Kabinet valt', url: 'https://nos.nl/artikel/1', topics: ['nederland'] }

test('feed: stroomTabs is { id, label } in volgorde, zonder de test', () => {
  assert.deepEqual(stroomTabsFeed(), [{ id: 'opinie', label: 'Opinie' }])
  assert.deepEqual(stroomTabsFeed().map((t) => t.id), STROOM_TABS.map((t) => t.id))
})

test('bericht: toClient zet tabs alleen op een bericht dat er een draagt', () => {
  assert.deepEqual(toClient(column).tabs, ['opinie'])
  assert.equal(toClient(column).opinion, true) // blijft mee voor het web van vóór de tabs
  assert.ok(!('tabs' in toClient(nieuws)))
  assert.equal(tabsVan({ kind: 'post', type: 'opinie', title: 'x' }), null) // Bluesky nooit
})

test('bericht: over het hele corpus is tabs gelijk aan opinion', () => {
  for (const i of [...corpus.opinie, ...corpus.geen]) {
    const c = toClient({ id: 'x', kind: 'article', ...i })
    assert.equal(c.tabs?.includes('opinie') === true, c.opinion === true, i.title)
  }
})

test('toestel: de lijst uit de feed wordt gecontroleerd', () => {
  assert.deepEqual(stroomTabsUit({}), TERUGVAL) // feed van vóór het veld
  assert.deepEqual(stroomTabsUit(null), TERUGVAL)
  assert.deepEqual(stroomTabsUit({ stroomTabs: [] }), []) // de server zet alles uit
  const raar = [{ id: 'opinie', label: 'Opinie' }, { id: 'opinie', label: 'Dubbel' }, { id: 'sport', label: 'Sport' }, { id: 'bubbel', label: 'X' }, { id: 'Hoofd', label: 'X' }, { id: 'podcasts', label: '' }, { id: 'podcasts', label: ' Podcasts ' }, 'los', null]
  assert.deepEqual(stroomTabsUit({ stroomTabs: raar }), [{ id: 'opinie', label: 'Opinie' }, { id: 'podcasts', label: 'Podcasts' }])
  const veel = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, label: id.toUpperCase() }))
  assert.equal(stroomTabsUit({ stroomTabs: veel }).length, 4)
})

test('toestel: inTab kijkt naar tabs, en valt voor Opinie terug op opinion/type', () => {
  assert.ok(inTab({ tabs: ['opinie'] }, 'opinie'))
  assert.ok(!inTab({ tabs: ['podcasts'], opinion: true }, 'opinie')) // met tabs telt alleen de lijst
  assert.ok(inTab({ opinion: true }, 'opinie'))
  assert.ok(inTab({ type: 'opinie' }, 'opinie'))
  assert.ok(!inTab({ opinion: true }, 'podcasts'))
})

test('rij: een nieuwe server-tab staat tussen Sport en Buiten je bubbel, zonder app-update', () => {
  const tabs = [{ id: 'opinie', label: 'Opinie' }, { id: 'podcasts', label: 'Podcasts' }]
  const stream = [{ tabs: ['opinie'] }, { tabs: ['podcasts'] }, {}]
  const metBerichten = tabsMetBerichten(stream, tabs)
  assert.deepEqual(labels(rubriekRij({ interests: ['sport'], hasBubble: true, tabs, metBerichten })), ['Alles', 'Sport', 'Opinie', 'Podcasts', 'Buiten je bubbel'])
  // Geen bericht met de tab: geen tab.
  assert.deepEqual(labels(rubriekRij({ interests: ['sport'], hasBubble: true, tabs, metBerichten: tabsMetBerichten([{ tabs: ['podcasts'] }], tabs) })), ['Alles', 'Sport', 'Podcasts', 'Buiten je bubbel'])
  // De tab uit een oude link blijft zichtbaar.
  assert.deepEqual(labels(rubriekRij({ interests: ['sport'], tabs, metBerichten: new Set(), filters: { rubriek: 'podcasts' } })), ['Alles', 'Sport', 'Podcasts'])
  assert.ok(rubriekRij({ tabs, metBerichten }).items.find((r) => r.label === 'Podcasts').tab)
})

test('filter: een server-tab filtert op tabs; een column staat in Opinie, zijn rubriek en Alles', () => {
  const c = toClient(column)
  assert.ok(inRubriek(c, 'opinie'))
  assert.ok(inRubriek(c, 'sport'))
  assert.ok(inRubriek(c, ''))
  assert.ok(inRubriek({ tabs: ['podcasts'] }, 'podcasts'))
  assert.ok(!inRubriek(toClient(nieuws), 'opinie'))
})

test('lege regel: gelijk aan Opinie voor elke server-tab', () => {
  assert.equal(legeRegel({ namen: ['NOS'], rubriek: 'Opinie', tab: true }), 'Nog geen opinie van NOS vandaag.')
  assert.equal(legeRegel({ rubriek: 'Opinie' }), 'Nog geen opinie vandaag.')
  assert.equal(legeRegel({ rubriek: 'Podcasts', tab: true }), 'Nog geen podcasts vandaag.')
  assert.equal(legeRegel({ rubriek: 'Sport' }), 'Nog niets in Sport.')
})
