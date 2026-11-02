// Taal per bericht (shared/lang.mjs): een Engelstalig Parool-stuk hoort niet bij Nederlandse
// lezers, en andersom. Voorbeelden uit de momentopname van 30 oktober en de feeds van 31 oktober 2026.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectLang, langOf, langFromUrl, visibleFor, READER_LANG } from '../shared/lang.mjs'
import { loadSource } from '../netlify/lib/rss.mjs'
import { streamItems } from '../netlify/lib/build.mjs'
import { SOURCES } from '../netlify/lib/sources.mjs'
import { loadSnapshot, loadGeneralGolden, generalEdition, storiesPrint } from './helpers/snapshot.mjs'

const PAROOL = 'https://www.parool.nl/amsterdam-news/x~b1/'
const plain = (title, summary = '') => detectLang({ title, summary }) // zonder link: alleen de tekst

test('Engelstalige Parool-stukken: Engels, ook zonder intro', () => {
  assert.equal(plain('Prosecution demands community service for tram driver who severely injured 14-year-old girl after running red light in Buitenveldert'), 'en')
  assert.equal(plain('U2 returns to the Netherlands after nine years for two nights at the Arena', 'Following a nine-year absence, U2 is returning to the Netherlands next year.'), 'en')
  assert.equal(plain('At Amsterdam Central Station, the message of the pro-Palestine sit-in is impossible to miss: ‘I’m here to show that I exist’'), 'en')
  assert.equal(plain('Amsterdam is bursting with singles, but who are they? Meet Robin, the city’s most common dater'), 'en')
  // Een Engels stuk in de NRC-feed.
  assert.equal(plain('Israel’s Jewish and Arab opposition parties should work together', 'If they want to dislodge Binyamin Netanyahu from office, they need to act fast.'), 'en')
})

test('Engelse koppen met een Nederlandse naam blijven Engels', () => {
  assert.equal(plain('Journalist Sarah Haaij (41) sees an Amsterdam full of exploitation: ‘Even my leftist friends don’t know if their cleaner actually has a passport’'), 'en')
  assert.equal(plain('Pieter Laurens Mol was the first living Dutch artist with a solo show at MoMA in New York, now his work is on view at three Amsterdam venues'), 'en')
  assert.equal(plain('Alex de Minaur hits career milestone in Vienna to book semi-final date with Zverev', 'World No 10 defeats Matteo Berrettini 7-6 (7-4) 6-2 in quarter-final 27-year-old becomes ninth Australian man to reach 350 tour-level wins Alex de Minaur has enjoyed a…'), 'en')
  // "de" en "van" in een naam maken een Engelse kop niet Nederlands.
  assert.notEqual(plain('Frenkie de Jong and Virgil van Dijk return for the Netherlands'), 'nl')
})

test('Nederlandse koppen met Engelse leenwoorden blijven Nederlands (of onzeker)', () => {
  assert.equal(plain('Album van de Dag: Loidis - From the Toolkit of Lovers', 'Ik zag gisteren in een Whatsapp-groep voorbijkomen dat de ADE-trein bij SlapFunk nog steeds niet tot halt is gekomen en dat de mensen in de BRET door en door en door willen tot minstens… donderdagochtend (?!).'), 'nl')
  assert.equal(plain('The Verge: The Elder Scrolls VI gaat Sentinel heten en wordt over maand getoond', 'De nieuwe Elder Scrolls-game gaat Sentinel heten. The Verge schrijft dat Microsoft en Bethesda de langverwachte game over een maand aankondigen.'), 'nl')
  assert.equal(plain('Karen Damen houdt het niet droog na optreden in Got Talent: ‘Ik ga voor je vechten’'), 'nl')
  assert.equal(plain('Nieuwe update voor de iPhone: dit is wat je moet weten over de must-have features'), 'nl')
  // Twijfel ("If This Then That") is geen Engels: dan geldt de taal van de bron.
  assert.notEqual(plain('Automatiseringsdienst If This Then That werkt voortaan met credits', 'Automatiseringsdienst If This Then That verandert zijn prijzen.'), 'en')
  assert.notEqual(plain('Black Friday deals: de beste smartwatch-deals op een rij'), 'en')
})

test('te weinig signaal is onzeker; dan geldt de brontaal', () => {
  assert.equal(plain('Tai Po fire report'), null)
  assert.equal(plain('8x verrassend leuke dates zónder alcohol'), null)
  assert.deepEqual(langOf({ title: 'Burnham rules out calling early election' }, 'en'), { lang: 'en', offLang: false })
  assert.deepEqual(langOf({ title: 'High Drama' }, 'nl'), { lang: 'nl', offLang: false })
})

test('bekende Engelstalige rubrieken: parool.nl/amsterdam-news en /guide', () => {
  assert.equal(langFromUrl('https://www.parool.nl/amsterdam-news/one-year-old-boy-falls~bd58d24a/'), 'en')
  assert.equal(langFromUrl('https://www.parool.nl/guide/what-to-do~bdd70eb8/'), 'en')
  assert.equal(langFromUrl('https://www.parool.nl/amsterdam/iets~b1/'), null)
  assert.equal(langFromUrl('https://www.nu.nl/guide/x'), null)
  assert.equal(langFromUrl('geen link'), null)
  // De rubriek beslist, ook bij een kop met te weinig functiewoorden.
  assert.deepEqual(langOf({ title: 'Tram 26 delays', url: PAROOL }, 'nl'), { lang: 'en', offLang: true })
})

test('zichtbaarheid: lezer-taal = app-taal (nl)', () => {
  assert.equal(READER_LANG, 'nl')
  assert.equal(visibleFor({ lang: 'nl', offLang: false }), true)
  assert.equal(visibleFor({}), true) // ongemarkeerd (oud bericht, Bluesky) blijft
  assert.equal(visibleFor({ lang: 'en', offLang: true }), false) // Engels Parool-stuk
  assert.equal(visibleFor({ lang: 'en', offLang: true }, 'en'), true) // straks in een Engelse app
  assert.equal(visibleFor({ lang: 'nl', offLang: true }), true) // Nederlands stuk bij een Engelse bron
  assert.equal(visibleFor({ lang: 'nl', offLang: true }, 'en'), false)
  // Een bron zonder taal (Bluesky) krijgt nooit offLang.
  assert.equal(langOf({ title: 'Prosecution demands community service for tram driver who ran a red light' }, undefined).offLang, false)
})

const feed = (items) => `<?xml version="1.0"?><rss version="2.0"><channel><title>T</title>${items.map(([t, l]) => `<item><title>${t}</title><link>${l}</link></item>`).join('')}</channel></rss>`
async function withFeed(xml, fn) {
  const orig = globalThis.fetch
  globalThis.fetch = async () => new Response(xml, { status: 200, headers: { 'content-type': 'application/rss+xml' } })
  try {
    return await fn()
  } finally {
    globalThis.fetch = orig
  }
}

test('loadSource markeert lang/offLang; de grens telt alleen berichten in de brontaal', async () => {
  const nl = Array.from({ length: 14 }, (_, k) => [`Raad stemt in met plan voor ${k} nieuwe woningen`, `https://www.parool.nl/amsterdam/w${k}~b${k}/`])
  const en = [['One-year-old boy falls from third floor on Amstelveenseweg', 'https://www.parool.nl/amsterdam-news/boy~bd5/'], ['In these 3 spots you can ice skate in Amsterdam this winter', 'https://www.parool.nl/amsterdam-news/ice~b9a/']]
  const xml = feed([nl[0], en[0], nl[1], en[1], ...nl.slice(2)])
  const res = await withFeed(xml, () => loadSource({ id: 'parool', name: 'Het Parool', cat: 'nl', lang: 'nl', urls: ['https://example.org/feed'] }, Promise.resolve({}), { limit: 12 }))
  const off = res.items.filter((i) => i.offLang)
  assert.deepEqual(off.map((i) => i.lang), ['en', 'en'])
  assert.equal(res.items.filter((i) => !i.offLang).length, 12) // grens 12, zonder de Engelse mee te tellen (de Stroom telt zo ook in stream.mjs)
  assert.ok(res.items.filter((i) => !i.offLang).every((i) => i.lang === 'nl'))
  // De Stroom (en alles daarna) laat ze weg voor de Nederlandse lezer, niet voor een Engelse.
  assert.equal(streamItems(res.items).some((i) => i.offLang), false)
  assert.equal(streamItems(res.items, { readerLang: 'en' }).filter((i) => i.offLang).length, 2)
})

// De momentopname van 30 oktober (avond): alleen de tien Engelstalige Parool-stukken vallen af,
// en de algemene Editie blijft byte-identiek aan de expliciet vastgelegde algoritme-golden.
test('momentopname: alleen Engelstalige Parool-stukken zijn offLang; taalfilter bewaart de algoritme-golden', () => {
  const snap = loadSnapshot()
  const SL = new Map(SOURCES.map((s) => [s.id, s.lang]))
  const marked = snap.items.map((i) => ({ ...i, ...langOf(i, SL.get(i.source)) }))
  const off = marked.filter((i) => i.offLang)
  assert.equal(off.length, 10)
  assert.ok(off.every((i) => i.source === 'parool' && i.lang === 'en' && /parool\.nl\/(amsterdam-news|guide)\//.test(i.url)))
  // Zonder de rubriek-regel herkent de tekst ze ook allemaal.
  assert.ok(off.every((i) => detectLang({ ...i, url: '' }) === 'en'))
  const expected = loadGeneralGolden()
  const g = generalEdition({ ...snap, items: marked.filter((i) => visibleFor(i)) })
  assert.equal(storiesPrint(g.stories), expected.stories)
  assert.equal(JSON.stringify(g.entries), JSON.stringify(expected.entries))
})
