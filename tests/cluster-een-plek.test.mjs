// Eén onderwerp op één dag, één plek (Redacteur · cluster, lijst van Alex 12 november). Verhalen van dezelfde dag die over
// hetzelfde gaan (een crisis of een gebeurtenis met veel invalshoeken) krijgen samen één plek: wie het eerst een plek
// krijgt, de rest blijft in de Stroom en bij Vergelijken. Zie sameCluster in netlify/lib/stories.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { signatures, sameCluster, clusterMatch, clusterNames, selectForReader, buildStories, CLUSTER_HOURS } from '../netlify/lib/stories.mjs'
import { freeDutchFill } from '../netlify/lib/aanvulling.mjs'
import { profileOf } from '../shared/editor.mjs'
import { MAIN_IDS } from '../netlify/lib/sources.mjs'

const NOW = Date.parse('2026-11-12T16:00:00.000Z')
const at = (h) => new Date(NOW - h * 36e5).toISOString()
let n = 0
const it = (source, title, h = 2, extra = {}) => ({ id: `i${++n}`, kind: 'article', source, sourceName: source, title, summary: `${title}.`, image: 'https://example.org/b.jpg', publishedAt: at(h), url: `https://example.org/${n}`, topics: [], ...extra })
// Namen zijn woorden die ergens midden in een zin met een hoofdletter staan (de woordenschat van de pool): één stuk zonder
// kop dat ze noemt, zoals in een echte pool.
const VOCAB = { id: 'vocab', kind: 'article', source: 'onbekend', title: '', summary: 'Het gaat vandaag over Nvidia, Huang, KLM, Binance, Utrecht, Bert, Zeeland, Mulder, Arnhem, Boekarest en Netanyahu.', publishedAt: at(1) }
const sigOf = (...xs) => signatures([VOCAB, ...xs.flat()])
const story = (id, items) => ({ id, itemIds: items.map((i) => i.id), leadId: items[0].id, sourceCount: new Set(items.map((i) => i.source)).size, publisherCount: new Set(items.map((i) => i.source)).size, latestAt: items.map((i) => i.publishedAt).sort().pop() })

test('sameCluster: twee invalshoeken met dezelfde twee namen in de koppen zijn één cluster', () => {
  const a = [it('nos', 'Nvidia zet topman Huang onder druk na spionagezaak', 3), it('nrc', 'Topman Huang overweegt vertrek bij Nvidia', 2), it('fd', 'Aandeel Nvidia keldert, Huang zwijgt', 2)]
  const b = [it('volkskrant', 'Hoe Nvidia de chipmarkt groot maakte, en wat Huang daarmee deed', 4), it('tweakers', 'Wat betekent de crisis bij Nvidia voor Huang en de aandeelhouders?', 5)]
  const sig = sigOf(a, b)
  const m = clusterMatch(sig, a, b)
  assert.ok(m, 'één onderwerp')
  assert.equal(m.via, 'namen')
  assert.deepEqual(m.namen, ['huang', 'nvidia'])
})

test('sameCluster: één gedeelde naam alleen is geen cluster (twee verhalen over KLM)', () => {
  const bom = [it('nos', 'KLM-vlucht naar Tel Aviv na bommelding vast in Boekarest', 3), it('rtl', 'KLM-vlucht in Boekarest blijft aan de grond na bommelding', 3), it('nu', 'KLM-vlucht kreeg bommelding en viel uit', 2)]
  const banen = [it('volkskrant', 'KLM schrapt 5000 banen, voortbestaan geen vanzelfsprekendheid', 2), it('parool', 'KLM schrapt duizenden banen bij reorganisatie', 2)]
  const sig = sigOf(bom, banen)
  assert.equal(sameCluster(sig, bom, banen), false)
})

test('sameCluster: één naam met dezelfde gebeurtenis in een kop van elke plek is wél één cluster', () => {
  const nl = [it('nos', 'Binance gehackt: miljarden aan cryptovaluta verdwenen', 3), it('nrc', 'Binance gehackt, beurs schort opnames op', 3)]
  const en = [it('bbc', 'Binance hacked as thieves take billions in crypto', 2), it('guardian', 'Binance hacked: what we know about the crypto theft', 2)]
  const sig = sigOf(nl, en)
  const m = clusterMatch(sig, nl, en)
  assert.ok(m)
  assert.equal(m.via, 'kop')
})

test('sameCluster: niet op dezelfde dag is geen cluster', () => {
  const a = [it('nos', 'Topman Huang stapt op bij Nvidia', 2), it('nrc', 'Huang vertrekt bij Nvidia', 2)]
  const b = [it('volkskrant', 'Nvidia en Huang aangeklaagd in spionagezaak', 2 + CLUSTER_HOURS + 6), it('fd', 'Spionagezaak raakt Nvidia en Huang', 2 + CLUSTER_HOURS + 5)]
  const sig = sigOf(a, b)
  assert.equal(sameCluster(sig, a, b), false)
})

test('sameCluster: een kop In Titelkast maakt van een gewoon woord geen naam ("Election", "Album")', () => {
  const a = [it('nyt', 'The Justice Department’s Unusual Election-Year Activity', 2), it('atlantic', 'What to Expect on Election Night', 3)]
  const b = [it('bbc', 'Israeli opposition accuses Netanyahu of trying to delegitimise election', 2), it('nos', 'Oppositie in Israël beschuldigt Netanyahu van ondermijnen verkiezing', 2)]
  const sig = sigOf(a, b)
  assert.equal(sameCluster(sig, a, b), false)
  assert.ok(!clusterNames(sig, a).some((x) => x.naam === 'election'))
})

test('sameCluster: een naam uit één verdwaald stuk van een kleine bundel telt niet', () => {
  const anc = [it('guardian', 'ANC faces anger as South Africans vote in local elections', 2), it('bbc', 'ANC under pressure to reverse South Africa decline', 2), it('dw', 'Why South Africa’s local elections matter', 3)]
  const handel = [it('scmp', 'Trump says US close to trade deal with Canada, Carney says work remains', 2), it('bbc', 'Trump to remove Rwanda and South Africa from US trade deal', 3)]
  const sig = sigOf(anc, handel)
  assert.equal(sameCluster(sig, anc, handel), false)
})

// De selectie: van drie verhalen over één onderwerp op één dag krijgt alleen het eerste een plek.
const crisis = () => {
  const a = [it('nos', 'Topman Huang stapt op bij Nvidia na spionagezaak', 1), it('nrc', 'Huang vertrekt per direct bij Nvidia', 1), it('volkskrant', 'Nvidia verliest topman Huang', 1), it('fd', 'Huang weg bij Nvidia, aandeel omlaag', 1), it('nu', 'Topman Huang stapt op bij Nvidia', 1)]
  const b = [it('tweakers', 'Wie volgt Huang op bij Nvidia? Dit zijn de kandidaten', 2), it('fd', 'Opvolging bij Nvidia: wie wordt de nieuwe Huang?', 2), it('nrc', 'Nvidia zoekt opvolger voor Huang', 2)]
  const c = [it('volkskrant', 'De val van Huang: hoe Nvidia zijn oprichter kwijtraakte', 3), it('nos', 'Analyse: Nvidia na Huang, wat nu?', 3)]
  const other = [
    [it('nos', 'Kabinet presenteert plan voor woningbouw in Utrecht', 2), it('nrc', 'Woningbouwplan voor Utrecht gepresenteerd', 2), it('volkskrant', 'Utrecht krijgt duizenden nieuwe woningen', 2)],
    [it('nos', 'Storm Bert raast over Zeeland', 2), it('nu', 'Storm Bert veroorzaakt schade in Zeeland', 2), it('rtl', 'Zware storm Bert in Zeeland', 2)],
    [it('nos', 'Rechtbank Arnhem veroordeelt bendeleider Mulder', 3), it('nu', 'Bendeleider Mulder krijgt twaalf jaar', 3), it('rtl', 'Twaalf jaar cel voor Mulder', 3)],
  ]
  const stories = [story('A', a), story('B', b), story('C', c), ...other.map((xs, k) => story(`O${k}`, xs))]
  return { pool: [VOCAB, ...a, ...b, ...c, ...other.flat()], stories }
}

test('selectForReader (algemeen): één plek voor het cluster, de rest van de Editie gaat naar ander nieuws', () => {
  const { pool, stories } = crisis()
  const audit = []
  const entries = selectForReader(stories, pool, { mainIds: MAIN_IDS, now: NOW, prof: profileOf({ followed: MAIN_IDS }), general: true, audit })
  const ids = entries.map((e) => e.id)
  assert.equal(ids.filter((id) => ['A', 'B', 'C'].includes(id)).length, 1, `één plek voor Nvidia: ${ids}`)
  assert.ok(ids.includes('A'), 'het grootste verhaal houdt de plek')
  for (const k of ['O0', 'O1', 'O2']) assert.ok(ids.includes(k), `${k} staat erin`)
  const why = new Map(audit.map((x) => [x.id, x.reason]))
  assert.equal(why.get('B'), 'zelfde-onderwerp-zelfde-dag')
  assert.equal(why.get('C'), 'zelfde-onderwerp-zelfde-dag')
})

test('selectForReader (persoonlijk): ook in jouw Editie één plek per cluster', () => {
  const { pool, stories } = crisis()
  const prof = profileOf({ followed: new Set(['nos', 'nrc', 'volkskrant', 'fd', 'tweakers', 'nu', 'rtl']), interests: ['tech', 'economie', 'binnenland'] })
  const entries = selectForReader(stories, pool, { mainIds: new Set(['nos', 'nrc', 'volkskrant', 'fd', 'tweakers', 'nu', 'rtl']), now: NOW, prof })
  assert.equal(entries.filter((e) => ['A', 'B', 'C'].includes(e.id)).length, 1)
})

test('freeDutchFill: geen aanvulling over een onderwerp dat al een plek heeft', () => {
  const a = [it('nos', 'Topman Huang stapt op bij Nvidia na spionagezaak', 1), it('nrc', 'Huang vertrekt per direct bij Nvidia', 1), it('volkskrant', 'Nvidia verliest topman Huang', 1)]
  const los = it('nu', 'Opvolger van Huang bij Nvidia binnen een week bekend', 1)
  const ander = it('rtl', 'Gemeente Utrecht opent nieuwe fietsenstalling bij station', 1)
  const st = story('A', a)
  const sel = [{ kind: 'story', id: 'A', leadId: a[0].id, itemIds: st.itemIds }]
  const out = freeDutchFill(sel, { stories: [st], newsPool: [VOCAB, ...a, los, ander], now: NOW, size: 10 })
  const ids = out.map((e) => e.id)
  assert.ok(!ids.includes(los.id), 'geen tweede plek voor Nvidia')
  assert.ok(ids.includes(ander.id), 'wel ander nieuws')
})

// Echte data: de Binance-roof op 30 oktober (vroege avond) stond als twee verhalen in de pool, een Engels verhaal van tien
// uitgevers en een Nederlands van twee ("Dit weten we tot nu toe over de grootste cryptoroof ooit").
test('echte pool 30 oktober: de twee Binance-verhalen zijn één cluster, ander nieuws niet', () => {
  const feed = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/snapshot-2026-10-30-avond.json.gz', import.meta.url))).toString('utf8'))
  const now = Date.parse(feed.edition.builtAt)
  const articles = [...new Map([...(feed.related || []), ...feed.items].map((i) => [i.id, i])).values()].filter((i) => i.kind === 'article' && Date.parse(i.publishedAt) <= now).map((i) => ({ ...i }))
  const stories = buildStories(articles, {}, { mainIds: MAIN_IDS, keys: true, extended: true }).filter((st) => now - Date.parse(st.latestAt) < 24 * 36e5)
  const byId = new Map(articles.map((i) => [i.id, i]))
  const itemsOf = (st) => st.itemIds.map((id) => byId.get(id)).filter(Boolean)
  const sig = signatures(articles)
  const binance = stories.filter((st) => itemsOf(st).some((i) => /binance/i.test(i.title || '')) && st.publisherCount >= 2)
  assert.ok(binance.length >= 2, 'twee Binance-verhalen in de pool')
  const [a, b] = binance.sort((x, y) => y.publisherCount - x.publisherCount)
  assert.ok(sameCluster(sig, itemsOf(a), itemsOf(b)))
  const others = stories.filter((st) => !binance.includes(st) && st.publisherCount >= 3).slice(0, 15)
  for (const st of others) assert.equal(sameCluster(sig, itemsOf(a), itemsOf(st)), false, itemsOf(st)[0]?.title)
})

// Jouw Editie vult aan uit de algemene Editie: ook die route geeft een onderwerp dat al een plek heeft geen tweede plek.
test('composePersonal: geen aanvulling uit de algemene Editie over een onderwerp dat al een plek heeft', async () => {
  const { composePersonal } = await import('../src/lib/personal.js')
  const SOURCES = ['nos', 'nrc', 'volkskrant', 'fd', 'tweakers', 'nu', 'rtl'].map((id) => ({ id, name: id, cat: id === 'tweakers' ? 'tech' : 'nl', lang: 'nl' }))
  const eigen = [it('nos', 'Topman Huang stapt op bij Nvidia na spionagezaak', 1), it('nos', 'Nvidia verliest topman Huang na spionagezaak', 1.5)]
  const hoek = [it('nrc', 'Wie volgt Huang op bij Nvidia? Dit zijn de kandidaten', 2), it('fd', 'Opvolging bij Nvidia: wie wordt de nieuwe Huang?', 2), it('volkskrant', 'Nvidia zoekt opvolger voor Huang', 2)]
  const ander = [it('nrc', 'Storm Bert raast over Zeeland', 2), it('volkskrant', 'Storm Bert veroorzaakt schade in Zeeland', 2), it('fd', 'Zware storm Bert in Zeeland', 2)]
  const stories = [story('A', eigen), story('B', hoek), story('O', ander)]
  const global = { id: '2026-11-12-middag', slot: 'middag', date: '2026-11-12', builtAt: new Date(NOW).toISOString(), entries: [{ kind: 'story', id: 'B', leadId: hoek[0].id, desk: 'tech' }, { kind: 'story', id: 'O', leadId: ander[0].id, desk: 'binnenland' }], items: [...hoek, ...ander], bubble: [] }
  const ed = composePersonal({ global, stories, items: [VOCAB, ...eigen], sources: SOURCES, followed: new Set(['nos']), interests: ['tech', 'binnenland'], now: NOW })
  const ids = ed.entries.map((e) => e.id)
  assert.ok(ids.includes('A') || ids.includes(eigen[0].id), `je eigen Nvidia-verhaal staat erin: ${ids}`)
  assert.ok(!ids.includes('B'), `geen tweede plek voor Nvidia: ${ids}`)
  assert.ok(ids.includes('O'), `wel het andere nieuws: ${ids}`)
})
