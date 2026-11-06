// Redacteur 3b · 2 (besluit van Alex, 6 november 2026): de algemene Editie is de persoonlijke Editie met een leeg
// profiel, met dezelfde vangrails (voorpagina met een Nederlandse plek, INT_MAX, kernrubrieken, toelating).
// Feed: de verkiezingsnacht (tests/fixtures/live-feed-2026-11-04-midterms.json.gz), opnieuw gebundeld zoals de server.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { buildStories, selectForReader } from '../netlify/lib/stories.mjs'
import { generalEdition } from '../netlify/lib/build.mjs'
import { MAIN_IDS, SOURCES } from '../netlify/lib/sources.mjs'
import { profileOf, INT_MAX } from '../shared/editor.mjs'
import { cappedInternational, majorNews } from '../shared/edition-policy.mjs'
import { isOpinion } from '../shared/article-signals.mjs'

const feed = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/live-feed-2026-11-04-midterms.json.gz', import.meta.url))).toString('utf8'))
const now = Date.parse(feed.meta.updatedAt)
const all = new Map([...feed.related, ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
const pool = [...all.values()].filter((i) => i.kind === 'article' && Date.parse(i.publishedAt) <= now).map(({ storyId, ...i }) => i)
const stories = buildStories(pool, {}, { mainIds: MAIN_IDS, keys: true, extended: true })
const byId = new Map(pool.map((i) => [i.id, i]))
const storyById = new Map(stories.map((s) => [s.id, s]))
const ed = generalEdition({ stories, pool, now })

test('algemene Editie: de plekken van een leeg profiel, in de vorm van de vastgelegde Editie', () => {
  assert.ok(ed.length > 0 && ed.length <= 10)
  for (const e of ed) {
    assert.ok(['story', 'item'].includes(e.kind))
    if (e.kind === 'story') assert.ok(storyById.get(e.id)?.itemIds.includes(e.leadId), e.id)
    assert.deepEqual(Object.keys(e).filter((k) => !['kind', 'id', 'leadId', 'desk'].includes(k)), [], 'geen waarom, geen gewicht')
  }
  const sel = selectForReader(stories, pool, { mainIds: MAIN_IDS, now, prof: profileOf({ followed: MAIN_IDS, sources: SOURCES }) })
  assert.deepEqual(new Set(ed.map((e) => e.id)), new Set(sel.map((e) => e.id)))
})

test('algemene Editie: dezelfde vangrails als een lezer zonder interesses', () => {
  const prof = profileOf({ followed: MAIN_IDS, sources: SOURCES })
  const itemsOf = (e) => (e.kind === 'story' ? storyById.get(e.id).itemIds : [e.id]).map((id) => byId.get(id))
  const st = (e) => (e.kind === 'story' ? storyById.get(e.id) : { sourceCount: 1 })
  // Buitenland zonder reden alleen als groot nieuws, en hooguit INT_MAX buiten de voorpagina.
  for (const e of ed) if (cappedInternational(prof, itemsOf(e), e.desk, st(e))) assert.ok(majorNews(st(e), itemsOf(e)), e.id)
  assert.ok(ed.filter((e) => cappedInternational(prof, itemsOf(e), e.desk, st(e))).length <= INT_MAX)
  // Plek 01 opent met nieuws.
  assert.ok(!isOpinion(byId.get(ed[0].leadId || ed[0].id)))
  // De uitslag opent.
  assert.match(byId.get(ed[0].leadId).title, /Democrat|Democraten|Senaat|Congres/)
})
