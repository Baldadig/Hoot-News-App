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

test('Nederlandse ondergrens: minstens twee Nederlandse plekken voor echt nieuws in de top 5 (3b · 3)', async () => {
  const { dutchFloor, NL_TOP5_MIN } = await import('../netlify/lib/build.mjs')
  const t = '2026-11-06T04:00:00Z'
  const it = (id, source, title = 'Kabinet neemt besluit over belastingplan') => ({ id, source, kind: 'article', title, publishedAt: t })
  const items = new Map()
  const story = (id, sources, title) => {
    const its = sources.map((s, k) => it(`${id}${k}`, s, title))
    for (const i of its) items.set(i.id, i)
    return { kind: 'story', id, leadId: its[0].id, members: its }
  }
  // Zes buitenlandse verhalen, dan twee Nederlandse, dan een Vlaams verhaal en een los Nederlands stuk.
  const entries = [
    ...['a', 'b', 'c', 'd', 'e', 'f'].map((x) => story(x, ['nyt', 'bbc'], 'Senate votes on budget')),
    story('nl1', ['nos', 'volkskrant'], 'Kabinet valt over belastingplan'),
    story('nl2', ['nrc', 'nos'], 'Tweede Kamer stemt over stikstofwet'),
  ]
  const itemsOf = (e) => e.members
  const out = dutchFloor([...entries], { itemsOf, byId: items })
  assert.equal(NL_TOP5_MIN, 2)
  assert.deepEqual(out.map((e) => e.id), ['a', 'b', 'c', 'nl1', 'nl2', 'd', 'e', 'f'])
  // Plek 01 blijft staan; staan er al twee, dan verandert er niets.
  assert.deepEqual(dutchFloor([...out], { itemsOf, byId: items }).map((e) => e.id), out.map((e) => e.id))
  // Een licht of los stuk telt niet als echt nieuws en schuift niet op.
  const loose = { kind: 'item', id: 'nl3', members: [it('nl3x', 'nos')] }
  items.set('nl3', loose.members[0])
  const base = [...entries.slice(0, 6), loose]
  assert.deepEqual(dutchFloor([...base], { itemsOf, byId: items }).map((e) => e.id), base.map((e) => e.id))
})

test('rubriekplekken: een voorkeur met een minimumgewicht (3b · 4)', async () => {
  const { DESK_MIN_PUBS } = await import('../netlify/lib/stories.mjs')
  const { KERN, KERN_MIN } = await import('../shared/editor.mjs')
  assert.equal(DESK_MIN_PUBS, 3)
  const prof = profileOf({ followed: MAIN_IDS, sources: SOURCES })
  for (const file of ['live-feed-2026-11-04-midterms.json.gz', 'snapshot-2026-10-31-1200.json.gz', 'snapshot-2026-10-30-avond.json.gz']) {
    const f = JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${file}`, import.meta.url))).toString('utf8'))
    const at = Date.parse(f.edition?.builtAt || f.meta.updatedAt)
    const arts = [...new Map([...(f.related || []), ...f.items, ...f.edition.items].map((i) => [i.id, i])).values()].filter((i) => i.kind === 'article' && Date.parse(i.publishedAt) <= at).map(({ storyId, ...i }) => i)
    const sts = buildStories(arts, {}, { mainIds: MAIN_IDS, keys: true, extended: true })
    const sel = selectForReader(sts, arts, { mainIds: MAIN_IDS, now: at, prof })
    // Een vaste rubriekplek (planned) zonder persoonlijke reden: minstens DESK_MIN_PUBS uitgevers, of de kernregel
    // (minstens KERN_MIN kernrubrieken) had hem nodig.
    for (const e of sel.filter((x) => x.planned)) {
      const others = new Set(sel.filter((x) => x !== e).map((x) => x.desk).filter((d) => KERN.includes(d)))
      assert.ok(e.sourceCount >= DESK_MIN_PUBS || (KERN.includes(e.desk) && !others.has(e.desk) && others.size < KERN_MIN), `${file}: ${e.desk} ${e.title}`)
    }
  }
})
