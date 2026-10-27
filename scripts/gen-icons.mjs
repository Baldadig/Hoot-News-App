// Rastert de merk-iconen (de h van Hoot in Newsreader 800, met een rode punt) (public/brand/*.svg) naar alle PNG-formaten die de
// PWA en iOS-homescreen nodig hebben. Draaien met: npm run gen-icons
import sharp from 'sharp'
import { readFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const pub = resolve(here, '..', 'public')
const rounded = await readFile(resolve(pub, 'brand/hoot-app-icon.svg')) // afgeronde hoeken
const full = await readFile(resolve(pub, 'brand/hoot-app-icon-full.svg')) // vlak tot de rand; iOS rondt zelf af
const maskable = await readFile(resolve(pub, 'brand/hoot-app-icon-maskable.svg')) // kleiner merk: Android snijdt er een cirkel of druppel uit
const dark = await readFile(resolve(pub, 'brand/hoot-app-icon-dark.svg'))
// Favicon: de h. zonder vlak eromheen, tot de rand, zodat hij past naast de favicons van kranten.
// De PNG's (voor browsers zonder SVG-favicon) in de lichte kleuren.
const favicon = (await readFile(resolve(pub, 'favicon.svg'), 'utf8')).replace(/@media[^{]*\{(?:[^{}]*\{[^}]*\})*\}/, '')

await mkdir(resolve(pub, 'icons'), { recursive: true })

const targets = [
  { out: 'icons/icon-192.png', size: 192, svg: rounded },
  { out: 'icons/icon-512.png', size: 512, svg: rounded },
  { out: 'icons/maskable-512.png', size: 512, svg: maskable },
  { out: 'icons/icon-dark-512.png', size: 512, svg: dark },
  { out: 'apple-touch-icon.png', size: 180, svg: full }, // iOS rondt zelf af
  { out: 'icons/favicon-48.png', size: 48, svg: Buffer.from(favicon) },
  { out: 'icons/favicon-32.png', size: 32, svg: Buffer.from(favicon) },
]

for (const t of targets) {
  await sharp(t.svg, { density: 384 }).resize(t.size, t.size).png().toFile(resolve(pub, t.out))
  console.log('✓', t.out)
}
// Deelafbeelding (Open Graph, 1200×630): een merkmoment in merkrood, met "hoot." in papierwit,
// een papieren balk erboven en een dunne lijn eronder.
{
  const RED = '#A3201B'
  const PAPER = '#F5F1E8'
  const logo = (await readFile(resolve(pub, 'brand/hoot-logo-ink.svg'), 'utf8')).replace(/#1A1814/gi, PAPER).replace(/#A3201B/gi, PAPER)
  const [, vw, vh] = logo.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
  const inner = logo.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  const h = 200
  const w = (h * vw) / vh
  const x = (1200 - w) / 2
  const y = (630 - h) / 2 + 10
  const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="${RED}"/><rect x="${x}" y="${y - 70}" width="${w}" height="18" fill="${PAPER}"/><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${vw} ${vh}">${inner}</svg><rect x="${x}" y="${y + h + 44}" width="${w}" height="6" fill="${PAPER}"/></svg>`
  await sharp(Buffer.from(og)).png().toFile(resolve(pub, 'og.png'))
  console.log('✓ og.png')
}
console.log('Klaar — iconen gegenereerd.')
