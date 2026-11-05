// Maakt de vier iOS-appiconen (en hun voorbeelden in Instellingen) opnieuw in het merkrood, uit dezelfde
// vectorbron als de keuze van build 44 (docs/codex-blokken/appicoon-keuze/maak-iconen.mjs, de SVG's uit
// Hoot-appicoon): de h en de punt uit public/brand/hoot-app-icon-full.svg op een vlak van 192 × 192.
//   node scripts/appiconen.mjs                 schrijft de iconen in ios/Hoot/Assets.xcassets
//   node scripts/appiconen.mjs --rood=#rrggbb --controle
//                                              rekent met dat rood na of de bestaande iconen uit deze bron
//                                              komen (geen schrijven; getint mag 2 grijswaarden schelen)
// Donker blijft bij elke keuze de bestaande doorzichtige voorgrond (rode punt #EC7A70, dat rood wijzigt niet).
import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { Resvg } from '@resvg/resvg-js'

const root = new URL('../', import.meta.url)
const assets = new URL('ios/Hoot/Assets.xcassets/', root)
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
const tokens = JSON.parse(await readFile(new URL('docs/design-system/tokens.json', root), 'utf8'))
const brandRed = JSON.stringify(tokens).match(/"name":"brand-red","value":\{"light":"(#[0-9a-f]{6})"/i)[1]
const RED = (arg('rood') || brandRed).toLowerCase()
const PAPER = '#f5f1e8'
const INK = '#1a1814'
const controle = process.argv.includes('--controle')

const full = await readFile(new URL('public/brand/hoot-app-icon-full.svg', root), 'utf8')
const d = full.match(/<path fill="#1A1814" d="([^"]+)"/i)[1]
// Zelfde opbouw als de bron-SVG's van de keuze (A, B, D): vlak, dan de h en de punt, eventueel kleiner.
const icon = (title, bg, dot, scale = 1) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 192 192"><title>${title}</title><rect width="192" height="192" fill="${bg}"/><g transform="translate(96 96) scale(${scale}) translate(-96 -96)"><g transform="translate(31.5 155.5) scale(0.95)"><path fill="${PAPER}" d="${d}"/><circle cx="124.2" cy="-13" r="13" fill="${dot}"/></g></g></svg>`
const render = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng()
const gray = async (png) => sharp(png).toColourspace('b-w').removeAlpha().png().toBuffer()

const papierOpRood = icon('A · Papier op rood', RED, PAPER)
const sets = [
  // [appiconset, voorbeeld in Instellingen, licht, getint]
  ['AppIcon', 'IcoonRood', papierOpRood, papierOpRood],
  ['AppIconRuim', 'IcoonRuim', icon('B · Ruim rood', RED, PAPER, 0.82), icon('B · Ruim rood', RED, PAPER, 0.82)],
  ['AppIconZwart', 'IcoonZwart', icon('D · Papier op inkt', INK, RED), papierOpRood],
]

const files = new Map()
for (const [set, preview, light, tinted] of sets) {
  files.set(`${set}.appiconset/icon-1024.png`, await sharp(render(light, 1024)).removeAlpha().png().toBuffer())
  files.set(`${set}.appiconset/icon-1024-tinted.png`, await gray(render(tinted, 1024)))
  files.set(`${preview}.imageset/voorbeeld.png`, render(light, 180))
}
// Papier: het oorspronkelijke icoon (inkt-h met rode punt op papier), zoals public/brand/hoot-app-icon-full.svg.
const fullSvg = Buffer.from(full.replace(/(<circle[^>]*fill=")#[0-9a-f]{6}/i, `$1${RED.toUpperCase()}`))
const papier = await sharp(fullSvg, { density: 384 }).resize(1024, 1024).removeAlpha().png().toBuffer()
files.set('AppIconPapier.appiconset/icon-1024.png', papier)
files.set('AppIconPapier.appiconset/icon-1024-tinted.png', await gray(papier))
files.set('IcoonPapier.imageset/voorbeeld.png', await sharp(papier).resize(180, 180).png().toBuffer())

for (const [path, png] of files) {
  const url = new URL(path, assets)
  if (controle) {
    const [a, b] = await Promise.all([sharp(png).raw().toBuffer(), sharp(await readFile(url)).raw().toBuffer()])
    let diff = a.length === b.length ? 0 : Infinity
    if (diff === 0) for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 2) diff++
    console.log(diff === 0 ? '✓' : '✗', path, diff === 0 ? '' : `${diff} bytes anders`)
  } else {
    await writeFile(url, png)
    console.log('✓', path)
  }
}
console.log(controle ? `Controle met ${RED}.` : `Klaar — iconen in ${RED}.`)
