import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { eindIndex, grensVan, grensIndex, weergaveGrens, vergeetGrenzen, leesGezien, markeerGezien, beoordeel, nieuweStaat, VENSTER, DAG, GEZIEN_KEY, GRENZEN_KEY } from '../src/lib/stroom-einde.js'

// Keuze r5-stroom-einde (5 november), herzien na de melding van Alex (14 november): de Stroom eindigt na
// het laatste bericht dat je in deze weergave nog niet zag. Gezien is echt gezien: alleen door zelf te
// scrollen, nooit door laden of een tab of bron te openen.
const opslag = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }
}
const NU = Date.parse('2026-11-14T17:00:00Z')
const tijd = (min) => NU - min * 60000
const item = (min, extra = {}) => ({ id: 'i' + min, publishedAt: new Date(NU - min * 60000).toISOString(), ...extra })
// Een Stroom met wetenschap en de rest door elkaar.
const stroom = [item(1), item(5, { w: 1 }), item(10), item(20, { w: 1 }), item(30), item(60, { w: 1 }), item(90)]
const wetenschap = stroom.filter((i) => i.w)

test('de melding: laden en wisselen van tab of bron markeert niets', () => {
  const local = opslag(), session = opslag()
  // Eerste bezoek: de Stroom laden (Alles), niets doen.
  const alles = weergaveGrens('hoot:pos-stroom', stroom, { local, session, now: NU })
  assert.equal(grensIndex(stroom, alles), stroom.length, 'niets gezien: de hele Stroom')
  // Tweede bezoek (nieuw tabblad): weer Alles, dan Wetenschap, dan één bron.
  const session2 = opslag()
  assert.equal(grensIndex(stroom, weergaveGrens('hoot:pos-stroom', stroom, { local, session: session2, now: NU })), stroom.length)
  const w = weergaveGrens('hoot:pos-stroom:wetenschap', wetenschap, { local, session: session2, now: NU })
  assert.equal(grensIndex(wetenschap, w), wetenschap.length, 'Wetenschap: alles staat er nog, niet meteen "Je bent bij."')
  const bron = stroom.filter((i) => !i.w)
  assert.equal(grensIndex(bron, weergaveGrens('hoot:pos-stroom:bron=nos', bron, { local, session: session2, now: NU })), bron.length)
  assert.equal(local.getItem(GEZIEN_KEY), null, 'niets als gezien bewaard')
})

test('scrollen voorbij markeert wel; "Je bent bij." alleen als je in die weergave alles zag', () => {
  const local = opslag()
  // In Wetenschap alles echt gezien.
  markeerGezien(wetenschap, { local, now: NU })
  const s = opslag()
  assert.equal(grensIndex(wetenschap, weergaveGrens('w', wetenschap, { local, session: s, now: NU })), 0, 'Wetenschap: meteen "Je bent bij."')
  // Alles toont nog wat je niet zag: tot het laatste ongeziene bericht; wat je zag ertussen blijft staan.
  assert.equal(grensIndex(stroom, weergaveGrens('a', stroom, { local, session: s, now: NU })), stroom.length)
  markeerGezien([item(90)], { local, now: NU })
  assert.equal(eindIndex(stroom, leesGezien({ local, now: NU }), NU), 5, 'na i30 alleen nog gezien')
})

test('zonder eerder bezoek eindigt de Stroom na de laatste 24 uur (r5-stroom-einde)', () => {
  assert.equal(DAG, 24 * 60 * 60 * 1000)
  // De hele Stroom van 36 uur, niets gezien: de lijst houdt op na het laatste bericht van de laatste dag.
  const lang = [item(1), item(60), item(23 * 60), item(25 * 60), item(30 * 60), item(35 * 60)]
  const local = opslag(), session = opslag()
  assert.equal(grensIndex(lang, weergaveGrens('a', lang, { local, session, now: NU })), 3, 'na 23 uur, niet na 35 uur')
  // Een ongezien bericht van 30 uur oud maakt de lijst niet langer.
  const dertig = [item(1), item(30 * 60)]
  assert.equal(eindIndex(dertig, {}, NU), 1)
  assert.deepEqual(grensVan(dertig, {}, NU), { id: 'i1', at: tijd(1), eerder: false })
  // Zag je de laatste dag helemaal, dan meteen "Je bent bij.", ook al staat er ouder ongezien nieuws onder.
  markeerGezien([item(1), item(60), item(23 * 60)], { local, now: NU })
  assert.equal(eindIndex(lang, leesGezien({ local, now: NU }), NU), 0)
  assert.equal(eindIndex([item(30 * 60)], {}, NU), 0, 'alleen ouder dan een dag: meteen "Je bent bij."')
})

test('"Hier was je gebleven" alleen als je onder de grens echt iets zag (tweede keuring)', () => {
  // Verse opslag: onder de grens staat alleen nieuws ouder dan een dag. Daar was je nooit.
  const lang = [item(1), item(60), item(23 * 60), item(25 * 60), item(30 * 60)]
  const local = opslag(), session = opslag()
  const vers = weergaveGrens('w', lang, { local, session, now: NU })
  assert.equal(grensIndex(lang, vers), 3, 'er staat iets onder de grens')
  assert.equal(vers.eerder, false, 'verse opslag: geen "Hier was je gebleven"')
  // Je zag een bericht van de laatste dag, daarna kwam er nieuws bij: onder de grens staat iets dat je zag.
  markeerGezien([item(23 * 60)], { local, now: NU })
  const terug = weergaveGrens('w', lang, { local, session: opslag(), now: NU })
  assert.equal(grensIndex(lang, terug), 2)
  assert.equal(terug.eerder, true, 'wel "Hier was je gebleven"')
  // Vastgelegd bij het vastzetten: verder lezen verandert de keuze niet.
  markeerGezien(lang, { local, now: NU })
  assert.equal(weergaveGrens('w', lang, { local, session, now: NU }).eerder, false)
  // Een oude grens uit deze sessie (van voor deze keuze) heeft geen eerder: dan geen streep.
  const s = readFileSync(new URL('../src/views/Stream.jsx', import.meta.url), 'utf8')
  assert.match(s, /const eerder = !!grens\?\.eerder && bIdx < list\.length/)
  assert.match(s, /\{eerder && older > 0 && index === bIdx && bIdx > 0 \?/, 'ook de streep in de lijst')
})

test('terugkerende lezer: wat je echt zag blijft gezien, tot de 36 uur van de Stroom voorbij zijn', () => {
  const local = opslag()
  markeerGezien([item(10)], { local, now: NU })
  assert.ok(leesGezien({ local, now: NU + 3600e3 })['i10'], 'een uur later nog gezien')
  assert.equal(leesGezien({ local, now: NU + VENSTER })['i10'], undefined, 'ouder dan de Stroom: opgeruimd')
  assert.equal(markeerGezien([item(10)], { local, now: NU }), 0, 'twee keer gezien telt één keer')
})

test('de grens staat vast per weergave: niets beweegt terwijl je leest', () => {
  const local = opslag(), session = opslag()
  const g = weergaveGrens('a', stroom, { local, session, now: NU })
  markeerGezien(stroom, { local, now: NU }) // je leest alles
  assert.deepEqual(weergaveGrens('a', stroom, { local, session, now: NU }), g, 'in deze sessie dezelfde grens')
  // Er komen berichten bij: de grens hangt aan het bericht, niet aan de plek.
  const meer = [item(0), ...stroom]
  assert.equal(grensIndex(meer, g), meer.length)
  // "N nieuwe berichten": opnieuw bepalen.
  vergeetGrenzen({ session })
  assert.equal(session.getItem(GRENZEN_KEY), null)
  assert.equal(grensIndex(stroom, weergaveGrens('a', stroom, { local, session, now: NU })), 0)
  assert.deepEqual(grensVan([], {}), { id: null, at: null, eerder: false })
})

test('de oude grens (één tijd, gezet bij het laden) wordt opgeruimd', () => {
  const local = opslag(), session = opslag()
  local.setItem('hoot:stroom-bij', JSON.stringify({ at: NU }))
  session.setItem('hoot:stroom-grens', JSON.stringify({ at: NU, eerder: true }))
  const g = weergaveGrens('a', stroom, { local, session, now: NU })
  assert.equal(grensIndex(stroom, g), stroom.length, 'de oude tijd telt niet als gezien')
  assert.equal(local.getItem('hoot:stroom-bij'), null)
  assert.equal(session.getItem('hoot:stroom-grens'), null)
})

test('beoordeel: voorbij scrollen of even helemaal in beeld, maar alleen na zelf scrollen', () => {
  const staat = nieuweStaat()
  const rij = (id, top, h = 100) => ({ id, top, bottom: top + h })
  const rand = { boven: 0, onder: 800 }
  // Laden: alles in beeld, lang genoeg, maar je scrolde niet.
  assert.deepEqual(beoordeel([rij('a', 0), rij('b', 100)], { ...rand, now: 0, gescrold: false, staat }), [])
  assert.deepEqual(beoordeel([rij('a', 0), rij('b', 100)], { ...rand, now: 5000, gescrold: false, staat }), [], 'blijven staan zonder scrollen telt niet')
  // Je scrolt: wat al die tijd helemaal in beeld stond, heb je gezien.
  assert.deepEqual(beoordeel([rij('a', -20), rij('b', 80), rij('c', 700, 200)], { ...rand, now: 5100, gescrold: true, staat }), ['b'])
  // a ging half uit beeld en nu helemaal voorbij: gezien. c kwam tijdens het scrollen helemaal in beeld
  // (boven- en onderkant gezien): ook gezien.
  assert.deepEqual(beoordeel([rij('a', -120), rij('c', 500, 200)], { ...rand, now: 5200, gescrold: true, staat }), ['a', 'c'])
  // Hoger dan het scherm: eerst de bovenkant, later de onderkant in beeld. Dan ben je er doorheen.
  assert.deepEqual(beoordeel([rij('t', 600, 1200)], { ...rand, now: 9000, gescrold: true, staat }), [])
  assert.deepEqual(beoordeel([rij('t', -600, 1200)], { ...rand, now: 9100, gescrold: true, staat }), ['t'])
  // Een bericht dat nooit in beeld was (een herstelde leespositie sprong eroverheen), telt niet als voorbij.
  assert.deepEqual(beoordeel([rij('x', -500)], { ...rand, now: 9000, gescrold: true, staat }), [])
})

test('Stream.jsx: geen automatisch bijladen voorbij de grens; einde met knop; gezien alleen door scrollen', () => {
  const s = readFileSync(new URL('../src/views/Stream.jsx', import.meta.url), 'utf8')
  assert.match(s, /Ouder nieuws tonen/)
  assert.match(s, /Hier was je gebleven/)
  assert.match(s, /className="listend stroomeinde__zin">Je bent bij\./)
  assert.match(s, /const cap = Math\.min\(list\.length, bIdx \+ older\)/)
  assert.match(s, /list\.slice\(0, Math\.min\(limit, cap\)\)/)
  assert.match(s, /\[shown\.length < cap\]\)/)
  assert.match(s, /weergaveGrens\(posKey, list\)/, 'een grens per weergave')
  assert.match(s, /volgGezien\(/, 'gezien komt van scrollen')
  assert.doesNotMatch(s, /bezoekGrens|gezien\(newest\)/, 'laden markeert niets meer')
  assert.match(readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8'), /import '\.\/styles\/stroom-einde\.css'/)
})
