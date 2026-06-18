// Rastert het uil-icoon (public/icon.svg) naar alle PNG-formaten die de
// PWA en iOS-homescreen nodig hebben. Draaien met: npm run gen-icons
import sharp from 'sharp'
import { readFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const pub = resolve(here, '..', 'public')
const svg = await readFile(resolve(pub, 'icon.svg'))

await mkdir(resolve(pub, 'icons'), { recursive: true })

const targets = [
  { out: 'icons/icon-192.png', size: 192 },
  { out: 'icons/icon-512.png', size: 512 },
  { out: 'icons/maskable-512.png', size: 512 },
  { out: 'apple-touch-icon.png', size: 180 },
  { out: 'icons/favicon-32.png', size: 32 },
]

for (const t of targets) {
  await sharp(svg, { density: 384 }).resize(t.size, t.size).png().toFile(resolve(pub, t.out))
  console.log('✓', t.out)
}
console.log('Klaar — iconen gegenereerd.')
