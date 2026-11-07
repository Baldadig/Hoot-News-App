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

// Ronde 3 · 4: één definitie van een Nederlandse plek voor bouw en meetlat (dutchPlace): een Nederlandse bron als kop
// én een Nederlands of Nederlands-relevant onderwerp (geen buitenlands nieuws volgens internationalNews).
test('een Nederlandse plek: Nederlandse bron én Nederlands onderwerp (3b · ronde 3 · 4)', async () => {
  const { dutchPlace } = await import('../netlify/lib/build.mjs')
  const t = '2026-11-06T04:00:00Z'
  const items = new Map()
  const place = (id, sources, title, desk = null) => {
    const its = sources.map((s, k) => ({ id: `${id}${k}`, source: s, kind: 'article', title, summary: `${title}.`, publishedAt: t }))
    for (const i of its) items.set(i.id, i)
    return { kind: 'story', id, leadId: its[0].id, desk, members: its }
  }
  const is = (e) => dutchPlace(e, { itemsOf: (x) => x.members, byId: items })
  assert.ok(is(place('a', ['nos', 'nrc'], 'Tweede Kamer stemt over stikstofwet in Den Haag', 'binnenland')))
  assert.ok(is(place('b', ['volkskrant', 'trouw'], 'Kabinet en provincies eens over woningbouw')), 'zonder rubriek: de plaatsen beslissen')
  // Een Nederlandse bron over buitenland is geen Nederlandse plek, ook als vooral Nederlandse kranten het brachten.
  assert.ok(!is(place('c', ['nrc', 'volkskrant', 'nos'], 'Russische krant in Moskou stopt onder druk van het Kremlin', 'buitenland')))
  assert.ok(!is(place('d', ['nos', 'nrc'], 'Raketten voor Kyiv goedgekeurd door Washington', 'oekraine')))
  // Een Nederlands onderwerp met een buitenlandse of Vlaamse kop is ook geen Nederlandse plek.
  assert.ok(!is(place('e', ['bbc', 'nos'], 'Dutch parliament votes on nitrogen law in The Hague', 'binnenland')))
  assert.ok(!is(place('f', ['vrt', 'nos'], 'Tweede Kamer stemt over stikstofwet in Den Haag', 'binnenland')))
})

test('de Nederlandse ondergrens houdt plek vrij voor Nederlands nieuws als de Editie anders vol buitenland staat (3b · ronde 3 · 4)', async () => {
  const { dutchPlace, NL_TOP5_MIN } = await import('../netlify/lib/build.mjs')
  const T = Date.parse('2026-11-06T05:00:00Z')
  const at = (h) => new Date(T - h * 36e5).toISOString()
  let n = 0
  const art = (source, title, h = 1, topics = []) => ({ id: `u${++n}`, kind: 'article', source, title, summary: `${title}.`, publishedAt: at(h), topics })
  const stories = []
  const pool = []
  const story = (id, sources, title, desk, topics, h = 1) => {
    const its = sources.map((s) => art(s, title, h, topics))
    pool.push(...its)
    stories.push({ id, itemIds: its.map((i) => i.id), sourceCount: its.length, publisherCount: its.length, latestAt: its[0].publishedAt, desk })
  }
  // Twaalf zware buitenlandse verhalen (ook met Nederlandse koppen), één groot Nederlands verhaal en één klein.
  const places = ['Lima', 'Quito', 'Bogota', 'Caracas', 'Santiago', 'Montevideo', 'Asuncion', 'La Paz', 'Brasilia', 'Havana', 'Managua', 'Panama']
  places.forEach((p, k) => story(`w${k}`, ['nos', 'nrc', 'bbc', 'nyt', 'guardian', 'lemonde'], `Regering in ${p} valt na massaal protest`, 'buitenland', ['wereld'], 1 + k / 10))
  story('n0', ['nos', 'volkskrant', 'ad'], 'Kabinet presenteert stikstofwet in Den Haag', 'binnenland', ['nederland'])
  story('n1', ['nu', 'trouw'], 'Gemeente Zwolle sluit zwembad na lekkage', 'binnenland', ['nederland'], 3)
  const ed = generalEdition({ stories, pool, now: T })
  const byId = new Map(pool.map((i) => [i.id, i]))
  const sById = new Map(stories.map((s) => [s.id, s]))
  const itemsOf = (e) => (e.kind === 'story' ? sById.get(e.id).itemIds : [e.id]).map((id) => byId.get(id))
  const top5 = ed.slice(0, 5).filter((e) => dutchPlace(e, { itemsOf, byId, storyOf: (e) => sById.get(e.id) }))
  assert.equal(top5.length, NL_TOP5_MIN, ed.map((e) => e.id).join())
  assert.ok(ed.some((e) => e.id === 'n1'), 'het kleine Nederlandse verhaal krijgt een plek boven een buitenlands verhaal')
  assert.equal(ed.length, 10)
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

// Ronde 3 · 2 (keuring ronde 2): het plafond voor buitenland en de eenbronsregel werken samen. Een buitenlands verhaal
// van drie uitgevers valt bij een leeg profiel onder het plafond (minder dan OPEN_WORLD_MIN), maar telt wel als sterk
// nieuws: de staart gaat eerst naar zulke verhalen, en pas daarna naar een eenbronsstuk.
test('de staart eerst met verhalen van drie uitgevers, ook buitenland, dan pas een eenbronsstuk (3b · ronde 3 · 2)', async () => {
  const { OPEN_WORLD_MIN } = await import('../shared/edition-policy.mjs')
  assert.ok(OPEN_WORLD_MIN > 3)
  const T = Date.parse('2026-11-06T05:00:00Z')
  const at = (h) => new Date(T - h * 36e5).toISOString()
  let n = 0
  const art = (source, title, o = {}) => ({ id: `t${++n}`, kind: 'article', source, title, summary: `${title}.`, publishedAt: at(1), topics: [], ...o })
  const own = new Set(['nos', 'nrc', 'volkskrant', 'ad', 'nu'])
  const prof = profileOf({ followed: own, sources: SOURCES })
  const stories = []
  const pool = []
  const story = (id, sources, title, desk, topics) => {
    const its = sources.map((s) => art(s, title, { topics }))
    pool.push(...its)
    stories.push({ id, itemIds: its.map((i) => i.id), sourceCount: its.length, publisherCount: its.length, latestAt: its[0].publishedAt, desk })
  }
  // Twee Nederlandse verhalen, twee kleine buitenlandse verhalen (drie uitgevers, onder het plafond) en twee losse stukken.
  story('n0', ['nos', 'nrc', 'volkskrant'], 'Kabinet presenteert stikstofwet in Den Haag', 'binnenland', ['nederland'])
  story('n1', ['ad', 'nu', 'rtl'], 'Inflatie in Nederland stijgt naar 3,7 procent', 'binnenland', ['nederland'])
  story('w0', ['bbc', 'nyt', 'guardian'], 'Chilean parliament rejects pension reform in Santiago', 'buitenland', ['wereld'])
  story('w1', ['bbc', 'lemonde', 'dw'], 'Kenyan court halts tax law after protests in Nairobi', 'buitenland', ['wereld'])
  story('w2', ['nyt', 'guardian', 'aljazeera'], 'Mongolian prime minister survives no-confidence vote in Ulaanbaatar', 'buitenland', ['wereld'])
  const singles = [art('ad', 'Griezelen in het pretpark tijdens de herfstnachten', { topics: ['nederland'] }), art('nu', 'Gemeente opent nieuwe bibliotheek in Zwolle', { topics: ['nederland'] })]
  pool.push(...singles)
  const ids = (size) => selectForReader(stories, pool, { mainIds: own, now: T, size, prof, general: true }).map((e) => e.id)
  // Met vijf plekken: alle verhalen van drie uitgevers, ook het derde buitenlandse boven INT_MAX, geen los stuk.
  assert.ok(INT_MAX < 3)
  assert.deepEqual(ids(5).sort(), ['n0', 'n1', 'w0', 'w1', 'w2'])
  // Met meer plekken dan sterk nieuws mogen de losse stukken daarna.
  const all = ids(10)
  assert.ok(singles.every((i) => all.includes(i.id)), all.join())
  // De persoonlijke Editie (niet `general`) houdt het plafond zoals het was.
  const personal = selectForReader(stories, pool, { mainIds: own, now: T, size: 5, prof }).map((e) => e.id)
  assert.ok(['w0', 'w1', 'w2'].filter((id) => personal.includes(id)).length <= INT_MAX, personal.join())
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

// Ronde 2, aanvulling op punt 1, bijgesteld in ronde 3 · 1: de algemene Editie vergelijkt ook kop met kop, zoals de lezer
// ze ziet, maar alleen op dezelfde gebeurtenis (sameHeadEvent: dezelfde partij, dezelfde handeling of hetzelfde feit, kort
// na elkaar), niet op hetzelfde onderwerp (sameSubject). Keuring ronde 2: met sameSubject legde de vergelijking alles
// rond een verkiezing uit als één onderwerp, en vielen een beurscrash en een stemmende kerkleider weg.
const headCase = async () => {
  const { signatures, sameSubject, sameHeadEvent } = await import('../netlify/lib/stories.mjs')
  const T = Date.parse('2026-11-05T04:30:00Z')
  const at = (h) => new Date(T - h * 36e5).toISOString()
  let n = 0
  const art = (source, title, summary, h = 2, topics = ['vs-politiek']) => ({ id: `m${++n}`, kind: 'article', source, title, summary, publishedAt: at(h), topics })
  const five = (sources, head, other, summary) => sources.map((s, k) => art(s, k ? `${other} ${k}` : head, summary))
  const ctx = 'Na de verkiezingen van deze week reageerde President Trump; ook de Democrats en Republicans in het Congress keken naar de uitslag van de midterm elections.'
  const groups = {
    // Eén breed onderwerp (de verkiezingen), verschillende partijen en feiten: geen dubbel.
    kerk: five(['nyt', 'bbc', 'guardian', 'npr', 'aljazeera'], 'Bishop Okafor Becomes First Church Leader to Cast a Ballot in US Election', 'Okafor votes by mail', `Bishop Okafor voted. ${ctx}`),
    inmenging: five(['nyt', 'bbc', 'guardian', 'npr', 'dw'], 'The Real Threat of Foreign Interference in This Election', 'Interference warnings grow', `Officials warned about interference. ${ctx}`),
    // Een beurscrash naast een burgemeestersverkiezing: andere partij, ander feit.
    beurs: five(['nyt', 'bbc', 'guardian', 'npr', 'ft'], 'Wall Street Sheds $2.1tn as Stocks Slump', 'Markets tumble on Wall Street', `Stocks fell sharply on Wall Street. ${ctx}`),
    stad: five(['nyt', 'bbc', 'guardian', 'npr', 'lemonde'], 'A Generational Upset in the Denver Mayoral Race', 'Denver mayor race upset', `Voters in Denver chose a newcomer. ${ctx}`),
    // Dezelfde gebeurtenis in twee verhalen die niet gebundeld werden: één plek.
    ontslag: five(['nyt', 'bbc', 'guardian', 'npr', 'independent'], 'Archbishop Mbeki Resigns After Abuse Report', 'Abuse report published', 'The report on Archbishop Mbeki was published by investigators on Tuesday.'),
    ontslag2: five(['politico', 'economist', 'telegraph', 'scmp', 'bloomberg'], 'Mbeki Resigns as Archbishop Amid Abuse Inquiry', 'Inquiry continues', 'Investigators said Archbishop Mbeki stepped down.'),
  }
  const nl = [['nos', 'nrc', 'volkskrant'], ['ad', 'nu', 'rtl']].map((ss, k) => ss.map((s) => art(s, ['Kabinet presenteert stikstofwet', 'Inflatie stijgt naar 3,7 procent'][k], 'Het kabinet besloot.', 1, ['nederland'])))
  const all = [...Object.entries(groups).map(([id, its]) => [id, its, 'vs']), ['n0', nl[0], 'binnenland'], ['n1', nl[1], 'binnenland']]
  const stories = all.map(([id, its, desk]) => ({ id, itemIds: its.map((i) => i.id), sourceCount: its.length, publisherCount: its.length, latestAt: its[0].publishedAt, desk }))
  const pool = all.flatMap((g) => g[1])
  return { groups, stories, pool, T, sameSubject, sameHeadEvent, signatures }
}
test('kop met kop: één breed onderwerp is geen dubbel, dezelfde gebeurtenis wel (3b · ronde 3 · 1)', async () => {
  const { groups, pool, sameSubject, sameHeadEvent, signatures } = await headCase()
  const full = signatures(pool)
  // Alleen de kop, met de woordenschat van de hele pool (zoals selectForReader het doet met headSignature).
  const heads = signatures(pool, Object.values(groups).map((g) => ({ ...g[0], id: `kop:${g[0].id}`, summary: '', text: '' })))
  const headOf = (g) => heads.get(`kop:${g[0].id}`)
  // De oude val: hetzelfde onderwerp (sameSubject op kop en tekst), want de tekst noemt dezelfde verkiezingen.
  assert.ok(sameSubject(full.get(groups.kerk[0].id), full.get(groups.inmenging[0].id)), 'zelfde onderwerp')
  assert.ok(sameSubject(full.get(groups.beurs[0].id), full.get(groups.stad[0].id)), 'zelfde onderwerp')
  // Maar niet dezelfde gebeurtenis.
  assert.ok(!sameHeadEvent(headOf(groups.kerk), headOf(groups.inmenging)))
  assert.ok(!sameHeadEvent(headOf(groups.beurs), headOf(groups.stad)))
  // Een land en een voorzetsel in twee koppen is geen gedeeld feit ("Rusland" is een naam, ook in een andere spelling).
  const extra = signatures(pool, [
    { id: 'kop:x', kind: 'article', source: 'volkskrant', title: 'Wandelaar steekt de bevroren zeestraat tussen Alaska en Rusland over', publishedAt: pool[0].publishedAt },
    { id: 'kop:y', kind: 'article', source: 'nrc', title: 'Gesprekken tussen VS, Oekraïne en Rusland volgende week in Genève', publishedAt: pool[0].publishedAt },
  ])
  assert.ok(!sameHeadEvent(extra.get('kop:x'), extra.get('kop:y')))
  // Wel dezelfde gebeurtenis: dezelfde partij, dezelfde handeling, kort na elkaar.
  assert.ok(sameHeadEvent(headOf(groups.ontslag), headOf(groups.ontslag2)))
})
test('algemene Editie: twee koppen uit één breed onderwerp krijgen elk een plek, één gebeurtenis één plek (3b · ronde 3 · 1)', async () => {
  const { stories, pool, T } = await headCase()
  const ed = generalEdition({ stories, pool, now: T })
  const ids = new Set(ed.map((e) => e.id))
  for (const id of ['kerk', 'inmenging', 'beurs', 'stad']) assert.ok(ids.has(id), id)
  assert.equal(['ontslag', 'ontslag2'].filter((id) => ids.has(id)).length, 1)
})

// Ronde 4 · 1 (keuring ronde 3): één verdwaald stuk in een geplaatste bundel drukt geen groot verhaal weg. Een bundel over
// een burgemeestersverkiezing met één beursstuk erin hield een beurscrash van veel uitgevers buiten de Editie, omdat de
// vergelijking per stuk (subjectTaken) al bij één stuk botste. Nu telt een botsing alleen als de botsende stukken de kern
// van de plek zijn: haar kop, of stukken van meer dan één uitgever (of de helft van haar uitgevers).
const strayCase = (strays = ['lemonde'], crashPubs = ['nyt', 'bbc', 'guardian', 'ft', 'nos', 'telegraaf']) => {
  const T = Date.parse('2026-11-06T06:00:00Z')
  const at = (h) => new Date(T - h * 36e5).toISOString()
  let n = 0
  const art = (source, title, summary, h = 2, topics = []) => ({ id: `w${++n}`, kind: 'article', source, title, summary, publishedAt: at(h), topics })
  const crashHead = 'Wall Street sheds $3tn as chip stocks slump on AI fears'
  const crashSum = 'Shares of Nvidia and other chipmakers tumbled on Wall Street as investors dumped AI stocks.'
  const mayor = [
    ...['nyt', 'npr', 'guardian', 'independent', 'aljazeera'].map((s) => art(s, 'Raman wins Denver mayoral race in generational upset', 'Voters in Denver elected Raman as mayor.', 3, ['vs-politiek'])),
    // Het verdwaalde stuk: over de beurs, maar in de bundel van de burgemeester terechtgekomen.
    ...strays.map((s) => art(s, 'On Wall Street, the AI bubble bursts as chip stocks slump', crashSum, 2)),
  ]
  const crash = crashPubs.map((s) => art(s, crashHead, crashSum, 1))
  const nl = [['nos', 'nrc', 'volkskrant'], ['ad', 'nu', 'rtl']].map((ss, k) => ss.map((s) => art(s, ['Kabinet presenteert stikstofwet', 'Inflatie stijgt naar 3,7 procent'][k], 'Het kabinet besloot.', 1, ['nederland'])))
  const all = [['mayor', mayor, 'vs'], ['crash', crash, null], ['n0', nl[0], 'binnenland'], ['n1', nl[1], 'binnenland']]
  const pubsOf = (its) => new Set(its.map((i) => i.source)).size
  // De burgemeester weegt zwaarder (meer uitgevers met de bundel erbij) en staat er dus eerst.
  const stories = all.map(([id, its, desk]) => ({ id, itemIds: its.map((i) => i.id), sourceCount: pubsOf(its), publisherCount: pubsOf(its) + (id === 'mayor' ? 6 : 0), latestAt: its.map((i) => i.publishedAt).sort().at(-1), desk }))
  return { stories, pool: all.flatMap((g) => g[1]), T }
}
test('één verdwaald stuk drukt geen groot verhaal weg (3b · ronde 4 · 1)', async () => {
  const { signatures, sameSubject } = await import('../netlify/lib/stories.mjs')
  const prof = profileOf({ followed: MAIN_IDS, sources: SOURCES })
  const run = (w, general = true) => selectForReader(w.stories, w.pool, { mainIds: MAIN_IDS, now: w.T, prof, general }).map((e) => e.id)
  const one = strayCase()
  // Het verdwaalde stuk gaat wel over hetzelfde onderwerp als de crash (de oude botsing).
  const sig = signatures(one.pool)
  const stray = one.pool.find((i) => /bubble/.test(i.title))
  assert.ok(one.pool.filter((i) => /sheds/.test(i.title)).some((i) => sameSubject(sig.get(i.id), sig.get(stray.id))))
  // Toch krijgen beide een plek, in de algemene en in de persoonlijke Editie.
  for (const general of [true, false]) {
    const ids = run(one, general)
    assert.ok(ids.includes('mayor') && ids.includes('crash'), ids.join())
  }
  // Komen de botsende stukken van twee uitgevers, dan is het geen verdwaald stuk meer: één plek.
  const two = run(strayCase(['lemonde', 'dw']))
  assert.ok(two.includes('mayor') && !two.includes('crash'), two.join())
  // Een kleiner verhaal (drie uitgevers) botst zoals vroeger al bij één stuk.
  const small = run(strayCase(['lemonde'], ['nyt', 'bbc', 'ft']))
  assert.ok(small.includes('mayor') && !small.includes('crash'), small.join())
})

// Ronde 5 · 1 (keuring ronde 4): een botsing per stuk telt alleen als de botsende stukken over dezelfde gebeurtenis gaan als
// de kandidaat (sameHeadEvent op de koppen, of twee uitslagstukken), of als de plek het onderwerp al minstens zo breed
// brengt als de kandidaat. Een losse analysebundel over een verkiezing drukt zo geen nieuwsverhaal van vier uitgevers
// over iets anders weg, ook niet als twee van haar stukken (met haar kop) hetzelfde thema hebben.
const themeCase = (clash = ['atlantic', 'wired']) => {
  const T = Date.parse('2026-10-30T17:00:00Z')
  const at = (h) => new Date(T - h * 36e5).toISOString()
  let n = 0
  const art = (source, title, summary, h = 2, topics = []) => ({ id: `t${++n}`, kind: 'article', source, title, summary, publishedAt: at(h), topics })
  const where = (s) => (clash.includes(s) ? ' in Michigan and Pennsylvania' : '')
  const analysis = [
    ['atlantic', 'The Real Threat of Election Interference in America', (w) => `Foreign meddling and voter intimidation${w} could shape the election, experts warn.`],
    ['wired', 'Election Integrity Group Linked to Billionaire Targets US Voters', (w) => `A group tied to a tech billionaire is recruiting poll watchers${w} ahead of the election.`],
    ['nyt', 'The Justice Department’s Unusual Election-Year Activity', (w) => `Prosecutors${w} have taken steps close to the election that break with tradition.`],
    ['npr', 'Here are the Senate races to watch ahead of Election Day', (w) => `Control of the Senate hinges on a handful of races${w}.`],
    ['dw', 'US election: voters fear interference at the polls', (w) => `Voters${w} worry about meddling in the election.`],
  ].map(([s, t, sum]) => art(s, t, sum(where(s)), 3, ['vs-politiek']))
  const news = ['bbc', 'independent', 'lemonde', 'scmp'].map((s) => art(s, 'Astronaut casts ballot from orbit for first time in US election', 'A NASA astronaut from Michigan aboard the space station voted in the election, with a ballot sent to Pennsylvania, the agency said.', 1))
  const nl = [['nos', 'nrc', 'volkskrant'], ['ad', 'nu', 'rtl']].map((ss, k) => ss.map((s) => art(s, ['Kabinet presenteert stikstofwet', 'Inflatie stijgt naar 3,7 procent'][k], 'Het kabinet besloot.', 1, ['nederland'])))
  const all = [['analyse', analysis, 'vs'], ['astronaut', news, null], ['n0', nl[0], 'binnenland'], ['n1', nl[1], 'binnenland']]
  const pubsOf = (its) => new Set(its.map((i) => i.source)).size
  // De analysebundel weegt zwaarder (meer uitgevers) en staat er dus eerst.
  const stories = all.map(([id, its, desk]) => ({ id, itemIds: its.map((i) => i.id), sourceCount: pubsOf(its), publisherCount: pubsOf(its) + (id === 'analyse' ? 6 : 0), latestAt: its.map((i) => i.publishedAt).sort().at(-1), desk }))
  return { stories, pool: all.flatMap((g) => g[1]), T }
}
test('een analysebundel over hetzelfde thema drukt geen verhaal over een andere gebeurtenis weg (3b · ronde 5 · 1)', async () => {
  const { signatures, sameSubject, sameHeadEvent } = await import('../netlify/lib/stories.mjs')
  const prof = profileOf({ followed: MAIN_IDS, sources: SOURCES })
  const run = (w, general = true) => selectForReader(w.stories, w.pool, { mainIds: MAIN_IDS, now: w.T, prof, general }).map((e) => e.id)
  const one = themeCase()
  // De oude botsing: twee stukken van de bundel (met haar kop) gaan volgens sameSubject over hetzelfde onderwerp, maar
  // de koppen melden geen gemeenschappelijke gebeurtenis.
  const sig = signatures(one.pool)
  const heads = signatures(one.pool, one.pool.map((i) => ({ ...i, id: `kop:${i.id}`, text: '', summary: '' })))
  const astro = one.pool.find((i) => /orbit/.test(i.title))
  const hit = one.pool.filter((i) => i.source === 'atlantic' || i.source === 'wired')
  for (const i of hit) {
    assert.ok(sameSubject(sig.get(astro.id), sig.get(i.id)), i.source)
    assert.ok(!sameHeadEvent(heads.get(`kop:${astro.id}`), heads.get(`kop:${i.id}`)), i.source)
  }
  for (const general of [true, false]) {
    const ids = run(one, general)
    assert.ok(ids.includes('analyse') && ids.includes('astronaut'), ids.join())
  }
  // Brengt de plek het onderwerp even breed als de kandidaat (vier uitgevers), dan blijft het één plek.
  const wide = run(themeCase(['atlantic', 'wired', 'nyt', 'npr']))
  assert.ok(wide.includes('analyse') && !wide.includes('astronaut'), wide.join())
})

// Ronde 4 · 2 (keuring ronde 3): dutchPlace kijkt naar alle stukken van het verhaal, ook die buiten de nieuwspool (zoals de
// meetlat), en een buitenlandse plaats of een buitenlands land als onderwerp in de kop maakt een plek niet-Nederlands.
test('een buitenlandse plaats in de kop is geen Nederlandse plek, tenzij de kop ook een Nederlands anker heeft (3b · ronde 4 · 2)', async () => {
  const { foreignHead } = await import('../netlify/lib/desks.mjs')
  const { dutchPlace } = await import('../netlify/lib/build.mjs')
  assert.ok(foreignHead('Uruguayaanse president stapt op na protesten om bankblokkade'))
  assert.ok(foreignHead('Regering van Bolivia valt na massaal protest'))
  assert.ok(foreignHead('Thaise premier ontslagen door grondwettelijk hof'))
  assert.ok(!foreignHead('Nederlandse militairen naar Litouwen'), 'Nederlands anker')
  assert.ok(!foreignHead('KLM schrapt vluchten naar Bolivia'), 'Nederlands bedrijf')
  assert.ok(!foreignHead('Kabinet presenteert stikstofwet'))
  assert.ok(!foreignHead('Inval bij datacenter in Middenmeer'))
  const t = '2026-11-06T04:00:00Z'
  const items = new Map()
  const place = (id, sources, title, desk = null) => {
    const its = sources.map((s, k) => ({ id: `${id}${k}`, source: s, kind: 'article', title, summary: 'De protesten duurden weken.', publishedAt: t }))
    for (const i of its) items.set(i.id, i)
    return { kind: 'story', id, leadId: its[0].id, desk, members: its }
  }
  const is = (e) => dutchPlace(e, { itemsOf: (x) => x.members, byId: items })
  assert.ok(!is(place('u', ['nos', 'nrc', 'volkskrant'], 'Uruguayaanse president stapt op na protesten om bankblokkade', 'economie')))
  assert.ok(is(place('k', ['nos', 'nrc', 'volkskrant'], 'KLM schrapt vluchten naar Bolivia na protesten', 'economie')))
})
test('de Nederlandse ondergrens telt met alle stukken van het verhaal, niet alleen de nieuwspool (3b · ronde 4 · 2)', async () => {
  const { dutchPlace } = await import('../netlify/lib/build.mjs')
  const T = Date.parse('2026-11-06T05:00:00Z')
  const at = (h) => new Date(T - h * 36e5).toISOString()
  let n = 0
  const art = (source, title, h = 1, topics = []) => ({ id: `q${++n}`, kind: 'article', source, title, summary: `${title}.`, publishedAt: at(h), topics })
  const stories = []
  const pool = []
  const newsPool = []
  const story = (id, news, rest, desk, h = 1) => {
    newsPool.push(...news)
    pool.push(...news, ...rest)
    const its = [...news, ...rest]
    const pubs = new Set(its.map((i) => i.source)).size
    stories.push({ id, itemIds: its.map((i) => i.id), sourceCount: pubs, publisherCount: pubs, latestAt: at(h), desk })
  }
  // Een verhaal waarvan alleen de Nederlandse stukken in de nieuwspool vallen; de rest zegt duidelijk: buitenland.
  story('x', ['nos', 'nrc', 'volkskrant'].map((s) => art(s, 'Minister stapt op na protesten om bankblokkade', 1, ['economie'])), ['bbc', 'guardian', 'nyt', 'aljazeera', 'lemonde'].map((s) => art(s, 'Colombia minister resigns over bank blockade protests', 1, ['wereld'])), 'economie')
  // Zware buitenlandse verhalen en twee kleine Nederlandse verhalen.
  ;['Lima', 'Quito', 'Bogota', 'Caracas', 'Santiago', 'Havana', 'Managua', 'Panama', 'La Paz', 'Asuncion'].forEach((p, k) => {
    const its = ['bbc', 'nyt', 'guardian', 'lemonde', 'aljazeera', 'dw'].map((s) => art(s, `Government in ${p} falls after mass protest`, 1 + k / 10, ['wereld']))
    story(`w${k}`, its, [], 'buitenland', 1 + k / 10)
  })
  story('n0', ['nos', 'volkskrant'].map((s) => art(s, 'Kabinet presenteert stikstofwet in Den Haag', 2, ['nederland'])), [], 'binnenland', 2)
  story('n1', ['nu', 'trouw'].map((s) => art(s, 'Gemeente Zwolle sluit zwembad na lekkage', 3, ['nederland'])), [], 'binnenland', 3)
  const newsIds = new Set(newsPool.map((i) => i.id))
  const newsStories = stories.filter((s) => s.itemIds.some((id) => newsIds.has(id)))
  const ed = generalEdition({ stories, newsStories, pool, newsPool, now: T })
  const allById = new Map(pool.map((i) => [i.id, i]))
  const sById = new Map(stories.map((s) => [s.id, s]))
  const itemsOf = (e) => (e.kind === 'story' ? sById.get(e.id).itemIds : [e.id]).map((id) => allById.get(id))
  const dutch = (e) => dutchPlace(e, { itemsOf, byId: allById, storyOf: (e) => sById.get(e.id) })
  const x = ed.find((e) => e.id === 'x')
  assert.ok(x && !dutch(x), 'met alle stukken is het verhaal buitenland')
  assert.ok(ed.slice(0, 5).filter(dutch).length >= 2, ed.map((e) => e.id).join())
})

// Ronde 4 · 3 (keuring ronde 3): bij gelijke grootte gaat een nieuwsverhaal in de algemene Editie voor een luchtig verhaal
// of curiosum, ook als dat verser is. Een luchtig verhaal met duidelijk meer uitgevers kan nog steeds een plek krijgen.
test('bij gelijke grootte gaat nieuws voor een luchtig verhaal (3b · ronde 4 · 3)', async () => {
  const { curioStory, CURIO_TIE } = await import('../netlify/lib/stories.mjs')
  assert.ok(CURIO_TIE > 0 && CURIO_TIE < 4, 'minder dan één uitgever')
  const T = Date.parse('2026-11-06T05:00:00Z')
  const at = (h) => new Date(T - h * 36e5).toISOString()
  let n = 0
  const art = (source, title, h, url = '') => ({ id: `l${++n}`, kind: 'article', source, title, summary: `${title}.`, publishedAt: at(h), topics: [], url: url && `https://example.com${url}/${n}` })
  const prof = profileOf({ followed: MAIN_IDS, sources: SOURCES })
  const build = (lightPubs) => {
    const stories = []
    const pool = []
    const story = (id, its, desk) => {
      pool.push(...its)
      const pubs = new Set(its.map((i) => i.source)).size
      stories.push({ id, itemIds: its.map((i) => i.id), sourceCount: pubs, publisherCount: pubs, latestAt: its.map((i) => i.publishedAt).sort().at(-1), desk })
    }
    // Het nieuws is ouder (13 uur), het luchtige verhaal vers (1 uur); verder even groot.
    story('nieuws', ['bbc', 'guardian', 'nyt', 'lemonde'].map((s) => art(s, 'Chilean parliament rejects pension reform in Santiago', 13)), 'buitenland')
    story('luchtig', lightPubs.map((s) => art(s, 'Governor declares gold-covered ballroom a national monument', 1)), 'buitenland')
    story('n0', ['nos', 'nrc', 'volkskrant'].map((s) => art(s, 'Kabinet presenteert stikstofwet in Den Haag', 1)), 'binnenland')
    story('n1', ['ad', 'nu', 'rtl'].map((s) => art(s, 'Inflatie in Nederland stijgt naar 3,7 procent', 1)), 'binnenland')
    return { stories, pool }
  }
  const run = (w, size) => selectForReader(w.stories, w.pool, { mainIds: MAIN_IDS, now: T, size, prof, general: true }).map((e) => e.id)
  const even = build(['bbc', 'guardian', 'nyt', 'lemonde'])
  assert.ok(curioStory(even.stories[1], even.pool.filter((i) => even.stories[1].itemIds.includes(i.id))))
  const three = run(even, 3)
  assert.ok(three.includes('nieuws') && !three.includes('luchtig'), three.join())
  // Met meer plekken komt het luchtige verhaal er gewoon bij; met duidelijk meer uitgevers gaat het voor.
  assert.ok(run(even, 10).includes('luchtig'))
  const big = run(build(['bbc', 'guardian', 'nyt', 'lemonde', 'npr', 'dw']), 3)
  assert.ok(big.includes('luchtig'), big.join())
})

test('bovenaan de kop van een Nederlandse bron als het verhaal die heeft, ook bij buitenlands nieuws (3b · ronde 6 · 1)', async () => {
  const { dutchHeads, DUTCH_HEAD_TOP } = await import('../netlify/lib/stories.mjs')
  assert.equal(DUTCH_HEAD_TOP, 3)
  const T = Date.parse('2026-11-06T17:00:00Z')
  const at = (h) => new Date(T - h * 36e5).toISOString()
  let n = 0
  const art = (source, title, h, extra = {}) => ({ id: `d${++n}`, kind: 'article', source, title, summary: `${title}.`, publishedAt: at(h), url: `https://example.com/nieuws/${n}`, ...extra })
  const items = new Map()
  const story = (id, its, leadSource) => {
    for (const i of its) items.set(i.id, i)
    return { kind: 'story', id, leadId: its.find((i) => i.source === leadSource).id, desk: 'buitenland', members: its }
  }
  // Een buitenlandse gebeurtenis met een Engelse kop van een eigen bron; Nederlandse stukken: één over de gebeurtenis
  // (een niet-eigen bron, ouder dan het nieuwste Engelse stuk), één met een vraag als kop en één verdwaald stuk.
  const hack = story('hack', [
    art('nyt', 'Hackers Steal $2.1 Billion From Crypto Exchange Kraxa', 1),
    art('bbc', 'Kraxa crypto exchange hacked, $2.1 billion stolen', 2),
    art('guardian', 'Kraxa hack: $2.1bn in crypto stolen from exchange', 2),
    art('tweakers', 'Cryptobeurs Kraxa gehackt: 2,1 miljard dollar aan crypto gestolen', 7),
    art('volkskrant', 'Hoe konden hackers 2,1 miljard dollar bij cryptobeurs Kraxa stelen?', 1),
    art('rtl', 'Verdachte van ontvoering meisje in Ohio opgepakt', 1),
  ], 'nyt')
  // Een verhaal zonder Nederlandse kop die kan (alleen opinie) blijft zoals het was.
  const vote = story('vote', [
    art('bbc', 'Chile votes in pension referendum', 1),
    art('guardian', 'Chileans vote on pension reform', 2),
    art('nrc', 'Opinie: Chili kiest voor zijn ouderen', 1, { type: 'opinie' }),
  ], 'bbc')
  // Plek 4 hoort niet bij de top: daar blijft de kop.
  const quake = story('quake', [
    art('dw', 'Earthquake of 6.8 strikes off coast of Peru', 1),
    art('nos', 'Aardbeving van 6,8 voor de kust van Peru', 2),
  ], 'dw')
  const filler = story('filler', [art('bbc', 'Senate passes budget bill', 1), art('npr', 'Senate passes budget', 1)], 'bbc')
  const entries = [hack, vote, filler, quake].map(({ members, ...e }) => e)
  const itemsOf = (e) => [hack, vote, quake, filler].find((x) => x.id === e.id).members
  dutchHeads(entries, { itemsOf, mainIds: MAIN_IDS, now: T })
  assert.equal(items.get(entries[0].leadId).source, 'tweakers', 'de Nederlandse kop over de gebeurtenis, niet de vraag of het verdwaalde stuk')
  assert.equal(items.get(entries[1].leadId).source, 'bbc', 'geen opinie als kop')
  assert.equal(items.get(entries[3].leadId).source, 'dw', 'alleen de top')
})

test('de Nederlandse kop geeft dezelfde actuele stand: geen ingehaalde vooruitblik, wel hetzelfde feit van een nacht ervoor (3b · ronde 7 · 1, ronde 8 · 1)', async () => {
  const { dutchHeads, outlookTitle, staleOutlook } = await import('../netlify/lib/stories.mjs')
  const T = Date.parse('2026-11-12T06:00:00Z')
  const at = (h) => new Date(T - h * 36e5).toISOString()
  let n = 0
  const art = (source, title, h) => ({ id: `o${++n}`, kind: 'article', source, title, summary: `${title}.`, publishedAt: at(h), url: `https://example.com/nieuws/${n}` })
  const members = new Map()
  const story = (id, its, leadSource) => {
    members.set(id, its)
    return { kind: 'story', id, leadId: its.find((i) => i.source === leadSource).id, desk: 'buitenland' }
  }
  // De ochtend na een referendum in een verzonnen land: de Engelse kop meldt de uitkomst, het enige Nederlandse stuk is de
  // vooruitblik van gisteravond.
  const vote = story('vote', [
    art('nyt', 'Velor Premier Hanno Kreisler Accepts Referendum Defeat', 1),
    art('bbc', 'Hanno Kreisler concedes Velor referendum defeat', 2),
    art('guardian', 'Velor rejects reform as Hanno Kreisler loses referendum', 3),
    art('nos', 'Velor naar de stembus: Hanno Kreisler hoopt op ja, hier wordt het verschil gemaakt', 10),
  ], 'nyt')
  // Een beursval: het Nederlandse stuk is van de avond ervoor (19 uur), de Engelse kop van een uur geleden. Hetzelfde feit
  // (de koersval), dus de Nederlandse kop (ronde 8 · 1: geen leeftijdsgrens meer binnen het verhaalvenster).
  const stocks = story('stocks', [
    art('nyt', 'Asian Markets Follow Nasdaq Lower as Nvidia Slides', 1),
    art('ft', 'Nvidia slide drags Asian stocks after Nasdaq fall', 2),
    art('bbc', 'Nvidia and Nasdaq fall hits markets in Asia', 2),
    art('nos', 'Nvidia krijgt klappen op Wall Street, Nasdaq 4 procent omlaag', 19),
  ], 'nyt')
  // Een gewone gebeurtenis met een Nederlands stuk van een paar uur eerder: dat wordt de kop.
  const quake = story('quake', [
    art('nyt', 'Hackers Steal $2.1 Billion From Crypto Exchange Kraxa', 1),
    art('bbc', 'Kraxa crypto exchange hacked, $2.1 billion stolen', 2),
    art('guardian', 'Kraxa hack: $2.1bn in crypto stolen from exchange', 2),
    art('tweakers', 'Cryptobeurs Kraxa gehackt: 2,1 miljard dollar aan crypto gestolen', 7),
  ], 'nyt')
  const itemsOf = (e) => members.get(e.id)
  const of = (e) => itemsOf(e).find((i) => i.id === e.leadId)
  assert.ok(outlookTitle(members.get('vote')[3]) && !outlookTitle(members.get('vote')[0]), 'een vooruitblik, en een uitkomst met "accepts" is er geen')
  assert.ok(staleOutlook(members.get('vote')[3], members.get('vote')))
  const entries = dutchHeads([vote, stocks, quake].map((e) => ({ ...e })), { itemsOf, mainIds: MAIN_IDS, now: T })
  assert.equal(of(entries[0]).source, 'nyt', 'geen vooruitblik van gisteren boven de uitkomst')
  assert.equal(of(entries[1]).source, 'nos', 'hetzelfde feit van de avond ervoor blijft Nederlands')
  assert.equal(of(entries[2]).source, 'tweakers', 'een paar uur ouder over dezelfde gebeurtenis mag')
  // Na de vorige Editie: een Nederlandse kop van daarvóór is geen nieuws meer.
  const later = dutchHeads([quake].map((e) => ({ ...e })), { itemsOf, mainIds: MAIN_IDS, now: T, since: T - 3 * 36e5 })
  assert.equal(of(later[0]).source, 'nyt')
  // Met een vorige Editie van daarna valt ook de Nederlandse kop van de avond ervoor af (actualiteit).
  const stocksLater = dutchHeads([stocks].map((e) => ({ ...e })), { itemsOf, mainIds: MAIN_IDS, now: T, since: T - 12 * 36e5 })
  assert.equal(of(stocksLater[0]).source, 'nyt')
})

test('nieuwsbelang boven sensatie: een verhaal over een bekend persoon opent niet naast even groot economisch nieuws (3b · ronde 6 · 2)', async () => {
  const { newsBeforePeople, peopleStory, weightyStory, curioStory } = await import('../netlify/lib/stories.mjs')
  const T = Date.parse('2026-11-06T17:00:00Z')
  let n = 0
  const art = (source, title, path = 'nieuws') => ({ id: `p${++n}`, kind: 'article', source, title, summary: `${title}.`, publishedAt: new Date(T - 36e5).toISOString(), url: `https://example.com/${path}/${n}` })
  const members = new Map()
  const story = (id, its, desk = 'buitenland') => {
    members.set(id, its)
    return { kind: 'story', id, leadId: its[0].id, desk }
  }
  // De broer van een bekende zangeres opgepakt in een strafzaak: ernstig (geen curiosum), maar sensatie.
  const people = story('people', [
    art('nos', 'Broer van zangeres Lina Vos opgepakt op verdenking van fraude'),
    art('nu', 'Broer Lina Vos aangehouden door politie', 'koningshuis'),
    art('rtl', 'Broer van Lina Vos opgepakt: verdenking van fraude', 'boulevard'),
    art('telegraaf', 'Broer zangeres Lina Vos aangehouden', 'entertainment/sterren'),
    art('bbc', 'Singer Lina Vos’s brother arrested on fraud charges'),
    art('guardian', 'Brother of singer Lina Vos arrested in fraud case'),
  ])
  // Even groot: de beurzen gaan hard onderuit.
  const markets = story('markets', [
    art('nyt', 'Global Stocks Tumble as Bond Yields Surge'),
    art('ft', 'Stocks slide worldwide as bond yields jump'),
    art('volkskrant', 'Beurzen wereldwijd onderuit door oplopende rente'),
    art('fd', 'Aandelen zakken hard weg na rentestijging'),
    art('guardian', 'Global stock markets fall sharply'),
  ])
  const small = story('small', [art('bbc', 'Parliament debates pension law in Chile'), art('npr', 'Chile lawmakers debate pensions')])
  const itemsOf = (e) => members.get(e.id)
  const storyOf = (e) => ({ publisherCount: new Set(members.get(e.id).map((i) => i.source)).size })
  assert.ok(peopleStory(itemsOf(people)) && !curioStory({}, itemsOf(people)), 'een bekend persoon, ernstig: geen curiosum')
  assert.ok(weightyStory({}, itemsOf(markets)) && !peopleStory(itemsOf(markets)))
  const order = (es) => newsBeforePeople(es.map((e) => ({ ...e })), { itemsOf, storyOf }).map((e) => e.id)
  assert.deepEqual(order([people, small, markets]), ['markets', 'people', 'small'])
  // Is het nieuws duidelijk kleiner, dan blijft de volgorde staan; een gewoon verhaal op 01 ook.
  members.set('markets', members.get('markets').slice(0, 3))
  assert.deepEqual(order([people, small, markets]), ['people', 'small', 'markets'])
  assert.deepEqual(order([small, people, markets]), ['small', 'people', 'markets'])
})

test('nieuwsbelang boven een misdaadzaak: een rechtszaak opent niet naast even groot geopolitiek nieuws (3b · ronde 7 · 2)', async () => {
  const { newsBeforePeople, crimeStory, weightyStory } = await import('../netlify/lib/stories.mjs')
  const T = Date.parse('2026-11-12T17:00:00Z')
  let n = 0
  const art = (source, title) => ({ id: `c${++n}`, kind: 'article', source, title, summary: `${title}.`, publishedAt: new Date(T - 36e5).toISOString(), url: `https://example.com/nieuws/${n}` })
  const members = new Map()
  const story = (id, its) => {
    members.set(id, its)
    return { kind: 'story', id, leadId: its[0].id, desk: 'buitenland' }
  }
  // Een binnenlandse strafzaak, vier uitgevers.
  const crime = story('crime', [
    art('nos', 'Echtpaar uit Dalfsen krijgt 14 jaar cel voor mishandeling pleegkinderen'),
    art('nrc', 'Rechtbank veroordeelt pleegouders Dalfsen tot jaren cel'),
    art('ad', 'Pleegouders Dalfsen veroordeeld voor mishandeling'),
    art('nu', 'Celstraf voor pleegouders uit Dalfsen na jarenlange mishandeling'),
  ])
  // Geopolitiek van dezelfde omvang.
  const strike = story('strike', [
    art('nos', 'Rusland voert raketaanval uit op Moldavische grensstad'),
    art('bbc', 'Russia strikes Moldovan border town in missile attack'),
    art('guardian', 'Russian missiles hit Moldova as Kremlin escalates'),
    art('volkskrant', 'Russische raketaanval op Moldavië, NAVO roept beraad bijeen'),
  ])
  const small = story('small', [art('rtl', 'Gemeente Zwolle opent nieuwe fietsenstalling'), art('nu', 'Zwolle heeft grootste fietsenstalling van Overijssel')])
  // Een politieke crisis met rechters en oproerpolitie is geen misdaadzaak.
  const crisis = story('crisis', [
    art('bbc', 'Riot police deployed to Velor’s constitutional court after judge suspended'),
    art('guardian', 'Velor president joins protest amid constitutional crisis at top court'),
    art('nos', 'Politie bij hof in Velor na schorsing hoogste rechter, president keert terug'),
    art('dw', 'Velor: protesters clash with police over sacked court chief'),
  ])
  const itemsOf = (e) => members.get(e.id)
  const storyOf = (e) => ({ publisherCount: new Set(members.get(e.id).map((i) => i.source)).size })
  assert.ok(crimeStory({}, itemsOf(crime)) && !weightyStory({}, itemsOf(crime)), 'een strafzaak')
  assert.ok(weightyStory({}, itemsOf(strike)))
  assert.ok(!crimeStory({}, itemsOf(crisis)), 'een politieke crisis is geen misdaadzaak')
  const order = (es) => newsBeforePeople(es.map((e) => ({ ...e })), { itemsOf, storyOf }).map((e) => e.id)
  assert.deepEqual(order([crime, small, strike]), ['strike', 'crime', 'small'])
  assert.deepEqual(order([crisis, small, strike]), ['crisis', 'small', 'strike'])
  // Is het nieuws kleiner dan de strafzaak, dan blijft de volgorde staan.
  members.set('strike', members.get('strike').slice(0, 3))
  assert.deepEqual(order([crime, small, strike]), ['crime', 'small', 'strike'])
})

// Ronde 7 · 3 (besluit van Alex, 6 november): elke Editie vertelt wat er sinds de vorige Editie gebeurde.
test('actualiteit: koppen van na de vorige Editie, terug alleen met een ontwikkeling, een groot verhaal één keer langer (3b · ronde 7 · 3)', async () => {
  const { previousOf, heldDown, HOLD_PUBS } = await import('../netlify/lib/stories.mjs')
  const T = Date.parse('2026-11-12T16:00:00Z')
  const PREV = T - 5 * 36e5
  const at = (h) => new Date(T - h * 36e5).toISOString()
  let n = 0
  const art = (source, title, h) => ({ id: `a${++n}`, kind: 'article', source, title, summary: `${title}.`, publishedAt: at(h), topics: [], url: `https://example.com/nieuws/${n}` })
  const prof = profileOf({ followed: MAIN_IDS, sources: SOURCES })
  const stories = []
  const pool = []
  const story = (id, its, desk = 'buitenland') => {
    pool.push(...its)
    const pubs = new Set(its.map((i) => i.source)).size
    stories.push({ id, itemIds: its.map((i) => i.id), sourceCount: pubs, publisherCount: pubs, latestAt: its.map((i) => i.publishedAt).sort().at(-1), desk })
    return its
  }
  // Groot (HOLD_PUBS uitgevers), stond in de vorige Editie; sindsdien één nieuw stuk, geen ontwikkeling.
  const bigPubs = ['nyt', 'bbc', 'guardian', 'ft', 'fd', 'volkskrant', 'nrc', 'ad', 'telegraaf', 'lemonde', 'dw']
  const big = story('big', [...bigPubs.map((s) => art(s, 'Nvidia and Nasdaq slide as Wall Street sells off chip stocks', 8)), art('nos', 'Nvidia en Nasdaq verder onderuit op Wall Street', 1)])
  // Klein, stond in de vorige Editie, niets nieuws.
  const small = story('small', ['nos', 'nrc', 'volkskrant'].map((s) => art(s, 'Kabinet presenteert stikstofwet in Den Haag', 8)), 'binnenland')
  // Nieuw voor de lezer, maar alle stukken van vóór de vorige Editie.
  story('old', ['bbc', 'guardian', 'dw', 'npr'].map((s) => art(s, 'Chilean parliament rejects pension reform in Santiago', 7)))
  // Nieuw sinds de vorige Editie, met één ouder stuk van een eigen bron.
  story('fresh', [art('nyt', 'Earthquake of 6.8 strikes Peru coast near Lima', 7), art('bbc', 'Strong earthquake hits Peru coast near Lima', 2), art('guardian', 'Peru earthquake near Lima kills dozens', 2), art('dw', 'Peru: earthquake near Lima leaves dozens dead', 1)])
  for (let k = 0; k < 8; k++) story(`f${k}`, ['nos', 'nrc', 'ad'].map((s) => art(s, `Gemeente Zwolle${k} opent nieuwe brug over de IJssel${k}`, 2)), 'binnenland')
  assert.ok(bigPubs.length >= HOLD_PUBS)
  const byId = new Map(pool.map((i) => [i.id, i]))
  const edition = (held) => ({ id: 'vorige', builtAt: new Date(PREV).toISOString(), entries: [{ kind: 'story', id: 'big', leadId: big[0].id, itemIds: big.slice(0, -1).map((i) => i.id), ...(held ? { held: true } : {}) }, { kind: 'story', id: 'small', leadId: small[0].id, itemIds: small.map((i) => i.id) }], items: [big[0], small[0]], stories: [] })
  const run = (previous) => {
    const audit = []
    const sel = selectForReader(stories, pool, { mainIds: MAIN_IDS, now: T, prof, general: true, previous, audit })
    return { sel, why: (id) => audit.find((x) => x.id === id)?.reason }
  }
  const { sel, why } = run(previousOf(edition(false)))
  const ids = sel.map((e) => e.id)
  const e = (id) => sel.find((x) => x.id === id)
  assert.ok(ids.includes('big') && e('big').held, 'groot verhaal blijft één Editie langer')
  assert.equal(byId.get(e('big').leadId).source, 'nos', 'met het nieuwe stuk als kop')
  assert.ok(!ids.includes('small') && why('small') === 'eerder-getoond-zonder-ontwikkeling')
  assert.ok(!ids.includes('old') && why('old') === 'geen-nieuw-stuk-sinds-vorige-Editie', 'geen oudere kop als nieuws')
  assert.ok(ids.includes('fresh') && Date.parse(byId.get(e('fresh').leadId).publishedAt) > PREV, 'de kop is van na de vorige Editie')
  for (const x of sel) assert.ok(Date.parse(byId.get(x.leadId || x.id).publishedAt) > PREV, x.id)
  // Bleef het al een keer zo, dan maakt het plaats.
  const again = run(previousOf(edition(true)))
  assert.ok(!again.sel.some((x) => x.id === 'big') && again.why('big') === 'eerder-getoond-zonder-ontwikkeling')
  // Zonder vorige Editie verandert er niets: 'old' doet gewoon mee.
  assert.ok(run(null).sel.some((x) => x.id === 'old'))
  // Wat blijft, zakt onder de top 5.
  const order = heldDown(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({ id, held: id === 'a' }))).map((x) => x.id)
  assert.deepEqual(order, ['b', 'c', 'd', 'e', 'f', 'a', 'g'])
})
