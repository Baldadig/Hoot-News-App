// Ronde 9 · 3 (blinde A/B ronde 8, opmerking van Alex): "een overleden dirigent is in de algemene Editie geen plek 01 waard;
// wellicht als je cultuur als interesse had". Een overlijden of ander cultuurbericht opent de algemene Editie niet als er
// nieuws van groter maatschappelijk belang in de top 5 staat; in de persoonlijke Editie met Cultuur als interesse mag het
// hoog. Redacteur 3b deed dit al (de basislijn zette de dirigent op 01, 3b op 7): een cultuurverhaal is licht en dus een
// curiosum (curiosaDown: nooit in de top 3), en een verhaal over een bekend persoon wijkt op 01 voor even groot nieuws over
// politiek, economie of grote gevolgen (newsBeforePeople). Deze toetsen leggen dat vast. Generiek: de titels wijzen alleen
// aan welk verhaal de toets bedoelt.
// Feed: 5 november ochtend (Hoot-design/woensdag-2026-11-04/ijkset/feeds/feed-2026-11-05-ochtend-0627Z.json.gz).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { buildStories, curiosaDown, newsBeforePeople, weightyStory, peopleStory, curioStory } from '../netlify/lib/stories.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'
import { generalEdition, storyPool } from '../netlify/lib/build.mjs'
import { composePersonal } from '../src/lib/personal.js'

const feed = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/feed-2026-11-05-ochtend.json.gz', import.meta.url))).toString('utf8'))
const now = Date.parse(feed.edition.builtAt)
const all = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
const articles = [...all.values()].filter((i) => i.kind === 'article' && Date.parse(i.publishedAt) <= now).map(({ storyId, ...i }) => i)
const pool = storyPool(articles)
const byId = new Map(pool.map((i) => [i.id, i]))
const stories = buildStories(pool, {}, { mainIds: MAIN_IDS, keys: true, extended: true })
const storyById = new Map(stories.map((s) => [s.id, s]))
const itemsOf = (e) => (e.kind === 'story' ? storyById.get(e.id)?.itemIds || [] : [e.id]).map((id) => byId.get(id)).filter(Boolean)
const isDeath = (e) => itemsOf(e).some((i) => /^Dirigent .* overleden/.test(i.title))

test('algemene Editie: het overlijden van een dirigent opent niet, met groter nieuws in de top 5', () => {
  const entries = generalEdition({ stories, pool, now, mainIds: MAIN_IDS, sources: feed.sources })
  const k = entries.findIndex(isDeath)
  assert.ok(k >= 0, 'het verhaal staat in de Editie')
  assert.ok(k >= 3, `plek ${k + 1}: niet in de top 3`)
  const st = storyById.get(entries[k].id)
  assert.ok(curioStory(st, itemsOf(entries[k])) || peopleStory(itemsOf(entries[k])), 'herkend als licht of als bekend persoon, zonder namen')
  assert.ok(entries.slice(0, 5).some((e) => e.kind === 'story' && weightyStory(storyById.get(e.id), itemsOf(e))), 'groter maatschappelijk nieuws in de top 5')
})

test('algemene Editie: ook als de selectie het overlijden bovenaan zet, opent het niet', () => {
  const entries = generalEdition({ stories, pool, now, mainIds: MAIN_IDS, sources: feed.sources })
  const k = entries.findIndex(isDeath)
  // Het overlijden op 01, de rest in dezelfde volgorde; dan de stappen van generalEdition die over 01 gaan.
  const forced = [entries[k], ...entries.filter((_, j) => j !== k)]
  curiosaDown(forced, { itemsOf, storyOf: (e) => storyById.get(e.id) })
  newsBeforePeople(forced, { itemsOf, storyOf: (e) => storyById.get(e.id), sources: feed.sources })
  assert.ok(!isDeath(forced[0]), `plek 01: ${itemsOf(forced[0])[0]?.title}`)
  assert.ok(forced.findIndex(isDeath) >= 3)
})

test('persoonlijke Editie met Cultuur als interesse: het overlijden mag hoog (top 3)', () => {
  const followed = new Set(['nos', 'nu', 'nrc', 'volkskrant', 'nos-cultuur'])
  const ed = composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed, interests: ['cultuur'], topics: [], now, builtAt: feed.edition.builtAt })
  // Hetzelfde verhaal (een stuk eruit), welke kop het toestel ook kiest.
  const k = ed.entries.findIndex((e) => (e.itemIds || []).some((id) => /^Dirigent .* overleden/.test(all.get(id)?.title || '')))
  assert.ok(k >= 0 && k < 3, `plek ${k + 1}`)
})
