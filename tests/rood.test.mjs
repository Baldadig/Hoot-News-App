import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
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

// Een proefscherm van 320 × 320 papier met een 'foto' van 160 × 160 (ruis, met een vlak merkrood
// van 64 × 64 erin, zoals een vlag) en daarbuiten een rode streep van 2 × 64 (een rolregel).
async function screen(file, { photo = true, block = false } = {}) {
  const W = 320
  const px = Buffer.alloc(W * W * 3, 0xf5)
  const put = (x, y, rgb) => px.set(rgb, (y * W + x) * 3)
  let seed = 7
  const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) >>> 24
  if (photo) {
    for (let y = 32; y < 192; y++) for (let x = 32; x < 192; x++) put(x, y, [rnd(), rnd(), rnd()])
    for (let y = 64; y < 128; y++) for (let x = 64; x < 128; x++) put(x, y, [0xa3, 0x20, 0x1b])
  }
  for (let y = 240; y < 242; y++) for (let x = 32; x < 96; x++) put(x, y, [0xa3, 0x20, 0x1b])
  // Desgewenst een rood vlak van 48 × 48 buiten de foto (2,25 procent): echt ontwerprood.
  if (block) for (let y = 256; y < 304; y++) for (let x = 224; x < 272; x++) put(x, y, [0xa3, 0x20, 0x1b])
  writeFileSync(file, await sharp(px, { raw: { width: W, height: W, channels: 3 } }).png().toBuffer())
}

test("foto's tellen niet: het masker laat de foto weg, ook het vlakke rood erin, maar niet de rolregel", async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rood-'))
  try {
    const file = join(dir, 'proef.png')
    await screen(file)
    const met = await redShare(file)
    const zonder = await redShare(file, { mask: true })
    // Met beeld: 64 × 64 vlag + 128 rolregel (+ wat toevallig rode ruis) op 320 × 320.
    assert.ok(met.raw > 4, `met beeld ${met.raw}`)
    assert.equal(met.photo, 0)
    // Zonder: alleen de rolregel, 128 / 102400 = 0,125 procent.
    assert.equal(zonder.pct, 0.125)
    assert.ok(zonder.photo >= 25 && zonder.photo <= 30, `beeld ${zonder.photo}`)
    // Een scherm zonder foto krijgt geen masker.
    await screen(file, { photo: false })
    assert.equal((await redShare(file, { mask: true })).photo, 0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('exitcode: masker met foto is na te kijken, de opname zonder beeld beslist, --met-beeld telt alles', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rood-'))
  const run = (...a) => spawnSync(process.execPath, ['scripts/rood-meting.mjs', dir, ...a], { encoding: 'utf8' })
  try {
    await screen(join(dir, 'editie-boven--390--licht.png'))
    // Masker: de foto valt weg, binnen de grens, exit 0.
    let r = run()
    assert.equal(r.status, 0, r.stdout + r.stderr)
    assert.match(readFileSync(join(dir, 'INDEX.md'), 'utf8'), /\| editie-boven--390--licht \| 390 \| licht \| 0,1 % \| 2\d,\d % \| masker \|/)
    // Met beeld: het rood van de foto telt, over de grens, exit 1.
    r = run('--met-beeld')
    assert.equal(r.status, 1, r.stdout)
    // Echt rood buiten de foto, maar wel een foto in beeld: na te kijken, geen exit 1.
    await screen(join(dir, 'editie-boven--390--licht.png'), { block: true })
    r = run()
    assert.equal(r.status, 0, r.stdout)
    assert.match(r.stdout, /1 na te kijken/)
    assert.match(readFileSync(join(dir, 'INDEX.md'), 'utf8'), /≤ 1,0, na te kijken \|/)
    // De tweelingopname zonder beeld gaat voor en telt niet als eigen scherm.
    // Met dat vlak erin is het een echte overschrijding: exit 1.
    await screen(join(dir, 'editie-boven--390--licht--zonder-beeld.png'), { photo: false, block: true })
    r = run()
    assert.equal(r.status, 1, r.stdout)
    let md = readFileSync(join(dir, 'INDEX.md'), 'utf8')
    assert.match(md, /^1 schermen/m)
    assert.match(md, /\| \*\*2,4 %\*\* \| – \| zonder beeld \|/)
    await screen(join(dir, 'editie-boven--390--licht--zonder-beeld.png'), { photo: false })
    r = run()
    assert.equal(r.status, 0, r.stdout)
    md = readFileSync(join(dir, 'INDEX.md'), 'utf8')
    assert.match(md, /\| 0,1 % \| – \| zonder beeld \|/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
