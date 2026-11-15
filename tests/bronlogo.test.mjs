// Nachttest 14 november (A7): het merkbeeld van een bron valt niet meer terug op unavatar.io (429), maar op het
// eigen logo van Hoot, dat er voor elke bron in de catalogus is.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SOURCES, ownLogo, OWN_LOGO_BASE, OWN_LOGO_VERSIE } from '../netlify/lib/sources.mjs'

test('bronlogo: elke bron in de catalogus heeft een eigen logo; vakbronnen niet', () => {
  for (const s of SOURCES) {
    assert.ok(existsSync(new URL(`../landing/bronnen/${s.id}.webp`, import.meta.url)), s.id)
    assert.equal(ownLogo(s.id), `${OWN_LOGO_BASE}${s.id}.webp` + (OWN_LOGO_VERSIE[s.id] ? `?v=${OWN_LOGO_VERSIE[s.id]}` : ''))
  }
  assert.equal(ownLogo('vak:tpo'), null)
})

test('bronlogo: geen unavatar meer in de terugval; NOS heeft geen Bluesky-handle die niet bestaat', () => {
  for (const f of ['../netlify/lib/rss.mjs', '../netlify/lib/build.mjs']) assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /unavatar/)
  for (const id of ['nos', 'nos-economie', 'nos-sport', 'nos-cultuur']) {
    const s = SOURCES.find((x) => x.id === id)
    assert.equal(s.logo, ownLogo(id))
    assert.notEqual(s.bsky, 'nos.nl')
  }
})

test('bronlogo: de NOS-familie toont de rode O (beeldmerk, geen onleesbaar woordmerk) met een nieuwe url voor de cache', async () => {
  const { default: sharp } = await import('sharp')
  for (const id of ['nos', 'nos-economie', 'nos-sport', 'nos-cultuur']) {
    assert.match(ownLogo(id), /\.webp\?v=\d+$/, id)
    // midden wit (het gat van de O), op een kwart van de breedte merkrood
    const { data, info } = await sharp(fileURLToPath(new URL(`../landing/bronnen/${id}.webp`, import.meta.url))).raw().toBuffer({ resolveWithObject: true })
    const px = (x, y) => { const i = (y * info.width + x) * info.channels; return [data[i], data[i + 1], data[i + 2]] }
    const m = px(info.width >> 1, info.height >> 1), r = px(Math.round(info.width * 0.22), info.height >> 1)
    assert.ok(m.every((c) => c > 235), id + ' midden wit')
    assert.ok(r[0] > 200 && r[1] < 80 && r[2] < 80, id + ' ring rood ' + r)
  }
})
