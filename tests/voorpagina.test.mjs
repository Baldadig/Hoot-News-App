import { test } from 'node:test'
import assert from 'node:assert/strict'
import voorpagina, { extract, isDutch, isHeavy, rubriek, OPEN_IMAGE_SOURCES, config } from '../netlify/functions/voorpagina.mjs'
import { writeDoc, KEYS } from '../netlify/lib/kv.mjs'

const it = (id, source, sourceName, title, extra = {}) => ({ id, source, sourceName, title, url: 'https://x/' + id, image: 'https://x/i.jpg', publishedAt: '2026-10-31T08:00:00Z', ...extra })
const feed = () => ({
  sources: [{ id: 'nos', lang: 'nl' }, { id: 'nyt', lang: 'en' }, { id: 'nrc', lang: 'nl' }],
  stories: [
    { id: 's1', leadId: 'a', sourceCount: 12 },
    { id: 's2', leadId: 'b', sourceCount: 5 },
    { id: 's3', leadId: 'c', sourceCount: 3 },
    { id: 's4', leadId: 'd', sourceCount: 2 },
  ],
  edition: {
    slot: 'ochtend',
    date: '2026-10-31',
    builtAt: '2026-10-31T05:00:00Z',
    entries: [
      { kind: 'story', id: 's2', leadId: 'b', desk: 'buitenland', sourceCount: 5 }, // Engels: overslaan
      { kind: 'story', id: 's1', leadId: 'a', desk: 'binnenland', sourceCount: 12 },
      { kind: 'item', id: 'e', desk: 'wetenschap' },
      { kind: 'item', id: 'f', desk: 'vs' }, // offLang: overslaan
      { kind: 'story', id: 's3', leadId: 'c', desk: 'middenoosten', sourceCount: 3 },
      { kind: 'story', id: 's4', leadId: 'd', desk: 'oekraine', sourceCount: 2 },
    ],
    items: [
      it('a', 'nos', 'NOS', 'Kabinet bereikt akkoord'),
      it('b', 'nyt', 'The New York Times', 'English headline'),
      it('c', 'nrc', 'NRC', 'Derde plek'),
      it('d', 'nos', 'NOS', 'Vierde plek'),
      it('e', 'nos', 'NOS', 'Los bericht', { lang: 'nl' }),
      it('f', 'nos', 'NOS', 'Foreign', { offLang: true }),
    ],
  },
})
const get = (headers = {}, method = 'GET') => voorpagina(new Request('http://x/api/voorpagina', { method, headers }))

test('vorm: slot, datum en drie plekken met alleen de kleine velden', () => {
  const r = extract(feed())
  assert.equal(r.slot, 'ochtend')
  assert.equal(r.date, '2026-10-31')
  assert.equal(r.entries.length, 3)
  assert.deepEqual(r.entries[0], { desk: 'binnenland', deskLabel: 'Binnenland', title: 'Kabinet bereikt akkoord', source: 'NOS', sourceCount: 12 })
  for (const e of r.entries) assert.ok(Object.keys(e).every((k) => ['desk', 'deskLabel', 'source', 'sourceCount', 'title'].includes(k)))
  assert.ok(!JSON.stringify(r).includes('http')) // geen URL's of beeld
})

test('taalfilter: anderstalige plekken worden overgeslagen, de volgende komt erbij', () => {
  const r = extract(feed())
  assert.ok(!r.entries.some((e) => e.title === 'English headline' || e.title === 'Foreign'))
  assert.ok(isDutch({ lang: 'nl' }, 'en'))
  assert.ok(!isDutch({ offLang: true }, 'nl'))
  assert.ok(isDutch({}, 'nl'))
  assert.ok(!isDutch({}, 'en'))
  assert.ok(!isDutch({}, undefined))
})

test('rubriekvoorkeur: rustige rubrieken gaan voor buitenland, in volgorde van gewicht', () => {
  const calm = feed()
  calm.edition.entries.push({ kind: 'item', id: 'cultuur', desk: 'cultuur' })
  calm.edition.items.push(it('cultuur', 'nrc', 'NRC', 'Museum opent een nieuwe zaal'))
  const r = extract(calm)
  assert.deepEqual(r.entries.map((e) => e.desk), ['binnenland', 'wetenschap', 'cultuur'])
  assert.ok(!r.entries.some((e) => ['buitenland', 'oekraine', 'middenoosten', 'vs'].includes(e.desk)))
  // gewicht: binnenland > cultuur > wetenschap > tech > sport
  const f = feed()
  f.sources.push({ id: 'tw', lang: 'nl', cat: 'tech' }, { id: 'ns', lang: 'nl', cat: 'sport' })
  f.edition.entries = [
    { kind: 'item', id: 'g', desk: null }, { kind: 'item', id: 'h', desk: null }, { kind: 'item', id: 'e', desk: 'wetenschap' }, { kind: 'item', id: 'a2', desk: 'binnenland' },
  ]
  f.edition.items.push(it('g', 'tw', 'Tweakers', 'Nieuwe telefoon'), it('h', 'ns', 'NOS Sport', 'Sportdag'), it('a2', 'nos', 'NOS', 'Gemeente opent bibliotheek'))
  assert.deepEqual(extract(f).entries.map((e) => e.desk), ['tech', 'wetenschap', 'binnenland']) // Editie-volgorde van de gekozen drie
})

test('rubrieken afgeleid uit bron en onderwerpen (cultuur, tech, sport)', () => {
  assert.equal(rubriek({ topics: [] }, null, 'sport'), 'sport')
  assert.equal(rubriek({ topics: [] }, null, 'tech'), 'tech')
  assert.equal(rubriek({ topics: ['muziek'] }, null, 'nl'), 'cultuur')
  assert.equal(rubriek({ topics: ['klimaat'] }, null, 'nl'), 'wetenschap')
  assert.equal(rubriek({ topics: [] }, 'bubbel', 'nl'), null)
  assert.equal(rubriek({ topics: [] }, 'vs', 'nl'), 'vs')
})

test('zware koppen: titel en intro worden uitgesloten', () => {
  for (const t of ['Man doodgeschoten in Rotterdam', 'Twee doden bij ongeluk', 'Aanslag op markt', 'Oorlogsmisdaden onderzocht', 'Ramp in de haven', 'Kanker bij kinderen', 'Zelfmoord onder jongeren', 'Gijzeling duurt voort', 'Rellen in Den Haag', 'Executie in Iran', 'Verkrachting aangegeven', 'Misbruik bij club', 'Explosie in fabriek', 'Crash op A2', 'Schrijver overleden', 'Geweld op straat', 'Terreurdreiging', 'Ziekenhuis vol']) {
    assert.ok(isHeavy({ title: t }), t)
  }
  for (const t of ['Kabinet bereikt akkoord', 'Overleg over woningbouw', 'Bommen en granaten van chocola', 'Zeehondencentrum krijgt steun', 'Brandweer opent museum', 'Rampenplan fietsfestival']) {
    assert.ok(!isHeavy({ title: t }) || t.startsWith('Rampen'), t) // Rampenplan: samenstelling met ramp mag eruit
  }
  const f = feed()
  f.edition.items[0].title = 'Kabinet: man doodgeschoten' // titel
  assert.ok(!extract(f).entries.some((e) => e.title.includes('doodgeschoten')))
  const g = feed()
  g.edition.items[0].summary = 'Er vielen doden bij de botsing.' // intro
  assert.ok(!extract(g).entries.some((e) => e.title === 'Kabinet bereikt akkoord'))
})

test('verschillende rubrieken waar mogelijk, anders aanvullen binnen dezelfde', () => {
  const f = feed()
  f.edition.entries = [
    { kind: 'item', id: 'a', desk: 'binnenland' }, { kind: 'item', id: 'c', desk: 'binnenland' }, { kind: 'item', id: 'd', desk: 'binnenland' }, { kind: 'item', id: 'e', desk: 'wetenschap' },
  ]
  assert.deepEqual(extract(f).entries.map((e) => e.desk), ['binnenland', 'binnenland', 'wetenschap'])
  assert.deepEqual(extract(f).entries.map((e) => e.title), ['Kabinet bereikt akkoord', 'Derde plek', 'Los bericht'])
  f.edition.entries = f.edition.entries.slice(0, 3) // geen wetenschap: dan toch drie binnenlandse
  assert.deepEqual(extract(f).entries.map((e) => e.desk), ['binnenland', 'binnenland', 'binnenland'])
})

test('terugval naar buitenland bij te weinig rustige plekken', () => {
  const f = feed()
  f.edition.entries = [
    { kind: 'item', id: 'a', desk: 'binnenland' },
    { kind: 'story', id: 's3', leadId: 'c', desk: 'middenoosten', sourceCount: 3 },
    { kind: 'story', id: 's4', leadId: 'd', desk: 'oekraine', sourceCount: 2 },
    { kind: 'item', id: 'j', desk: 'buitenland' },
  ]
  f.edition.items.push(it('j', 'nos', 'NOS', 'Nieuwe brug in Parijs open'))
  const r = extract(f)
  assert.equal(r.entries.length, 3)
  assert.equal(r.entries[0].desk, 'binnenland')
  assert.deepEqual(r.entries.map((e) => e.desk), ['binnenland', 'middenoosten', 'oekraine']) // Editie-volgorde, buitenlandse rubrieken verschillend
})

test('aanvullen uit de pool van het dagdeel (laatste 24 uur) bij te weinig in de Editie', () => {
  const f = feed()
  f.edition.entries = [{ kind: 'item', id: 'a', desk: 'binnenland' }]
  f.stories.push({ id: 's9', leadId: 'k', itemIds: ['k'], sourceCount: 4, latestAt: '2026-10-31T07:00:00Z' }, { id: 's8', leadId: 'l', itemIds: ['l'], sourceCount: 9, latestAt: '2026-10-29T07:00:00Z' })
  f.edition.items.push(it('k', 'nos', 'NOS', 'Nieuwe bibliotheek open', { topics: ['boeken'] }), it('l', 'nos', 'NOS', 'Te oud', { topics: ['boeken'] }))
  f.stories = f.stories.map((s) => ({ latestAt: '2026-10-31T06:00:00Z', ...s }))
  const titles = extract(f).entries.map((e) => e.title)
  assert.ok(titles.includes('Nieuwe bibliotheek open'))
  assert.ok(!titles.includes('Te oud'))
  assert.equal(titles[0], 'Kabinet bereikt akkoord') // Editie eerst
})

test('deterministisch: dezelfde feed geeft hetzelfde antwoord', () => {
  assert.deepEqual(extract(feed()), extract(feed()))
})

test('imageUrl alleen voor bronnen op de lijst met open licentie of toestemming', () => {
  assert.equal(OPEN_IMAGE_SOURCES.size, 0) // standaard: persfoto's zijn beschermd
  assert.ok(!JSON.stringify(extract(feed())).includes('imageUrl'))
  const r = extract(feed(), 3, new Set(['nos']))
  const byTitle = Object.fromEntries(r.entries.map((e) => [e.title, e]))
  assert.equal(byTitle['Kabinet bereikt akkoord'].imageUrl, 'https://x/i.jpg')
  assert.equal(byTitle['Los bericht'].imageUrl, 'https://x/i.jpg')
  assert.ok(!('imageUrl' in byTitle['Derde plek'])) // nrc staat niet op de lijst
  const g = feed()
  g.edition.items[0].image = 'http://x/onveilig.jpg'
  assert.ok(!('imageUrl' in extract(g, 3, new Set(['nos'])).entries[0])) // alleen https
})

test('foutpad: geen of kapotte editie geeft null', () => {
  assert.equal(extract(null), null)
  assert.equal(extract({}), null)
  const f = feed()
  f.edition.entries = f.edition.entries.slice(0, 1) // alleen een Engelse plek
  assert.equal(extract(f), null)
})

test('endpoint: 503 met { edition: null } als er niets is opgeslagen', async () => {
  const r = await get({ origin: 'https://gethoot.app' })
  assert.equal(r.status, 503)
  assert.deepEqual(await r.json(), { edition: null })
  assert.equal(r.headers.get('cache-control'), 'no-store')
})

test('endpoint: 200 met headers en CORS alleen voor gethoot.app', async () => {
  await writeDoc(KEYS.start, { body: JSON.stringify(feed()), etag: 'x', builtAt: '2026-10-31T05:00:00Z' })
  const r = await get({ origin: 'https://gethoot.app' })
  assert.equal(r.status, 200)
  assert.equal(r.headers.get('content-type'), 'application/json; charset=utf-8')
  assert.equal(r.headers.get('cache-control'), 'public, max-age=300, s-maxage=900, stale-while-revalidate=3600')
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://gethoot.app')
  assert.match(r.headers.get('vary'), /Origin/)
  const body = await r.json()
  assert.deepEqual(Object.keys(body), ['edition'])
  assert.equal(body.edition.entries.length, 3)
  assert.equal((await get({ origin: 'https://www.gethoot.app' })).headers.get('access-control-allow-origin'), 'https://www.gethoot.app')
  assert.equal((await get({ origin: 'https://evil.example' })).headers.get('access-control-allow-origin'), null)
  assert.equal((await get({}, 'POST')).status, 405)
  assert.equal(config.path, '/api/voorpagina')
})

test('endpoint: kapotte opgeslagen feed geeft 503, geen crash', async () => {
  await writeDoc(KEYS.start, { body: '{kapot', etag: 'y' })
  const r = await get()
  assert.equal(r.status, 503)
  assert.deepEqual(await r.json(), { edition: null })
})
