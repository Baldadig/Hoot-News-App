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

await mkdir(resolve(pub, 'icons'), { recursive: true })

const targets = [
  { out: 'icons/icon-192.png', size: 192, svg: rounded },
  { out: 'icons/icon-512.png', size: 512, svg: rounded },
  { out: 'icons/maskable-512.png', size: 512, svg: maskable },
  { out: 'icons/icon-dark-512.png', size: 512, svg: dark },
  { out: 'apple-touch-icon.png', size: 180, svg: full }, // iOS rondt zelf af
  { out: 'icons/favicon-48.png', size: 48, svg: rounded },
  { out: 'icons/favicon-32.png', size: 32, svg: rounded },
]

for (const t of targets) {
  await sharp(t.svg, { density: 384 }).resize(t.size, t.size).png().toFile(resolve(pub, t.out))
  console.log('✓', t.out)
}
console.log('Klaar — iconen gegenereerd.')
