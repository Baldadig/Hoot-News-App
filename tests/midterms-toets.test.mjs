// De toetspunten bij de verkiezingsnacht (H7, toets 4 november 2026: Hoot-design/woensdag-2026-11-04/midterms/
// TOETS.md). Vier regels, alle algemeen; de titels hieronder wijzen alleen aan welk verhaal de toets bedoelt.
// 1. Eén onderwerp, één gewicht alleen voor stembusverhalen na een uitslag (de paus mocht 30 oktober niet openen).
// 2. Een sportbron is nooit de kop van een verhaal dat geen sport is (ESPN, vannacht 01:50).
// 3. Een ander hoofdonderwerp is een ander verhaal: een groot verhaal botst alleen op zijn koppen (de Israël-steun
//    naast de uitslagbundel).
// Feeds: 30 oktober (avond), 31 oktober (ochtend, 09:30, 12:00), vannacht 01:50 en de midterms-feed van 05:30.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { buildStories, selectEdition, voteResultOf, voteKind, votePlace, leadPool, FAMILY_MAX, OWN_STORY } from '../netlify/lib/stories.mjs'
import { MAIN_IDS, SOURCES } from '../netlify/lib/sources.mjs'
import { sportStory } from '../shared/edition-policy.mjs'
import { composePersonal } from '../src/lib/personal.js'
import { FRONT_BIG } from '../shared/editor.mjs'
import { proposeSources } from '../src/lib/welcome.js'

const SPORT = new Set(SOURCES.filter((s) => s.cat === 'sport').map((s) => s.id))
// Een feed zoals de server hem had (`server`) en opnieuw gebundeld in de uitgebreide stand (`re`), met `now`
// het moment van samenstellen (de Editie) of van de feed zelf (`meta`).
function load(file, { meta = false } = {}) {
  const feed = JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${file}`, import.meta.url))).toString('utf8'))
  const now = meta ? Date.parse(feed.meta.updatedAt) : Date.parse(feed.edition.builtAt)
  const all = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
  const articles = [...all.values()].filter((i) => i.kind === 'article' && Date.parse(i.publishedAt) <= now)
  const re = articles.map(({ storyId, ...i }) => i)
  const stories = buildStories(re, {}, { mainIds: MAIN_IDS, keys: true, extended: true })
  const byStory = new Map([...stories, ...feed.stories].map((s) => [s.id, s]))
  const editions = {
    server: selectEdition(feed.stories, articles, { mainIds: MAIN_IDS, now }),
    re: selectEdition(stories, re, { mainIds: MAIN_IDS, now }),
  }
  const title = (id) => all.get(id)?.title || ''
  const lead = (e) => all.get(e.leadId || e.id)
  const members = (e) => (e.kind === 'story' ? byStory.get(e.id)?.itemIds || [] : [e.id]).map((id) => all.get(id)).filter(Boolean)
  return { feed, now, all, articles, re, stories, editions, title, lead, members }
}
const OKT30 = load('snapshot-2026-10-30-avond.json.gz')
const OKT31 = ['snapshot-2026-10-31-ochtend.json.gz', 'snapshot-2026-10-31-0930.json.gz', 'snapshot-2026-10-31-1200.json.gz'].map((f) => load(f))
const NACHT = load('live-feed-2026-11-04.json.gz', { meta: true })
const MIDTERMS = load('live-feed-2026-11-04-midterms.json.gz', { meta: true })
const ALL = [['30 okt', OKT30], ...OKT31.map((x, k) => [`31 okt ${k}`, x]), ['01:50', NACHT], ['05:30', MIDTERMS]]
const at = (f, e, re) => f.editions[e].findIndex((x) => f.members(x).some((i) => re.test(i.title || '')))

test('toets 1: geen familiegewicht vóór een uitslag; de paus opent 30 en 31 oktober niet', () => {
  for (const [name, f] of [['30 okt', OKT30], ...OKT31.map((x, k) => [`31 okt ${k}`, x]), ['01:50', NACHT]]) {
    // Op deze dagen is er geen uitslag: geen enkel verhaal is een uitslagbundel.
    assert.equal(f.stories.filter((s) => voteResultOf(s.itemIds.map((id) => f.all.get(id)))).length, 0, name)
    for (const e of ['server', 're']) {
      const k = at(f, e, /^(Paus Leo|Pope Leo|Leo XIV)/)
      assert.ok(k !== 0 && (k < 0 || k >= 2), `${name} ${e}: paus op plek ${k + 1}`)
    }
  }
  // 30 oktober: het grootste nieuws opent (de laatste onafhankelijke Russische krant, 12 uitgevers), en een
  // reportage van één uitgever over een staat telt niets bij de verkiezingen op.
  for (const e of ['server', 're']) {
    const k = at(OKT30, e, /^In Michigan, barometer/)
    assert.ok(k < 0 || k >= 5, `30 okt ${e}: Michigan op plek ${k + 1}`)
  }
  assert.match(OKT30.lead(OKT30.editions.server[0]).title, /Russische krant/)
  // Vannacht 01:50 (geen uitslag): de stembus-voorbeschouwing krijgt de Trump-verhalen niet als gewicht en
  // opent niet; het Spaanse ontslag (15 uitgevers) wel.
  for (const e of ['server', 're']) assert.match(NACHT.lead(NACHT.editions[e][0]).title, /Spaanse/, e)
})

test('toets 2: een sportbron is nooit de kop van een verhaal dat geen sport is', () => {
  for (const [name, f] of ALL)
    for (const e of ['server', 're'])
      for (const x of f.editions[e]) {
        if (x.kind !== 'story' || !SPORT.has(f.lead(x)?.source)) continue
        assert.ok(sportStory({}, f.members(x)), `${name} ${e}: ${f.lead(x).sourceName}: ${f.lead(x).title}`)
      }
  // De bundel met de marathon van 01:50 (mazelen, de marathon, beroemdheden) krijgt geen ESPN-kop.
  const k = at(NACHT, 're', /Marathon runner, 24, dies/)
  assert.ok(k >= 0)
  assert.notEqual(NACHT.lead(NACHT.editions.re[k]).source, 'espn')
  // Eenheid: vers sportstuk naast een nieuwsstuk in een nieuwsverhaal; in een sportverhaal blijft de sportbron.
  const t0 = Date.parse('2026-11-04T01:00:00Z')
  const it = (id, source, title, h) => ({ id, kind: 'article', source, sourceName: source, title, publishedAt: new Date(t0 - h * 36e5).toISOString() })
  const news = [it('s', 'espn', 'Runner, 24, dies after collapsing near the finish', 1), it('n', 'independent', 'Woman dies after collapsing during city marathon', 3), it('m', 'nos', 'Eerste mazelendode in de stad', 16)]
  assert.equal(leadPool(news, news, t0)[0].id, 'n')
  const sport = [it('a', 'espn', 'Almgren wins the city marathon', 1), it('b', 'bbc-sport', 'Almgren storms to marathon win', 2), it('c', 'independent', 'Swede wins marathon', 3)]
  assert.equal(leadPool(sport, sport, t0)[0].id, 'a')
})

const base = (f) => new Set(f.feed.sources.filter((s) => s.kind !== 'sociaal' && !s.optional).map((s) => s.id))
function personal(f, interests, topics) {
  const general = f.editions.re
  const sb = new Map(f.stories.map((s) => [s.id, s]))
  const globalEd = { ...f.feed.edition, entries: [...general, ...f.feed.edition.entries.filter((e) => e.desk === 'bubbel')], items: [...new Set([...general.flatMap((e) => (e.kind === 'story' ? sb.get(e.id).itemIds : [e.id])), ...f.feed.edition.items.map((i) => i.id)])].map((id) => f.all.get(id)).filter(Boolean) }
  const storyOfItem = new Map(f.stories.flatMap((s) => s.itemIds.map((id) => [id, s.id])))
  const items = f.feed.items.map(({ storyId, ...i }) => (storyOfItem.has(i.id) ? { ...i, storyId: storyOfItem.get(i.id) } : i))
  const followed = interests.length ? new Set([...base(f), ...proposeSources(f.feed.sources.filter((s) => s.pick), interests)]) : base(f)
  return composePersonal({ global: globalEd, stories: f.stories, items, sources: f.feed.sources, followed, interests, topics, now: f.now, builtAt: new Date(f.now).toISOString(), previous: null })
}

test('toets 3: een ander hoofdonderwerp is een ander verhaal (de Israël-steun naast de uitslagbundel)', () => {
  const ISRAEL = /military aid (deal|to Israel|for Israel)|Israel military aid/
  // Het verhaal is groot genoeg om een eigen gebeurtenis te zijn, en geen van zijn koppen noemt de stembus.
  const st = MIDTERMS.stories.find((s) => s.itemIds.some((id) => ISRAEL.test(MIDTERMS.title(id))))
  assert.ok(st.publisherCount >= OWN_STORY)
  assert.ok(st.itemIds.every((id) => voteKind({ title: MIDTERMS.title(id), source: MIDTERMS.all.get(id).source }) === 0))
  for (const e of ['server', 're']) {
    const ed = MIDTERMS.editions[e]
    const k = at(MIDTERMS, e, ISRAEL)
    assert.ok(k > 0 && k < 10, `${e}: Israël-steun op plek ${k + 1}`)
    // De uitslag opent nog steeds, en de stembus krijgt niet meer plekken.
    assert.match(MIDTERMS.lead(ed[0]).title, /^Enorme winst Democraten/)
    const vote = ed.filter((x) => { const its = MIDTERMS.members(x); return its.filter((i) => voteKind(i) >= 1 && votePlace(i) === 'us').length * 2 > its.length })
    assert.ok(vote.length <= FAMILY_MAX, e)
  }
  // De beginner krijgt het niet, en dat is de norm: zonder Wereld hooguit twee internationale plekken, alleen
  // groot nieuws (FRONT_BIG uitgevers; dit verhaal heeft er zes), en die zijn voor de uitslag (23) en het
  // Spaanse ontslag (15). De Israël-steun komt bij een persoonlijke Editie alleen via de algemene Editie.
  const beginner = personal(MIDTERMS, [], []).entries.filter((e) => e.desk !== 'bubbel')
  assert.match(MIDTERMS.title(beginner[0].leadId), /^Enorme winst Democraten/)
  assert.match(MIDTERMS.title(beginner[1].leadId), /Spaanse/)
  assert.ok(st.publisherCount < FRONT_BIG)
  // Kleinere verhalen blijven op kop én tekst vergeleken: geen tweede losse stembusplek uit een zijstuk.
  for (const e of ['server', 're']) assert.ok(!MIDTERMS.editions[e].slice(1).some((x) => /\b(wins|flips|elects)\b.*\b(senate|seat|governor|senator)\b/i.test(MIDTERMS.lead(x).title)))
})
