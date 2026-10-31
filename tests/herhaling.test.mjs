// De Redacteur: "al gezien in een eerdere Editie" (Hoot-design/algoritme/aanvulling-pariteit-herhaling.md
// §2 H1–H4, §3 T1–T9). Overgenomen uit de diagnose (scratchpad/diagnose/herhaling/herhaling.test.mjs).
// T5, T5n en T6 toetsen H6 (sameEvent in de uitgebreide stand); de fixtures uit de live-data staan in
// tests/h6.test.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { selectForReader, previousOf, historyOf, recentEditions, HISTORY_MAX, signatures, sameEvent, buildStories, seenBefore, developedSince, storyKeys } from '../netlify/lib/stories.mjs'
import { composePersonal } from '../src/lib/personal.js'
import { profileOf } from '../shared/editor.mjs'

const NOW = Date.parse('2026-10-30T11:00:00Z') // middag
const OCHTEND = Date.parse('2026-10-30T05:00:00Z')
const art = (id, source, title, iso, extra = {}) => ({ id, kind: 'article', source, sourceName: source, title, summary: title + '.', publishedAt: iso, image: 'https://x/y.jpg', ...extra })
const SOURCES = ['nos', 'nrc', 'volkskrant', 'trouw', 'nyt', 'guardian', 'bbc', 'economist', 'atlantic', 'politico', 'dw', 'aljazeera', 'rtl', 'nu'].map((id) => ({ id, cat: ['nyt', 'guardian', 'bbc', 'economist', 'atlantic', 'politico', 'dw', 'aljazeera'].includes(id) ? 'int' : 'nl', lang: ['nos', 'nrc', 'volkskrant', 'trouw', 'rtl', 'nu'].includes(id) ? 'nl' : 'en' }))
const FOLLOWED = new Set(SOURCES.map((s) => s.id))

// Een groot verhaal (10 bronnen, uit de Ochtend) waar in de Middag één extra bron bij kwam: dezelfde
// dood van een acteur, alleen een andere kop.
const stewart = Array.from({ length: 10 }, (_, i) => art('pw' + i, SOURCES[i].id, 'Acteur Patrick Stewart (1940-2026) overleden', new Date(OCHTEND - 36e5 * (1 + i * 0.1)).toISOString()))
const extra = art('pw-extra', 'nu', 'Dit was het leven van Patrick Stewart, van bescheiden komaf tot wereldster', new Date(NOW - 36e5).toISOString())
const stStewart = { id: 'st-stewart', itemIds: [...stewart.map((s) => s.id), extra.id], sourceCount: 11, ownCount: 11, latestAt: extra.publishedAt, desk: null }
// Ander groot verhaal van nu (6 bronnen, allemaal nieuw).
const fresh6 = Array.from({ length: 6 }, (_, i) => art('fr' + i, SOURCES[i + 2].id, 'Kabinet valt over asielplan, verkiezingen in het voorjaar', new Date(NOW - 36e5 * (0.5 + i * 0.1)).toISOString()))
const stFresh = { id: 'st-fresh', itemIds: fresh6.map((s) => s.id), sourceCount: 6, ownCount: 6, latestAt: fresh6[0].publishedAt, desk: 'binnenland' }
// Kleinere verse verhalen om de Editie mee te vullen.
const TOWNS = ['Utrecht', 'Groningen', 'Breda', 'Zwolle', 'Leiden', 'Delft', 'Haarlem', 'Almere', 'Tilburg', 'Arnhem', 'Deventer', 'Assen']
const small = Array.from({ length: 12 }, (_, k) => {
  const its = [art(`sm${k}a`, SOURCES[k % 14].id, `Nieuw bericht nummer ${k} over gemeente en begroting ${TOWNS[k]}`, new Date(NOW - 36e5 * (1 + k * 0.1)).toISOString()), art(`sm${k}b`, SOURCES[(k + 5) % 14].id, `Gemeente ${TOWNS[k]} krijgt tekort op begroting, bericht ${k}`, new Date(NOW - 36e5 * (1.2 + k * 0.1)).toISOString())]
  return { st: { id: 'st-sm' + k, itemIds: its.map((i) => i.id), sourceCount: 2, ownCount: 2, latestAt: its[0].publishedAt, desk: 'binnenland' }, its }
})
const pool = [...stewart, extra, ...fresh6, ...small.flatMap((s) => s.its)]
const stories = [stStewart, stFresh, ...small.map((s) => s.st)]
const prof = profileOf({ interests: [], topics: [], affinity: null, taste: null, favorites: [], followed: FOLLOWED, sources: SOURCES, supply: {} })
const select = (sts, items, opts) => selectForReader(sts, items, { mainIds: FOLLOWED, now: NOW, prof, ctx: {}, seed: 't', ...opts })

// De Ochtend-Editie had het Stewart-verhaal als hoofdverhaal (lead pw0), met de volledige itemIds en kop (H4).
const ochtend = {
  builtAt: new Date(OCHTEND).toISOString(),
  entries: [
    { kind: 'story', id: 'st-stewart', leadId: 'pw0', desk: null, itemIds: stewart.map((s) => s.id), title: stewart[0].title },
    ...small.slice(0, 9).map((s) => ({ kind: 'story', id: s.st.id, leadId: s.its[0].id, desk: 'binnenland', itemIds: s.st.itemIds, title: s.its[0].title })),
  ],
}

test('T1 H1: één nieuw stuk van een andere bron is geen ontwikkeling — het verhaal komt niet terug', () => {
  const sel = select(stories, pool, { previous: previousOf(ochtend) })
  assert.ok(!sel.some((e) => e.id === 'st-stewart'), `Stewart kwam terug (lead ${sel.find((e) => e.id === 'st-stewart')?.leadId}); er was één nieuw stuk bij 10 oude`)
  assert.equal(seenBefore(stStewart, [...stewart, extra], previousOf(ochtend)), true)
  assert.equal(developedSince(stStewart, [...stewart, extra], previousOf(ochtend), signatures(pool)), null)
})

test('T2 H1: de voorpagina slaat een gezien verhaal over, ook als het de enige grote is', () => {
  const sel = select(stories, pool, { previous: previousOf(ochtend) })
  assert.ok(!sel.some((e) => e.id === 'st-stewart' && e.front), 'Stewart staat weer op de voorpagina')
  assert.ok(sel.some((e) => e.id === 'st-fresh'), 'het verse grote verhaal staat erin')
  const seen = previousOf(ochtend).storyIds
  assert.ok(!sel.some((e) => seen.has(e.id)), 'niets uit de Ochtend komt zonder ontwikkeling terug')
  assert.ok(sel.length >= 4, 'de verhalen die niet in de Ochtend stonden vullen aan')
})

const DEV = [art('dv1', 'nos', 'Staatsbegrafenis voor Patrick Stewart aangekondigd in Westminster Abbey', new Date(NOW - 36e5).toISOString()), art('dv2', 'bbc', 'Patrick Stewart to receive state funeral at Westminster Abbey, palace confirms', new Date(NOW - 30e5).toISOString())]
const developed = (dev) => ({
  st: { ...stStewart, itemIds: [...stewart.map((s) => s.id), ...dev.map((d) => d.id)], sourceCount: 11, latestAt: dev[1].publishedAt },
  pool: [...stewart, ...dev, ...fresh6, ...small.flatMap((s) => s.its)],
})

test('T3 H2: terug met ≥ 2 nieuwe stukken én nieuwe namen in de kop, met een nieuw stuk als kop en why "Vervolg"', () => {
  const { st, pool: p } = developed(DEV)
  const sel = select([st, stFresh, ...small.map((s) => s.st)], p, { previous: previousOf(ochtend) })
  const e = sel.find((x) => x.id === 'st-stewart')
  assert.ok(e, 'ontwikkeld verhaal mag terug')
  assert.ok(['dv1', 'dv2'].includes(e.leadId), `kop is een nieuw stuk, niet een oud stuk uit een andere bron (${e.leadId})`)
  assert.equal(e.vervolg, 2)
  assert.deepEqual(e.itemIds, st.itemIds, 'de plek draagt alle stukken van het verhaal (H4)')
  assert.equal(e.title, p.find((i) => i.id === e.leadId).title)
  // Via composePersonal krijgt de plek het waarom "Vervolg · N nieuwe stukken" (code vervolg).
  const global = { id: '2026-10-30-middag', slot: 'middag', date: '2026-10-30', builtAt: new Date(NOW).toISOString(), entries: [{ kind: 'story', id: 'st-fresh', leadId: 'fr0', desk: 'binnenland' }], items: [fresh6[0]], bubble: [] }
  const mine = composePersonal({ global, stories: [st, stFresh, ...small.map((s) => s.st)], items: p, sources: SOURCES, followed: FOLLOWED, now: NOW, previous: previousOf(ochtend) })
  const back = mine.entries.find((x) => x.id === 'st-stewart')
  assert.equal(back?.why?.text, 'Vervolg · 2 nieuwe stukken')
  assert.equal(back.why.code, 'vervolg')
  assert.ok(['dv1', 'dv2'].includes(back.leadId))
  assert.ok(!('vervolg' in back), 'alleen het waarom gaat mee, niet het getal apart')
})

// Het toestel kent van een verhaal alleen de stukken uit de eigen bronnen (plus de koppen van de
// algemene Editie). Een portret of necrologie noemt namen (Jean-Luc Picard, Star Trek, Shakespeare) die
// de andere bronnen 's ochtends al noemden, maar die het toestel niet zag. Daarom draagt elke plek de
// `keys` van zijn hele verhaal (van de server) en toetst developedSince de nieuwe kop daartegen.
test('T2c H2: op toestelkennis is een portret met namen uit de andere bronnen van toen geen ontwikkeling (keys van de server)', () => {
  const AVOND = Date.parse('2026-10-30T16:00:00Z')
  const nl = (id, source, iso) => art(id, source, 'Acteur Patrick Stewart (1940-2026) overleden', iso, { summary: 'De Britse acteur Patrick Stewart is op 85-jarige leeftijd overleden, meldt zijn familie.' })
  const en = (id, source, iso) => art(id, source, 'Actor Patrick Stewart dies at 85', iso, { summary: 'Stewart, known for playing Jean-Luc Picard in Star Trek and for his Shakespeare roles, died at 85, his family said.' })
  const morning = [nl('m0', 'nos', new Date(OCHTEND - 36e5).toISOString()), nl('m1', 'nrc', new Date(OCHTEND - 35e5).toISOString()), nl('m2', 'volkskrant', new Date(OCHTEND - 34e5).toISOString()), ...['nyt', 'guardian', 'bbc', 'economist', 'atlantic', 'politico', 'dw'].map((src, k) => en('m' + (3 + k), src, new Date(OCHTEND - 33e5 + k * 1e5).toISOString()))]
  const portraits = [
    art('p1', 'volkskrant', 'Met zijn norse bariton zette Patrick Stewart iedere rol neer alsof het Shakespeare was', new Date(AVOND - 36e5).toISOString(), { summary: 'Hij speelde Jean-Luc Picard in Star Trek en stond jarenlang op de planken met Shakespeare.' }),
    art('p2', 'nrc', 'Patrick Stewart: van de Royal Shakespeare Company naar het sterrenschip Enterprise', new Date(AVOND - 30e5).toISOString(), { summary: 'Als Jean-Luc Picard in Star Trek werd hij wereldberoemd; Shakespeare bleef zijn thuis.' }),
    art('p3', 'nos', 'Fans en collega’s herdenken Patrick Stewart, de kapitein van Star Trek', new Date(AVOND - 24e5).toISOString(), { summary: 'Jean-Luc Picard was zijn bekendste rol; collega’s uit Star Trek en van Shakespeare-gezelschappen reageren.' }),
  ]
  const all = [...morning, ...portraits]
  const sigServer = signatures(all)
  const stThen = { id: 'st-pw', itemIds: morning.map((i) => i.id), sourceCount: 10, ownCount: 10, latestAt: morning[9].publishedAt, desk: null, keys: storyKeys(morning, sigServer) }
  assert.ok(stThen.keys.includes('picard') && stThen.keys.includes('shakespeare'), `keys van de server: ${stThen.keys.join(',')}`)
  // De Ochtend-plek draagt de keys van het hele verhaal (H4), zoals selectForReader en composePersonal ze zetten.
  const ochtendEd = { builtAt: new Date(OCHTEND).toISOString(), entries: [{ kind: 'story', id: 'st-pw', leadId: 'm0', itemIds: stThen.itemIds, title: morning[0].title, keys: stThen.keys }] }
  const previous = previousOf(ochtendEd)
  assert.deepEqual([...previous.keysOf.get('st-pw')].sort(), [...stThen.keys].sort(), 'previousOf neemt de keys per verhaal mee')
  // Het toestel volgt drie Nederlandse bronnen en kent alleen hun stukken.
  const followed = new Set(['nos', 'nrc', 'volkskrant'])
  const device = all.filter((i) => followed.has(i.source))
  const known = new Map(device.map((i) => [i.id, i]))
  const stNow = { ...stThen, itemIds: all.map((i) => i.id), sourceCount: 10, latestAt: portraits[2].publishedAt }
  const members = stNow.itemIds.map((id) => known.get(id)).filter(Boolean)
  assert.equal(members.length, 6, 'drie oude en drie nieuwe stukken uit eigen bronnen')
  const sigDevice = signatures(device)
  const opts = { mainIds: followed, now: AVOND, known }
  assert.equal(developedSince(stNow, members, previous, sigDevice, opts), null, 'met de keys van toen is het portret geen ontwikkeling')
  // Zonder die keys (een plek van een oudere Editie) kent het toestel de namen van toen niet: dan zou het
  // portret wél als ontwikkeld tellen. Dat is precies waarom de keys meegaan.
  const kaal = { ...previous, keysOf: new Map() }
  assert.ok(developedSince(stNow, members, kaal, sigDevice, opts), 'zonder keys ziet het toestel de namen van de andere bronnen niet')
  // En via selectForReader: het verhaal komt niet terug.
  const sel = selectForReader([stNow], device, { mainIds: followed, now: AVOND, prof, ctx: { known, sigKnown: sigDevice }, seed: 't', previous })
  assert.ok(!sel.some((e) => e.id === 'st-pw'), 'Stewart kwam in de Avond terug als Vervolg')
  // Zonder previous krijgt de plek de keys van het verhaal mee, voor de volgende Editie.
  const first = selectForReader([stNow], device, { mainIds: followed, now: AVOND, prof, ctx: {}, seed: 't' })
  assert.deepEqual(first.find((e) => e.id === 'st-pw')?.keys, stNow.keys)
})

test('T3b H2: een vertaalde kop (zelfde namen, andere taal) is geen ontwikkeling, ook niet met ≥ 2 nieuwe stukken', () => {
  const vertaald = [art('tr1', 'guardian', 'Patrick Stewart (1940-2026) dies: the actor was 85', new Date(NOW - 36e5).toISOString()), art('tr2', 'nyt', 'Actor Patrick Stewart Is Dead at 85', new Date(NOW - 30e5).toISOString())]
  const { st, pool: p } = developed(vertaald)
  assert.equal(developedSince(st, p.filter((i) => st.itemIds.includes(i.id)), previousOf(ochtend), signatures(p)), null)
  const sel = select([st, stFresh, ...small.map((s) => s.st)], p, { previous: previousOf(ochtend) })
  assert.ok(!sel.some((e) => e.id === 'st-stewart'), 'Stewart kwam terug met een vertaalde kop')
})

// De Middag had Stewart niet (de filter werkte); met alleen de Middag als previous zou de Avond hem niet kennen.
const middag = { id: '2026-10-30-middag', builtAt: new Date(NOW).toISOString(), entries: small.slice(0, 10).map((s) => ({ kind: 'story', id: s.st.id, leadId: s.its[0].id, desk: 'binnenland', itemIds: s.st.itemIds, title: s.its[0].title })) }
const ochtendMetId = { id: '2026-10-30-ochtend', ...ochtend }
const AVOND = Date.parse('2026-10-30T16:00:00Z')

test('T4 H3: previous over de laatste drie Edities — wat in de Ochtend stond, komt in de Avond niet terug zonder ontwikkeling', () => {
  const extra2 = art('pw-extra2', 'rtl', 'Fans leggen bloemen bij het theater van Patrick Stewart', new Date(AVOND - 36e5).toISOString())
  const st = { ...stStewart, itemIds: [...stewart.map((s) => s.id), extra.id, extra2.id], sourceCount: 12, latestAt: extra2.publishedAt }
  const sts = [st, stFresh, ...small.map((s) => s.st)]
  const p = [...pool, extra2]
  // Alleen de Middag als previous: dan is Stewart onbekend en komt hij terug (de fout van vóór H3).
  assert.ok(select(sts, p, { now: AVOND, previous: previousOf(middag) }).some((e) => e.id === 'st-stewart'))
  // Ochtend en Middag samen: niet terug, in welke volgorde ze ook worden meegegeven.
  for (const list of [[ochtendMetId, middag], [middag, ochtendMetId]]) {
    const sel = select(sts, p, { now: AVOND, previous: previousOf(list) })
    assert.ok(!sel.some((e) => e.id === 'st-stewart'), 'Stewart (Ochtend) komt in de Avond terug omdat previous alleen de Middag kent')
    assert.ok(!sel.some((e) => previousOf(list).storyIds.has(e.id)), 'niets uit Ochtend of Middag komt zonder ontwikkeling terug')
  }
  // Ook als de Ochtend alleen nog als samenvatting uit het account bekend is (H5).
  const sel = select(sts, p, { now: AVOND, previous: previousOf([historyOf(ochtendMetId), middag]) })
  assert.ok(!sel.some((e) => e.id === 'st-stewart'))
})

test('H3: previousOf over meer Edities verenigt verhalen, stukken, koppen en hoofdverhalen; at per verhaal is de laatste Editie waarin het stond', () => {
  const one = previousOf(ochtendMetId)
  const both = previousOf([ochtendMetId, middag])
  // Eén Editie: dezelfde velden als vroeger (selectEdition rekent met at, leadStoryId, storyIds, itemIds, leadIds).
  assert.equal(one.at, OCHTEND)
  assert.equal(one.leadStoryId, 'st-stewart')
  assert.deepEqual([...one.leadStoryIds], ['st-stewart'])
  assert.equal(one.atOf.get('st-stewart'), OCHTEND)
  // Twee Edities: de vereniging; `at` en `leadStoryId` van de laatste, alle hoofdverhalen in leadStoryIds.
  assert.equal(both.at, NOW)
  assert.equal(both.leadStoryId, 'st-sm0')
  assert.deepEqual([...both.leadStoryIds].sort(), ['st-sm0', 'st-stewart'])
  assert.ok(both.storyIds.has('st-stewart') && both.storyIds.has('st-sm9'), 'verhalen van beide')
  assert.ok(both.itemIds.has('pw9') && both.itemIds.has('sm9b'), 'alle stukken van beide')
  assert.ok(both.leadIds.has('pw0') && both.leadIds.has('sm0a'))
  assert.ok(both.titles.has(stewart[0].title) && both.titles.has(small[9].its[0].title))
  assert.equal(both.shown.length, previousOf(ochtendMetId).shown.length + previousOf(middag).shown.length)
  // st-sm0 stond in beide: at is de Middag; Stewart alleen in de Ochtend.
  assert.equal(both.atOf.get('st-sm0'), NOW)
  assert.equal(both.atOf.get('st-stewart'), OCHTEND)
  // De volgorde van de lijst doet er niet toe, en lege plekken worden overgeslagen.
  const flipped = previousOf([null, middag, undefined, ochtendMetId])
  assert.equal(flipped.at, both.at)
  assert.equal(flipped.leadStoryId, both.leadStoryId)
  assert.deepEqual([...flipped.storyIds].sort(), [...both.storyIds].sort())
  assert.equal(previousOf([]), null)
  assert.equal(previousOf([null]), null)
})

test('H5: historyOf is de platte samenvatting van een Editie, en previousOf leest die terug zoals de Editie zelf', () => {
  const row = historyOf(ochtendMetId)
  assert.equal(row.id, '2026-10-30-ochtend')
  assert.equal(row.builtAt, ochtend.builtAt)
  assert.ok(Array.isArray(row.storyIds) && Array.isArray(row.itemIds) && Array.isArray(row.leadIds) && Array.isArray(row.titles))
  assert.equal(row.leadStoryId, 'st-stewart')
  assert.equal(JSON.stringify(row), JSON.stringify(JSON.parse(JSON.stringify(row))), 'platte JSON')
  const a = previousOf(ochtendMetId)
  const b = previousOf(row)
  for (const k of ['storyIds', 'itemIds', 'leadIds', 'titles']) assert.deepEqual([...b[k]].sort(), [...a[k]].sort(), k)
  assert.equal(b.at, a.at)
  assert.equal(b.leadStoryId, a.leadStoryId)
  assert.deepEqual(b.shown, a.shown)
  // Een samenvatting blijft een samenvatting; keys per verhaal gaan mee en komen als Set terug.
  assert.equal(historyOf(row), row)
  const met = historyOf({ id: 'x', builtAt: ochtend.builtAt, entries: [{ kind: 'story', id: 'st-k', leadId: 'k1', itemIds: ['k1'], title: 'K', keys: ['picard', 'shakespeare'] }] })
  assert.deepEqual(met.keys, { 'st-k': ['picard', 'shakespeare'] })
  assert.deepEqual([...previousOf(met).keysOf.get('st-k')].sort(), ['picard', 'shakespeare'])
  assert.equal(historyOf(null), null)
  assert.equal(historyOf({ id: 'leeg', builtAt: ochtend.builtAt, entries: [] }), null)
})

test('H3/H5: recentEditions houdt de laatste drie, ontdubbeld op id, nieuwste eerst', () => {
  const at = (h) => new Date(OCHTEND + h * 36e5).toISOString()
  const ed = (id, h) => ({ id, builtAt: at(h), entries: [{ kind: 'item', id: 'i' + id }] })
  const rows = [historyOf(ed('a', 0)), ed('b', 6), historyOf(ed('b', 6)), ed('c', 11), null, { id: 'zonder-tijd' }, ed('d', 24)]
  const out = recentEditions(rows)
  assert.equal(HISTORY_MAX, 3)
  assert.deepEqual(out.map((e) => e.id), ['d', 'c', 'b'])
  assert.equal(out[2], rows[1], 'bij een dubbele id wint de eerste')
  assert.deepEqual(recentEditions(rows, 5).map((e) => e.id), ['d', 'c', 'b', 'a'])
  assert.deepEqual(recentEditions([]), [])
})

test('T5 H6 (i): dezelfde gebeurtenis in het Nederlands en het Engels met twee namen in de kop en zonder gebeurtenis-woord', () => {
  const a = art('nd', 'nrc', 'Apple haalt Nvidia in als meest waardevolle bedrijf ter wereld', new Date(NOW - 36e5).toISOString(), { summary: 'De beurswaarde van Apple steeg donderdag boven die van Nvidia.' })
  const b = art('bb', 'economist', 'Apple Overtakes Nvidia to Become World’s Most Valuable Company', new Date(NOW - 30e5).toISOString(), { summary: 'Apple’s market value rose above Nvidia’s on Thursday.' })
  const sig = signatures([a, b], [], { extended: true })
  assert.equal(sameEvent(sig.get('nd'), sig.get('bb'), true), true)
  // In de gewone stand (de meetlat) verandert er niets.
  const oud = signatures([a, b])
  assert.equal(sameEvent(oud.get('nd'), oud.get('bb')), false)
  // Twee namen die één persoon zijn ("Kylian Mbappé") tellen als één: geen gebeurtenis.
  const c = art('c1', 'telegraaf', 'Rob Hoogland: wat jammer dat Kylian Mbappé zijn excuses heeft geboden', new Date(NOW - 36e5).toISOString(), { summary: 'Column over Kylian Mbappé en zijn excuses aan China.' })
  const d = art('d1', 'guardian', 'Kylian Mbappé loses Ballon d’Or vote by 28 points to Harry Kane', new Date(NOW - 30e5).toISOString(), { summary: 'The vote breakdown shows Kylian Mbappé came close to winning.' })
  const sig2 = signatures([c, d], [], { extended: true })
  assert.equal(sameEvent(sig2.get('c1'), sig2.get('d1'), true), false)
  // En niet na meer dan twaalf uur: dan is het dezelfde persoon in ander nieuws.
  const e = { ...b, id: 'bb2', publishedAt: new Date(NOW - 20 * 36e5).toISOString() }
  const sig3 = signatures([a, e], [], { extended: true })
  assert.equal(sameEvent(sig3.get('nd'), sig3.get('bb2'), true), false)
})

test('T5n H6: Intel-koersval en Intel-fabrieksexplosie blijven twee gebeurtenissen', () => {
  const a = art('ik', 'tweakers', 'Aandeel Intel zakt 8 procent na tegenvallende kwartaalcijfers', new Date(NOW - 36e5).toISOString(), { summary: 'Beleggers reageren op de omzet van Intel, die lager uitviel dan verwacht.' })
  const b = art('ie', 'ars', 'Explosion at Intel fab in Arizona injures three workers', new Date(NOW - 30e5).toISOString(), { summary: 'Intel said the blast at its Chandler plant happened during maintenance; three workers were injured.' })
  const sig = signatures([a, b], [], { extended: true })
  assert.equal(sameEvent(sig.get('ik'), sig.get('ie'), true), false)
  const oud = signatures([a, b])
  assert.equal(sameEvent(oud.get('ik'), oud.get('ie')), false)
})

// Regel (ii) werkt niet per paar maar per verhaal (attachLoose in buildStories): de necrologie deelt
// alleen de persoon met het verhaal, en hoort er alleen bij omdat de kern van dat verhaal een
// overlijden is. Op de echte berichten van 30-10 (tests/fixtures/clustering-3010.json).
test('T6 H6 (ii): een necrologie zonder sterfwoord hoort bij het verhaal over het overlijden (≥ 6 bronnen), niet bij een paar', () => {
  const items = JSON.parse(readFileSync(new URL('./fixtures/clustering-3010.json', import.meta.url), 'utf8'))
  const byTitle = (re) => items.find((i) => re.test(i.title)).id
  const nyt = byTitle(/^Patrick Stewart Was Regal/)
  const nos = byTitle(/^Bedroefde reacties om dood Patrick Stewart/)
  const stories = buildStories(items, {}, { extended: true })
  const st = stories.find((s) => s.itemIds.includes(nos))
  assert.ok(st && st.sourceCount >= 6, 'het Stewart-verhaal heeft minstens zes bronnen')
  assert.ok(st.itemIds.includes(nyt), 'de NYT-necrologie hoort bij het verhaal over zijn dood')
  // In de gewone stand blijft de necrologie los (de meetlat verandert niet).
  const oud = buildStories(items)
  assert.ok(!oud.some((s) => s.itemIds.includes(nyt)))
  // Per paar is het geen gebeurtenis: één persoon, geen begrip.
  const sig = signatures(items, [], { extended: true })
  assert.equal(sameEvent(sig.get(nos), sig.get(nyt), true), false)
})

test('T7 H1: de aanvulling uit de algemene Editie en "Waar iedereen over schrijft" respecteren previous', () => {
  const global = { id: '2026-10-30-middag', slot: 'middag', date: '2026-10-30', builtAt: new Date(NOW).toISOString(), entries: [{ kind: 'story', id: 'st-stewart', leadId: 'pw0', desk: 'buitenland', itemIds: stStewart.itemIds }], items: [stewart[0]], bubble: [], wide: [{ storyId: 'st-stewart', sourceCount: 11, topics: [], item: stewart[1] }] }
  // Lezer volgt alleen twee kleine bronnen: zijn Editie wordt aangevuld uit de algemene.
  const followed = new Set(['rtl', 'nu'])
  const zonder = composePersonal({ global, stories, items: pool, sources: SOURCES, followed, now: NOW, previous: null })
  assert.ok(zonder.entries.some((e) => e.id === 'st-stewart'), 'zonder previous komt Stewart via de aanvulling of het brede verhaal')
  const mine = composePersonal({ global, stories, items: pool, sources: SOURCES, followed, now: NOW, previous: previousOf(ochtend) })
  const back = mine.entries.filter((e) => e.id === 'st-stewart')
  assert.equal(back.length, 0, `Stewart kwam terug via ${back.map((e) => e.desk).join(', ')}`)
})

test('T7b H1/H2: een ontwikkeld verhaal komt als aanvulling terug met een nieuw stuk als kop en "Vervolg"', () => {
  const { st, pool: p } = developed(DEV)
  const global = { id: '2026-10-30-middag', slot: 'middag', date: '2026-10-30', builtAt: new Date(NOW).toISOString(), entries: [{ kind: 'story', id: 'st-stewart', leadId: 'pw0', desk: 'buitenland', itemIds: st.itemIds }], items: [stewart[0]], bubble: [] }
  const mine = composePersonal({ global, stories: [st, stFresh, ...small.map((s) => s.st)], items: p, sources: SOURCES, followed: new Set(['rtl', 'nu']), now: NOW, previous: previousOf(ochtend) })
  const back = mine.entries.find((e) => e.id === 'st-stewart')
  assert.ok(back, 'ontwikkeld: mag terug als aanvulling')
  assert.equal(back.desk, 'extern')
  assert.ok(['dv1', 'dv2'].includes(back.leadId), `kop ${back.leadId}`)
  assert.equal(back.why.text, 'Vervolg · 2 nieuwe stukken')
})

test('T9 H4: een tweede verhaal over dezelfde gebeurtenis (ander id) komt niet terug, op de kop van toen', () => {
  const reacties = [art('rx1', 'rtl', 'Hollywood rouwt om Patrick Stewart: collega’s herdenken de acteur', new Date(NOW - 36e5).toISOString()), art('rx2', 'nu', 'Reacties op dood van Patrick Stewart stromen binnen', new Date(NOW - 30e5).toISOString())]
  const st2 = { id: 'st-stewart2', itemIds: reacties.map((i) => i.id), sourceCount: 2, ownCount: 2, latestAt: reacties[1].publishedAt, desk: null }
  const p = [...pool, ...reacties]
  const sts = [stStewart, st2, stFresh, ...small.map((s) => s.st)]
  const zonder = select(sts, p, { previous: null })
  assert.ok(zonder.some((e) => e.id === 'st-stewart2') || zonder.some((e) => e.id === 'st-stewart'), 'zonder previous krijgt het onderwerp één plek')
  const previous = previousOf(ochtend)
  assert.ok(previous.titles.has(stewart[0].title), 'previousOf neemt de koppen mee')
  const sel = select(sts, p, { previous })
  assert.ok(!sel.some((e) => e.id === 'st-stewart2'), 'het tweede verhaal over Stewart kwam terug via een ander verhaal-id')
  // Zonder de koppen van toen (oude Editie zonder `title` en zonder `items`) is er niets om op te toetsen.
  const kaal = { ...previous, titles: new Set() }
  assert.ok(select(sts, p, { previous: kaal }).some((e) => e.id === 'st-stewart2'))
})

test('previousOf leest de koppen uit `title` of uit de getoonde berichten', () => {
  const p = previousOf({ builtAt: new Date(OCHTEND).toISOString(), entries: [{ kind: 'story', id: 'st-x', leadId: 'x1', itemIds: ['x1', 'x2'] }, { kind: 'item', id: 'y1', title: 'Kop Y' }], items: [{ id: 'x1', title: 'Kop X' }] })
  assert.deepEqual([...p.titles].sort(), ['Kop X', 'Kop Y'])
  assert.ok(p.itemIds.has('x2') && p.itemIds.has('y1'))
})
