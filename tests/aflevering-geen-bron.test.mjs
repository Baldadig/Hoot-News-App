// Luister verder, stap 1 (besluit Alex 14 november 2026): een aflevering is geen bron meer.
// Een podcast-, audio- of video-aflevering (shared/aflevering.mjs) telt niet mee in coverageOf, sourceCount, "N bronnen",
// de drempels voor groot nieuws en "Waar iedereen over schrijft", en is nooit de kop van een verhaal als er een bericht is.
// Echte stukken: het Nvidia-verhaal van 14 november (middag) uit de live feed, met zes afleveringen van vier uitgevers
// erin (De Telegraaf /podcast/, Bloomberg Odd Lots en twee video's, Vox /podcasts/, een NYT-video).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { afleveringSoort, isAflevering } from '../shared/aflevering.mjs'
import { coverageOf, majorNews, publishersOf, countsAsSource } from '../shared/edition-policy.mjs'
import { buildStories, widelyCovered, leadCandidates } from '../netlify/lib/stories.mjs'
import { whyOf } from '../shared/editor.mjs'

const FIX = JSON.parse(readFileSync(new URL('./fixtures/aflevering-nvidia-2026-11-14.json', import.meta.url), 'utf8'))
const OPTS = { mainIds: new Set(['nos', 'nrc', 'volkskrant']), keys: true, extended: true }

test('herkenning: alleen wat de uitgever zelf zegt (feed, rubriek, programmalabel), nooit een woord in de slug of de kop', () => {
  const echt = [
    [{ source: 'telegraaf', title: '‘Nvidia-affaire kan in Trumps gezicht ontploffen’', feedMark: 'podcast', url: 'https://www.telegraaf.nl/podcast/nvidia-affaire-kan-in-trumps-gezicht-ontploffen/164538911.html' }, 'podcast'],
    [{ source: 'bloomberg', title: 'Odd Lots: Wall Street and the Post-Huang Nvidia Era (Podcast)', url: 'https://www.bloomberg.com/news/audio/2026-11-14/odd-lots-wall-street-and-the-post-huang-nvidia-era-podcast' }, 'podcast'],
    [{ source: 'vox', title: 'Jensen Huang is out. What now?', url: 'https://www.vox.com/podcasts/510560/jensen-huang-nvidia-ceo-china-spying-ai-national-security' }, 'podcast'],
    [{ source: 'economist', title: 'Invidious position: finding Jensen Huang’s successor', url: 'https://www.economist.com/podcasts/2026/11/13/invidious-position-finding-jensen-huangs-successor' }, 'podcast'],
    [{ source: 'nyt', title: 'What’s Behind the Trump-Huang Relationship?', url: 'https://www.nytimes.com/video/us/politics/100000011272223/whats-behind-the-trump-huang-relationship.html' }, 'video'],
    [{ source: 'bbc', title: 'Watch: Cruise ship overturns after collision with tanker in New Orleans', url: 'https://www.bbc.co.uk/news/videos/ck4gn4y77m40o' }, 'video'],
    [{ source: 'nu', title: 'Video | Zo werd Gijs Naber als nieuwe Sinterklaas geïntroduceerd', url: 'https://www.nu.nl/332280/video/zo-werd-gijs-naber.html' }, 'video'],
    [{ source: 'nos', title: 'Energie uitgelegd', podcastEpisode: '3', url: 'https://nos.nl/l/1' }, 'podcast'],
    [{ source: 'nos', title: 'De Dag', mediaType: 'audio/mpeg', summary: '', url: 'https://nos.nl/l/2' }, 'podcast'],
  ]
  for (const [it, soort] of echt) assert.equal(afleveringSoort({ kind: 'article', ...it }), soort, it.title)
  const geen = [
    // Een woord in de slug of de kop is geen rubriek of label.
    { source: 'nrc', title: 'Podcastmaker wint prijs voor beste video', url: 'https://www.nrc.nl/nieuws/2026/11/14/podcast-video-prijs-a123/' },
    { source: 'nyt', title: 'The podcast boom is over', url: 'https://www.nytimes.com/2026/11/12/business/media/podcast-boom.html' },
    // Een nieuwsbericht met een voorleesversie (audio-enclosure met een eigen intro) blijft een bericht.
    { source: 'nos', title: 'Kabinet valt', mediaType: 'audio/mpeg', summary: 'Het kabinet is gevallen na een conflict over het Belastingplan in de Tweede Kamer.', url: 'https://nos.nl/artikel/2590001-kabinet-valt' },
    // …/2026/11/podcasts/684400/: na een datum is het slug, geen rubriek (zelfde regel als de Editie).
    { source: 'tweakers', title: 'Nieuwe chip', url: 'https://tweakers.net/nieuws/2026/11/podcasts/684400/nieuwe-chip.html' },
    { kind: 'post', source: 'bsky:x', title: 'Podcast: luister nu', url: 'https://bsky.app/x' },
  ]
  for (const it of geen) assert.equal(isAflevering({ kind: 'article', ...it }), false, it.title)
})

test('coverageOf en groot nieuws: een aflevering telt niet als uitgever', () => {
  const nieuws = [{ source: 'nos', title: 'a', url: 'https://nos.nl/artikel/1-a' }, { source: 'nrc', title: 'b', url: 'https://www.nrc.nl/nieuws/2026/11/14/b' }]
  const afl = [
    { source: 'telegraaf', title: 'c', feedMark: 'podcast', url: 'https://www.telegraaf.nl/podcast/c/1.html' },
    { source: 'vox', title: 'd', url: 'https://www.vox.com/podcasts/1/d' },
    { source: 'economist', title: 'e', url: 'https://www.economist.com/podcasts/2026/11/13/e' },
    { source: 'bloomberg', title: 'f (Podcast)', url: 'https://www.bloomberg.com/news/audio/2026-11-14/f' },
    { source: 'volkskrant', title: 'g', feedMark: 'video', url: 'https://www.volkskrant.nl/video/g' },
  ]
  assert.deepEqual(coverageOf([...nieuws, ...afl]), coverageOf(nieuws))
  assert.equal(coverageOf(afl).publisherCount, 0)
  assert.equal(majorNews({}, [...nieuws, ...afl]), majorNews({}, nieuws))
  assert.equal(publishersOf({}, [...nieuws, ...afl]), 2)
})

test('het Nvidia-verhaal: de afleveringen blijven lid, maar tellen niet in sourceCount, publisherCount of de bronnamen', () => {
  const afl = FIX.items.filter(isAflevering)
  assert.deepEqual([...new Set(afl.map((i) => i.source))].sort(), ['bloomberg', 'nyt', 'telegraaf', 'vox'])
  const [st] = buildStories(FIX.items, {}, OPTS).sort((a, b) => b.itemIds.length - a.itemIds.length)
  // Ze blijven lid (Vergelijken): van alle vier de uitgevers hangt er een aflevering aan het verhaal.
  assert.deepEqual([...new Set(afl.filter((i) => st.itemIds.includes(i.id)).map((i) => i.source))].sort(), ['bloomberg', 'nyt', 'telegraaf', 'vox'])
  // Geteld: geen aflevering en geen opinieblad (die hangt als lid aan het verhaal, shared/opinie.mjs).
  const counted = FIX.items.filter((i) => st.itemIds.includes(i.id) && countsAsSource(i))
  assert.equal(st.sourceCount, new Set(counted.map((i) => i.source)).size)
  assert.equal(st.publisherCount, coverageOf(counted).publisherCount)
  // Telegraaf, NYT en Bloomberg brengen het ook als bericht en blijven bron; Vox bracht alleen een aflevering.
  assert.ok(!st.sourceNames.includes('Vox'))
  assert.ok(st.sourceCount < FIX.story.sourceCount, `${st.sourceCount} < ${FIX.story.sourceCount}`)
  assert.ok(!isAflevering(FIX.items.find((i) => i.id === st.leadId)))
  // "N bronnen" in de waarom-regel volgt het verhaal.
  assert.match(whyOf({ desk: 'breed', big: true }, { sourceCount: st.sourceCount }).text, new RegExp(`· ${st.sourceCount} bronnen$`))
})

test('een verhaal van één bericht en afleveringen van andere uitgevers is geen verhaal', () => {
  const t = '2026-11-14T10:00:00.000Z'
  const items = [
    { id: 'a', kind: 'article', source: 'nos', sourceName: 'NOS', title: 'Jensen Huang stapt op als topman van Nvidia', summary: 'Jensen Huang stapt op als topman van Nvidia na een affaire.', url: 'https://nos.nl/artikel/1-huang', publishedAt: t },
    { id: 'b', kind: 'article', source: 'vox', sourceName: 'Vox', title: 'Jensen Huang stapt op als topman van Nvidia', summary: 'Jensen Huang stapt op als topman van Nvidia, wat nu?', url: 'https://www.vox.com/podcasts/1/huang', publishedAt: t },
    { id: 'c', kind: 'article', source: 'telegraaf', sourceName: 'De Telegraaf', title: 'Jensen Huang stapt op als topman van Nvidia', summary: 'Jensen Huang stapt op als topman van Nvidia, de podcast.', feedMark: 'podcast', url: 'https://www.telegraaf.nl/podcast/huang/1.html', publishedAt: t },
  ]
  assert.equal(buildStories(items, {}, OPTS).length, 0)
  // Met een tweede bericht wel, en dan telt het twee bronnen.
  const twee = [...items, { id: 'd', kind: 'article', source: 'nrc', sourceName: 'NRC', title: 'Jensen Huang stapt op als topman van Nvidia', summary: 'Jensen Huang stapt op als topman van Nvidia na een affaire.', url: 'https://www.nrc.nl/nieuws/2026/11/14/huang-a1', publishedAt: t }]
  const [st] = buildStories(twee, {}, OPTS)
  assert.equal(st.sourceCount, 2)
  assert.equal(st.publisherCount, 2)
})

test('Waar iedereen over schrijft: afleveringen tillen een verhaal niet over de drempel en zijn nooit de kop', () => {
  const t = '2026-11-14T10:00:00.000Z'
  const bericht = (id, source) => ({ id, kind: 'article', source, title: 'Kabinet valt', url: `https://${source}.example/artikel/${id}`, publishedAt: t })
  const afl = (id, source) => ({ id, kind: 'article', source, title: 'Kabinet valt', feedMark: 'podcast', url: `https://${source}.example/podcast/${id}`, publishedAt: t })
  const items = [bericht('a', 'nos'), bericht('b', 'nrc'), afl('c', 'volkskrant'), afl('d', 'trouw'), afl('e', 'fd'), afl('f', 'nu')]
  const byId = new Map(items.map((i) => [i.id, i]))
  const st = { id: 's', itemIds: items.map((i) => i.id), sourceCount: 2, publisherCount: 2 }
  assert.deepEqual(widelyCovered([st], byId, { isFree: () => true, min: 6 }), [])
  // De gratis kop van een breed verhaal is nooit een aflevering, ook als die de meest gekozen bron is.
  const breed = { ...st, sourceCount: 6, publisherCount: 6 }
  const [w] = widelyCovered([breed], byId, { isFree: (s) => s !== 'nrc', min: 6 })
  assert.equal(w.item.id, 'a')
  assert.equal(leadCandidates([afl('x', 'nos'), bericht('y', 'nu')], new Set(['nos']))[0].id, 'y')
})
