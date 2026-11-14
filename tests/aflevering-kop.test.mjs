// Een aflevering is nooit de kop van een plek (dubbelcheck 14 november, A3). In de Ochtendeditie van een lezer met
// alleen Nederlandse bronnen was een Telegraaf-podcast met een eigen intro de kop van plek 02 (Groot nieuws). Filter A
// weert een podcastrubriek alleen zonder eigen intro, en filter B laat bij twijfel staan. Het voorbeeld is een
// illustratie; deze toetsen houden het algemene patroon vast:
//   1. een stuk dat de feed als aflevering markeert (Podcast/Video, audio- of video-enclosure, iTunes-nummer), in een
//      podcast- of videorubriek van de uitgever staat, of met een programmalabel begint, is een aflevering
//      (mediaEpisode in shared/editie-filter.mjs); een nieuwsstuk óver een podcast of video niet;
//   2. zo'n stuk is nooit de kop van een plek, ook niet met een eigen intro, van je eigen voorkeursbron of als nieuwste;
//      het blijft lid van het verhaal; een plek of los stuk met alleen afleveringen komt er niet in.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mediaEpisode, hardMark } from '../shared/editie-filter.mjs'
import { leadCandidates, leadPool, selectForReader } from '../netlify/lib/stories.mjs'
import { profileOf } from '../shared/editor.mjs'

const NOW = Date.parse('2026-11-14T10:00:00Z')
const at = (h) => new Date(NOW - h * 36e5).toISOString()
const art = (id, source, title, url, extra = {}) => ({ id, kind: 'article', source, title, summary: 'De val van de topman sloeg in de Verenigde Staten in als een bom, zeggen ingewijden.', url, image: 'https://example.org/b.jpg', publishedAt: at(1), topics: ['tech'], ...extra })

// Zoals live: een eigen intro, feedMark podcast en een podcastrubriek in de link.
const PODCAST = art('pod', 'telegraaf', "'Nvidia-affaire kan in Trumps gezicht ontploffen'", 'https://www.telegraaf.nl/podcast/nvidia-affaire-kan-in-trumps-gezicht-ontploffen/164538911.html', { feedMark: 'podcast', publishedAt: at(0.5) })
const NOS = art('nos1', 'nos', 'Affaire Nvidia-topman legt risico’s van banden met Amerikaanse politiek bloot', 'https://nos.nl/artikel/2590001-affaire-nvidia-topman', { publishedAt: at(2) })
const NU = art('nu1', 'nu', 'Nvidia-topman Huang stapt op na onthullingen over contacten met Witte Huis', 'https://www.nu.nl/economie/6380001/nvidia-topman-huang-stapt-op.html', { publishedAt: at(1.5) })

test('herkenning: feedmarkering, enclosure, iTunes, rubriek in de link en programmalabel; niet een stuk óver een podcast', () => {
  for (const it of [
    PODCAST,
    { ...NOS, feedMark: 'video' },
    { ...NOS, mediaType: 'audio/mpeg' },
    { ...NOS, mediaType: 'video/mp4' },
    { ...NOS, podcastEpisode: '12' },
    { ...NOS, url: 'https://www.nytimes.com/video/world/100000010000/flood.html' },
    { ...NOS, url: 'https://www.theatlantic.com/podcasts/archive/2026/11/x/680000/' },
    { ...NOS, url: 'https://www.telegraaf.nl/video/1234567/intocht-in-grave' },
    { ...NOS, url: 'https://www.example.nl/luister/aflevering-12' },
    { ...NOS, title: 'Video | Intocht van Sinterklaas in Grave' },
    { ...NOS, title: 'Podcast: wat de val van Huang betekent' },
    { ...NOS, title: 'Kijk: brand in centrum Utrecht' },
  ]) assert.ok(mediaEpisode(it), `${it.title} ${it.url} ${it.feedMark || ''}${it.mediaType || ''}`)
  // Nieuws óver een podcast of video, een slug met "video" of "podcast", of een rubriek ná een datum: geen aflevering.
  for (const it of [
    NOS,
    { ...NOS, title: 'Podcastmaker wint prijs voor onderzoeksjournalistiek' },
    { ...NOS, title: 'Video van aanhouding gaat rond, politie onderzoekt geweld' },
    { ...NOS, url: 'https://nos.nl/artikel/2590002-podcast-over-zorg-wint-prijs' },
    { ...NOS, url: 'https://www.example.com/2026/11/podcasts/684400/' },
    { ...NOS, kind: 'post', feedMark: 'podcast' },
  ]) assert.ok(!mediaEpisode(it), `${it.title} ${it.url}`)
  // Filter A laat deze podcast staan (eigen intro): daarom is de koptoets nodig.
  assert.equal(hardMark(PODCAST), null)
})

test('kop van een verhaal: elk nieuwsstuk gaat vóór een aflevering, ook vóór je voorkeursbron en het nieuwste stuk', () => {
  const mine = new Set(['telegraaf', 'nos', 'nu'])
  const order = leadCandidates([PODCAST, NOS, NU], mine, new Set(['telegraaf']), NOW)
  assert.equal(order[order.length - 1].id, 'pod')
  // leadPool (vers, kern, eigen bronnen eerst) haalt de aflevering niet terug naar voren.
  for (const own of [null, (i) => i.source === 'telegraaf']) {
    assert.notEqual(leadPool(leadCandidates([PODCAST, NOS, NU], mine, new Set(['telegraaf']), NOW, { role: 'front' }), [PODCAST, NOS, NU], NOW, own)[0].id, 'pod')
  }
  // Ook een video met een eigen intro.
  const vid = { ...PODCAST, id: 'vid', feedMark: 'video', url: 'https://www.telegraaf.nl/video/164538912/nvidia' }
  assert.notEqual(leadPool(leadCandidates([vid, NOS], mine, new Set(['telegraaf']), NOW), [vid, NOS], NOW, (i) => i.source === 'telegraaf')[0].id, 'vid')
})

const story = { id: 'snv', leadId: 'pod', itemIds: ['pod', 'nos1', 'nu1'], sourceCount: 3, publisherCount: 3, latestAt: at(0.5), firstAt: at(2), desk: 'vs', light: false }
const reader = (followed) => ({ mainIds: new Set(followed), now: NOW, size: 10, prof: profileOf({ interests: ['tech', 'economie', 'wereld'], followed: new Set(followed) }), preferred: new Set(['telegraaf']) })

test('persoonlijke Editie: de plek blijft met het nieuws als kop; de aflevering blijft lid', () => {
  const audit = []
  const out = selectForReader([story], [PODCAST, NOS, NU], { ...reader(['telegraaf', 'nos', 'nu']), audit })
  assert.equal(out.length, 1, JSON.stringify(audit))
  assert.notEqual(out[0].leadId, 'pod')
  assert.ok(story.itemIds.includes('pod'))
})

test('alleen afleveringen van je eigen bronnen: geen plek, en een losse aflevering is geen plek', () => {
  const audit = []
  const out = selectForReader([story], [PODCAST], { ...reader(['telegraaf']), audit })
  assert.equal(out.length, 0)
  assert.ok(audit.some((a) => a.id === 'snv' && a.reason === 'alleen-aflevering'), JSON.stringify(audit))
  const los = { ...PODCAST, id: 'los', storyId: undefined }
  const audit2 = []
  const out2 = selectForReader([], [los], { ...reader(['telegraaf']), audit: audit2 })
  assert.ok(!out2.some((e) => (e.leadId || e.id) === 'los'))
  assert.ok(audit2.some((a) => a.id === 'los' && a.reason === 'vorm-of-bron-niet-toegelaten'))
})
