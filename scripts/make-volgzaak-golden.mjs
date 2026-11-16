// Maakt tests/fixtures/volgzaak-golden.json: vaste invoer en uitvoer van de volgregels in de rekenkern (Volgen 1.5,
// shared/volgzaak-weergave.mjs). Node (tests/volgzaak-weergave.test.mjs, ook als kale bundel) en de app
// (ios/HootTests/VolgzaakParityTests.swift) moeten uit `input` byte voor byte `output` maken. De regels zelf staan los
// getoetst in tests/volgzaak-weergave.test.mjs, zodat de fixture niet alleen zichzelf bevestigt.
//
//   node scripts/make-volgzaak-golden.mjs     (ook onderdeel van npm run golden)
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { volgzaakViewJSON, volgzaakVoorrangJSON, rubriekRegelJSON, volgtVanJSON, volgtVanPlekJSON, erSpeeldeAlJSON } from '../src/lib/editionCore.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const VOLGZAAK_GOLDEN = 'tests/fixtures/volgzaak-golden.json'

const NOW = Date.parse('2026-11-20T09:30:00Z')
const uur = (h) => new Date(NOW - h * 36e5).toISOString()
const dag = (d) => new Date(NOW - d * 864e5).toISOString()

const VOLGZAKEN = [
  { slug: 'gta-6', label: 'GTA 6', status: 'actief' },
  { slug: 'kabinetsformatie', label: 'Kabinetsformatie', status: 'actief' },
  { slug: 'tata-steel', label: 'Tata Steel', status: 'gestopt' },
]
const VERHALEN = {
  sGta: { volgzaak: { slug: 'gta-6', label: 'GTA 6' } },
  sGtaOud: { volgzaak: { slug: 'gta-6', label: 'GTA 6' } },
  sForm: { volgzaak: { slug: 'kabinetsformatie', label: 'Kabinetsformatie' } },
  sTata: { volgzaak: { slug: 'tata-steel', label: 'Tata Steel' } },
  sStarship: { volgzaak: { slug: 'starship', label: 'Starship' } },
}
// De Stroom in de tijd, nieuwste eerst.
const LIJST = [
  { id: 'a1', storyId: null, publishedAt: uur(0.5), kind: 'article' },
  { id: 'a2', storyId: 'sTata', publishedAt: uur(1), kind: 'article' },
  { id: 'a3', storyId: 'sForm', publishedAt: uur(2), kind: 'article' },
  { id: 'a4', storyId: 'sStarship', publishedAt: uur(3), kind: 'article' },
  { id: 'a5', storyId: 'sGta', publishedAt: uur(4), kind: 'article' },
  { id: 'a6', storyId: 'sGta', publishedAt: uur(6), kind: 'article' },
  { id: 'p1', storyId: 'sForm', publishedAt: uur(0.2), kind: 'post' },
  { id: 'a7', storyId: 'sGtaOud', publishedAt: uur(20), kind: 'article' },
  { id: 'a8', storyId: 'sForm', publishedAt: uur(26), kind: 'article' },
]
const voorrang = (name, extra) => ({ name, fn: 'volgzaakVoorrangJSON', input: { lijst: LIJST, verhalen: VERHALEN, volgzaken: VOLGZAKEN, grens: 7, gezien: {}, gelezen: [], now: NOW, weergave: 'alles', ...extra } })

const BRONNEN = [
  { id: 'nos', lang: 'nl', paid: false },
  { id: 'nu', lang: 'nl', paid: false },
  { id: 'tweakers', lang: 'nl', paid: false },
  { id: 'nrc', lang: 'nl', paid: true },
  { id: 'fd', lang: 'nl', paid: true },
  { id: 'guardian', lang: 'en', paid: false },
  { id: 'verge', lang: 'en', paid: false },
]
const STAND = {
  verhalen: [
    { verhaal: 'v1', kop: 'Nieuwe trailer van GTA 6 toont Vice City bij nacht', bron: 'nu', url: 'https://nu.nl/1', bronnen: 4, at: uur(3), betaald: false, rubriek: 'games' },
    { verhaal: 'v2', kop: 'Gamewinkels verwachten drukte bij verkoop van GTA 6', bron: 'tweakers', url: 'https://tweakers.net/2', bronnen: 2, at: uur(5), betaald: false, rubriek: 'games' },
    { verhaal: 'v3', kop: 'Rockstar: GTA 6 ligt op 19 november in de winkel', bron: 'nrc', url: 'https://nrc.nl/3', bronnen: 6, at: dag(2), betaald: true, rubriek: 'games' },
    { verhaal: 'v4', kop: 'GTA 6 release date confirmed', bron: 'verge', url: 'https://verge.com/4', bronnen: 3, at: dag(3), betaald: false, rubriek: 'games' },
    { verhaal: 'v5', kop: 'Take-Two rekent op recordkwartaal door GTA 6', bron: 'nos', url: 'https://nos.nl/5', bronnen: 3, at: dag(9), betaald: false, rubriek: 'economie' },
    { verhaal: 'v6', kop: 'Take-Two rekent op recordkwartaal door GTA 6', bron: 'nu', url: 'https://nu.nl/6', bronnen: 2, at: dag(10), betaald: false, rubriek: 'economie' },
    { verhaal: 'v7', kop: 'Eerste beelden van GTA 6 uitgelekt', bron: 'fd', url: 'https://fd.nl/7', bronnen: 2, at: dag(12), betaald: true, rubriek: 'games' },
    { verhaal: 'v1', kop: 'Dubbel verhaal', bron: 'nos', url: 'https://nos.nl/1b', bronnen: 4, at: uur(8), betaald: false, rubriek: 'games' },
  ],
}
// "Er speelde al" zoals de server het geeft: gedeeld per volgzaak, uit alle bronnen en talen (zonder url en rubriek).
const EERDER = STAND.verhalen.slice(0, 7).map(({ verhaal, kop, bron, bronnen, at, betaald }) => ({ verhaal, kop, bron, bronnen, at, betaald }))
const erSpeeldeAl = (name, extra) => ({ name, fn: 'erSpeeldeAlJSON', input: { eerder: EERDER, bronnen: BRONNEN, eigen: ['nos', 'nu'], now: NOW, ...extra } })
const view = (name, extra) => ({ name, fn: 'volgzaakViewJSON', input: { stand: STAND, bronnen: BRONNEN, eigen: ['nos', 'nu', 'nrc'], gezien: dag(1), gelezen: [], now: NOW, ...extra } })

export const CASES = [
  voorrang('voorrang-alles', {}),
  voorrang('voorrang-gezien', { gezien: { a5: Date.parse(uur(4)) } }),
  voorrang('voorrang-gelezen-in-editie', { gelezen: ['a3'] }),
  voorrang('voorrang-onder-de-grens', { grens: 3 }),
  voorrang('voorrang-geen-grens', { grens: null }),
  voorrang('voorrang-rubriek', { weergave: 'rubriek', lijst: LIJST.filter((i) => ['a5', 'a6', 'a7', 'a1'].includes(i.id)), grens: 4 }),
  voorrang('voorrang-bubbel', { weergave: 'bubbel' }),
  voorrang('voorrang-tab', { weergave: 'tab' }),
  voorrang('voorrang-ouder-dan-een-etmaal', { lijst: LIJST.filter((i) => ['a8', 'a1'].includes(i.id)), grens: 2 }),
  voorrang('voorrang-hooguit-drie', { volgzaken: [...VOLGZAKEN.slice(0, 2), { slug: 'tata-steel', label: 'Tata Steel' }, { slug: 'starship', label: 'Starship' }] }),
  view('pagina-eigen-en-buiten', {}),
  view('pagina-alles-nieuw', { gezien: null }),
  view('pagina-gelezen', { gelezen: ['v1'] }),
  view('pagina-met-engels', { eigen: ['nos', 'guardian'] }),
  view('pagina-zonder-bronnen', { eigen: [], gezien: dag(4) }),
  erSpeeldeAl('er-speelde-al-alleen-nederlands', {}),
  erSpeeldeAl('er-speelde-al-met-engels', { eigen: ['nos', 'guardian'] }),
  { name: 'regel-volgt-voor-buiten', fn: 'rubriekRegelJSON', input: { rubriek: 'Politiek', volgt: { slug: 'kabinetsformatie', label: 'Kabinetsformatie' }, buiten: true } },
  { name: 'regel-alleen-buiten', fn: 'rubriekRegelJSON', input: { rubriek: 'Wereld', volgt: null, buiten: true } },
  { name: 'regel-alleen-volgt', fn: 'rubriekRegelJSON', input: { rubriek: 'Games', volgt: { slug: 'gta-6', label: 'GTA 6' }, buiten: false } },
  { name: 'label-editie', fn: 'volgtVanJSON', input: { story: VERHALEN.sForm, volgzaken: VOLGZAKEN } },
  { name: 'label-editie-gestopt', fn: 'volgtVanJSON', input: { story: VERHALEN.sTata, volgzaken: VOLGZAKEN } },
  // Het label in de Editie, vast op de server per plek (Altijd server): de plek draagt `volgt`, de lijst op het toestel beslist.
  { name: 'plek-volgt', fn: 'volgtVanPlekJSON', input: { plek: { kind: 'story', id: 'sForm', desk: 'politiek', volgt: { slug: 'kabinetsformatie', naam: 'Kabinetsformatie' } }, volgzaken: VOLGZAKEN } },
  { name: 'plek-naam-uit-je-eigen-lijst', fn: 'volgtVanPlekJSON', input: { plek: { kind: 'story', id: 'sGta', desk: 'games', volgt: { slug: 'gta-6', naam: 'GTA VI' } }, volgzaken: VOLGZAKEN } },
  { name: 'plek-ontvolgd', fn: 'volgtVanPlekJSON', input: { plek: { kind: 'story', id: 'sGta', desk: 'games', volgt: { slug: 'gta-6', naam: 'GTA 6' } }, volgzaken: VOLGZAKEN.filter((z) => z.slug !== 'gta-6') } },
  { name: 'plek-gestopt', fn: 'volgtVanPlekJSON', input: { plek: { kind: 'story', id: 'sTata', desk: 'economie', volgt: { slug: 'tata-steel', naam: 'Tata Steel' } }, volgzaken: VOLGZAKEN } },
  { name: 'plek-nieuw-gevolgd-nog-niet-vastgelegd', fn: 'volgtVanPlekJSON', input: { plek: { kind: 'story', id: 'sGta', desk: 'games' }, volgzaken: VOLGZAKEN } },
  { name: 'plek-niet-onder-buiten-je-bubbel', fn: 'volgtVanPlekJSON', input: { plek: { kind: 'story', id: 'sGta', desk: 'bubbel', volgt: { slug: 'gta-6', naam: 'GTA 6' } }, volgzaken: VOLGZAKEN } },
  { name: 'plek-vreemd-veld', fn: 'volgtVanPlekJSON', input: { plek: { kind: 'story', id: 'sGta', desk: 'games', volgt: 'gta-6' }, volgzaken: VOLGZAKEN } },
]

const FNS = { volgzaakViewJSON, volgzaakVoorrangJSON, rubriekRegelJSON, volgtVanJSON, volgtVanPlekJSON, erSpeeldeAlJSON }
// Eén aanroep zoals Swift hem doet: één JSON-tekst in (volgtVan krijgt er twee), één tekst uit.
export function callCase(fns, c) {
  if (c.fn === 'volgtVanJSON') return fns.volgtVanJSON(JSON.stringify(c.input.story), JSON.stringify(c.input.volgzaken))
  if (c.fn === 'volgtVanPlekJSON') return fns.volgtVanPlekJSON(JSON.stringify(c.input.plek), JSON.stringify(c.input.volgzaken))
  return fns[c.fn](JSON.stringify(c.input))
}
export const makeVolgzaakGolden = () => CASES.map((c) => ({ ...c, output: JSON.parse(callCase(FNS, c)) }))

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
export function writeVolgzaakGolden() {
  const g = makeVolgzaakGolden()
  writeFileSync(resolve(ROOT, VOLGZAAK_GOLDEN), JSON.stringify(g, null, 1) + '\n')
  console.log(`${VOLGZAAK_GOLDEN}: ${g.length} gevallen`)
}
if (isMain) writeVolgzaakGolden()
