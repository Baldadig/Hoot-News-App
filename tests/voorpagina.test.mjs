import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import voorpagina, { extract, withPool, isDutch, isHeavy, rubriek, OPEN_IMAGE_SOURCES, config } from '../netlify/functions/voorpagina.mjs'
import { voorpaginaPool, VOORPAGINA_HOURS, VOORPAGINA_MAX } from '../netlify/lib/voorpagina-pool.mjs'
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
      { kind: 'item', id: 'cultuur0', desk: 'cultuur' },
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
      it('cultuur0', 'nrc', 'NRC', 'Nieuwe tentoonstelling opent'),
      it('f', 'nos', 'NOS', 'Foreign', { offLang: true }),
    ],
  },
})
const get = (headers = {}, method = 'GET') => voorpagina(new Request('http://x/api/voorpagina', { method, headers }))

test('onrust wordt ook herkend aan tags, rubriek en incidenttaal zonder het woord rellen', () => {
  assert.ok(isHeavy({ title: 'De rust keert terug', topics: ['misdaad'] }))
  assert.ok(isHeavy({ title: 'De situatie is veranderd', mainTopics: ['oorlog'] }))
  assert.ok(isHeavy({ title: 'De situatie is veranderd', desk: 'geweld' }))
  assert.ok(isHeavy({ title: 'De situatie is veranderd', desk: 'geweld' }, null))
  assert.ok(isHeavy({ title: 'De situatie is veranderd', section: 'Misdaad' }))
  assert.ok(isHeavy({ title: 'De rust keert terug', summary: 'De politie meldt tientallen aanhoudingen.' }))
  assert.ok(isHeavy({ title: 'Geen grootschalige oploop van jonge relschoppers' }))
  assert.ok(!isHeavy({ title: 'Museum opent een nieuwe zaal', topics: ['kunst'] }))
})

test('één kop per cluster, ook zonder storyId op de afzonderlijke publicaties', () => {
  const f = feed()
  const copy = it('a-copy', 'nrc', 'NRC', 'Een andere kop over het akkoord')
  f.items = [copy]
  f.stories[0].itemIds = ['a', copy.id]
  f.edition.entries.splice(2, 0, { kind: 'item', id: copy.id, desk: 'binnenland' })
  const result = extract(f)
  assert.equal(result.entries.length, 3)
  assert.equal(result.entries.filter(e => /akkoord/i.test(e.title)).length, 1)
})

test('varianten zonder cluster-id krijgen één plek; de pool vult na ontdubbelen aan', () => {
  const f = feed()
  const a = it('event-a', 'nos', 'NOS', 'Rijksmuseum opent tentoonstelling over Rembrandt', { topics: ['kunst'] })
  const b = it('event-b', 'nrc', 'NRC', 'Tentoonstelling over Rembrandt opent in Rijksmuseum', { topics: ['kunst'] })
  f.edition.items = [a, b, it('third', 'nos', 'NOS', 'Een nieuwe planeet ontdekt', { topics: ['ruimte'] })]
  f.edition.entries = f.edition.items.map(i => ({ kind: 'item', id: i.id }))
  f.stories = []
  f.items = [it('extra', 'nos', 'NOS', 'Gemeente maakt meer ruimte voor woningbouw', { topics: ['wonen'], publishedAt: '2026-10-31T04:00:00Z' })]
  const r = extract(f)
  assert.equal(r.entries.length, 3)
  assert.equal(r.entries.filter(e => /Rembrandt/.test(e.title)).length, 1)
  assert.ok(r.entries.some(e => /woningbouw/.test(e.title)))
})

test('drie rustige koppen met één bron zijn genoeg; spreiding bekijkt ook de overige pool', () => {
  const f = feed()
  f.stories = []
  f.edition.items = [1, 2, 3].map(n => it('huis-' + n, 'nos', 'NOS', 'Woningbouwplan ' + n, { topics: ['wonen'] }))
  f.edition.entries = f.edition.items.map(i => ({ kind: 'item', id: i.id, desk: 'binnenland' }))
  f.items = [it('kunst', 'nrc', 'NRC', 'Museum opent de deuren', { topics: ['kunst'], mainTopics: ['kunst'], publishedAt: '2026-10-31T04:00:00Z' }), it('ruimte', 'nos', 'NOS', 'Een nieuwe planeet ontdekt', { topics: ['ruimte'], publishedAt: '2026-10-31T04:00:00Z' })]
  const r = extract(f)
  // schets: een losse onderwerp-tag geeft geen Wetenschap meer; zonder zekere rubriek is desk null
  assert.deepEqual(new Set(r.entries.map(e => e.desk)), new Set(['binnenland', 'cultuur', null]))
  assert.ok(r.entries.every(e => e.sourceCount === 1))
})

test('sport zonder tags valt af; cultuur krijgt geen onjuiste Binnenland-stempel', () => {
  const f = feed()
  f.edition.entries.unshift({ kind: 'item', id: 'coach', desk: 'binnenland' })
  f.edition.items.push(it('coach', 'nos', 'NOS', 'AZ-coach blikt terug op zijn eerste seizoen', { section: 'Sport' }))
  assert.ok(extract(f).entries.every(e => !/AZ-coach/.test(e.title)))
  assert.equal(rubriek({ topics: ['film'], mainTopics: ['film'] }, 'binnenland', 'nl'), 'cultuur')
  // Showbizz is niet zeker Cultuur (landing-live): geen rubriek, en zeker geen Binnenland. Noemt de Editie het Cultuur, dan wel.
  assert.equal(rubriek({ title: 'Een verrassend halloweenkostuum', section: 'Showbizz' }, 'binnenland', 'nl'), null)
  assert.equal(rubriek({ title: 'Een verrassend halloweenkostuum', section: 'Showbizz' }, 'binnenland', 'nl', 'cultuur'), 'cultuur')
  assert.equal(rubriek({ title: 'Schrijfwedstrijd voor jonge auteurs', topics: ['boeken'], mainTopics: ['boeken'] }, 'binnenland', 'nl'), 'cultuur')
})

test('alleen onrust levert ook via de HTTP-handler 503 in plaats van drie ongeschikte koppen', async () => {
  const f = feed()
  f.stories = []
  f.items = []
  f.edition.items = [1, 2, 3].map(n => it('onrust-' + n, 'nos', 'NOS', 'De situatie verandert ' + n, { topics: ['misdaad'] }))
  f.edition.entries = f.edition.items.map(i => ({ kind: 'item', id: i.id, desk: 'binnenland' }))
  await writeDoc(KEYS.start, { body: JSON.stringify(f), etag: 'onrust' })
  const r = await get({ origin: 'https://gethoot.app' })
  assert.equal(r.status, 503)
  assert.deepEqual(await r.json(), { edition: null })
  assert.equal(r.headers.get('cache-control'), 'no-store')
})

test('vorm: slot, datum en drie plekken met alleen de kleine velden', () => {
  const r = extract(feed())
  assert.equal(r.slot, 'ochtend')
  assert.equal(r.date, '2026-10-31')
  assert.equal(r.entries.length, 3)
  assert.deepEqual(r.entries[0], { desk: 'binnenland', deskLabel: 'Binnenland', title: 'Kabinet bereikt akkoord', source: 'NOS', sourceCount: 12, sourceId: 'nos' }) // sourceId: voor het logo
  for (const e of r.entries) assert.ok(Object.keys(e).every((k) => ['desk', 'deskLabel', 'source', 'sourceCount', 'sourceId', 'title'].includes(k)))
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
  assert.equal(rubriek({ mainTopics: ['muziek'] }, null, 'nl'), 'cultuur')
  assert.equal(rubriek({ topics: ['klimaat'] }, null, 'nl'), null) // schets: een tag alleen is niet zeker genoeg
  assert.equal(rubriek({ topics: [] }, 'bubbel', 'nl'), null)
  assert.equal(rubriek({ topics: [] }, 'vs', 'nl'), 'vs')
})

test('zware koppen: titel en intro worden uitgesloten', () => {
  for (const t of ['Man doodgeschoten in Rotterdam', 'Twee doden bij ongeluk', 'Aanslag op markt', 'Oorlogsmisdaden onderzocht', 'Ramp in de haven', 'Kanker bij kinderen', 'Zelfmoord onder jongeren', 'Gijzeling duurt voort', 'Rellen in Den Haag', 'Executie in Iran', 'Verkrachting aangegeven', 'Misbruik bij club', 'Explosie in fabriek', 'Crash op A2', 'Schrijver overleden', 'Geweld op straat', 'Terreurdreiging', 'Ziekenhuis vol', 'Tien mensen opgepakt na ongeregeldheden', 'Rubberboot met migranten gered', 'Man mishandeld na ontvoering']) {
    assert.ok(isHeavy({ title: t }), t)
  }
  for (const t of ['Kabinet bereikt akkoord', 'Overleg over woningbouw', 'Bommen en granaten van chocola', 'Zeehondencentrum krijgt steun', 'Brandweer opent museum', 'Rampenplan fietsfestival']) {
    assert.ok(!isHeavy({ title: t }) || t.startsWith('Rampen'), t) // Rampenplan: samenstelling met ramp mag eruit
  }
  const f = feed()
  f.edition.items[0].title = 'Kabinet: man doodgeschoten' // titel
  assert.equal(extract(f), null) // geen drie veilige koppen: geen gedeeltelijk succesantwoord
  const g = feed()
  g.edition.items[0].summary = 'Er vielen doden bij de botsing.' // intro
  assert.equal(extract(g), null)
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

test('hooguit één Wereld-plek, alleen groot nieuws; zonder drie geschikte plekken geen misleidend resultaat', () => {
  const f = feed()
  f.edition.entries = [{ kind: 'item', id: 'a', desk: 'binnenland' }, { kind: 'item', id: 'e', desk: 'wetenschap' }, { kind: 'story', id: 's3', leadId: 'c', desk: 'buitenland', sourceCount: 8 }, { kind: 'story', id: 's4', leadId: 'd', desk: 'vs', sourceCount: 9 }]
  const result = extract(f)
  assert.equal(result.entries.length, 3)
  assert.equal(result.entries.filter(e => ['buitenland','vs','middenoosten','oekraine'].includes(e.desk)).length, 1)
  f.edition.entries = f.edition.entries.slice(2)
  assert.equal(extract(f), null)
})

test('sport en zwaar nieuws vallen weg, ook bij een sportbron zonder desk', () => {
  const f = feed()
  f.sources.push({ id: 'sport', lang: 'nl', cat: 'sport' })
  f.edition.entries.unshift({kind:'item',id:'s',desk:null},{kind:'item',id:'z',desk:'binnenland'})
  f.edition.items.push(it('s','sport','Sport','Manchester United dieper in de problemen'),it('z','nos','NOS','Twee doden bij aanslag'))
  const r = extract(f)
  assert.equal(r.entries.length,3)
  assert.ok(r.entries.every(e => !/Manchester|doden|aanslag/.test(e.title)))
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
  assert.ok(!('imageUrl' in byTitle['Nieuwe tentoonstelling opent'])) // nrc staat niet op de lijst
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

test('aanvullen gebruikt de echte feedpool, ook als die berichten niet in ed.items staan', () => {
  const f = feed()
  f.edition.entries = [{kind:'item',id:'a',desk:'binnenland'}]
  f.items = [it('pool-a','nos','NOS','Museum opent de deuren',{topics:['kunst']}),it('pool-b','nos','NOS','Een nieuwe bibliotheek',{topics:['boeken']})]
  f.stories = f.items.map((i,n)=>({id:'pool-'+n,leadId:i.id,itemIds:[i.id],sourceCount:2,latestAt:'2026-10-31T04:00:00Z'}))
  assert.equal(extract(f).entries.length,3)
  f.items[0].mainTopics=[];f.items[0].topics=['voetbal']
  assert.equal(extract(f),null)
})

test('echte middagfixture: drie rustige koppen uit de feedpool en maximaal één Wereld', () => {
  const f=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/snapshot-2026-10-31-1200.json.gz',import.meta.url))))
  const result=extract(f)
  assert.equal(result.entries.length,3)
  assert.ok(result.entries.every(e=>!isHeavy({title:e.title})))
  assert.ok(result.entries.filter(e=>['buitenland','vs','middenoosten','oekraine'].includes(e.desk)).length<=1)
  assert.equal(new Set(result.entries.map(e=>e.title)).size,3)
})

// Productievorm: refresh.mjs schrijft KEYS.start met `items: []` en zonder `related`. Zonder eigen
// pool gaf de voorpagina daardoor altijd 503 (review 1.0.1, punt 1 en 11).
const realStart = () => {
  const f = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/snapshot-2026-10-31-1200.json.gz', import.meta.url))))
  const { related, items, ...lean } = f
  return { f, items, start: { ...lean, items: [] } }
}

test('productievorm: KEYS.start zonder berichten is te weinig; met de voorpagina-pool drie rustige koppen', () => {
  const { f, items, start } = realStart()
  assert.equal(extract(start), null) // de fout uit productie: alleen de Editie levert geen drie veilige koppen
  const pool = voorpaginaPool(items, f.sources, Date.parse(f.meta.updatedAt))
  const result = extract(withPool(start, pool))
  assert.equal(result.entries.length, 3)
  assert.deepEqual(result, extract(f)) // dezelfde keuze als met de volledige feed
  assert.ok(result.entries.every((e) => !isHeavy({ title: e.title })))
})

test('voorpagina-pool: alleen Nederlands, geen posts, hooguit 36 uur en 200 berichten, kleine velden', () => {
  assert.equal(VOORPAGINA_HOURS, 36)
  assert.equal(VOORPAGINA_MAX, 200)
  const now = Date.parse('2026-10-31T12:00:00Z')
  const at = (h) => new Date(now - h * 36e5).toISOString()
  const sources = [{ id: 'nos', lang: 'nl' }, { id: 'nyt', lang: 'en' }]
  const items = [
    it('nl', 'nos', 'NOS', 'Nieuw', { publishedAt: at(1), url: 'https://nos.nl/artikel/1', storyId: 's1', section: 'binnenland' }),
    it('en', 'nyt', 'NYT', 'English', { publishedAt: at(1) }),
    it('post', 'nos', 'NOS', 'Post', { publishedAt: at(1), kind: 'post' }),
    it('oud', 'nos', 'NOS', 'Oud', { publishedAt: at(37) }),
    it('rand', 'nos', 'NOS', 'Rand', { publishedAt: at(35) }),
  ]
  const pool = voorpaginaPool(items, sources, now)
  assert.deepEqual(pool.items.map((i) => i.id), ['nl', 'rand'])
  assert.deepEqual(Object.keys(pool.items[0]).sort(), ['desk', 'id', 'image', 'publishedAt', 'section', 'source', 'sourceName', 'storyId', 'summary', 'title', 'topics'])
  assert.ok(!JSON.stringify(pool).includes('nos.nl/artikel')) // geen uitgeverslinks in de pool
  const many = Array.from({ length: 260 }, (_, n) => it('m' + n, 'nos', 'NOS', 'Kop ' + n, { publishedAt: new Date(now - n * 6e4).toISOString() }))
  const big = voorpaginaPool(many, sources, now)
  assert.equal(big.items.length, 200)
  assert.equal(big.items[0].id, 'm0') // de nieuwste
})

test('pool bewaart tags en rubriekbewijs zonder de URL; sport en cultuur blijven gelijk aan de volledige feed', () => {
  const f = feed()
  const sport = it('sport-path', 'nos', 'NOS', 'De trainer vertelt', { url: 'https://nos.nl/sport/de-trainer', topics: [], mainTopics: [] })
  const culture = it('culture-path', 'nrc', 'NRC', 'Een verrassend halloweenkostuum', { url: 'https://nrc.nl/showbizz/het-kostuum', topics: [] })
  const unrest = it('unrest-tag', 'nos', 'NOS', 'De rust keert terug', { mainTopics: ['rellen'] })
  f.edition.items.push(sport, culture, unrest)
  f.edition.entries.unshift(...[sport, culture, unrest].map(i => ({ kind: 'item', id: i.id, desk: 'binnenland' })))
  const pool = voorpaginaPool(f.edition.items, f.sources, Date.parse('2026-10-31T12:00:00Z'))
  assert.equal(pool.items.find(i => i.id === sport.id).section, 'sport')
  assert.equal(pool.items.find(i => i.id === culture.id).section, 'showbizz')
  assert.deepEqual(pool.items.find(i => i.id === unrest.id).mainTopics, ['rellen'])
  assert.ok(pool.items.every(i => !('url' in i)))
  const direct = extract(f)
  assert.deepEqual(extract(withPool({ ...f, items: [], edition: { ...f.edition, items: [] } }, pool)), direct)
  assert.ok(direct.entries.every(e => !/trainer|rust keert/.test(e.title)))
  assert.equal(direct.entries.find(e => /halloweenkostuum/.test(e.title))?.desk ?? null, null) // showbizz: niet zeker, dus geen rubriek
})

test('HEAD heeft ook bij 503 geen body, met dezelfde veilige CORS- en cacheheaders', async () => {
  await writeDoc(KEYS.start, { body: '{}', etag: 'head-empty' })
  const r = await get({ origin: 'https://gethoot.app' }, 'HEAD')
  assert.equal(r.status, 503)
  assert.equal(await r.text(), '')
  assert.equal(r.headers.get('cache-control'), 'no-store')
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://gethoot.app')
})

test('endpoint: echte productievorm (KEYS.start + KEYS.voorpagina) geeft 200 met drie koppen', async () => {
  const { f, items, start } = realStart()
  const pool = voorpaginaPool(items, f.sources, Date.parse(f.meta.updatedAt))
  await writeDoc(KEYS.start, { body: JSON.stringify(start), etag: 'p' })
  await writeDoc(KEYS.voorpagina, { body: '', etag: 'leeg' })
  assert.equal((await get({ origin: 'https://gethoot.app' })).status, 503)
  await writeDoc(KEYS.voorpagina, { body: JSON.stringify(pool), etag: 'q' })
  const r = await get({ origin: 'https://gethoot.app' })
  assert.equal(r.status, 200)
  assert.equal((await r.json()).edition.entries.length, 3)
})

// Schets landing-schets (12 november): echte fouten van de live voorpagina blijven weg.
test('rubriek: de Editie wint van een trefwoord uit de intro', () => {
  const iran = { title: 'België: aanwijzingen voor Iraanse betrokkenheid bij hack koelsystemen', summary: 'Mogelijk is een Iraanse actor verantwoordelijk voor de cyberaanval.', topics: ['privacy'], mainTopics: ['privacy'], url: 'https://www.nrc.nl/nieuws/2026/11/12/belgie-a4941176' }
  assert.equal(rubriek(iran, 'buitenland', 'nl', 'buitenland'), 'buitenland')
  const lexus = { title: 'De Lexus ES 350e: een walvis met vijfsterrensuite in zijn buik', topics: ['natuur'], url: 'https://www.nrc.nl/nieuws/2026/10/30/de-lexus-a4939741' }
  assert.equal(rubriek(lexus, null, 'nl'), null)
  const littler = { title: 'Luke Littler treft 24 tegenstanders', topics: ['film'], url: 'https://www.ad.nl/darts/luke-littler~a286a41d/' }
  assert.equal(rubriek(littler, null, 'nl'), 'sport')
})

// landing-live: alleen hele mappen in de URL, nooit woorden uit de slug; showbizz is niet zeker Cultuur.
test('rubriek: alleen hele mappen uit de URL, geen woorden uit de slug', () => {
  const sociaal = { title: 'Juristen waarschuwen voor rechtspraak via sociale media', url: 'https://www.vrt.be/vrtnws/nl/2026/11/12/sociale-media-gerecht/' }
  assert.equal(rubriek(sociaal, 'buitenland', 'nl'), 'buitenland')
  const geweld = { title: 'Kabinet wil harder optreden tegen geweld rond wedstrijden', url: 'https://nos.nl/artikel/123-voetbal-geweld-aanpak' }
  assert.equal(rubriek(geweld, 'binnenland', 'nl'), 'binnenland')
  const koning = { title: 'Veiligheidsexpert kritisch op beveiliging na incident bij koning', url: 'https://www.rtl.nl/boulevard/artikel/5662128/incident-koning' }
  assert.equal(rubriek(koning, 'binnenland', 'nl'), null)
  const darts = { title: 'Luke Littler treft 24 tegenstanders', url: 'https://www.ad.nl/darts/luke-littler~a286a41d/' }
  assert.equal(rubriek(darts, null, 'nl'), 'sport')
  const vk = { title: 'Acteur Patrick Stewart overleden', url: 'https://www.volkskrant.nl/cultuur-media/patrick-stewart~b1/' }
  assert.equal(rubriek(vk, null, 'nl'), 'cultuur')
  const ai = { title: 'Liechtenstein ruilt publieke omroep in voor AI-radio', mainTopics: ['ai', 'media'], url: 'https://nos.nl/l/2638489' }
  assert.equal(rubriek(ai, 'buitenland', 'nl'), 'buitenland') // 'media' als onderwerp is niet zeker Cultuur
})

// Bronnenblok van de landing (13 november): per verhaal de bronnen die erover schrijven.
test('voorpagina: een verhaal draagt zijn bronnen (id en naam), de bron van de kop eerst, hooguit twaalf; anders geen veld', () => {
  const f = feed()
  f.sources = [{ id: 'nos', name: 'NOS', lang: 'nl' }, { id: 'nyt', name: 'NYT', lang: 'en' }, { id: 'nrc', name: 'NRC', lang: 'nl' }, { id: 'vk', name: 'de Volkskrant', lang: 'nl' }]
  f.stories[0].sourceNames = ['de Volkskrant', 'NRC', 'NOS', 'Onbekende Krant', 'NRC'] // de rest komt in catalogusvolgorde
  const e = extract(f)
  const a = e.entries.find((x) => x.title === 'Kabinet bereikt akkoord')
  assert.deepEqual(a.sources, [{ id: 'nos', name: 'NOS' }, { id: 'nrc', name: 'NRC' }, { id: 'vk', name: 'de Volkskrant' }])
  for (const x of e.entries) if (x !== a) assert.equal('sources' in x, false, x.title) // losse berichten en verhalen zonder namen
  assert.doesNotMatch(JSON.stringify(e), /https?:\/\/x\//) // nog steeds geen uitgever-URL's
  // begrensd
  f.sources.push(...Array.from({ length: 20 }, (_, i) => ({ id: 'b' + i, name: 'Bron ' + i, lang: 'nl' })))
  f.stories[0].sourceNames = f.sources.map((s) => s.name)
  assert.equal(extract(f).entries.find((x) => x.title === 'Kabinet bereikt akkoord').sources.length, 12)
})

test('voorpagina: breed geeft hooguit drie verhalen met minstens drie bekende bronnen, de breedste eerst; anders geen veld', () => {
  const f = feed()
  assert.equal('breed' in extract(f), false) // de verhalen dragen hier geen namen
  f.sources = [{ id: 'nos', name: 'NOS', lang: 'nl' }, { id: 'nyt', name: 'NYT', lang: 'en' }, { id: 'nrc', name: 'NRC', lang: 'nl' }, { id: 'vk', name: 'de Volkskrant', lang: 'nl' }, { id: 'tr', name: 'Trouw', lang: 'nl' }]
  f.stories[0].sourceNames = ['NOS', 'NRC', 'de Volkskrant', 'Trouw']
  f.stories[2].sourceNames = ['NRC', 'NOS'] // twee: te weinig
  const e = extract(f)
  assert.deepEqual(e.breed.map((x) => x.title), ['Kabinet bereikt akkoord'])
  assert.equal(e.breed[0].sources.length, 4)
  assert.deepEqual(Object.keys(e.breed[0]).sort(), ['desk', 'deskLabel', 'source', 'sourceCount', 'sourceId', 'sources', 'title'])
  // het Engelse verhaal (s2) komt er nooit in, hoe breed ook
  f.stories[1].sourceNames = ['NOS', 'NRC', 'de Volkskrant', 'Trouw', 'NYT']
  assert.ok(!extract(f).breed.some((x) => x.title === 'English headline'))
})
