import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanTerms, matchTrending, termMatches, termWords, briefInput, bubbleCandidates, areasOf, nearStories, BUBBLE_CANDIDATES, BUBBLE_PER_AREA, NEAR_MAX } from '../netlify/lib/bubble.mjs'
import { writeDoc, KEYS } from '../netlify/lib/kv.mjs'
import edition from '../netlify/functions/edition.mjs'

const art = (id, title, summary = '', extra = {}) => ({ id, kind: 'article', title, summary, publishedAt: '2026-10-10T06:00:00Z', ...extra })

test('termen worden opgeschoond: onderstrepen, haakjes, generieke pagina’s en dubbelen', () => {
  const t = cleanTerms([
    { term: 'Hoofdpagina', via: 'wikipedia' },
    { term: 'Speciaal:Zoeken', via: 'wikipedia' },
    { term: 'Navanethem_Pillay', via: 'wikipedia' },
    { term: 'East_of_Eden_(miniserie_uit_2026)', via: 'wikipedia' },
    { term: 'navanethem pillay', via: 'google' },
    { term: 'Deaths_in_2026', via: 'wikipedia' },
  ])
  assert.deepEqual(
    t.map((x) => x.words),
    [['navanethem', 'pillay'], ['east', 'eden']]
  )
})

test('een term past alleen als (vrijwel) alle woorden in het bericht staan', () => {
  const text = new Set('navi pillay krijgt de nobelprijs voor de vrede'.split(' '))
  assert.equal(termMatches(termWords('Navi Pillay'), text), true)
  assert.equal(termMatches(termWords('Pillay'), text), true)
  assert.equal(termMatches(termWords('Trump approval poll results'), text), false)
  assert.equal(termMatches(termWords('Christa Pike'), text), false)
})

test('kiest berichten buiten de editie, één per verhaal, meerdere signalen eerst', () => {
  const articles = [
    art('a', 'Navi Pillay wint de Nobelprijs voor de Vrede', '', { storyId: 's1' }), // zit in de editie
    art('b', 'Christa Pike: executie mislukt', 'De terdoodveroordeelde Christa Pike overleefde de injectie.', { storyId: 's2' }),
    art('c', 'Pike case raises questions', 'Christa Pike and the death penalty.', { storyId: 's2' }), // zelfde verhaal
    art('d', 'Marinus Dijkhuizen ontslagen als trainer', ''),
    art('e', 'Chelsea verslaat Bournemouth', ''),
    art('f', 'Beurs sluit hoger', ''),
  ]
  const trends = [
    { term: 'navanethem pillay', via: 'google', rank: 1 },
    { term: 'Christa_Pike', via: 'wikipedia', rank: 5 },
    { term: 'Christa Pike execution', via: 'bluesky', rank: 2 },
    { term: 'marinus dijkhuizen', via: 'google', rank: 3 },
    { term: 'chelsea - bournemouth', via: 'google', rank: 2 },
  ]
  const out = matchTrending(trends, articles, { excludeStoryIds: new Set(['s1']), max: 3 })
  assert.deepEqual(
    out.map((o) => o.id),
    ['b', 'd', 'e']
  )
  assert.equal(out[0].terms.length, 2) // twee signalen voor Pike
  assert.ok(out.every((o) => o.id !== 'a' && o.id !== 'c'))
})

test('een signaal dat de editie al dekt telt niet mee', () => {
  const articles = [art('x', 'Why the US stopped public executions', 'The case of Nidal Hasan revives the debate.')]
  const trends = [{ term: 'Nidal_Hasan', via: 'wikipedia' }]
  assert.deepEqual(matchTrending(trends, articles, { coveredTitles: ['Pentagon wil executie Nidal Hasan live uitzenden'] }), [])
  assert.equal(matchTrending(trends, articles).length, 1)
})

test('zonder passende signalen is het blok leeg; sociale posts doen niet mee', () => {
  assert.deepEqual(matchTrending([{ term: 'iets anders', via: 'google' }], [art('a', 'Beurs sluit hoger')]), [])
  assert.deepEqual(matchTrending([{ term: 'beurs', via: 'google' }], [{ ...art('p', 'beurs sluit hoger'), kind: 'post' }]), [])
})

test('de invoer voor het AI-overzicht: bron, kop en samenvatting; zonder samenvatting gemarkeerd', () => {
  const s = briefInput([{ sourceName: 'NOS', title: 'Kop', summary: 'Kern.' }, { sourceName: 'NYT', title: 'Head' }])
  assert.equal(s, '1. [NOS] Kop — Kern.\n2. [NYT] Head [alleen kop]')
})

// ---------- Kandidaten voor de persoonlijke Editie (bouwspec §7) ----------

test('gebied van een bericht: uit de onderwerpen, anders uit de rubriek van de bron', () => {
  assert.deepEqual(areasOf({ topics: ['voetbal'] }), ['sport'])
  assert.deepEqual(areasOf({ topics: ['ai', 'klimaat', 'tech'] }), ['tech', 'wetenschap'])
  assert.deepEqual(areasOf({ topics: [] }, 'sport'), ['sport'])
  assert.deepEqual(areasOf({}, 'nl'), []) // gewoon nieuws: geen gebied
  assert.deepEqual(areasOf(undefined), [])
})

// Een trendavond vol voetbal: zes kandidaten naast het stuk in de editie, hooguit twee per gebied.
const SPORT_NAMES = ['Ajax', 'Feyenoord', 'PSV', 'Twente', 'Utrecht', 'Vitesse', 'Heerenveen', 'Groningen']
const OTHER = [
  ['k1', 'Pillay', 'Navi Pillay wint de Nobelprijs', ['geopolitiek']],
  ['k2', 'Kepler', 'Kepler vindt nieuwe planeet', ['ruimte']],
  ['k3', 'Lula', 'Lula spreekt over klimaat', ['klimaat']],
  ['k4', 'Nvidia', 'Nvidia presenteert nieuwe chip', ['ai']],
  ['k5', 'Rembrandt', 'Rembrandt gevonden op zolder', ['kunst']],
  ['k6', 'Tata', 'Tata Steel schrapt banen', ['bedrijven']],
  ['k7', 'Gaza', 'Bestand in Gaza houdt stand', ['middenoosten']],
]
const trendNight = () => {
  const articles = [
    ...SPORT_NAMES.map((n, i) => art('s' + i, `${n} wint met ruime cijfers`, '', { topics: ['voetbal'], storyId: 'st-s' + i, lang: i < 6 ? 'nl' : 'en' })),
    ...OTHER.map(([id, , title, topics], i) => art(id, title, '', { topics, lang: i % 2 ? 'nl' : 'en' })),
  ]
  // Voetbal scoort het hoogst (google + wikipedia), daarna de rest.
  const trends = [
    ...SPORT_NAMES.flatMap((n, i) => [{ term: n.toLowerCase(), via: 'google', rank: i }, { term: n, via: 'wikipedia', rank: i }]),
    ...OTHER.map(([, term], i) => ({ term, via: 'bluesky', rank: i })),
  ]
  return { articles, trends }
}

test('bubbel: ≥ 6 kandidaten, hooguit 2 per gebied, het stuk van de algemene editie blijft eerst', () => {
  const { articles, trends } = trendNight()
  const byId = new Map(articles.map((a) => [a.id, a]))
  const opts = { max: Infinity }
  const nl = matchTrending(trends, articles.filter((a) => a.lang === 'nl'), opts)
  const all = matchTrending(trends, articles, opts)
  const picks = bubbleCandidates([nl, all], { areaOf: (p) => areasOf(byId.get(p.id)) })
  // Wat de algemene editie vroeger koos (max 3, Nederlandstalig eerst) staat nog steeds vooraan.
  const before = matchTrending(trends, articles.filter((a) => a.lang === 'nl'), { max: 3 })
  assert.equal(picks[0].id, before[0].id)
  const bubble = picks.slice(1) // zo komt het in global.bubble
  assert.ok(bubble.length >= BUBBLE_CANDIDATES, `kandidaten: ${bubble.length}`)
  const per = new Map()
  for (const p of picks) for (const a of areasOf(byId.get(p.id))) per.set(a, (per.get(a) || 0) + 1)
  for (const [a, n] of per) assert.ok(n <= BUBBLE_PER_AREA, `${a}: ${n}`)
  assert.equal(per.get('sport'), 2) // niet meer acht keer voetbal
  // Nederlandstalig eerst, daarna aangevuld met de rest; één per verhaal, geen dubbelen.
  assert.ok(picks.findIndex((p) => byId.get(p.id).lang === 'en') > picks.findLastIndex((p) => byId.get(p.id).lang === 'nl'))
  assert.equal(new Set(picks.map((p) => p.storyId || p.id)).size, picks.length)
})

test('bubbel: zonder gebied telt een stuk niet mee voor de spreiding; de grens blijft gelden', () => {
  const list = Array.from({ length: 10 }, (_, i) => ({ id: 'x' + i }))
  assert.equal(bubbleCandidates([list]).length, 1 + BUBBLE_CANDIDATES)
  assert.equal(bubbleCandidates([list], { max: 3 }).length, 3)
  assert.deepEqual(bubbleCandidates([[{ id: 'a', storyId: 's' }], [{ id: 'b', storyId: 's' }, { id: 'a' }, null]]).map((p) => p.id), ['a'])
  assert.deepEqual(bubbleCandidates([]), [])
})

// "Naast je bubbel": een twaalftal brede verhalen van het afgelopen etmaal.
const NEAR_NOW = Date.parse('2026-10-30T17:00:00Z')
const hAgo = (h) => new Date(NEAR_NOW - h * 36e5).toISOString()
const nearFixture = () => {
  const byId = new Map()
  const stories = []
  const add = (id, sourceCount, latestH, members) => {
    for (const m of members) byId.set(m.id, { kind: 'article', title: m.id, summary: 'Intro.', ...m })
    stories.push({ id, sourceCount, latestAt: hAgo(latestH), itemIds: members.map((m) => m.id) })
  }
  add('st-klimaat', 5, 2, [{ id: 'c1', source: 'nyt', topics: ['klimaat'] }, { id: 'c2', source: 'nos', topics: ['klimaat', 'energie'] }])
  add('st-ai', 5, 3, [{ id: 'a1', source: 'nos', topics: ['ai'] }])
  add('st-oud', 9, 30, [{ id: 'o1', source: 'nos', topics: ['zorg'] }]) // ouder dan een dag
  add('st-smal', 2, 1, [{ id: 'm1', source: 'nos', topics: ['zorg'] }]) // te weinig bronnen
  add('st-sport', 8, 1, [{ id: 'v1', source: 'nos', topics: ['voetbal'] }, { id: 'v2', source: 'nyt', topics: ['nederland'] }])
  add('st-leeg', 7, 1, [{ id: 'e1', source: 'nos' }]) // geen onderwerpen: niets om naast te liggen
  add('st-betaald', 6, 1, [{ id: 'p1', source: 'nyt', topics: ['wonen'] }]) // alleen betaald
  add('st-opinie', 4, 1, [{ id: 'op', source: 'nos', topics: ['wonen'], type: 'opinie' }, { id: 'op2', source: 'nu', topics: ['wonen'] }])
  return { stories, byId }
}
const nearOpts = { isFree: (s) => s !== 'nyt', isDutch: (s) => s === 'nos' || s === 'nu', isSport: (i) => (i.topics || []).includes('voetbal'), now: NEAR_NOW }

test('near: ≥ 3 bronnen, jonger dan een etmaal, met onderwerpen en een gratis kop, zonder sport', () => {
  const { stories, byId } = nearFixture()
  const near = nearStories(stories, byId, nearOpts)
  // Breedste eerst; bij gelijke stand (5 en 5) op id.
  assert.deepEqual(near.map((n) => n.storyId), ['st-ai', 'st-klimaat', 'st-opinie'])
  const klimaat = near.find((n) => n.storyId === 'st-klimaat')
  assert.equal(klimaat.item.id, 'c2') // de gratis, Nederlandstalige kop
  assert.deepEqual(klimaat.topics, ['klimaat', 'energie'])
  assert.equal(klimaat.sourceCount, 5)
  assert.equal(near.find((n) => n.storyId === 'st-opinie').item.id, 'op2') // geen opinie als kop
})

test('near: hooguit een twaalftal, en de volgorde hangt niet af van de invoer', () => {
  const byId = new Map()
  const stories = Array.from({ length: 20 }, (_, i) => {
    byId.set('i' + i, { id: 'i' + i, kind: 'article', source: 'nos', title: 't', summary: 's', topics: ['zorg'] })
    return { id: 'st' + String(i).padStart(2, '0'), sourceCount: 3 + (i % 4), latestAt: hAgo(1), itemIds: ['i' + i] }
  })
  const a = nearStories(stories, byId, nearOpts)
  const b = nearStories([...stories].reverse(), byId, nearOpts)
  assert.equal(a.length, NEAR_MAX)
  assert.deepEqual(a, b)
  assert.ok(a.every((n, i) => i === 0 || a[i - 1].sourceCount >= n.sourceCount))
  assert.deepEqual(nearStories([{ id: 'x', sourceCount: 5, latestAt: null, itemIds: [] }], byId, nearOpts), []) // geen tijd: niet mee
})

// ---------- /api/edition: alleen nog terugval, leest geen leesprofiel ----------

test('/api/edition negeert affinity en geeft geen punten mee', async () => {
  const now = new Date().toISOString()
  const mk = (id, title, topics) => ({ id, kind: 'article', source: 'nos', sourceName: 'NOS', title, summary: `Intro bij ${title}.`, publishedAt: now, image: 'https://x/i.jpg', topics })
  const items = [mk('n1', 'Kabinet presenteert plan voor woningbouw', ['wonen']), mk('n2', 'Nieuwe klimaatafspraken in Brussel', ['klimaat']), mk('n3', 'Storm in Zeeland sluit wegen af', ['verkeer'])]
  const start = {
    sources: [{ id: 'nos', kind: 'nieuws', cat: 'nl', name: 'NOS' }],
    stories: [],
    edition: { id: 'e', slot: 'avond', date: '2026-10-30', next: '06:00', builtAt: now, entries: [{ kind: 'item', id: 'g1', desk: 'buitenland' }], items: [{ ...mk('g1', 'Wereldnieuws', []), source: 'nyt' }] },
    meta: { parts: { nos: 'p' } },
  }
  await writeDoc(KEYS.start, { body: JSON.stringify(start), builtAt: now, etag: 's' })
  await writeDoc(KEYS.part('nos'), { body: JSON.stringify({ items }), builtAt: now, etag: 'p' })
  const post = async (extra) => (await (await edition(new Request('http://x/api/edition', { method: 'POST', body: JSON.stringify({ followed: ['nos'], ...extra }) }))).json()).edition
  const plain = await post({})
  const learned = await post({ affinity: { n: 200, topics: { klimaat: 80 }, sources: { nos: 80 } } })
  assert.deepEqual(plain.entries.map(e => e.leadId || e.id).sort(), ['n1', 'n3']) // Brussel is geen groot nieuws; geen Wereld gekozen
  assert.deepEqual(learned, plain)
  assert.ok(learned.entries.every((e) => !Object.keys(e).some((k) => k.startsWith('_')) && !/leest/.test(e.why?.text || '')))
  assert.ok(!Object.keys(learned).some((k) => k.startsWith('_')))
})
