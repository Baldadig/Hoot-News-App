// De Redacteur: "al gezien in een eerdere Editie" (Hoot-design/algoritme/aanvulling-pariteit-herhaling.md
// §2 H1–H4, §3 T1–T9). Overgenomen uit de diagnose (scratchpad/diagnose/herhaling/herhaling.test.mjs).
// Wat nog bij een volgend pakket hoort (H3: previous over drie Edities, H6: sameEvent), staat als todo.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectForReader, previousOf, signatures, sameEvent, seenBefore, developedSince } from '../netlify/lib/stories.mjs'
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

test('T3b H2: een vertaalde kop (zelfde namen, andere taal) is geen ontwikkeling, ook niet met ≥ 2 nieuwe stukken', () => {
  const vertaald = [art('tr1', 'guardian', 'Patrick Stewart (1940-2026) dies: the actor was 85', new Date(NOW - 36e5).toISOString()), art('tr2', 'nyt', 'Actor Patrick Stewart Is Dead at 85', new Date(NOW - 30e5).toISOString())]
  const { st, pool: p } = developed(vertaald)
  assert.equal(developedSince(st, p.filter((i) => st.itemIds.includes(i.id)), previousOf(ochtend), signatures(p)), null)
  const sel = select([st, stFresh, ...small.map((s) => s.st)], p, { previous: previousOf(ochtend) })
  assert.ok(!sel.some((e) => e.id === 'st-stewart'), 'Stewart kwam terug met een vertaalde kop')
})

test('T4 H3: previous over de laatste drie Edities — wat in de Ochtend stond, komt in de Avond niet terug zonder ontwikkeling', { todo: 'H3 (previousOf over drie Edities) komt in een volgend pakket' }, () => {
  // De Middag had Stewart niet (de filter werkte); de Avond kent alleen de Middag als previous.
  const middag = { builtAt: new Date(NOW).toISOString(), entries: small.slice(0, 10).map((s) => ({ kind: 'story', id: s.st.id, leadId: s.its[0].id, desk: 'binnenland', itemIds: s.st.itemIds, title: s.its[0].title })) }
  const AVOND = Date.parse('2026-10-30T16:00:00Z')
  const extra2 = art('pw-extra2', 'rtl', 'Fans leggen bloemen bij het theater van Patrick Stewart', new Date(AVOND - 36e5).toISOString())
  const st = { ...stStewart, itemIds: [...stewart.map((s) => s.id), extra.id, extra2.id], sourceCount: 12, latestAt: extra2.publishedAt }
  const sel = select([st, stFresh, ...small.map((s) => s.st)], [...pool, extra2], { now: AVOND, previous: previousOf([ochtend, middag]) })
  assert.ok(!sel.some((e) => e.id === 'st-stewart'), 'Stewart (Ochtend) komt in de Avond terug omdat previous alleen de Middag kent')
})

test('T5 H6: dezelfde gebeurtenis in het Nederlands en het Engels met twee namen en zonder gebeurtenis-woord', { todo: 'H6 (sameEvent regel i) komt in een volgend pakket' }, () => {
  const a = art('nd', 'nrc', 'Apple haalt Nvidia in als meest waardevolle bedrijf ter wereld', new Date(NOW - 36e5).toISOString(), { summary: 'De beurswaarde van Apple steeg donderdag boven die van Nvidia.' })
  const b = art('bb', 'economist', 'Apple Overtakes Nvidia to Become World’s Most Valuable Company', new Date(NOW - 30e5).toISOString(), { summary: 'Apple’s market value rose above Nvidia’s on Thursday.' })
  const sig = signatures([a, b])
  assert.equal(sameEvent(sig.get('nd'), sig.get('bb')), true)
})

test('T5n H6: Intel-koersval en Intel-fabrieksexplosie blijven twee gebeurtenissen', () => {
  const a = art('ik', 'tweakers', 'Aandeel Intel zakt 8 procent na tegenvallende kwartaalcijfers', new Date(NOW - 36e5).toISOString(), { summary: 'Beleggers reageren op de omzet van Intel, die lager uitviel dan verwacht.' })
  const b = art('ie', 'ars', 'Explosion at Intel fab in Arizona injures three workers', new Date(NOW - 30e5).toISOString(), { summary: 'Intel said the blast at its Chandler plant happened during maintenance; three workers were injured.' })
  const sig = signatures([a, b])
  assert.equal(sameEvent(sig.get('ik'), sig.get('ie')), false)
})

test('T6 H6: een necrologie uit een andere bron hoort bij het verhaal over het overlijden', { todo: 'H6 (sameEvent regel ii) komt in een volgend pakket' }, () => {
  const a = art('a1', 'nos', 'Bedroefde reacties om dood Patrick Stewart: ‘Een man om van te houden’', new Date(NOW - 36e5).toISOString(), { summary: 'De Britse acteur Patrick Stewart is op 85-jarige leeftijd overleden.' })
  const b = art('b1', 'nyt', 'Patrick Stewart Was Regal, Stately and Quite Hilarious', new Date(NOW - 30e5).toISOString(), { summary: 'An appraisal of the actor, who played Captain Picard and Professor X.' })
  const sig = signatures([a, b])
  assert.equal(sameEvent(sig.get('a1'), sig.get('b1')), true)
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
