import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import sharp from 'sharp'
import { kindOf, redShare } from '../scripts/rood-meting.mjs'

// De rood-meting (scripts/rood-meting.mjs, D5): soort per jobnaam en het aandeel rood per beeld.
test('soort per naam: merkmoment vrij, bediening ≤ 1,5, de rest leesscherm ≤ 1,0', () => {
  const k = (n) => [kindOf(n).kind, kindOf(n).max]
  for (const n of ['editie-einde', 'welkom-1', 'welkom-snel', 'opstart', 'opstart-iris', 'ios-licht-04-editie-einde', 'web-welkom-1-start--390--licht']) assert.deepEqual(k(n), ['merkmoment', null], n)
  for (const n of ['bronnen-boven', 'palet-blad-bronnen', 'instellingen-midden', 'groot-instellingen-boven', 'welkom-2-gekozen', 'welkom-5', 'stroom-filters', 'stroom-bronnen-open', 'account-weergave', 'join-blad', 'focus-chip', 'hover-nav', 'b1-instellingen-donker']) assert.deepEqual(k(n), ['bediening', 1.5], n)
  for (const n of ['editie-boven', 'stroom-bron-gekozen', 'welkom-10', 'lezer', 'selectie-onderwerpen', 'b1-einde-licht']) assert.deepEqual(k(n), ['leesscherm', 1.0], n)
})

test('rood telt binnen een RGB-afstand van 48 tot #a3201b en #ec7a70', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rood-'))
  try {
    // 10 × 10 papier, met 3 pixels merkrood, 2 bijna-rood (afstand 40) en 1 te ver weg (afstand 60).
    const px = Buffer.alloc(10 * 10 * 3, 0xf5)
    const put = (i, [r, g, b]) => px.set([r, g, b], i * 3)
    put(0, [0xa3, 0x20, 0x1b])
    put(1, [0xa3, 0x20, 0x1b])
    put(2, [0xec, 0x7a, 0x70])
    put(3, [0xa3 + 40, 0x20, 0x1b])
    put(4, [0xec, 0x7a - 24, 0x70 + 32])
    put(5, [0xa3, 0x20 + 60, 0x1b])
    const file = join(dir, 'proef.png')
    writeFileSync(file, await sharp(px, { raw: { width: 10, height: 10, channels: 3 } }).png().toBuffer())
    const { pct, width } = await redShare(file)
    assert.equal(width, 10)
    assert.equal(pct, 5)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
