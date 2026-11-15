// Een programmalabel achteraan in de kop maakt een stuk een aflevering (15 november 2026). Plek 04 van de Editie was
// "Als AI de journalistiek binnendringt | Luisterverhaal op zondag" van NRC: een aflevering van NRC Vandaag onder
// /nieuws/, zonder podcastmarkering in de feed en met alleen de cover van de podcast als afbeelding. Het voorbeeld is een
// illustratie; deze toetsen houden het algemene patroon vast:
//   1. het laatste stuk van de kop, na | of een streep met spaties, is een programmawoord om te luisteren of te kijken,
//      alleen of met een voorzetsel en een of twee woorden, of met een afleveringsnummer: dan is het een aflevering
//      (afleveringSoort, isAflevering), opent het de Editie nooit (opensEdition) en is het geen kop (audioEpisode);
//   2. een rubriek achter het scheidingsteken ("| Tech", "| Column", "| Interview"), inhoud die met zo'n woord begint
//      ("| Video toont chaos") en een woord ergens in de kop tellen niet;
//   3. de Redacteur maakt van zo'n stuk geen plek meer.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { afleveringSoort, isAflevering, opensEdition } from '../shared/aflevering.mjs'
import { audioEpisode, labelAchteraan, hardMark, videoMetLabel, geenPlekAflevering } from '../shared/editie-filter.mjs'
import { selectForReader } from '../netlify/lib/stories.mjs'
import { profileOf } from '../shared/editor.mjs'

const NOW = Date.parse('2026-11-15T10:00:00Z')
const at = (h) => new Date(NOW - h * 36e5).toISOString()
const art = (id, source, title, url, extra = {}) => ({ id, kind: 'article', source, title, summary: 'Wat betekent het voor de journalistiek als AI steeds meer van het werk overneemt? Een gesprek op de redactie.', url, image: 'https://example.org/b.jpg', publishedAt: at(1), topics: ['tech'], ...extra })

// Zoals live in de feed van NRC: rubriek /nieuws/, een spatie achter de kop, de cover van de podcast als afbeelding.
const NRC = art('nrc1', 'nrc', 'Als AI de journalistiek binnendringt | Luisterverhaal op zondag ', 'https://www.nrc.nl/nieuws/2026/11/15/als-ai-de-journalistiek-binnendringt-luisterverhaal-op-zondag-a4941418', {
  image: 'https://images.nrc.nl/x=/1280x/filters:no_upscale()/s3/static.nrc.nl/taxonomy/93d656f-NRC%2520Vandaag_Item.jpg',
})
const gewoon = (title) => art('g', 'nos', title, 'https://nos.nl/artikel/2590100-x')

test('het NRC-geval: een aflevering die de Editie niet opent en geen kop is', () => {
  assert.equal(afleveringSoort(NRC), 'podcast')
  assert.ok(isAflevering(NRC))
  assert.equal(opensEdition(NRC), false)
  assert.ok(audioEpisode(NRC))
  // Filter A weert het niet helemaal: het heeft een eigen intro en mag lid van een verhaal blijven.
  assert.equal(hardMark(NRC), null)
})

test('varianten van een programmalabel achteraan', () => {
  const cases = [
    ['Wijkagent John was altijd bereikbaar – ook als hij vrij was | Luisterverhaal op zondag', 'podcast'],
    ['Teen prodigy, Netflix star, prisoner: the story of Joshua Wong – podcast', 'podcast'],
    ['De val van Huang | Podcast', 'podcast'],
    ['De val van Huang - Luister', 'podcast'],
    ['De val van Huang — Luisterstuk', 'podcast'],
    ['De val van Huang | Podcast 12', 'podcast'],
    ['De val van Huang | Podcast aflevering 12', 'podcast'],
    ['Why Nvidia matters | Listen', 'podcast'],
    ['Why Nvidia matters – Audio', 'podcast'],
    ['Intocht van Sinterklaas in Grave | Video', 'video'],
    ['Intocht van Sinterklaas in Grave | Video van de dag', 'video'],
    ['Storm raast over de kust – Kijk', 'video'],
    ['Storm hits the coast | Watch', 'video'],
    ['Storm raast over de kust|Video', 'video'],
    ['Storm hits the coast | Watch 3', 'video'],
    ['Storm raast over de kust – Kijk 12', 'video'],
    ['Why Nvidia matters | Audio episode 4', 'podcast'],
    ['Inside the Fed meeting (Video)', 'video'],
    ['Inside the Fed meeting (Podcast)', 'podcast'],
  ]
  for (const [title, soort] of cases) {
    const it = gewoon(title)
    assert.equal(labelAchteraan(title), soort, title)
    assert.equal(afleveringSoort(it), soort, title)
    assert.equal(opensEdition(it), false, title)
    assert.equal(audioEpisode(it), soort === 'podcast', title)
  }
})

test('geen label: inhoud met het woord, een rubriek achter het scheidingsteken, een dubbele punt', () => {
  for (const title of [
    'Spotify koopt podcastbedrijf | Tech',
    'Waarom podcasts groeien',
    'NOS-podcast De Dag uitgeroepen tot beste dagelijkse podcast',
    'Video van aanhouding gaat rond, politie onderzoekt geweld',
    'Brand in Amsterdam | Video toont chaos in de binnenstad',
    'Kabinet valt – Luister naar de Kamer',
    'Kabinet valt | Kijk toch naar links',
    'Wat de val van Huang betekent | Column',
    'Herman Koch: ‘Naast kanker heb ik ook parkinson’ | Interview',
    'Amerikanen rekenen af met Trump. Hoe nu verder? | In Het Nieuws',
    'Spotify koopt podcastbedrijf | Podcastmaker wint prijs',
    'Chris Packham’s lovely new wildlife show: best podcasts of the week',
    'Ajax wint ruim: video',
    'Podcast',
    '| Podcast',
    // Aangescherpt (aflevering-2): watch, audio en kijk alleen kaal of met een nummer, niet achter een productkop.
    'Apple Watch Series 12 review - Watch',
    'Rolex Daytona – watch of the year',
    'Sony WH-1000XM6 review | Audio',
    'Fed meeting - watch for rate cut',
    'Column | Kijk op de week',
    'Ajax-Feyenoord | Kijk in het stadion',
    'Brand in Amsterdam | Video op sociale media',
    'Bodycam | Video on social media',
  ]) {
    const it = gewoon(title)
    assert.equal(labelAchteraan(title), null, title)
    assert.equal(afleveringSoort(it), null, title)
    assert.ok(opensEdition(it), title)
    assert.ok(!audioEpisode(it), title)
  }
})

test('de Redacteur maakt er geen plek van, los en als enige stuk van een verhaal', () => {
  const mine = new Set(['nrc'])
  const reader = { mainIds: mine, now: NOW, size: 10, prof: profileOf({ interests: ['tech'], followed: mine }), preferred: mine }
  const los = { ...NRC, id: 'los' }
  const audit = []
  const out = selectForReader([], [los], { ...reader, audit })
  assert.ok(!out.some((e) => (e.leadId || e.id) === 'los'), JSON.stringify(out))
  const st = { id: 'snrc', leadId: 'nrc1', itemIds: ['nrc1'], sourceCount: 1, publisherCount: 1, latestAt: at(1), firstAt: at(1), desk: 'tech', light: false }
  const audit2 = []
  const out2 = selectForReader([st], [NRC], { ...reader, audit: audit2 })
  assert.equal(out2.length, 0, JSON.stringify(out2))
  assert.ok(audit2.some((a) => a.id === 'snrc' && a.reason === 'alleen-aflevering'), JSON.stringify(audit2))
})

test('een video met een programmalabel: geen plek, net als een podcast (aflevering-2)', () => {
  for (const title of ['Video | Joe Biden bekogeld met eieren', 'Video: zo ziet de nieuwe brug eruit', 'Kijk: storm raast over de kust', 'Watch: storm hits the coast', 'Storm raast over de kust | Video', 'Storm raast over de kust – Kijk', 'Storm hits the coast (Video)']) {
    const it = gewoon(title)
    assert.ok(videoMetLabel(it), title)
    assert.ok(geenPlekAflevering(it), title)
    assert.ok(!audioEpisode(it), title)
    assert.equal(afleveringSoort(it), 'video', title)
  }
  // Alleen aan rubriek of feed herkend (besluit B2): blijft zoals het was, mag een plek en een kop zijn.
  for (const it of [
    art('rtl', 'rtl', 'Storm raast over de kust, bomen omgewaaid', 'https://www.rtl.nl/nieuws/video/5500100/storm-raast-over-de-kust'),
    { ...gewoon('Storm raast over de kust, bomen omgewaaid'), feedMark: 'video' },
    gewoon('Brand in Amsterdam | Video op sociale media'),
  ]) {
    assert.ok(!videoMetLabel(it), it.title)
    assert.ok(!geenPlekAflevering(it), it.title)
  }
})

test('selectForReader: een label-video is geen plek, een RTL-/video/-stuk nog wel', () => {
  const mine = new Set(['rtl'])
  const reader = { mainIds: mine, now: NOW, size: 10, prof: profileOf({ interests: ['binnenland'], followed: mine }), preferred: mine }
  const summary = 'Een zware storm trok vannacht over de kust. Bomen waaiden om en treinen reden niet tussen Leiden en Haarlem.'
  const label = art('lv', 'rtl', 'Storm raast over de kust | Video', 'https://www.rtl.nl/nieuws/binnenland/artikel/5500101/storm-raast-over-de-kust', { summary, topics: ['binnenland'] })
  const rubriek = art('rv', 'rtl', 'Storm raast over de kust, bomen omgewaaid', 'https://www.rtl.nl/nieuws/video/5500100/storm-raast-over-de-kust', { summary, topics: ['binnenland'] })
  const out = selectForReader([], [label], { ...reader, audit: [] })
  assert.ok(!out.some((e) => (e.leadId || e.id) === 'lv'), JSON.stringify(out))
  const out2 = selectForReader([], [rubriek], { ...reader, audit: [] })
  assert.ok(out2.some((e) => (e.leadId || e.id) === 'rv'), JSON.stringify(out2))
  // Als enige stuk van een verhaal: geen plek (alleen-aflevering).
  const st = { id: 'slv', leadId: 'lv', itemIds: ['lv'], sourceCount: 1, publisherCount: 1, latestAt: at(1), firstAt: at(1), desk: 'binnenland', light: false }
  const audit = []
  assert.equal(selectForReader([st], [label], { ...reader, audit }).length, 0)
  assert.ok(audit.some((a) => a.id === 'slv' && a.reason === 'alleen-aflevering'), JSON.stringify(audit))
})
