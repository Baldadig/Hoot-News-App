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
  const sel = selectForReader(stories, pool, { mainIds: MAIN_IDS, now, prof: profileOf({ followed: MAIN_IDS, sources: SOURCES }), general: true })
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

// Ronde 2 · 2 (keuring 6 november): een stuk of verhaal van één uitgever alleen als er geen vers verhaal van minstens
// SPREAD_MIN uitgevers meer over is; een stuk zonder titel nooit; een review, uitverkoop of productblad is geen nieuwsplek.
test('eenbronsstukken: pas als er geen verhaal van minstens drie uitgevers meer over is (3b · ronde 2)', async () => {
  const { SPREAD_MIN, titled } = await import('../netlify/lib/stories.mjs')
  assert.equal(SPREAD_MIN, 3)
  const T = Date.parse('2026-11-06T05:00:00Z')
  const at = (h) => new Date(T - h * 36e5).toISOString()
  let n = 0
  const art = (source, title, o = {}) => ({ id: `e${++n}`, kind: 'article', source, title, summary: `${title}.`, publishedAt: at(1), topics: [], ...o })
  const own = new Set(['nos', 'nrc', 'volkskrant', 'ad', 'nu'])
  const prof = profileOf({ followed: own, sources: SOURCES })
  // Vier buitenlandse verhalen van vier uitgevers (voor een leeg profiel een reden) en twee losse Nederlandse stukken.
  const subjects = ['French premier resigns after losing confidence vote in Paris', 'German coalition collapses over budget in Berlin', 'Spanish court blocks amnesty law in Madrid', 'Polish president vetoes judicial reform in Warsaw']
  const stories = []
  const pool = []
  subjects.forEach((title, k) => {
    const its = ['bbc', 'nyt', 'guardian', 'lemonde'].map((s) => art(s, title, { topics: ['europa'] }))
    pool.push(...its)
    stories.push({ id: `s${k}`, itemIds: its.map((i) => i.id), sourceCount: 4, publisherCount: 4, latestAt: its[0].publishedAt, desk: 'buitenland' })
  })
  const singles = [art('ad', 'Griezelen in het pretpark tijdens de herfstnachten', { topics: ['nederland'] }), art('nu', 'Gemeente opent nieuwe bibliotheek in Zwolle', { topics: ['nederland'] })]
  const untitled = art('nrc', '', { publishedAt: at(0.1), topics: ['nederland'] })
  delete untitled.title
  pool.push(...singles, untitled)
  const run = (size, general) => selectForReader(stories, pool, { mainIds: own, now: T, size, prof, general }).map((e) => e.id)
  // Zonder de regel neemt de Nederlandse plek van de voorpagina een los stuk, ook al zijn er sterke verhalen over.
  assert.ok(run(4, false).some((id) => id.startsWith('e')), run(4, false).join())
  // Met de regel eerst de verhalen van vier uitgevers; een los stuk pas als er geen sterk verhaal meer over is.
  assert.deepEqual(run(4, true).sort(), ['s0', 's1', 's2', 's3'])
  const all = run(10, true)
  for (const k of [0, 1, 2, 3]) assert.ok(all.includes(`s${k}`), all.join())
  assert.ok(all.some((id) => id.startsWith('e')), 'als het sterke nieuws op is, mag een los stuk')
  // Nooit een stuk zonder titel, ook niet in de persoonlijke Editie.
  assert.ok(!titled(untitled) && titled(singles[0]))
  assert.ok(!all.includes(untitled.id) && !run(10, false).includes(untitled.id))
})

test('service is geen nieuwsplek: review, uitverkoop en productblad herkend aan URL-slug en kopvorm (3b · ronde 2)', async () => {
  const { lightKind } = await import('../shared/edition-policy.mjs')
  const k = (title, url) => lightKind({ title, url, source: 'theverge' })
  assert.equal(k('Sony’s retro headphones brought me back to my childhood', 'https://www.theverge.com/tech/1026958/sony-mdr-3r-headphones-review'), 'consument')
  assert.equal(k('Google’s latest Nest Learning Thermostat is $60 off just in time', 'https://www.theverge.com/gadgets/1022819/google-nest-learning-thermostat-4th-gen-watch-deal-sale'), 'consument')
  assert.equal(k('Motorola Signature 27: Specs, Price, Features, Release Date', 'https://www.wired.com/story/motorola-wants-to-sell-you-a-phone/'), 'consument')
  assert.equal(k('Motorola is going ultra premium with its Signature phone', 'https://www.theverge.com/gadgets/1026643/motorola-signature-27-price-specs-availability'), 'consument')
  // Een overname of akkoord is nieuws, ook met "deal" of "sale" in de slug; een rechtszaak over een review ook.
  assert.equal(k('Nvidia closes chip deal with Saudi Arabia', 'https://www.theverge.com/news/1/nvidia-deal-saudi-arabia'), null)
  assert.equal(k('Paramount completes sale of studio to rival', 'https://www.theverge.com/news/2/paramount-sale-studio'), null)
  assert.equal(k('Court fines Amazon over fake review scheme', 'https://www.theverge.com/news/3/amazon-fake-review-fine'), null)
})

// Ronde 2 · 4 (besluit van Alex, 4 november middag: "Trump accepteert" als eigen plek naast de uitslag): twee plekken voor
// één gebeurtenis alleen in de algemene Editie, alleen als het verhaal dat al een plek heeft zelf FAMILY_WIDE_PUBS
// uitgevers heeft, en alleen voor een echte, verse tweede ontwikkeling (geen tweede uitslag).
test('één gebeurtenis, twee plekken alleen op een uitzonderlijke nieuwsdag (3b · ronde 2)', async () => {
  const { FAMILY_WIDE_PUBS, FAMILY_SECOND_PUBS } = await import('../netlify/lib/stories.mjs')
  assert.equal(FAMILY_WIDE_PUBS, 15)
  assert.equal(FAMILY_SECOND_PUBS, 4)
  const T = Date.parse('2026-11-04T11:00:00Z')
  const at = (h) => new Date(T - h * 36e5).toISOString()
  let n = 0
  const art = (source, title, h = 2) => ({ id: `v${++n}`, kind: 'article', source, title, summary: `${title}.`, publishedAt: at(h), topics: ['vs-politiek'] })
  const pubs = ['nos', 'nu', 'nrc', 'volkskrant', 'trouw', 'parool', 'ad', 'telegraaf', 'rtl', 'nd', 'nyt', 'guardian', 'bbc', 'aljazeera', 'npr', 'dw', 'lemonde', 'scmp', 'independent', 'politico']
  const build = (headPubs, secondH = 2) => {
    const head = pubs.slice(0, headPubs).map((s) => art(s, 'Democrats win majority in Senate and House in midterm elections', 6))
    const second = ['nyt', 'bbc', 'guardian', 'nos', 'npr'].map((s) => art(s, 'Trump says he will accept the midterm outcome and blames turnout', secondH))
    const race = ['nyt', 'politico', 'npr', 'guardian'].map((s) => art(s, 'Democrat Talarico flips Texas Senate seat in midterm upset', 3))
    const other = [['nos', 'nrc', 'volkskrant'], ['ad', 'nu', 'rtl'], ['trouw', 'parool', 'nd']].map((ss, k) => ss.map((s) => ({ ...art(s, ['Kabinet presenteert stikstofwet', 'Inflatie stijgt naar 3,7 procent', 'Ombudsman: overheid onbetrouwbaar voor boeren'][k], 1), topics: ['nederland'] })))
    const groups = [['sHead', head, 'vs'], ['sTrump', second, 'vs'], ['sRace', race, 'vs'], ...other.map((its, k) => [`sNl${k}`, its, 'binnenland'])]
    const stories = groups.map(([id, its, desk]) => ({ id, itemIds: its.map((i) => i.id), sourceCount: new Set(its.map((i) => i.source)).size, publisherCount: new Set(its.map((i) => i.source)).size, latestAt: its.map((i) => i.publishedAt).sort().at(-1), desk }))
    return { stories, pool: groups.flatMap((g) => g[1]) }
  }
  const prof = profileOf({ followed: MAIN_IDS, sources: SOURCES })
  const ids = (w, general) => selectForReader(w.stories, w.pool, { mainIds: MAIN_IDS, now: T, prof, general }).map((e) => e.id)
  // Uitzonderlijk (twintig uitgevers op de uitslag): de uitslag en Trumps reactie, niet ook nog een losse race.
  const big = ids(build(20), true)
  assert.ok(big.includes('sHead') && big.includes('sTrump'), big.join())
  assert.ok(!big.includes('sRace'), big.join())
  // De persoonlijke Editie houdt één plek; een gewone uitslag (twaalf uitgevers) ook; een tweede feit van gisteren ook.
  assert.equal(ids(build(20), false).filter((id) => ['sHead', 'sTrump', 'sRace'].includes(id)).length, 1)
  assert.equal(ids(build(12), true).filter((id) => ['sHead', 'sTrump', 'sRace'].includes(id)).length, 1)
  assert.equal(ids(build(20, 9), true).filter((id) => ['sHead', 'sTrump', 'sRace'].includes(id)).length, 1)
})
