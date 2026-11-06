// Hoot 1.1.1: beginschermiconen van de webapp in Rubrica.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// 6. Beginschermiconen van de webapp in Rubrica (#9A3324), papier op rood zoals het iOS-appicoon.
test('webiconen: vlak in Rubrica, h en punt in papier', async () => {
  const { default: sharp } = await import('sharp')
  const at = async (path, x, y) => {
    const { data, info } = await sharp(readFileSync(new URL(`../${path}`, import.meta.url))).raw().toBuffer({ resolveWithObject: true })
    const i = (y * info.width + x) * info.channels
    return [data[i], data[i + 1], data[i + 2]]
  }
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 2)
  const RED = [0x9a, 0x33, 0x24]
  for (const [path, s] of [['public/apple-touch-icon.png', 180], ['public/icons/icon-192.png', 192], ['public/icons/icon-512.png', 512], ['public/icons/maskable-512.png', 512]]) {
    assert.ok(near(await at(path, Math.round(s * 0.5), Math.round(s * 0.12)), RED), `${path}: vlak in Rubrica`)
  }
  assert.match(read('scripts/gen-icons.mjs'), /hoot-app-icon-rood\.svg/)
  assert.match(read('public/brand/hoot-app-icon-rood.svg'), /fill="#9A3324"/)
})
