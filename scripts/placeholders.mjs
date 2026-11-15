// Maakt de placeholderbeelden (knipsel, sinds 15 november) uit de hires-beelden van Luma:
// - WebP's voor het web, per beeld en weergave groot (2:1) en klein (3:2), elk in 1x en 2x
//   (src/assets/placeholder/beeld-N-thema[-klein]-breedte.webp);
// - dezelfde 2x-bestanden voor de app (ios/Hoot/Resources/Placeholder/ph-N-thema[-klein].webp);
// - de CSS die ze per beeld en weergave kiest (src/placeholder.css);
// - de tabel voor Swift (ios/Hoot/Views/PlaceholderBeelden.swift);
// - bron.json: de instellingen en de sha256 van elk bronbeeld, zodat --check ziet of alles bij is;
// - het manifest voor de app (landing/placeholders.json, op gethoot.app/placeholders.json): de reeks en de urls
//   van de beelden met hun versie (build 61, "server side bouwen"); landing/build.mjs zet beelden en manifest online;
// - tests/fixtures/placeholder-manifest.json: een andere reeks, met de keuze die web en app er allebei uit maken.
//
// Bron: ../Hoot-design/merk/placeholders-luma-2026-11-15/hires/beeld-N-thema.png (2048 x 1152), of de map
// in HOOT_PLACEHOLDER_BRON. Bitmaps worden alleen opnieuw gemaakt als een bronbeeld of een instelling
// veranderde. Met --check: niets schrijven, alleen nagaan of alles bij is (de bronmap is dan niet nodig;
// staat hij er wel, dan worden ook de hashes van de bronbeelden nagelopen).
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, renameSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'
import { PLACEHOLDERS, PLACEHOLDER_COUNT, PLACEHOLDER_UIT, PLACEHOLDER_NUMMERS, PLACEHOLDER_BRON, PLACEHOLDER_MATEN, PLACEHOLDER_KWALITEIT, THEMES, placeholderFile, placeholderAppFile, placeholderManifest, placeholderManifestFout, placeholderReeksUitManifest, placeholderVersie, PLACEHOLDER_SITE, PLACEHOLDER_BEELD_PAD } from '../shared/placeholder.mjs'

const root = new URL('../', import.meta.url)
const WEB = 'src/assets/placeholder/'
const APP = 'ios/Hoot/Resources/Placeholder/'
const MANIFEST = WEB + 'bron.json'
export const SERVER_MANIFEST = 'landing/placeholders.json'
export const MANIFEST_FIXTURE = 'tests/fixtures/placeholder-manifest.json'
const SELECTOR = { licht: '', donker: ":root[data-theme='dark'] ", nacht: ":root[data-theme='night'] " }
export const bronMap = () => process.env.HOOT_PLACEHOLDER_BRON || fileURLToPath(new URL('../Hoot-design/merk/placeholders-luma-2026-11-15/hires/', root))
const bronFile = (n, theme) => join(bronMap(), `beeld-${n}-${theme}.png`)

// Alle bitmaps: [{ n, theme, uitsnede, breed, hoog, web, app? }].
export function bitmaps() {
  const out = []
  for (const n of PLACEHOLDER_NUMMERS) for (const theme of THEMES) for (const [uitsnede, m] of Object.entries(PLACEHOLDER_MATEN)) {
    for (const breed of m.maten) {
      const hoog = Math.round((breed * m.crop.h) / m.crop.w)
      const groot = breed === Math.max(...m.maten)
      out.push({ n, theme, uitsnede, breed, hoog, web: WEB + placeholderFile(n, theme, uitsnede, breed), app: groot ? APP + placeholderAppFile(n, theme, uitsnede) : null })
    }
  }
  return out
}

const instellingen = () => ({ bron: PLACEHOLDER_BRON, maten: PLACEHOLDER_MATEN, kwaliteit: PLACEHOLDER_KWALITEIT, nummers: PLACEHOLDER_NUMMERS, themas: THEMES, kleinRechts: PLACEHOLDER_NUMMERS.filter((n) => PLACEHOLDERS[n - 1].klein === 'rechts') })

// De tekstbestanden: CSS, de Swift-tabel, het manifest voor de app en de fixture. `shas`: pad in WEB → sha256 (hex)
// van elke WebP (bron.json.uit).
export function textOutputs(shas = {}) {
  const files = new Map()
  const url = (b) => `url('./assets/placeholder/${placeholderFile(b.n, b.theme, b.uitsnede, b.breed)}')`
  // CSS: het beeld vult het vak als een foto (cover); het vak heeft zijn eigen vaste maat, dus er
  // verspringt niets. De browser haalt een achtergrond pas op als een element hem gebruikt: alleen de
  // beelden die echt in beeld komen (hooguit dertien per maat), en uit de cache van de service worker.
  let css = '/* Gegenereerd door scripts/placeholders.mjs uit shared/placeholder.mjs. Niet met de hand aanpassen. */\n'
  css += '/* Placeholderbeeld (knipsel): vult het beeldvak van een stuk zonder (passend) beeld (Beeld.jsx, Beeldloos). */\n'
  css += '.ph {\n  background-color: var(--paper);\n  background-position: center;\n  background-size: cover;\n  background-repeat: no-repeat;\n}\n'
  for (const theme of THEMES) {
    for (const n of PLACEHOLDER_NUMMERS) {
      for (const [uitsnede, m] of Object.entries(PLACEHOLDER_MATEN)) {
        const [een, twee] = m.maten.map((breed) => ({ n, theme, uitsnede, breed }))
        const sel = `${SELECTOR[theme]}.ph--${n}${uitsnede === 'klein' ? '.ph--klein' : ''}`
        css += `${sel} { background-image: ${url(een)}; background-image: image-set(${url(een)} 1x, ${url(twee)} 2x); }\n`
      }
    }
  }
  files.set('src/placeholder.css', css)
  const shaVan = (f) => shas[WEB + f] ?? '0'.repeat(64)
  const manifest = placeholderManifest(shaVan, sha)
  files.set('ios/Hoot/Views/PlaceholderBeelden.swift', swift(manifest, shaVan))
  files.set(SERVER_MANIFEST, JSON.stringify(manifest, null, 1) + '\n')
  files.set(MANIFEST_FIXTURE, JSON.stringify(manifestFixture()) + '\n')
  return files
}

// Een andere reeks dan de huidige, om te toetsen dat web en app er dezelfde keuze uit maken: twintig plekken, De kop
// (11) uit, twee nieuwe beelden (19 in een nieuwe set, 20 bij Iris). Plus manifesten die de app moet weigeren.
export function manifestFixture() {
  const v = (n) => placeholderVersie(sha(`fixture-${n}`))
  const urls = (n) => Object.fromEntries(THEMES.map((t) => [t, Object.fromEntries(['groot', 'klein'].map((u) => [u, Object.fromEntries(PLACEHOLDER_MATEN[u].maten.map((breed, i) => [i ? '2x' : '1x', `${PLACEHOLDER_SITE}${PLACEHOLDER_BEELD_PAD}${placeholderFile(n, t, u, breed)}?v=${v(`${n}-${t}-${u}-${breed}`)}`]))]))]))
  const sets = { ...Object.fromEntries(PLACEHOLDER_NUMMERS.map((n) => [n, PLACEHOLDERS[n - 1].family])), 19: 'golf', 20: 'iris' }
  const uit = [7, 11, 14, 15, 16, 17]
  const manifest = { schema: 1, versie: v('versie'), count: 20, uit, beelden: Object.entries(sets).map(([n, set]) => ({ nummer: Number(n), set, ...urls(Number(n)) })) }
  if (placeholderManifestFout(manifest)) throw new Error('fixture-manifest: ' + placeholderManifestFout(manifest))
  const reeks = placeholderReeksUitManifest(manifest)
  const ids = Array.from({ length: 60 }, (_, i) => (i % 3 ? `https://nos.nl/artikel/${2560000 + i * 977}` : `nrc:https://www.nrc.nl/nieuws/2026/11/15/stuk-${i}`))
  const base = ids.map((id) => ({ id, beeld: reeks.base(id) + 1 }))
  const lijsten = [0, 1, 2].map((t) => {
    const rows = Array.from({ length: 24 }, (_, i) => ({ id: `lijst-${t}-${i}`, bare: (t + i * 5) % 7 !== 0 }))
    return { naam: `lijst ${t}`, rows, beelden: Object.fromEntries([...reeks.plan(rows)].map(([id, k]) => [id, k + 1])) }
  })
  const kapot = (naam, wijzig) => {
    const m = structuredClone(manifest)
    wijzig(m)
    const fout = placeholderManifestFout(m)
    if (!fout) throw new Error('fixture: ' + naam + ' zou fout moeten zijn')
    return { naam, fout, manifest: m }
  }
  const ongeldig = [
    kapot('ander schema', (m) => (m.schema = 2)),
    kapot('geen versie', (m) => delete m.versie),
    kapot('count te klein', (m) => (m.count = 1)),
    kapot('uit buiten de reeks', (m) => m.uit.push(21)),
    kapot('beeld ontbreekt', (m) => (m.beelden = m.beelden.filter((b) => b.nummer !== 19))),
    kapot('url van een andere site', (m) => (m.beelden[0].licht.groot['2x'] = 'https://example.com/img/placeholder/beeld-1-licht-1600.webp?v=000000000000')),
    kapot('url zonder versie', (m) => (m.beelden[0].nacht.klein['2x'] = m.beelden[0].nacht.klein['2x'].replace(/\?v=.*/, ''))),
    kapot('alles in een set', (m) => m.beelden.forEach((b) => (b.set = 'zon'))),
  ]
  return { manifest, uit: uit, base, lijsten, ongeldig }
}

function swift(manifest, shaVan) {
  let s = '// Gegenereerd door scripts/placeholders.mjs uit shared/placeholder.mjs. Niet met de hand aanpassen.\n'
  s += '// De placeholderbeelden (knipsel): welke er zijn, hun set en hun bestand (ios/Hoot/Resources/Placeholder/).\n'
  s += '// PlaceholderBeeld (Beeldloos.swift) en WidgetBeeldloos tonen ze, zoals de WebP\'s op het web.\n'
  s += 'enum PlaceholderBeelden {\n'
  s += `    // Plekken in de hash (beeld 1 tot ${PLACEHOLDER_COUNT}); nil: uit het product.\n`
  s += '    static let familie: [String?] = [\n'
  PLACEHOLDERS.forEach((p, k) => (s += `        ${p ? `"${p.family}"` : 'nil'}, // ${k + 1} ${p ? p.naam : '(weg)'}\n`))
  s += '    ]\n'
  s += '    static let count = familie.count\n'
  s += '    // Uit het product (index): geen stuk krijgt ze (shared/placeholder.mjs, PLACEHOLDER_UIT).\n'
  s += `    static let uit: Set<Int> = [${PLACEHOLDER_UIT.join(', ')}]\n`
  s += '    // De beelden die wel gekozen worden, op volgorde.\n'
  s += '    static let keuze: [Int] = familie.indices.filter { !uit.contains($0) }\n'
  s += `    // Het beeld bij een hash: hash mod ${PLACEHOLDER_COUNT}, en valt dat op een lege plek, dan (hash / ${PLACEHOLDER_COUNT}) mod ${PLACEHOLDER_NUMMERS.length} uit de rest.\n`
  s += '    static func index(hash h: UInt32) -> Int {\n'
  s += '        let k = Int(h % UInt32(count))\n'
  s += '        return uit.contains(k) ? keuze[Int((h / UInt32(count)) % UInt32(keuze.count))] : k\n'
  s += '    }\n'
  s += '    // Bestandsnaam (zonder .webp) van beeld index in een weergave (licht, donker, nacht), groot (2:1) of klein (3:2).\n'
  s += '    static func bestand(_ index: Int, thema: String, klein: Bool) -> String { "ph-\\(index + 1)-\\(thema)\\(klein ? "-klein" : "")" }\n'
  const groot = PLACEHOLDER_MATEN.groot, klein = PLACEHOLDER_MATEN.klein
  const px = (m) => [Math.max(...m.maten), Math.round((Math.max(...m.maten) * m.crop.h) / m.crop.w)]
  s += `    // Maat van de bestanden in pixels.\n    static let groot = (w: ${px(groot)[0]}, h: ${px(groot)[1]})\n    static let klein = (w: ${px(klein)[0]}, h: ${px(klein)[1]})\n`
  s += '    // Het manifest op de server (landing/placeholders.json) dat precies deze bundel beschrijft: met deze versie hoeft de\n'
  s += '    // app niets op te halen (PlaceholderReeks, PlaceholderOphalen).\n'
  s += `    static let versie = "${manifest.versie}"\n`
  s += '    // Per bestand in de bundel de versie (eerste twaalf tekens van de sha256), zoals ?v= in het manifest: is die gelijk,\n'
  s += '    // dan is het gebundelde bestand hetzelfde beeld en hoeft het niet opgehaald.\n'
  s += '    static let versies: [String: String] = [\n'
  for (const n of PLACEHOLDER_NUMMERS) for (const theme of THEMES) for (const uitsnede of ['groot', 'klein']) {
    const naam = placeholderAppFile(n, theme, uitsnede).replace(/\.webp$/, '')
    s += `        "${naam}": "${placeholderVersie(shaVan(placeholderFile(n, theme, uitsnede, Math.max(...PLACEHOLDER_MATEN[uitsnede].maten))))}",\n`
  }
  s += '    ]\n'
  s += '}\n'
  return s
}

const sha = (buf) => createHash('sha256').update(buf).digest('hex')
const read = (path) => (existsSync(new URL(path, root)) ? readFileSync(new URL(path, root)) : null)

async function maak(b, bron) {
  const m = PLACEHOLDER_MATEN[b.uitsnede]
  const rechts = b.uitsnede === 'klein' && PLACEHOLDERS[b.n - 1].klein === 'rechts'
  const left = rechts ? PLACEHOLDER_BRON.w - m.crop.w : Math.round((PLACEHOLDER_BRON.w - m.crop.w) / 2), top = Math.round((PLACEHOLDER_BRON.h - m.crop.h) / 2)
  return sharp(bron).extract({ left, top, width: m.crop.w, height: m.crop.h }).resize(b.breed, b.hoog, { kernel: 'lanczos3' }).webp({ quality: PLACEHOLDER_KWALITEIT, effort: 6, smartSubsample: true }).toBuffer()
}

// Wat staat er in de map maar hoort er niet (meer) bij? (Oude SVG's, beelden die uit het product zijn.)
function overbodig(dir, hoort) {
  const url = new URL(dir, root)
  if (!existsSync(url)) return []
  return readdirSync(url, { withFileTypes: true }).filter((e) => e.isFile() && !e.name.startsWith('.') && !hoort.has(dir + e.name)).map((e) => dir + e.name)
}

export async function check() {
  const fouten = []
  const manifest = JSON.parse(read(MANIFEST)?.toString('utf8') ?? 'null')
  for (const [path, text] of textOutputs(manifest?.uit)) if (read(path)?.toString('utf8') !== text) fouten.push(`${path}: niet bij`)
  if (!manifest) fouten.push(`${MANIFEST}: ontbreekt`)
  else if (JSON.stringify(manifest.instellingen) !== JSON.stringify(instellingen())) fouten.push(`${MANIFEST}: instellingen veranderd`)
  const hoort = new Set([MANIFEST])
  for (const b of bitmaps()) {
    hoort.add(b.web)
    if (b.app) hoort.add(b.app)
    const web = read(b.web)
    if (!web) { fouten.push(`${b.web}: ontbreekt`); continue }
    const meta = await sharp(web).metadata()
    if (meta.format !== 'webp' || meta.width !== b.breed || meta.height !== b.hoog) fouten.push(`${b.web}: ${meta.format} ${meta.width} x ${meta.height}, verwacht webp ${b.breed} x ${b.hoog}`)
    if (manifest && manifest.uit?.[b.web] !== sha(web)) fouten.push(`${b.web}: niet gemaakt door dit script`)
    if (b.app && !read(b.app)?.equals(web)) fouten.push(`${b.app}: niet gelijk aan ${b.web}`)
  }
  for (const f of [...overbodig(WEB, hoort), ...overbodig(APP, hoort)]) fouten.push(`${f}: hoort er niet (meer) bij`)
  // De bronbeelden, als ze er zijn.
  if (manifest && existsSync(bronMap())) {
    for (const n of PLACEHOLDER_NUMMERS) for (const theme of THEMES) {
      const f = bronFile(n, theme)
      if (!existsSync(f)) fouten.push(`${f}: bron ontbreekt`)
      else if (manifest.bron?.[`beeld-${n}-${theme}.png`] !== sha(readFileSync(f))) fouten.push(`${f}: bron veranderd`)
    }
  }
  return fouten
}

export async function bouw() {
  const oud = JSON.parse(read(MANIFEST)?.toString('utf8') ?? 'null')
  const zelfde = oud && JSON.stringify(oud.instellingen) === JSON.stringify(instellingen())
  const manifest = { instellingen: instellingen(), bron: {}, uit: {} }
  for (const n of PLACEHOLDER_NUMMERS) for (const theme of THEMES) {
    const f = bronFile(n, theme)
    if (!existsSync(f)) throw new Error(`bron ontbreekt: ${f} (zet HOOT_PLACEHOLDER_BRON)`)
    const buf = readFileSync(f)
    const meta = await sharp(buf).metadata()
    if (meta.width !== PLACEHOLDER_BRON.w || meta.height !== PLACEHOLDER_BRON.h) throw new Error(`${f}: ${meta.width} x ${meta.height}, verwacht ${PLACEHOLDER_BRON.w} x ${PLACEHOLDER_BRON.h}`)
    manifest.bron[`beeld-${n}-${theme}.png`] = sha(buf)
  }
  for (const dir of [WEB, APP]) mkdirSync(new URL(dir, root), { recursive: true })
  let gemaakt = 0
  for (const b of bitmaps()) {
    const bestaand = read(b.web)
    const bijgewerkt = zelfde && bestaand && oud.bron[`beeld-${b.n}-${b.theme}.png`] === manifest.bron[`beeld-${b.n}-${b.theme}.png`] && oud.uit?.[b.web] === sha(bestaand)
    const buf = bijgewerkt ? bestaand : await maak(b, bronFile(b.n, b.theme))
    if (!bijgewerkt) { writeFileSync(new URL(b.web, root), buf); gemaakt++ }
    if (b.app && !read(b.app)?.equals(buf)) writeFileSync(new URL(b.app, root), buf)
    manifest.uit[b.web] = sha(buf)
  }
  writeFileSync(new URL(MANIFEST, root), JSON.stringify(manifest, null, 1) + '\n')
  for (const [path, text] of textOutputs(manifest.uit)) if (read(path)?.toString('utf8') !== text) { writeFileSync(new URL(path, root), text); console.log('geschreven:', path) }
  // Wat er niet meer bij hoort gaat naar de prullenbak (nooit rm).
  const hoort = new Set([MANIFEST, ...bitmaps().flatMap((b) => [b.web, b.app].filter(Boolean))])
  for (const f of [...overbodig(WEB, hoort), ...overbodig(APP, hoort)]) {
    const naam = f.replaceAll('/', '_')
    renameSync(new URL(f, root), join(homedir(), '.Trash', `${Date.now()}-${naam}`))
    console.log('naar de prullenbak:', f)
  }
  console.log(`${gemaakt} bitmaps gemaakt, ${bitmaps().length - gemaakt} waren al bij`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--check')) {
    const fouten = await check()
    if (fouten.length) {
      console.error('Niet bij (draai node scripts/placeholders.mjs):\n' + fouten.join('\n'))
      process.exit(1)
    }
    console.log('placeholders: alles bij')
  } else await bouw()
}
