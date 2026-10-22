import { test } from 'node:test'
import assert from 'node:assert/strict'
import { composePersonal, personalRows, INTEREST_BONUS } from '../src/lib/personal.js'

const NOW = Date.parse('2026-10-22T10:00:00Z')
const ago = (h) => new Date(NOW - h * 36e5).toISOString()
const art = (id, source, title, extra = {}) => ({ id, kind: 'article', source, sourceName: source.toUpperCase(), title, summary: `Intro bij ${title}.`, publishedAt: ago(1), ...extra })

// Eigen bronnen: NOS en Tweakers. Anderen (NRC) volgt deze lezer niet.
const items = [
  art('n1', 'nos', 'Kabinet presenteert plan voor woningbouw in Utrecht'),
  art('t1', 'tweakers', 'Nieuwe chip van Nvidia verdubbelt rekenkracht voor AI', { topics: ['ai', 'tech'], publishedAt: ago(5) }),
  art('n2', 'nos', 'Storm zorgt voor schade in Zeeland, wegen afgesloten'),
  art('r1', 'nrc', 'Kabinet presenteert plan voor woningbouw, kritiek van gemeenten'),
]
const stories = [{ id: 'sWoning', leadId: 'n1', itemIds: ['n1', 'r1'], sourceCount: 2, ownCount: 1, latestAt: ago(1) }]
const global = {
  id: '2026-10-22-middag', slot: 'middag', date: '2026-10-22', next: '17:00', version: 'g@1',
  entries: [
    { kind: 'story', id: 'sWoning', leadId: 'r1', desk: 'binnenland' },
    { kind: 'item', id: 'g1', desk: 'buitenland' },
    { kind: 'item', id: 'g2', desk: 'vs' },
    { kind: 'item', id: 'b1', desk: 'bubbel', terms: [{ via: 'google' }] },
  ],
  items: [art('r1', 'nrc', 'Kabinet presenteert plan voor woningbouw'), art('g1', 'nyt', 'Wereldnieuws'), art('g2', 'nyt', 'Nieuws uit Washington'), art('b1', 'nu', 'Wat iedereen zoekt')],
  bubble: [],
}
const followed = new Set(['nos', 'tweakers'])
const make = (extra = {}) => composePersonal({ global, stories, items, followed, now: NOW, builtAt: 'T', ...extra })

test('hoofdberichten komen uit je eigen bronnen; een gedeeld verhaal krijgt een eigen bron als kop', () => {
  const e = make()
  const own = e.entries.filter((x) => x.desk !== 'extern' && x.desk !== 'bubbel')
  assert.ok(own.length >= 3)
  for (const x of own) assert.ok(followed.has(e.items.find((i) => i.id === (x.leadId || x.id)).source))
  assert.equal(own.find((x) => x.id === 'sWoning').leadId, 'n1') // NOS, niet de NRC van de algemene editie
  assert.equal(e.personal, true)
  assert.equal(e.id, global.id)
})

test('aanvullen uit de algemene editie: zonder dubbele gebeurtenis, met label', () => {
  const e = make()
  const ext = e.entries.filter((x) => x.desk === 'extern')
  assert.deepEqual(ext.map((x) => x.id), ['g1', 'g2']) // sWoning zat er al in (zelfde verhaal)
  assert.equal(ext[0].fromDesk, 'buitenland')
  assert.ok(e.items.find((i) => i.id === 'g1')) // het gepubliceerde bericht gaat mee
})

test('"Buiten je bubbel" houdt zijn plek, en nooit meer dan tien', () => {
  const e = make()
  assert.equal(e.entries.filter((x) => x.desk === 'bubbel').length, 1)
  const many = Array.from({ length: 20 }, (_, i) => art('x' + i, 'nos', `Ander nieuws nummer ${i} over onderwerp ${i}`, { publishedAt: ago(i % 5) }))
  assert.ok(make({ items: [...items, ...many] }).entries.length <= 10)
})

test('interesses geven voorrang: met interesse Tech gaat het (oudere) chipnieuws voor de storm', () => {
  const order = (e) => e.entries.map((x) => x.leadId || x.id)
  const plain = order(make())
  const tech = order(make({ interests: ['tech'] }))
  assert.ok(plain.indexOf('n2') < plain.indexOf('t1'), 'zonder interesse: nieuwer gaat voor')
  assert.ok(tech.indexOf('t1') < tech.indexOf('n2'), 'met interesse Tech: het chipnieuws gaat voor')
  assert.equal(tech[0], 'n1') // groot nieuws (meerdere bronnen) blijft bovenaan
  assert.ok(INTEREST_BONUS > 0)
})

test('rijen voor de samenvatting volgen de plekken van jouw editie', () => {
  const e = make()
  const rows = personalRows(e)
  assert.equal(rows.length, e.entries.length)
  assert.equal(rows[0].entry, 0)
  assert.ok(rows.every((r) => r.title && r.sourceName))
})

test('zonder algemene editie geen persoonlijke', () => {
  assert.equal(composePersonal({ global: null, items, followed }), null)
})

test('sport verdringt het nieuws niet: hooguit twee, onderaan, alleen met die interesse', () => {
  const sources = [{ id: 'nos', cat: 'nl' }, { id: 'tweakers', cat: 'tech' }, { id: 'vi', cat: 'sport' }]
  const sport = Array.from({ length: 4 }, (_, i) => art('s' + i, 'vi', `Voetbal uitslag nummer ${i} Ajax Feyenoord PSV`, { publishedAt: ago(0.2) }))
  const withSport = new Set(['nos', 'tweakers', 'vi'])
  const none = composePersonal({ global, stories, items: [...items, ...sport], sources, followed: withSport, now: NOW, builtAt: 'T' })
  assert.equal(none.entries.filter((e) => (e.leadId || e.id).startsWith('s')).length, 0) // geen interesse sport: geen sport
  const fan = composePersonal({ global, stories, items: [...items, ...sport], sources, followed: withSport, interests: ['sport'], now: NOW, builtAt: 'T' })
  const ids = fan.entries.map((e) => e.leadId || e.id)
  const sp = ids.filter((id) => id.startsWith('s'))
  assert.ok(sp.length >= 1 && sp.length <= 2)
  assert.notEqual(ids[0].slice(0, 1), 's') // nooit het hoofdverhaal
  assert.ok(ids.indexOf(sp[0]) > ids.indexOf('g1')) // na het aangevulde nieuws
})

test('een podcast is nooit het hoofdbericht van een verhaal', async () => {
  const { leadCandidates } = await import('../netlify/lib/stories.mjs')
  const lead = leadCandidates([art('p', 'vi', 'Pak Schaal Podcast Extra: hoop bij Ajax'), art('q', 'nos', 'Ajax wint van Atalanta')], new Set(['vi', 'nos']))[0]
  assert.equal(lead.id, 'q')
})

test('een voetbalbericht uit een gewone nieuwsbron telt als sport, niet als nieuws', () => {
  const sources = [{ id: 'nos', cat: 'nl' }, { id: 'tweakers', cat: 'tech' }, { id: 'nu', cat: 'nl' }]
  const fb = art('f1', 'nu', 'Steijn en Hadj Moussa ruziën na verlies Feyenoord', { topics: ['voetbal'], publishedAt: ago(0.1) })
  const f = new Set(['nos', 'tweakers', 'nu'])
  const plain = composePersonal({ global, stories, items: [...items, fb], sources, followed: f, now: NOW, builtAt: 'T' })
  assert.ok(!plain.entries.some((e) => (e.leadId || e.id) === 'f1'))
  const fan = composePersonal({ global, stories, items: [...items, fb], sources, followed: f, interests: ['sport'], now: NOW, builtAt: 'T' })
  const ids = fan.entries.map((e) => e.leadId || e.id)
  assert.ok(ids.includes('f1') && ids[0] !== 'f1')
})

test('een liveblog (herkend aan het adres) is geen plek in de editie', () => {
  const live = art('lb', 'nos', 'Russia bombards Kyiv with missiles', { url: 'https://www.theguardian.com/world/live/2026/oct/22/russia-ukraine-war-live', publishedAt: ago(0.1) })
  const e = composePersonal({ global, stories, items: [...items, live], followed, now: NOW, builtAt: 'T' })
  assert.ok(!e.entries.some((x) => (x.leadId || x.id) === 'lb'))
})

test('"Waar iedereen over schrijft": buiten je interesses, niet dubbel, met de lead van de server', () => {
  const wideItem = art('w1', 'nu', 'Eerste besmetting met Shamonda-virus in Frankrijk', { topics: ['gezondheid'] })
  const techWide = { storyId: 'sChip', sourceCount: 14, topics: ['ai', 'tech'], item: art('w0', 'nos', 'Chiprace') }
  const g = { ...global, wide: [techWide, { storyId: 'sVirus', sourceCount: 12, topics: ['gezondheid'], item: wideItem }] }
  const e = composePersonal({ global: g, stories, items, followed, interests: ['tech'], now: NOW, builtAt: 'T' })
  const wide = e.entries.filter((x) => x.desk === 'breed')
  assert.equal(wide.length, 1)
  assert.equal(wide[0].id, 'sVirus') // het tech-verhaal valt binnen je interesse: overgeslagen
  assert.equal(wide[0].sourceCount, 12)
  assert.ok(e.items.find((i) => i.id === 'w1'))
  assert.ok(e.entries.length <= 10)
  // Staat het al in je editie, dan niet nog eens.
  const dup = composePersonal({ global: { ...global, wide: [{ storyId: 'sWoning', sourceCount: 9, topics: [], item: items[0] }] }, stories, items, followed, now: NOW, builtAt: 'T' })
  assert.equal(dup.entries.filter((x) => x.desk === 'breed').length, 0)
})

test('server: breed gedekt alleen met een gratis bron als bericht, en geen sport', async () => {
  const { widelyCovered } = await import('../netlify/lib/stories.mjs')
  const byId = new Map([
    ['a', art('a', 'nrc', 'Betaald bericht')],
    ['b', art('b', 'nos', 'Gratis bericht')],
    ['c', art('c', 'vi', 'Voetbal', { topics: ['voetbal'] })],
    ['d', art('d', 'nu', 'Voetbal', { topics: ['voetbal'] })],
    ['e', art('e', 'nrc', 'Alleen betaald')],
  ])
  const st = [
    { id: 'sNews', sourceCount: 9, itemIds: ['a', 'b'] },
    { id: 'sSport', sourceCount: 20, itemIds: ['c', 'd'] },
    { id: 'sPaid', sourceCount: 8, itemIds: ['e'] },
  ]
  const free = new Set(['nos', 'nu', 'vi'])
  const out = widelyCovered(st, byId, { isFree: (id) => free.has(id), isDutch: () => true, isSport: (i) => (i.topics || []).includes('voetbal') })
  assert.deepEqual(out.map((w) => w.storyId), ['sNews']) // sport en alleen-betaald vallen af
  assert.equal(out[0].item.id, 'b') // de gratis bron, niet NRC
})
