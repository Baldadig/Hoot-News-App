import { test } from 'node:test'
import assert from 'node:assert/strict'
import { desksOf, weight, primaryDesk } from '../netlify/lib/desks.mjs'
import { selectEdition } from '../netlify/lib/stories.mjs'
import { insertBubble } from '../netlify/lib/bubble.mjs'

const d = (o) => [...desksOf(o)].sort()

test('rubrieken uit kop, samenvatting, bron en rubriek van de bron', () => {
  assert.deepEqual(d({ source: 'nos', title: 'Lijnbus uitgebrand in Hoogersmilde, passagiers komen met de schrik vrij' }), ['binnenland'])
  assert.deepEqual(d({ source: 'volkskrant', title: 'Raad van State kraakt VVD-verbod', url: 'https://www.volkskrant.nl/politiek/x~b1/' }), ['binnenland'])
  assert.deepEqual(d({ source: 'nos', title: 'Toegang tot het Louvre geblokkeerd door studenten in Parijs' }), ['buitenland'])
  assert.deepEqual(d({ source: 'nyt', title: 'Midterm Elections: Who Is Winning the Race for Congress' }), ['vs'])
  assert.deepEqual(d({ source: 'nos', title: 'Israëlische politie pakt verdachten op voor aanvallen Westelijke Jordaanoever' }), ['middenoosten'])
  assert.deepEqual(d({ source: 'nyt', title: 'Trump Is Pushing Ukraine to Surrender to Russia, Zelensky Says' }), ['oekraine', 'vs'])
  assert.deepEqual(d({ source: 'volkskrant', title: 'Spookaardbeving jaagt Japanners stuipen op het lijf', url: 'https://www.volkskrant.nl/wetenschap/x~b2/' }), ['buitenland', 'wetenschap'])
})

test('van het moment: meer bronnen en verser weegt zwaarder', () => {
  const now = Date.parse('2026-10-19T10:00:00Z')
  assert.ok(weight({ sourceCount: 5, ownCount: 2, latestAt: '2026-10-19T09:00:00Z' }, now) > weight({ sourceCount: 5, ownCount: 2, latestAt: '2026-10-18T20:00:00Z' }, now))
  assert.ok(weight({ sourceCount: 2, ownCount: 1, latestAt: '2026-10-19T09:00:00Z' }, now) > weight({ sourceCount: 6, ownCount: 0, latestAt: '2026-10-19T09:00:00Z' }, now))
})

const NOW = Date.parse('2026-10-19T10:00:00Z')
const art = (id, source, title, hoursAgo = 1, extra = {}) => ({ id, kind: 'article', source, sourceName: source.toUpperCase(), title, summary: '', image: 'x', publishedAt: new Date(NOW - hoursAgo * 36e5).toISOString(), ...extra })
const MAIN = new Set(['nos', 'nrc', 'nyt', 'volkskrant'])

test('elke rubriek krijgt zijn belangrijkste verhaal, ook als één onderwerp het nieuws domineert', () => {
  // Vijf grote VS-verhalen (veel bronnen), en per andere rubriek één los bericht.
  const vs = [1, 2, 3, 4, 5].map((n) => art('vs' + n, 'nyt', `Trump and Congress clash over budget number ${n} in Washington`, n))
  const stories = vs.map((a, n) => ({ id: 's' + n, itemIds: [a.id], leadId: a.id, sourceCount: 6, ownCount: 1, latestAt: a.publishedAt }))
  const pool = [
    ...vs,
    art('nl', 'nos', 'Opnieuw fataal ongeluk bij veerpontoprit Dordrecht', 2),
    art('bl', 'nos', 'Albanese premier treedt niet af na gewelddadige protesten', 3),
    art('me', 'nos', 'Hezbollah en Israël wisselen opnieuw beschietingen uit bij Libanon', 4),
    art('ua', 'nrc', 'Russische drones treffen energiecentrale bij Kyiv', 5),
    art('wt', 'volkskrant', 'Onderzoekers vinden oudste fossiel van een zoogdier', 6),
  ]
  const e = selectEdition(stories, pool, { mainIds: MAIN, now: NOW })
  const desks = e.map((x) => x.desk).filter(Boolean)
  for (const want of ['binnenland', 'buitenland', 'vs', 'middenoosten', 'oekraine', 'wetenschap']) assert.ok(desks.includes(want), want)
  assert.equal(e[0].id, 's0') // het hoofdverhaal blijft het zwaarste nieuws
  assert.equal(new Set(e.map((x) => x.id)).size, e.length)
})

test('één verhaal van buiten je bubbel op plek 6; het minst belangrijke aanvullende verhaal maakt plaats', () => {
  const entries = [...'abcdefghij'].map((id, i) => ({ kind: 'item', id, desk: i < 6 ? 'x' : null }))
  const out = insertBubble(entries, { id: 'bub', terms: [{ term: 't', via: 'google' }] })
  assert.equal(out.length, 10)
  assert.equal(out[5].id, 'bub')
  assert.equal(out[5].desk, 'bubbel')
  assert.ok(!out.some((x) => x.id === 'j'))
  assert.equal(insertBubble(entries, null), entries)
})

test('een verhaal telt voor de rubriek waar het vooral over gaat', () => {
  const s = (...a) => new Set(a)
  assert.equal(primaryDesk([s('middenoosten', 'vs'), s('middenoosten'), s('middenoosten')]), 'middenoosten')
  assert.equal(primaryDesk([s('vs'), s('vs'), s('oekraine', 'vs')]), 'vs')
  assert.equal(primaryDesk([s('oekraine', 'vs')]), 'oekraine') // gelijk: de specifiekere
  assert.equal(primaryDesk([]), null)
  assert.equal(primaryDesk([s('wetenschap'), s(), s(), s(), s()]), null) // één losse vermelding van vijf
})
