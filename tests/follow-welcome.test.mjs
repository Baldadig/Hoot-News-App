// Welkom, Volg je bronnen (src/lib/follow-welcome.js): eerst de interesses, dan de bronnen. Niets
// vooraf aan, de Basis bovenaan, per gekozen interesse een blok met een gratis aanrader, sport alleen
// bij Sport maar wel te vinden, Later kiezen zonder sport, en een voorbeeld met echte koppen.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { toggleFollow, freeStart, startIds, followGroups, basisSources, interestBlocks, moreGroups, freePick, findSources, followedSources, followedLine, previewLines, FREE_START, BASIS_KRANTEN } from '../src/lib/follow-welcome.js'
import { INTERESTS } from '../src/lib/topics.js'
import { rubriekRij } from '../src/lib/streamline.js'
import { applyWelcome } from '../src/lib/welcome.js'
import { SOURCES } from '../netlify/lib/sources.mjs'

const catalog = SOURCES.map((s) => ({ ...s, followed: true }))
const byId = new Map(catalog.map((s) => [s.id, s]))

test('het gratis begin: NOS, NU.nl en RTL Nieuws, gratis en in die volgorde', () => {
  assert.deepEqual(freeStart(catalog).map((s) => s.id), ['nos', 'nu', 'rtl'])
  assert.ok(freeStart(catalog).every((s) => !s.paid))
  assert.deepEqual(freeStart([{ id: 'nos', paid: true }, { id: 'nu' }]).map((s) => s.id), ['nu'], 'nooit een betaalde bron')
})

test('Later kiezen en Liever meteen lezen: gratis en zonder sport', () => {
  const ids = startIds(catalog)
  assert.ok(ids.length >= 3)
  assert.deepEqual(ids.slice(0, 3), FREE_START)
  for (const id of ids) {
    assert.ok(!byId.get(id).paid, id)
    assert.notEqual(byId.get(id).cat, 'sport', id)
  }
})

test('per rubriek, zonder het gratis begin; alles komt één keer voor; sport als eigen groep', () => {
  const groups = followGroups(catalog)
  const ids = groups.flatMap((g) => g.sources.map((s) => s.id))
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(ids.length + FREE_START.length, catalog.length)
  assert.ok(!ids.includes('nos'))
  assert.equal(groups[0].cat, 'nl')
  const sport = groups.find((g) => g.cat === 'sport')
  assert.ok(sport && sport.sources.every((s) => s.cat === 'sport'))
  // Onbekende rubriek: achteraan bij Overig, niet kwijt.
  assert.deepEqual(followGroups([{ id: 'x', name: 'X', cat: 'raar' }]).map((g) => g.cat), ['overig'])
})

test('de Basis: het gratis begin, dan de kranten als losse rijen in vaste volgorde', () => {
  const basis = basisSources(catalog)
  assert.deepEqual(basis.map((s) => s.id), ['nos', 'nu', 'rtl', 'volkskrant', 'nrc', 'trouw', 'parool', 'ad', 'telegraaf'])
  assert.deepEqual(basis.slice(0, 3).map((s) => s.id), FREE_START)
  assert.ok(basis.every((s) => s.cat === 'nl'))
  // Het gratis begin is gratis; de kranten staan er los onder (betaald, dus geen onderdeel van "Volg alles").
  assert.ok(basis.slice(0, 3).every((s) => !s.paid))
  assert.ok(basis.slice(3).every((s) => s.paid))
  assert.equal(new Set(basis.map((s) => s.id)).size, basis.length, 'elke bron één keer')
  // Een krant die er niet is (of al in het gratis begin zit) valt weg, de rest blijft in volgorde.
  assert.deepEqual(basisSources(catalog.filter((s) => s.id !== 'trouw')).map((s) => s.id).slice(3), ['volkskrant', 'nrc', 'parool', 'ad', 'telegraaf'])
  // De andere Nederlandse titels blijven onder Meer bronnen.
  assert.ok(!basis.some((s) => ['nd', 'ftm'].includes(s.id)))
})

test('elke bron één keer op de stap: de vier nieuwe kranten staan in de Basis, niet ook onder Meer bronnen of in een blok', () => {
  const vier = ['trouw', 'parool', 'ad', 'telegraaf']
  const interests = INTERESTS.map((i) => i.id)
  for (const chosen of [[], ['tech'], interests]) {
    const ids = [
      ...basisSources(catalog).map((s) => s.id),
      ...interestBlocks(catalog, chosen).flatMap((b) => b.sources.map((s) => s.id)),
      ...moreGroups(catalog, chosen).flatMap((g) => g.sources.map((s) => s.id)),
    ]
    for (const id of vier) assert.equal(ids.filter((x) => x === id).length, 1, `${id} (${chosen.length} interesses)`)
    assert.equal(ids.filter((x) => x === 'volkskrant').length, 1)
    assert.equal(ids.filter((x) => x === 'nrc').length, 1)
  }
  const more = moreGroups(catalog, []).flatMap((g) => g.sources.map((s) => s.id))
  assert.ok(vier.every((id) => !more.includes(id)))
  assert.ok(more.includes('nd') && more.includes('ftm'))
})

test('per gekozen interesse een blok, in vaste volgorde, met de nichebronnen en een gratis aanrader voorop', () => {
  const blocks = interestBlocks(catalog, ['wetenschap', 'tech', 'cultuur'])
  assert.deepEqual(blocks.map((b) => b.id), ['tech', 'wetenschap', 'cultuur'])
  const of = (id) => blocks.find((b) => b.id === id).sources.map((s) => s.id)
  // De kleine en vakbronnen staan bij hun interesse, niet verstopt.
  for (const id of ['quanta', 'carbonbrief', 'nature']) assert.ok(of('wetenschap').includes(id), id)
  for (const id of ['tweakers', 'ars', 'ign', 'polygon']) assert.ok(of('tech').includes(id), id)
  for (const id of ['3voor12', 'quietus', 'variety']) assert.ok(of('cultuur').includes(id), id)
  // De gratis aanrader staat voorop en is gratis; Nederlands gaat voor.
  for (const b of blocks) {
    assert.equal(b.sources[0].id, b.pick)
    assert.ok(!byId.get(b.pick).paid, b.id)
  }
  assert.equal(blocks.find((b) => b.id === 'tech').pick, 'tweakers')
  assert.equal(blocks.find((b) => b.id === 'cultuur').pick, 'nos-cultuur')
  // Wereld krijgt de internationale bronnen, Politiek die de catalogus aanraadt.
  const wp = interestBlocks(catalog, ['politiek', 'wereld'])
  assert.ok(wp[0].sources.some((s) => s.id === 'politico-eu'))
  assert.ok(wp[1].sources.some((s) => s.id === 'aljazeera'))
  // Geen blok zonder bronnen; de Basis staat nergens nog eens in.
  assert.ok(interestBlocks(catalog, INTERESTS.map((i) => i.id)).every((b) => b.sources.length && b.sources.every((s) => s.cat !== 'nl')))
  assert.equal(freePick([{ id: 'a', name: 'A', paid: true }]), null)
  // Elke bron één keer, in het eerste blok waar hij hoort; en elk blok heeft één aanrader die erin staat.
  const all = interestBlocks(catalog, INTERESTS.map((i) => i.id))
  const ids = all.flatMap((b) => b.sources.map((s) => s.id))
  assert.equal(new Set(ids).size, ids.length, 'geen bron in twee blokken')
  for (const b of all) assert.ok(!b.pick || b.sources.some((s) => s.id === b.pick))
  const picks = all.map((b) => b.pick).filter(Boolean)
  assert.equal(new Set(picks).size, picks.length, 'elke aanrader hoort bij één blok')
})

test('sport alleen als je Sport kiest; de rest ingeklapt onder Meer bronnen, zonder sport', () => {
  assert.ok(!interestBlocks(catalog, ['tech']).some((b) => b.id === 'sport'))
  assert.ok(interestBlocks(catalog, ['sport'])[0].sources.some((s) => s.id === 'vi'))
  const more = moreGroups(catalog, ['tech']).flatMap((g) => g.sources)
  assert.ok(more.every((s) => s.cat !== 'sport'))
  assert.ok(!more.some((s) => s.cat === 'tech' || s.id === 'nos' || s.id === 'nrc'))
  assert.ok(more.some((s) => s.id === 'vrt') && more.some((s) => s.id === 'nd'))
  // Niets gekozen: de Basis en de rest ingeklapt; elke niet-sportbron is ergens te vinden.
  const shown = new Set([...basisSources(catalog), ...moreGroups(catalog, []).flatMap((g) => g.sources)].map((s) => s.id))
  assert.ok(catalog.filter((s) => s.cat !== 'sport').every((s) => shown.has(s.id)))
})

test('Later kiezen bij de interesses: de Stroom toont alle hoofdrubrieken (niets gekozen = alles)', () => {
  const p = applyWelcome({}, { interests: [], topics: [], sources: startIds(catalog), all: catalog })
  assert.deepEqual(p.interests, [])
  assert.deepEqual(rubriekRij({ interests: p.interests }).items.map((r) => r.label), ['Alles', ...INTERESTS.map((i) => i.label)])
})

test('zoeken vindt alles, ook sport (zoeken is een keuze)', () => {
  assert.deepEqual(findSources(catalog, 'voetbal international').map((s) => s.id), ['vi'])
  assert.ok(findSources(catalog, 'tweak').some((s) => s.id === 'tweakers'))
  assert.deepEqual(findSources(catalog, 'zzzz'), [])
  assert.deepEqual(findSources(catalog, '  '), [])
})

test('volgen: aan, uit, en de lijst Gevolgd op volgorde van volgen', () => {
  let ids = []
  for (let n = 0; n < 20; n++) ids = toggleFollow(ids, String(n))
  assert.equal(ids.length, 20)
  assert.equal(toggleFollow(ids, '8').length, 19)
  assert.deepEqual(followedSources(catalog, ['tweakers', 'nos', 'bestaatniet']).map((s) => s.id), ['tweakers', 'nos'])
  assert.equal(followedLine(0), 'Nog niets gevolgd')
  assert.equal(followedLine(1), '1 bron gevolgd')
  assert.equal(followedLine(4), '4 bronnen gevolgd')
})

test('het voorbeeld: de nieuwste kop per gevolgde bron, nooit van een andere bron', () => {
  const items = [
    { id: 'a', source: 'nos', kind: 'article', title: 'Oud NOS', publishedAt: '2026-11-04T06:00:00Z' },
    { id: 'b', source: 'nos', kind: 'article', title: 'Nieuw NOS', publishedAt: '2026-11-04T08:00:00Z' },
    { id: 'c', source: 'tweakers', kind: 'article', title: 'Tweakers', publishedAt: '2026-11-04T07:00:00Z' },
    { id: 'd', source: 'vi', kind: 'article', title: 'Sport', publishedAt: '2026-11-04T09:00:00Z' },
    { id: 'e', source: 'tweakers', kind: 'post', title: 'Post', publishedAt: '2026-11-04T10:00:00Z' },
  ]
  assert.deepEqual(previewLines(items, catalog, ['nos', 'tweakers']).map((l) => l.title), ['Nieuw NOS', 'Tweakers'])
  assert.equal(previewLines(items, catalog, ['nos'])[0].source.name, 'NOS')
  // Nog niets gevolgd: het gratis begin, dus geen sport.
  assert.deepEqual(previewLines(items, catalog, []).map((l) => l.id), ['b'])
  assert.equal(previewLines(items, catalog, ['nos', 'tweakers'], 1).length, 1)
})

test('opslaan gebruikt bestaande voorkeuren; een geannuleerd concept wijzigt ze niet', () => {
  const all = [{ id: 'a' }, { id: 't' }, { id: 's' }]
  const original = { onboarded: true, interests: ['tech'], topics: ['ai'], muted: [], vak: ['ux'], saved: ['artikel'] }
  const before = structuredClone(original)
  const applied = applyWelcome(original, { interests: ['tech'], topics: ['ai'], sources: ['t'], all, vak: ['ux', 'design'] })
  assert.deepEqual(original, before)
  assert.deepEqual(applied.saved, ['artikel'])
  assert.deepEqual(applied.vak, ['ux', 'design'])
  assert.ok(applied.muted.includes('a'))
  assert.ok(!applied.muted.includes('t'))
})

test('web en app: hetzelfde gratis begin en dezelfde schermen', () => {
  const swift = readFileSync(new URL('../ios/Hoot/Views/WelcomeView.swift', import.meta.url), 'utf8')
  const web = readFileSync(new URL('../src/views/Welcome.jsx', import.meta.url), 'utf8')
  for (const text of ['Zo werkt Hoot', 'Volg je bronnen', 'Wat interesseert je?', 'Basis', 'Volg alles', 'Meer bronnen', 'Gratis aanrader', 'Voor jou', 'Liever meteen lezen', 'Kies je interesses', 'Naar je Editie', 'Zo ziet je Editie eruit', 'Kies onderwerpen voor je Selectie']) {
    assert.ok(web.includes(text), `web: ${text}`)
    assert.ok(swift.includes(text), `app: ${text}`)
  }
  for (const gone of ['Later kiezen']) {
    assert.ok(!web.includes(`>${gone}<`) && !new RegExp(`>\\s*${gone}\\s*<`).test(web), `web: ${gone} is weg`)
    assert.ok(!swift.includes(`"${gone}"`), `app: ${gone} is weg`)
  }
  assert.match(swift, /freeStart = \["nos", "nu", "rtl"\]/)
  assert.match(swift, /basisKranten = \["volkskrant", "nrc", "trouw", "parool", "ad", "telegraaf"\]/)
  assert.deepEqual(BASIS_KRANTEN, ['volkskrant', 'nrc', 'trouw', 'parool', 'ad', 'telegraaf'])
  // De oude route is weg: geen Wat precies?, geen seintje-stap, geen veegpagina's.
  for (const old of ['Wat precies?', 'Stel je Hoot samen', 'Veeg verder', 'Een seintje?', 'Kies minstens één', 'Om te beginnen · gratis', 'sportbronnen']) {
    assert.ok(!web.includes(old), `web: ${old}`)
    assert.ok(!swift.includes(old), `app: ${old}`)
  }
})

test('volgorde: eerst de interesses, dan de bronnen (web en app)', () => {
  const swift = readFileSync(new URL('../ios/Hoot/Views/WelcomeView.swift', import.meta.url), 'utf8')
  const web = readFileSync(new URL('../src/views/Welcome.jsx', import.meta.url), 'utf8')
  // Uitleg → interesses → bronnen → Editie; opnieuw kiezen begint bij de interesses.
  assert.match(web, /onClick=\{\(\) => show\('interesses'\)\}>\s*Kies je interesses/)
  assert.match(web, /onClick=\{\(\) => show\('bronnen'\)\}>\s*Verder/)
  assert.match(web, /useState\(reopen \? 'interesses' : 'intro'\)/)
  assert.match(swift, /ctaButton\("Kies je interesses"[^\n]*go\(\.interesses\)/)
  assert.match(swift, /ctaButton\("Verder"[^\n]*go\(\.bronnen\)/)
  assert.match(swift, /reopen \? \.interesses : start/)
  // Geen rood in de bronnenlijst: Gratis staat in inkt.
  assert.doesNotMatch(web, /ob__free/)
  assert.doesNotMatch(swift, /Theme\.accent : Theme\.ink\)/)
})
