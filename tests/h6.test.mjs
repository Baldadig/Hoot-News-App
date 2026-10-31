// H6: sameEvent gericht uitgebreid (Hoot-design/algoritme/aanvulling-pariteit-herhaling.md §2 H6, §3),
// op de echte berichten van 30 oktober 2026 (tests/fixtures/clustering-3010.json: momentopname van
// 19:00Z plus de live-momentopname van 21:30Z). De uitgebreide stand (`extended`) is wat de server
// bundelt (build.mjs); de gewone stand blijft byte-gelijk aan vroeger (meetlat.test.mjs). Elke regel
// heeft een eigen positieve fixture, en de negatieve fixtures van §2 zijn verplicht: Intel-koersval vs
// Intel-fabrieksexplosie, "Trump ignored intel", Mbappé-opinies, voetbal-liveblogs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildStories, isLive, signatures, sameEvent } from '../netlify/lib/stories.mjs'

const items = JSON.parse(readFileSync(new URL('./fixtures/clustering-3010.json', import.meta.url), 'utf8'))
const stories = buildStories(items, {}, { extended: true })
const byTitle = (re) => {
  const it = items.find((i) => re.test(i.title))
  assert.ok(it, `fixture mist ${re}`)
  return it.id
}
const storyOf = (re) => stories.find((s) => s.itemIds.includes(byTitle(re)))?.id || null
const together = (a, b) => storyOf(a) !== null && storyOf(a) === storyOf(b)
const titlesOf = (st) => st.itemIds.map((id) => items.find((i) => i.id === id).title)

test('H6 (i): Apple haalt Nvidia in — dezelfde gebeurtenis in het Nederlands en het Engels, twee namen in de kop, geen gebeurtenis-woord', () => {
  assert.ok(together(/^Apple haalt Nvidia in/, /^Apple Overtakes Nvidia/))
  // Het spionageverhaal rond de Nvidia-ceo (zes bronnen) is een andere gebeurtenis met dezelfde naam.
  assert.ok(!together(/^Apple haalt Nvidia in/, /^CEO van chipreus Nvidia/))
  assert.ok(!together(/^Apple haalt Nvidia in/, /^China denies allegations of spy operation targeting Nvidia/))
})

test('H6 (ii): de NYT-necrologie zonder sterfwoord hoort bij het verhaal over de dood van Patrick Stewart', () => {
  const st = stories.find((s) => s.itemIds.includes(byTitle(/^Bedroefde reacties om dood Patrick Stewart/)))
  assert.ok(st.sourceCount >= 6, `${st.sourceCount} bronnen`)
  assert.ok(st.itemIds.includes(byTitle(/^Patrick Stewart Was Regal, Stately and Quite Hilarious/)))
  // Wat er al bij hoorde, hoort er nog bij.
  for (const re of [/^Van bescheiden komaf tot wereldster/, /^As Picard on ‘Star Trek’/, /^Buckingham Palace Honors Patrick Stewart/, /^Patrick Stewart dies: how Captain Picard/]) assert.ok(st.itemIds.includes(byTitle(re)), String(re))
  // En niets anders: geen Star Wars, geen ander overlijden.
  assert.ok(titlesOf(st).every((t) => /Stewart|Picard|Star Trek|No Man Has Gone/.test(t)), titlesOf(st).join(' | '))
})

test('H6 (iii)+(iv): het Poolse Grondwettelijk Hof — Pools/Poolse/Poland, Grondwettelijk/Constitutioneel Hof/top court en "Hof" van drie letters zijn één verhaal', () => {
  const pairs = [/^Politie opgesteld rond Pools Grondwettelijk Hof/, /^Voorzitter Pools Grondwettelijk Hof geschorst, politie opgesteld/, /^Constitutionele crisis in Polen/, /^Onrust in Warschau/, /^Police deployed during stand-off over control of Poland/, /^Tusk-Nawrocki battle escalates/]
  for (const re of pairs) assert.ok(together(/^Spanningen rond Pools Constitutioneel Hof/, re), String(re))
  const st = stories.find((s) => s.itemIds.includes(byTitle(/^Spanningen rond Pools Constitutioneel Hof/)))
  assert.ok(st.sourceCount >= 8, `${st.sourceCount} bronnen (vóór H6: drie verhalen van 2, 2 en 7)`)
  // Een Poolse spionagezaak of een Poolse politieagent is niet hetzelfde als het Hof: "Polen" is zwak.
  assert.ok(titlesOf(st).every((t) => /Hof|court|Polen|Warschau|Nawrocki/i.test(t)), titlesOf(st).join(' | '))
})

test('H6 (iii): Olesjky en Oleshky zijn dezelfde stad, de Communistische Partij en de Communist party dezelfde partij', () => {
  assert.ok(together(/^Zeldzaam: Oekraïne en Rusland werken samen aan evacuatie frontstadje Olesjky/, /^Hundreds evacuated from Russian-occupied Oleshky/))
  assert.ok(together(/^Humanitaire operatie in Olesjky/, /^Ukraine: Oleshky residents evacuate/))
  const oles = stories.find((s) => s.itemIds.includes(byTitle(/^Hundreds evacuated from Russian-occupied Oleshky/)))
  assert.ok(oles.sourceCount >= 8, `${oles.sourceCount} bronnen (vóór H6: 5 Engels en 2 Nederlands, apart)`)
  assert.ok(together(/^Recordaantal lege stoelen bij bijeenkomst CCP/, /^China expels a record number from Communist party/))
})

test('H6 negatief: de Intel-koersval en de dodelijke explosie bij Fab 28 blijven twee gebeurtenissen', () => {
  assert.equal(storyOf(/^Dodelijke explosie bij Fab 28/), null, 'de explosie (één bron) hoort bij geen koersverhaal')
  for (const re of [/^Chipfabrikant Intel keldert/, /^Intel en Amazon diep in het rood/, /^Intel Plunges 29%/, /^Zware domper bij Intel/]) assert.ok(!together(re, /^Dodelijke explosie bij Fab 28/), String(re))
  // Wél samen: de Nederlandse koersberichten en de Amerikaanse marktbrede ("Nasdaq 100 Slumps").
  assert.ok(together(/^Chipfabrikant Intel keldert/, /^Intel en Amazon diep in het rood/))
  assert.ok(together(/^Chipfabrikant Intel keldert/, /^Nasdaq 100 Slumps/))
})

test('H6 negatief: "Trump ignored intel" is geen Intel — het hoort bij het spionageverhaal rond de Nvidia-ceo', () => {
  assert.ok(together(/^Trump ignored intel on China/, /^CEO van chipreus Nvidia/))
  for (const re of [/^Chipfabrikant Intel keldert/, /^Intel Plunges 29%/, /^Dodelijke explosie bij Fab 28/, /^Apple haalt Nvidia in/]) assert.ok(!together(/^Trump ignored intel on China/, re), String(re))
})

test('H6 negatief: de Mbappé-opinies horen niet bij het verhaal over de Ballon d’Or-uitslag', () => {
  const kane = stories.find((s) => s.itemIds.includes(byTitle(/^Puntenverdeling Gouden Bal bekend/)))
  assert.ok(kane.sourceCount >= 6)
  assert.ok(kane.itemIds.includes(byTitle(/^Harry Kane won Ballon d'Or met slechts 28 punten/)))
  // Een column (opinie) en de meme-maker: dezelfde voetballer, een andere gebeurtenis (de rel in China).
  assert.equal(storyOf(/^Rob Hoogland: wat jammer dat Kylian Mbappé/), null)
  assert.equal(storyOf(/^Maker van Mao-meme die Kylian Mbappé/), null)
  assert.ok(!titlesOf(kane).some((t) => /Mao|China|Hoogland/.test(t)))
})

test('H6 negatief: voetbal-liveblogs staan in geen enkel verhaal', () => {
  const live = items.filter(isLive)
  assert.ok(live.length >= 4, `${live.length} liveblogs in de fixture`)
  for (const i of live) assert.ok(!stories.some((s) => s.itemIds.includes(i.id)), i.title)
})

// De bestaande fixtures mogen in de uitgebreide stand niet verslechteren: evenveel verhalen, dezelfde
// grootste bundel, en de bekende goede en foute paren blijven zoals ze waren (clustering.test.mjs toetst
// ze in de gewone stand).
test('H6: de fixtures van 22-10, 26-10, 28-10 en 29-10 bundelen in de uitgebreide stand niet anders', () => {
  for (const f of ['2210', '2610', '2810', '2910']) {
    const its = JSON.parse(readFileSync(new URL(`./fixtures/clustering-${f}.json`, import.meta.url), 'utf8'))
    const oud = buildStories(its)
    const nieuw = buildStories(its, {}, { extended: true })
    assert.equal(nieuw.length, oud.length, `${f}: aantal verhalen`)
    assert.equal(Math.max(0, ...nieuw.map((s) => s.sourceCount)), Math.max(0, ...oud.map((s) => s.sourceCount)), `${f}: grootste bundel`)
    assert.deepEqual(nieuw.map((s) => [...s.itemIds].sort()).sort(), oud.map((s) => [...s.itemIds].sort()).sort(), `${f}: dezelfde bundels`)
  }
})

// Keuring H6 (iii)/(iv): een instituut is een naam zonder land, en "Hof" los is geen naam. Synthetische
// paren naast de fixture: de uitgebreide stand mag hier niets samenvoegen wat de gewone stand ook los
// laat; het Poolse Hof (met gedeeld land) en het Amerikaanse Hooggerechtshof (één land, één hof) blijven
// wél één gebeurtenis in twee talen.
const NOW = Date.parse('2026-10-30T11:00:00Z')
const art = (id, source, title, summary, h = 0) => ({ id, kind: 'article', source, sourceName: source, title, summary, publishedAt: new Date(NOW - 36e5 * h).toISOString() })
const paar = (a, b) => {
  const ext = signatures([a, b], [], { extended: true })
  const oud = signatures([a, b])
  return { ext: sameEvent(ext.get(a.id), ext.get(b.id), true), oud: sameEvent(oud.get(a.id), oud.get(b.id)), sig: ext }
}

test('H6 (iii) negatief: twee hoogste rechtbanken in twee landen over een kieswet zijn twee gebeurtenissen', () => {
  const a = art('il', 'guardian', 'Israel’s top court blocks election law', 'The court in Jerusalem said the law passed by the Knesset violates the constitution. Israel heads to the polls in March.')
  const b = art('br', 'nyt', 'Brazil’s top court upholds election result', 'The court in Brasília rejected a challenge by the opposition. Brazil voted on Sunday.', 1)
  const r = paar(a, b)
  assert.ok(r.sig.get('il').strong.has('constitutionalcourt') && r.sig.get('br').strong.has('constitutionalcourt'), 'beide koppen dragen het instituut')
  assert.equal(r.ext, false)
  assert.equal(r.oud, false)
})

test('H6 (iii) negatief: het Georgia Supreme Court en het Pennsylvania Supreme Court over kiesregels zijn twee rechtbanken, ook al liggen beide in de VS', () => {
  const a = art('ga', 'nyt', 'Georgia Supreme Court Upholds New Voting Rules Before Midterms', 'The Georgia Supreme Court ruled that the state may enforce the new election rules in November, days before the U.S. midterms.')
  const b = art('pa', 'politico', 'Pennsylvania Supreme Court strikes down mail ballot deadline', 'The Pennsylvania Supreme Court said the election rule violates the state constitution ahead of the U.S. midterms.', 1)
  const r = paar(a, b)
  assert.ok(r.sig.get('ga').weak.has('us') && r.sig.get('pa').weak.has('us'), 'beide noemen de VS')
  assert.equal(r.ext, false)
})

test('H6 (iv) negatief: "Hof" los is geen naam — het hof in Den Haag en het hof in Arnhem zijn twee rechtbanken', () => {
  const a = art('dh', 'nos', 'Hof in Den Haag veroordeelt man voor moord', 'Het hof in Den Haag heeft de man veroordeeld tot twintig jaar cel voor de moord op zijn buurman. Het Hof volgde de eis.')
  const b = art('ar', 'nu', 'Hof Arnhem spreekt verdachte vrij van moord', 'Het hof in Arnhem vindt het bewijs voor de moord onvoldoende, zei de voorzitter van het Hof.', 1)
  const r = paar(a, b)
  assert.ok(!r.sig.get('dh').strong.has('hof') && !r.sig.get('ar').strong.has('hof'))
  assert.equal(r.ext, false)
  assert.equal(r.oud, false)
})

test('H6 (iii) positief: het instituut telt mét een gedeeld land — het Poolse Hof zonder stad, en het Amerikaanse Hooggerechtshof, in twee talen', () => {
  const pl = paar(art('p1', 'nos', 'Constitutionele crisis in Polen: voorzitter Grondwettelijk Hof geschorst', 'De politieke crisis in Polen rond het Grondwettelijk Hof blijft verder escaleren.'), art('p2', 'bbc', 'Poland’s top court president suspended as crisis deepens', 'The constitutional court in Poland is at the centre of a political crisis.', 1))
  assert.equal(pl.ext, true)
  assert.equal(pl.oud, false)
  const us = paar(art('u1', 'nrc', 'Hooggerechtshof buigt zich over de heffingen van Trump', 'Het Amerikaanse Hooggerechtshof behandelt de zaak over de importheffingen van president Trump.'), art('u2', 'nyt', 'Supreme Court Hears Challenge to Trump’s Tariffs', 'The Supreme Court heard arguments over President Trump’s tariffs on Wednesday.', 1))
  assert.equal(us.ext, true)
  assert.equal(us.oud, false)
})
