// Column in de Editie (13 november 2026). Alex zag in zijn Avondeditie op plek 08 "NIEUWS · Quotezakkenexodus" (NRC,
// 5 bronnen): een column die via gedeelde namen in een sportverhaal van vier andere bronnen hing en daar de kop van
// werd. Het voorbeeld is een illustratie; deze toetsen houden het algemene patroon vast, niet dit ene stuk:
//   1. opinie herkend aan de rubriek uit de feed (een categorie van alleen opinielabels, een vaste columnrubriek per
//      uitgever), nooit aan de toon van een kop, de ik-vorm of een oud beeld;
//   2. een opiniestuk is nooit de kop van een plek als het verhaal nieuws heeft, op elke plek en ook bij herkenning
//      aan link of kop; een plek met alleen opinie (voor deze lezer) valt weg;
//   3. tegengevallen: nieuws met een woordspelige kop, een analyse en een reportage in de ik-vorm blijven nieuws; een
//      opiniestuk blijft in de Stroom onder Opinie en blijft lid van het verhaal (Vergelijken, "N bronnen").
// Zie Hoot-design/column-in-editie-2026-11-13/DIAGNOSE.md.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isOpinie, opinieRubriek } from '../shared/opinie.mjs'
import { isOpinion } from '../shared/article-signals.mjs'
import { typeOf } from '../netlify/lib/rss.mjs'
import { leadCandidates, leadPool, selectForReader } from '../netlify/lib/stories.mjs'
import { profileOf } from '../shared/editor.mjs'
import { tabsVan, inTab } from '../shared/stroom-tabs.mjs'

const FIX = JSON.parse(readFileSync(new URL('./fixtures/column-in-editie-2026-11-13.json', import.meta.url), 'utf8'))
const byId = new Map(FIX.items.map((i) => [i.id, i]))
const COLUMN = byId.get('8wq4dq')
// Zoals de server het stuk nu aflevert: de rubriek "Ondertussen" uit de NRC-feed geeft `type: 'opinie'` (rss.mjs).
const herkend = (i) => ({ ...i, type: typeOf(i.url, FIX.rss[i.source]?.[i.id] || []) })
const NOW = Date.parse('2026-11-13T19:50:00Z')

test('rubriek uit de feed: een categorie van alleen opinielabels, en een vaste columnrubriek per uitgever', () => {
  for (const c of ['Opinie', 'Columns ', 'Opinie & columns', 'Opinie &amp; columns', 'Opinie en columns', 'Opinie - Columns', 'Commentaar', 'Opinion'])
    assert.ok(opinieRubriek([c], 'https://example.org/x/y'), c)
  // Een deel dat geen opinielabel is, een onderwerp, of een los woord: geen opinie.
  for (const c of ['Opinion & Analysis', 'Public opinion', 'Opinion polls', 'Magazine / Comment', 'Analyse', 'Vandaag', 'Niet te missen', 'Sport', 'The Durutti Column', ''])
    assert.ok(!opinieRubriek([c], 'https://www.nrc.nl/nieuws/2026/11/13/x-a1'), c)
  // De columnrubriek van één uitgever geldt alleen bij die uitgever.
  assert.ok(opinieRubriek(['Ondertussen'], 'https://www.nrc.nl/nieuws/2026/11/13/quotezakkenexodus-a4941342'))
  assert.ok(!opinieRubriek(['Ondertussen'], 'https://www.example.nl/nieuws/ondertussen-in-de-polder'))
  // In de feed-omzetting: het soort volgt de rubriek; een gewone rubriek laat het stuk nieuws.
  assert.equal(typeOf('https://www.nrc.nl/nieuws/2026/11/13/quotezakkenexodus-a4941342', ['Ondertussen']), 'opinie')
  assert.equal(typeOf('https://www.nrc.nl/nieuws/2026/11/13/de-penibele-positie-a4941100', ['Opinie & columns']), 'opinie')
  assert.equal(typeOf('https://www.nrc.nl/nieuws/2026/11/13/microsoft-storing-a4941349', ['Vandaag']), null)
  assert.equal(typeOf('https://www.nrc.nl/nieuws/2026/11/13/x-a1', ['Sport']), null)
})

test('het stuk uit het schermbeeld: zonder rubriek geen opinie, met de NRC-rubriek wel, en dan ook in de Stroom onder Opinie', () => {
  assert.ok(!isOpinion(COLUMN), 'de feed van toen gaf geen enkel signaal mee')
  const c = herkend(COLUMN)
  assert.ok(isOpinie(c) && isOpinion(c))
  assert.deepEqual(tabsVan(c), ['opinie'])
  assert.ok(inTab({ ...c, opinion: true }, 'opinie'), 'zichtbaar onder de tab Opinie')
  // Het nieuws van het verhaal blijft nieuws.
  for (const id of ['3q47hm', 'n17pbx', '18xv1d', '1xkb3s2']) assert.ok(!isOpinion(herkend(byId.get(id))), id)
})

test('geen signaal uit toon, ik-vorm of beeld: bij twijfel blijft het nieuws', () => {
  const base = { kind: 'article', source: 'nrc', url: 'https://www.nrc.nl/nieuws/2026/11/13/x-a1', publishedAt: '2026-11-13T15:00:00Z' }
  for (const it of [
    { ...base, title: 'Quotezakkenexodus', summary: 'Het kabinet kondigt een vertrekregeling aan.' }, // woordspelige nieuwskop
    { ...base, title: 'Ik moest twee dagen achter elkaar in Arnhem zijn', summary: 'Ik reisde met de nachttrein mee.' }, // reportage in de ik-vorm
    { ...base, title: 'Analyse: waarom het kabinet wankelt', url: 'https://www.nrc.nl/nieuws/2026/11/13/analyse-a2' }, // analyse
    { ...base, title: 'Rechtbank veroordeelt oud-wethouder', image: 'https://images.nrc.nl/x/s3/static.nrc.nl/wp-content/uploads/2019/10/archief.png' }, // archiefbeeld
  ]) assert.ok(!isOpinion(it) && typeOf(it.url, ['Binnenland']) === null, it.title)
})

test('kop van een plek: elk nieuwsstuk gaat vóór elk opiniestuk, ook vóór je eigen voorkeursbron', () => {
  const col = herkend(COLUMN)
  const news = byId.get('n17pbx')
  const mine = new Set(['nrc', 'nos-sport'])
  // De column heeft ster (+12) en eigen bron (+8): vroeger won hij van de −16.
  assert.deepEqual(leadCandidates([col, news], mine, new Set(['nrc']), NOW).map((i) => i.id), ['n17pbx', '8wq4dq'])
  // leadPool met "eigen bronnen eerst" (de persoonlijke Editie) haalt de column niet terug naar voren.
  assert.equal(leadPool(leadCandidates([col, news], mine, null, NOW), [col, news], NOW, (i) => i.source === 'nrc')[0].id, 'n17pbx')
  // Ook een opiniestuk dat alleen aan zijn link herkend is (geen `type`), zoals de NYT boven de Volkskrant op 9 november.
  const nyt = { id: 'o1', kind: 'article', source: 'nyt', title: 'There’s a New Roy Cohn in Town', summary: 'x', url: 'https://www.nytimes.com/2026/11/09/opinion/x.html', publishedAt: '2026-11-09T10:00:00Z', image: 'https://example.org/a.jpg' }
  const vk = { id: 'n1', kind: 'article', source: 'volkskrant', title: 'Met aanstelling Miller als stafchef kiest Trump voor confrontatie', summary: 'x', url: 'https://www.volkskrant.nl/buitenland/x~b1/', publishedAt: '2026-11-09T08:00:00Z' }
  assert.equal(leadCandidates([nyt, vk], new Set(['nyt']), new Set(['nyt']), Date.parse('2026-11-09T12:00:00Z'))[0].id, 'n1')
  // Alleen opinie: dan blijft de volgorde van de punten (er is geen nieuws om voor te kiezen).
  const nyt2 = { ...nyt, id: 'o2', source: 'atlantic', url: 'https://www.theatlantic.com/ideas/2026/11/x/1/' }
  assert.equal(leadCandidates([nyt2, nyt], new Set(['nyt']), null, Date.parse('2026-11-09T12:00:00Z'))[0].id, 'o1')
})

const sportReader = profileOf({ interests: ['sport'], followed: new Set(['nrc']) })
const story = FIX.story

test('persoonlijke Editie: een verhaal waarvan je eigen stukken alleen opinie zijn, krijgt geen plek', () => {
  const audit = []
  const out = selectForReader([story], [herkend(COLUMN)], { mainIds: new Set(['nrc']), now: NOW, size: 10, prof: sportReader, audit })
  assert.equal(out.length, 0)
  assert.ok(audit.some((a) => a.id === story.id && a.reason === 'alleen-opinie'), JSON.stringify(audit))
  // Dezelfde lezer met ook een nieuwsbron van het verhaal: de plek blijft, met het nieuws als kop. Het opiniestuk blijft
  // lid van het verhaal (Vergelijken en "N bronnen" tellen het mee, met het label Opinie).
  const pool = [herkend(COLUMN), byId.get('n17pbx')]
  const met = selectForReader([story], pool, { mainIds: new Set(['nrc', 'nos-sport']), now: NOW, size: 10, prof: profileOf({ interests: ['sport'], followed: new Set(['nrc', 'nos-sport']) }), preferred: new Set(['nrc']) })
  assert.equal(met.length, 1)
  assert.equal(met[0].leadId, 'n17pbx')
  assert.ok(story.itemIds.includes('8wq4dq') && story.sourceCount === 5)
})

test('tegenval: hetzelfde verhaal met een woordspelige nieuwskop van je eigen bron blijft gewoon staan, met die kop', () => {
  const pun = { ...COLUMN, id: 'pun1', title: 'Hakgoalgekte', summary: 'Ajax-spits Tolu scoorde vrijdag twee keer voor Nigeria.' }
  const st = { ...story, itemIds: [...story.itemIds, 'pun1'] }
  const out = selectForReader([st], [pun], { mainIds: new Set(['nrc']), now: NOW, size: 10, prof: sportReader })
  assert.equal(out.length, 1)
  assert.equal(out[0].leadId, 'pun1')
})

test('een los opiniestuk komt niet als eigen plek, ook niet als het alleen aan zijn link herkend is', () => {
  const audit = []
  const op = { id: 'lo1', kind: 'article', source: 'volkskrant', title: 'Sta ook open voor de ander', summary: 'Een pleidooi.', image: 'https://example.org/a.jpg', url: 'https://www.volkskrant.nl/columns-opinie/sta-ook-open~b1/', publishedAt: '2026-11-13T09:00:00Z', topics: [] }
  const out = selectForReader([], [op], { mainIds: new Set(['volkskrant']), now: NOW, size: 10, audit })
  assert.ok(!out.some((e) => (e.leadId || e.id) === 'lo1'))
  assert.ok(audit.some((a) => a.id === 'lo1' && a.reason === 'vorm-of-bron-niet-toegelaten'))
})

test('opinie is geen nieuw stuk: kwam er sinds de vorige Editie alleen een column bij, dan geen plek', async () => {
  const { previousOf } = await import('../shared/edition-history.mjs')
  // Het nieuws van het verhaal is van vóór de vorige Editie, de column van erna.
  const oud = (id) => ({ ...byId.get(id), publishedAt: '2026-11-13T09:00:00Z' })
  const pool = [oud('n17pbx'), oud('18xv1d'), herkend(COLUMN)]
  const followed = new Set(['nrc', 'nos-sport', 'ad'])
  const previous = previousOf({ id: '2026-11-13-middag', builtAt: '2026-11-13T12:00:00Z', storyIds: ['s-anders'], itemIds: ['x1'], leadIds: ['x1'] })
  const opts = { mainIds: followed, now: NOW, size: 10, previous, prof: profileOf({ interests: ['sport'], followed }) }
  const audit = []
  const out = selectForReader([story], pool, { ...opts, audit })
  assert.equal(out.length, 0)
  assert.ok(audit.some((a) => a.id === story.id && a.reason === 'alleen-opinie-nieuw'), JSON.stringify(audit))
  // Tegenval: komt er ook een nieuwsstuk na de vorige Editie bij, dan blijft de plek, met dat nieuws als kop.
  const met = selectForReader([story], [...pool, byId.get('3q47hm')], { ...opts, mainIds: new Set([...followed, 'telegraaf']), prof: profileOf({ interests: ['sport'], followed: new Set([...followed, 'telegraaf']) }) })
  assert.equal(met.length, 1)
  assert.equal(met[0].leadId, '3q47hm')
})
