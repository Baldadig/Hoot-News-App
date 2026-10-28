import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildStories } from '../netlify/lib/stories.mjs'

// Echte berichten van 22-10 waar het bundelen te los was (review L9).
const items = JSON.parse(readFileSync(new URL('./fixtures/clustering-2210.json', import.meta.url), 'utf8'))
const stories = buildStories(items)
const byTitle = (re) => items.find((i) => re.test(i.title)).id
const storyOf = (re) => stories.find((s) => s.itemIds.includes(byTitle(re)))?.id || null
const together = (a, b) => storyOf(a) !== null && storyOf(a) === storyOf(b)

test('Trump-rally (Volkskrant) en Macron over rellen in Frankrijk zijn twee verhalen', () => {
  assert.ok(together(/^Voor- en tegenstanders van Trump op de vuist/, /Klappen uitgedeeld tijdens rally/))
  assert.ok(together(/^Voor- en tegenstanders van Trump op de vuist/, /Rally Trump meermaals/))
  assert.ok(!together(/^Voor- en tegenstanders van Trump op de vuist/, /Macron accuses/))
  // Het liveblog van De Morgen volgt een heel onderwerp en hoort in geen enkel verhaal.
  assert.equal(storyOf(/^▶ Live/), null)
  // "Donald" en "Benjamin" zijn voornamen van leiders, geen eigen namen die een verhaal dragen.
  assert.ok(!together(/Macron accuses/, /Israeli elections/))
})

test('de haai in Zuid-Korea is geen verhaal over Noord-Korea', () => {
  assert.ok(together(/Haai die uitgroeide/, /Haai die na maand/))
  assert.ok(!together(/Haai die uitgroeide/, /propaganda-luidsprekers/))
  assert.ok(!together(/Haai die uitgroeide/, /Kim Jong-un gaat shoppen/))
  // Wat wél bij elkaar hoort, blijft bij elkaar.
  assert.ok(together(/propaganda-luidsprekers/, /Spanning Korea/))
})

// Echte berichten van 26-10: twee verkiezingsuitslagen in één nacht (Brazilië en Servië) werden
// één verhaal van 31 bronnen. Koppen als "president erkent nederlaag bij verkiezingen" deelden
// genoeg woorden, en één felicitatie van Von der Leyen hing aan beide.
test('de verkiezingen in Brazilië en Servië zijn twee verhalen', () => {
  const items = JSON.parse(readFileSync(new URL('./fixtures/clustering-2610.json', import.meta.url), 'utf8'))
  const stories = buildStories(items)
  const storyOf = (re) => stories.find((s) => s.itemIds.includes(items.find((i) => re.test(i.title)).id))?.id || null
  const together = (a, b) => storyOf(a) !== null && storyOf(a) === storyOf(b)
  assert.ok(together(/^President Lula wint Braziliaanse verkiezingen/, /^Lula secures surprise win/))
  assert.ok(together(/^Feestnacht in Servië/, /^Aleksandar Vucic Concedes Defeat/))
  assert.ok(!together(/^President Lula wint Braziliaanse verkiezingen/, /^Feestnacht in Servië/))
  assert.ok(!together(/^EU-topvrouw Von der Leyen/, /^EU-leiders feliciteren Servische/))
  for (const st of stories) {
    const titles = st.itemIds.map((id) => items.find((i) => i.id === id).title)
    assert.ok(!(titles.some((t) => /Lula|Bolsonaro|Brazil/i.test(t)) && titles.some((t) => /Servi|Serbia|Vu[cč]i[cć]/i.test(t))), 'een verhaal mengt Brazilië en Servië')
  }
})

// Echte berichten van 28-10: Kane wint de Ballon d'Or, Mbappé ligt onder vuur in China. Een analyse
// van The Guardian over Mbappé noemde terloops de Ballon d'Or; de Kane-stukken noemden Mbappé als
// verliezer. "Kylian", "Mbappé" en "Ballon" golden als drie gedeelde namen, en zo werden het één
// verhaal van 11 bronnen.
test("Kane's Ballon d'Or en Mbappé's rel met China zijn twee verhalen", () => {
  const items = JSON.parse(readFileSync(new URL('./fixtures/clustering-2810.json', import.meta.url), 'utf8'))
  const stories = buildStories(items)
  const storyOf = (re) => stories.find((s) => s.itemIds.includes(items.find((i) => re.test(i.title)).id))?.id || null
  const together = (a, b) => storyOf(a) !== null && storyOf(a) === storyOf(b)
  assert.ok(together(/^Did Harry Kane have to leave England/, /^England and Bayern Munich striker Harry Kane wins/))
  assert.ok(together(/^Mbappé, Real én La Liga diep door het stof/, /^Real Madrid issues apology to China/))
  assert.ok(together(/^Kylian Mbappé’s China crisis/, /^Real Madrid issues apology to China/))
  assert.ok(!together(/^Did Harry Kane have to leave England/, /^Mbappé, Real én La Liga diep door het stof/))
  for (const st of stories) {
    const titles = st.itemIds.map((id) => items.find((i) => i.id === id).title)
    assert.ok(!(titles.some((t) => /\bKane\b/.test(t)) && titles.some((t) => /Mbapp|China|Mao\b/i.test(t))), 'een verhaal mengt Kane en Mbappé')
  }
})
