// De showcover van NRC Vandaag maakt een NRC-stuk een aflevering (aflevering-2, 15 november 2026, besluit Alex).
// Sinds wereldzaken (15 november, besluit Alex) geldt hetzelfde voor de showcover van NRC Wereldzaken.
// NRC zet afleveringen van NRC Vandaag als gewoon nieuwsstuk onder /nieuws/ in de feed, vaak zonder label in de kop
// ("Seks en spionage: de druk op Nvidia neemt toe"). Het teken is de afbeelding: de showcover uit NRC's taxonomie, met
// dubbel gecodeerde spaties ("NRC%2520Vandaag_Item.jpg"). Het voorbeeld is een illustratie; deze toetsen houden vast:
//   1. een stuk van NRC met die cover is een aflevering (podcast), opent de Editie niet en is geen kop of eigen plek;
//   2. andere taxonomie-afbeeldingen van NRC (columns, commentaar, puzzels, nieuwsbrieven, andere podcasts) en dezelfde
//      cover bij een andere bron tellen niet;
//   3. in alle fixtures raakt de regel alleen afleveringen van NRC Vandaag en NRC Wereldzaken.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { afleveringSoort, isAflevering, opensEdition } from '../shared/aflevering.mjs'
import { audioEpisode, geenPlekAflevering, hardMark, showcover, SHOWCOVERS } from '../shared/editie-filter.mjs'
import { selectForReader } from '../netlify/lib/stories.mjs'
import { profileOf } from '../shared/editor.mjs'

const NOW = Date.parse('2026-11-15T10:00:00Z')
const at = (h) => new Date(NOW - h * 36e5).toISOString()
const COVER = 'https://images.nrc.nl/2Wl4fXwkh2RwbwJ6NJ0GtOGlFNo=/1280x/filters:no_upscale()/s3/static.nrc.nl/taxonomy/93d656f-NRC%2520Vandaag_Item.jpg'
const nrc = (id, title, image, extra = {}) => ({ id, kind: 'article', source: 'nrc', title, summary: 'Chipmaker Nvidia ligt onder vuur. Wat is er aan de hand, en wat betekent het voor de techsector?', url: `https://www.nrc.nl/nieuws/2026/11/10/${id}-a4941032`, image, publishedAt: at(1), topics: ['tech'], ...extra })
const NVIDIA = nrc('nvidia', 'Seks en spionage: de druk op Nvidia neemt toe', COVER)

test('het Nvidia-geval: geen label in de kop, wel de showcover van NRC Vandaag', () => {
  assert.equal(showcover(NVIDIA), 'NRC Vandaag')
  assert.equal(afleveringSoort(NVIDIA), 'podcast')
  assert.ok(isAflevering(NVIDIA))
  assert.equal(opensEdition(NVIDIA), false)
  assert.ok(audioEpisode(NVIDIA))
  assert.ok(geenPlekAflevering(NVIDIA))
  // Filter A weert het niet helemaal: het heeft een eigen intro en mag lid van een verhaal blijven.
  assert.equal(hardMark(NVIDIA), null)
})

test('varianten van de cover: enkel gecodeerd, ongecodeerd, met een query', () => {
  for (const image of [
    COVER.replace('%2520', '%20'),
    COVER.replace('%2520', ' '),
    COVER.replace('%2520', '%252520'),
    `${COVER}?w=640`,
    'https://static.nrc.nl/taxonomy/93d656f-NRC%20Vandaag_Item.jpg',
  ]) assert.equal(showcover(nrc('v', 'Wat nu?', image)), 'NRC Vandaag', image)
})

test('geen showcover: andere taxonomie-afbeeldingen, andere bron, geen afbeelding', () => {
  const anders = [
    'https://images.nrc.nl/x=/1280x/filters:no_upscale()/s3/static.nrc.nl/taxonomy/bf9b707-commentaar-itemafbeelding-2024.png',
    'https://images.nrc.nl/x=/1280x/filters:no_upscale()/s3/static.nrc.nl/taxonomy/64ea993-Vries%2520Marijn%2520de%25202023%252001%25201280.png',
    'https://images.nrc.nl/x=/1280x/filters:no_upscale()/s3/static.nrc.nl/taxonomy/c3f9335-Sudoku_itemafbeelding.png',
    'https://images.nrc.nl/x=/1280x/filters:no_upscale()/s3/static.nrc.nl/taxonomy/9622f8f-Zo%2520simpel%2520is%2520het%2520niet_Nieuwsbrief_16x9.png',
    'https://images.nrc.nl/x=/1280x/filters:no_upscale()/s3/static.nrc.nl/taxonomy/e5c3f19-03182026_Cocai%25CC%2588nekoorts_Artikel-%2520en%2520itemafbeelding_1280x768px.png',
    'https://images.nrc.nl/x=/1280x/filters:no_upscale()/s3/static.nrc.nl/taxonomy/abc1234-Wereldzakenrubriek_itemafbeelding.png',
    'https://images.nrc.nl/x=/1280x/filters:no_upscale()/s3/static.nrc.nl/wp-content/uploads/2026/11/Wereldzaken_studio.jpg',
    'https://images.nrc.nl/x=/1280x/filters:no_upscale()/s3/static.nrc.nl/wp-content/uploads/2026/11/nrc-vandaag-studio.jpg',
    'https://images.nrc.nl/x=/1280x/filters:no_upscale()/s3/static.nrc.nl/bvhw/files/2026/11/data123.jpg',
  ]
  for (const image of anders) {
    const it = nrc('a', 'Aan een staarwedstrijd tussen coalitie en oppositie heeft Nederland niets', image)
    assert.equal(showcover(it), null, image)
    assert.equal(afleveringSoort(it), null, image)
    assert.ok(opensEdition(it), image)
    assert.ok(!geenPlekAflevering(it), image)
  }
  assert.equal(showcover({ ...NVIDIA, source: 'volkskrant' }), null)
  assert.equal(showcover({ ...NVIDIA, image: null }), null)
  assert.equal(showcover({ ...NVIDIA, kind: 'post' }), null)
  // De lijst is klein en benoemd: NRC Vandaag en NRC Wereldzaken, allebei alleen bij NRC.
  assert.deepEqual(SHOWCOVERS.map((c) => c.show), ['NRC Vandaag', 'NRC Wereldzaken'])
  for (const c of SHOWCOVERS) assert.deepEqual(c.bronnen, ['nrc'], c.show)
})

test('meting op de fixtures: elke treffer is een aflevering van NRC Vandaag of NRC Wereldzaken', () => {
  const dir = new URL('./fixtures/', import.meta.url)
  const hits = new Map()
  const walk = (x) => {
    if (Array.isArray(x)) return x.forEach(walk)
    if (!x || typeof x !== 'object') return
    if (typeof x.image === 'string' && x.source && x.title && showcover(x)) hits.set(x.url || x.id, x)
    for (const v of Object.values(x)) if (v && typeof v === 'object') walk(v)
  }
  for (const f of readdirSync(dir)) {
    if (!/\.json(\.gz)?$/.test(f)) continue
    let buf = readFileSync(new URL(f, dir))
    if (f.endsWith('.gz')) buf = gunzipSync(buf)
    try {
      walk(JSON.parse(buf.toString('utf8')))
    } catch {}
  }
  // Gemeten op 15 november 2026: 11 stukken van NRC Vandaag (In Het Nieuws, Luisterverhaal op zondag en afleveringen
  // zonder label) en 2 van NRC Wereldzaken (Rob Bauer, biologische wapens: precies de titels van afleveringen in
  // rss.art19.com/wereldzaken). Komt er een fixture bij, dan telt hij mee; nooit een column of commentaar.
  const per = (show) => [...hits.values()].filter((it) => showcover(it) === show)
  assert.ok(per('NRC Vandaag').length >= 11, String(per('NRC Vandaag').length))
  assert.ok(per('NRC Wereldzaken').length >= 2, String(per('NRC Wereldzaken').length))
  assert.ok(hits.size >= 13, String(hits.size))
  for (const it of hits.values()) {
    assert.equal(it.source, 'nrc', it.title)
    assert.match(it.url, /^https:\/\/www\.nrc\.nl\/nieuws\//, it.title)
    assert.ok(!/commentaar|column/i.test(decodeURIComponent(decodeURIComponent(it.image))), it.title)
  }
})

test('de Redacteur maakt er geen plek van, los en als enige stuk van een verhaal', () => {
  const mine = new Set(['nrc'])
  const reader = { mainIds: mine, now: NOW, size: 10, prof: profileOf({ interests: ['tech'], followed: mine }), preferred: mine }
  const out = selectForReader([], [{ ...NVIDIA, id: 'los' }], { ...reader, audit: [] })
  assert.ok(!out.some((e) => (e.leadId || e.id) === 'los'), JSON.stringify(out))
  const st = { id: 'snv', leadId: 'nvidia', itemIds: ['nvidia'], sourceCount: 1, publisherCount: 1, latestAt: at(1), firstAt: at(1), desk: 'tech', light: false }
  const audit = []
  const out2 = selectForReader([st], [NVIDIA], { ...reader, audit })
  assert.equal(out2.length, 0, JSON.stringify(out2))
  assert.ok(audit.some((a) => a.id === 'snv' && a.reason === 'alleen-aflevering'), JSON.stringify(audit))
})

// NRC Wereldzaken (wereldzaken, 15 november 2026, besluit Alex: "mag er zeker bij"). De twee stukken uit de fixtures,
// letterlijk: de kop is die van de aflevering, het intro de eerste zin van de shownotes.
const WZ_COVER = 'https://images.nrc.nl/etdYqyQ4i0U1ALFCxbTVF6PdPCg=/1280x/filters:no_upscale():format(jpeg):fill(f8f8f8,true)/s3/static.nrc.nl/taxonomy/ea4c1fa-11252025_Wereldzaken_Artikel-%2520en%2520itemafbeelding_1280x768px.png'
const BAUER = { ...nrc('bauer', 'Voormalig NAVO-topmilitair Rob Bauer: “Ik denk dat de sleutel bij China ligt.”', WZ_COVER, { summary: 'Wat als Litouwen wordt platgelegd door cyberaanvallen?', topics: ['wereld'] }), url: 'https://www.nrc.nl/nieuws/2026/11/04/voormalig-navo-topmilitair-rob-bauer-ik-denk-dat-de-sleutel-bij-china-ligt-a4940502' }
const BIOWAPENS = { ...nrc('bio', 'Hoe de mensheid in zes dagen ten onder kan gaan aan biologische wapens', WZ_COVER, { summary: 'Biologische wapens zijn verboden, maar dat betekent niet dat ze niet bestaan.', topics: ['wereld'] }), url: 'https://www.nrc.nl/nieuws/2026/11/11/hoe-de-mensheid-in-zes-dagen-ten-onder-kan-gaan-aan-biologische-wapens-a4941061' }

test('NRC Wereldzaken: de showcover maakt een stuk een aflevering, zonder label in de kop', () => {
  for (const it of [BAUER, BIOWAPENS]) {
    assert.equal(showcover(it), 'NRC Wereldzaken', it.title)
    assert.equal(afleveringSoort(it), 'podcast', it.title)
    assert.ok(isAflevering(it), it.title)
    assert.equal(opensEdition(it), false, it.title)
    assert.ok(audioEpisode(it), it.title)
    assert.ok(geenPlekAflevering(it), it.title)
    // Wel lid van een verhaal: filter A weert het niet.
    assert.equal(hardMark(it), null, it.title)
  }
})

test('NRC Wereldzaken: varianten van de cover en de show art', () => {
  for (const image of [
    WZ_COVER.replaceAll('%2520', '%20'),
    WZ_COVER.replaceAll('%2520', ' '),
    `${WZ_COVER}?w=640`,
    'https://static.nrc.nl/taxonomy/ea4c1fa-11252025_Wereldzaken_Artikel-%20en%20itemafbeelding_1280x768px.png',
    'https://images.nrc.nl/x=/1280x/s3/static.nrc.nl/taxonomy/fcbaeb0-Wereldzaken_Show%2520art_RGB_01.jpg',
    'https://static.nrc.nl/taxonomy/1234567-wereldzaken.png',
  ]) assert.equal(showcover({ ...BAUER, image }), 'NRC Wereldzaken', image)
  // Andere bron, een post, geen afbeelding, of het woord vast aan een ander woord: geen showcover.
  assert.equal(showcover({ ...BAUER, source: 'volkskrant' }), null)
  assert.equal(showcover({ ...BAUER, kind: 'post' }), null)
  assert.equal(showcover({ ...BAUER, image: null }), null)
  assert.equal(showcover({ ...BAUER, image: 'https://static.nrc.nl/taxonomy/abc-NRCWereldzakenrubriek.png' }), null)
})

test('NRC Wereldzaken: de Redacteur maakt er geen plek van, ook niet als enige stuk van een verhaal', () => {
  const mine = new Set(['nrc'])
  const reader = { mainIds: mine, now: NOW, size: 10, prof: profileOf({ interests: ['wereld'], followed: mine }), preferred: mine }
  const losse = { ...BIOWAPENS, id: 'los', publishedAt: at(1) }
  const out = selectForReader([], [losse], { ...reader, audit: [] })
  assert.ok(!out.some((e) => (e.leadId || e.id) === 'los'), JSON.stringify(out))
  const bio = { ...BIOWAPENS, publishedAt: at(1) }
  const st = { id: 'sbio', leadId: 'bio', itemIds: ['bio'], sourceCount: 1, publisherCount: 1, latestAt: at(1), firstAt: at(1), desk: 'wereld', light: false }
  const audit = []
  const out2 = selectForReader([st], [bio], { ...reader, audit })
  assert.equal(out2.length, 0, JSON.stringify(out2))
  assert.ok(audit.some((a) => a.id === 'sbio' && a.reason === 'alleen-aflevering'), JSON.stringify(audit))
})
