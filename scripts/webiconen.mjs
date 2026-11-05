// De beginschermiconen van de webapp in het merkrood (1.1.1), op dezelfde manier als de iOS-appiconen
// (scripts/appiconen.mjs, keuze A · Papier op rood): de h en de punt in papier uit
// public/brand/hoot-app-icon-full.svg op een vlak in brand-red uit docs/design-system/tokens.json (Rubrica #9A3324).
//   node scripts/webiconen.mjs             schrijft de drie bron-SVG's (public/brand/hoot-app-icon-rood*.svg)
//                                          en de vier PNG's: apple-touch-icon.png (180, tot de rand: iOS rondt zelf af),
//                                          icons/icon-192.png en icon-512.png (afgeronde hoeken, rx 42 zoals de bron)
//                                          en icons/maskable-512.png (merk op 70 %: Android snijdt er een vorm uit).
//   node scripts/webiconen.mjs --controle  rekent na of de PNG's uit deze bron komen (niets schrijven)
// scripts/gen-icons.mjs leest dezelfde -rood-bronnen, zodat een volgende run van gen-icons het rood houdt.
import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { Resvg } from '@resvg/resvg-js'

const root = new URL('../', import.meta.url)
const tokens = JSON.parse(await readFile(new URL('docs/design-system/tokens.json', root), 'utf8'))
const RED = JSON.stringify(tokens).match(/"name":"brand-red","value":\{"light":"(#[0-9a-f]{6})"/i)[1].toUpperCase()
const PAPER = '#F5F1E8'
const controle = process.argv.includes('--controle')

const full = await readFile(new URL('public/brand/hoot-app-icon-full.svg', root), 'utf8')
const d = full.match(/<path fill="#1A1814" d="([^"]+)"/i)[1]
// Zelfde opbouw als icon() in scripts/appiconen.mjs: vlak, dan de h en de punt (eventueel kleiner, rond het midden).
const icon = ({ rx = 0, scale = 1 } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" role="img" aria-label="Hoot"><rect width="192" height="192"${rx ? ` rx="${rx}"` : ''} fill="${RED}"/><g transform="translate(96 96) scale(${scale}) translate(-96 -96)"><g transform="translate(31.5 155.5) scale(0.95)"><path fill="${PAPER}" d="${d}"/><circle cx="124.2" cy="-13" r="13" fill="${PAPER}"/></g></g></svg>\n`

const svgs = {
  'public/brand/hoot-app-icon-rood.svg': icon({ rx: 42 }),
  'public/brand/hoot-app-icon-rood-full.svg': icon(),
  'public/brand/hoot-app-icon-rood-maskable.svg': icon({ scale: 0.7 }),
}
const render = async (svg, size, flat) => {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  return flat ? sharp(png).removeAlpha().png().toBuffer() : sharp(png).png().toBuffer()
}
const pngs = {
  'public/apple-touch-icon.png': await render(svgs['public/brand/hoot-app-icon-rood-full.svg'], 180, true),
  'public/icons/icon-192.png': await render(svgs['public/brand/hoot-app-icon-rood.svg'], 192),
  'public/icons/icon-512.png': await render(svgs['public/brand/hoot-app-icon-rood.svg'], 512),
  'public/icons/maskable-512.png': await render(svgs['public/brand/hoot-app-icon-rood-maskable.svg'], 512, true),
}

for (const [path, data] of Object.entries({ ...svgs, ...pngs })) {
  const url = new URL(path, root)
  if (controle) {
    const now = await readFile(url).catch(() => null)
    const same = now && (path.endsWith('.svg') ? now.toString() === data : Buffer.compare(await sharp(now).raw().toBuffer(), await sharp(data).raw().toBuffer()) === 0)
    console.log(same ? '✓' : '✗', path)
  } else {
    await writeFile(url, data)
    console.log('✓', path)
  }
}
console.log(controle ? `Controle met ${RED}.` : `Klaar — webiconen in ${RED}.`)
