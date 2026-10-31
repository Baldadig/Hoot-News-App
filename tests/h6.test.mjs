// H6: sameEvent gericht uitgebreid (Hoot-design/algoritme/aanvulling-pariteit-herhaling.md §2 H6, §3),
// op de echte berichten van 30 oktober 2026 (tests/fixtures/clustering-3010.json: momentopname van
// 19:00Z plus de live-momentopname van 21:30Z). De uitgebreide stand (`extended`) is wat de server
// bundelt (build.mjs); de gewone stand blijft byte-gelijk aan vroeger (meetlat.test.mjs). Elke regel
// heeft een eigen positieve fixture, en de negatieve fixtures van §2 zijn verplicht: Intel-koersval vs
// Intel-fabrieksexplosie, "Trump ignored intel", Mbappé-opinies, voetbal-liveblogs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildStories, isLive } from '../netlify/lib/stories.mjs'

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
