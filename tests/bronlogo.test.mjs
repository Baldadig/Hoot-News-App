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

// Besluit Alex 15 november: "Mag je bij alle NOS bronnen stoppen." Elke bron die NOS heet (nieuws, Selectie, ook in het
// archief) toont dezelfde rode O: het eigen logo van de NOS uit de catalogus, met de versie in de url.
test('bronlogo: elke NOS-bron, ook in de Selectie, toont dezelfde rode O', async () => {
  const { VAK_SOURCES, composeVak } = await import('../netlify/lib/vak.mjs')
  const { MORE_SOURCES, ARCHIVED_SOURCES } = await import('../netlify/lib/vakBronnen.mjs')
  const isNos = (s) => /^NOS\b/.test(s.name)
  const nosIds = new Set(SOURCES.filter(isNos).map((s) => s.id))
  const oLogos = new Set([...nosIds].map(ownLogo))
  assert.deepEqual([...nosIds].sort(), ['nos', 'nos-cultuur', 'nos-economie', 'nos-sport'])
  // Het nieuws: het eigen bestand per bron (hierboven op kleur getoetst), allemaal met een versie.
  for (const id of nosIds) assert.match(SOURCES.find((s) => s.id === id).logo, /\.webp\?v=\d+$/, id)
  // De Selectie (in gebruik en in het archief): het logo van de NOS zelf, geen favicon van nos.nl.
  const vak = [...VAK_SOURCES, ...MORE_SOURCES, ...ARCHIVED_SOURCES].filter(isNos)
  assert.deepEqual([...new Set(vak.map((s) => s.id))].sort(), ['vak:nos-economie', 'vak:nos-media', 'vak:nos-politiek', 'vak:nos-sport', 'vak:nos-tech'])
  for (const s of vak) assert.ok(oLogos.has(s.logo), s.id + ' ' + s.logo)
  // Een stuk dat al in de voorraad stond (met de oude favicon) krijgt in de Selectie het logo van nu.
  const src = VAK_SOURCES.find((s) => s.id === 'vak:nos-tech')
  const now = Date.parse('2026-11-12T10:00:00Z')
  const pool = [{ id: 'n1', source: src.id, sourceName: src.name, title: 'Hoe een groot datalek bij een ziekenhuis ontstond en wat er nu verandert', summary: 'Een eigen intro over dit stuk en wat het betekent.', url: 'https://nos.nl/l/1', publishedAt: '2026-11-05T09:00:00Z', avatar: 'https://www.google.com/s2/favicons?domain=nos.nl&sz=128', avatarContain: true }]
  const out = composeVak(pool, { now, sources: [src] })
  const entry = out.fields.flatMap((f) => [...f.top, ...f.more]).find((e) => e.id === 'n1')
  assert.ok(entry, 'stuk in de Selectie')
  assert.equal(entry.avatar, src.logo)
  assert.equal(entry.avatarContain, false)
  // De deelkaart: dezelfde O voor de NOS-bronnen van de Selectie die in gebruik zijn.
  const marks = JSON.parse(readFileSync(new URL('../shared/deelkaart/publisher-marks.json', import.meta.url), 'utf8'))
  for (const id of nosIds) assert.equal(marks[id], marks.nos, id)
  for (const s of VAK_SOURCES.filter(isNos)) assert.equal(marks[s.id], marks.nos, s.id)
})

test('bronlogo: de NOS-podcasts horen bij de NOS (de cover van de show blijft die van de show)', async () => {
  const { SHOWS } = await import('../netlify/lib/luister.mjs')
  const nos = SHOWS.filter((s) => s.uitgever === 'NOS')
  assert.ok(nos.length >= 3)
  for (const s of nos) assert.equal(s.bron, 'nos', s.id)
})

// Besluit Alex 17 november: Nieuwsuur krijgt een eigen logo (de blauwe N uit hun eigen app-icoon), niet meer de favicon van
// nos.nl (het NOS-merk). Eigen bestand in landing/bronnen, geen catalogusbron; stuk in de voorraad krijgt het logo van nu.
test('bronlogo: Nieuwsuur toont de blauwe N, in de Selectie en op de deelkaart', async () => {
  const { default: sharp } = await import('sharp')
  const { VAK_SOURCES, composeVak } = await import('../netlify/lib/vak.mjs')
  const { MORE_SOURCES } = await import('../netlify/lib/vakBronnen.mjs')
  const src = [...VAK_SOURCES, ...MORE_SOURCES].find((s) => s.id === 'vak:nieuwsuur')
  assert.equal(src.logo, OWN_LOGO_BASE + 'nieuwsuur.webp')
  assert.notEqual(src.logo, ownLogo('nos'))
  const file = fileURLToPath(new URL('../landing/bronnen/nieuwsuur.webp', import.meta.url))
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true })
  assert.equal(info.width, 192)
  assert.equal(info.height, 192)
  const px = (x, y) => { const i = (y * info.width + x) * info.channels; return [data[i], data[i + 1], data[i + 2]] }
  const hoek = px(6, 6), n = px(Math.round(info.width * 0.33), Math.round(info.height * 0.3))
  assert.ok(hoek[2] > 200 && hoek[0] < 80, 'hoek blauw ' + hoek)
  assert.ok(n.every((c) => c > 200), 'de N is licht ' + n)
  const now = Date.parse('2026-11-12T10:00:00Z')
  const pool = [{ id: 'u1', source: src.id, sourceName: src.name, title: 'Waarom de rente en de inflatie blijven stijgen en wat dat voor de economie en huishoudens betekent', summary: 'Een eigen intro over de economie, de rente en de inflatie en wat het betekent voor huishoudens.', url: 'https://nos.nl/l/2', publishedAt: '2026-11-05T09:00:00Z', avatar: 'https://www.google.com/s2/favicons?domain=nos.nl&sz=128', avatarContain: true }]
  const out = composeVak(pool, { now, sources: [src] })
  const entry = out.fields.flatMap((f) => [...f.top, ...f.more]).find((e) => e.id === 'u1')
  assert.ok(entry, 'stuk in de Selectie')
  assert.equal(entry.avatar, src.logo)
  assert.equal(entry.avatarContain, false)
  const marks = JSON.parse(readFileSync(new URL('../shared/deelkaart/publisher-marks.json', import.meta.url), 'utf8'))
  assert.match(marks['vak:nieuwsuur'], /^data:image\/png;base64,iVBOR/)
  assert.notEqual(marks['vak:nieuwsuur'], marks.nos)
})
