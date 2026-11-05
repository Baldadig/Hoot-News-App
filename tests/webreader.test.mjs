import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Keuze r5-webreader (5 november, OVERDRACHT §11 optie 1): op het web opent een artikel in hetzelfde
// tabblad. Terug brengt je naar dezelfde plek (scrollpositie en tab), en gelezen is gemarkeerd.
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const ARTIKELEN = ['src/components/Items.jsx', 'src/views/Edition.jsx', 'src/views/Story.jsx', 'src/views/Vak.jsx', 'src/components/BriefReader.jsx']

test('artikelen openen in hetzelfde tabblad, zonder verwijzer', () => {
  for (const f of ARTIKELEN) {
    const s = src(f)
    assert.doesNotMatch(s, /target="_blank"/, f)
    // Elke link naar een artikel houdt rel="noreferrer": de uitgever ziet niet vanaf welke pagina.
    for (const m of s.matchAll(/<a [^>]*href=\{(?:linkOf\([^)]*\)|[a-z.]+url)\}[^>]*>/g)) assert.match(m[0], /rel="noreferrer"/, `${f}: ${m[0]}`)
  }
})

test('links buiten het nieuws (Baldadig, voorwaarden) openen nog apart', () => {
  for (const f of ['src/views/Over.jsx', 'src/views/Privacy.jsx', 'src/views/Settings.jsx', 'src/components/Terms.jsx']) assert.match(src(f), /target="_blank"/, f)
})

test('de weg terug: plek vastleggen bij weggaan, gelezen meteen bewaard, geen opstartscherm', () => {
  const mem = src('src/hooks/useScrollMemory.js')
  assert.match(mem, /addEventListener\('pagehide', onLeave\)/)
  assert.match(mem, /removeEventListener\('pagehide', onLeave\)/)
  assert.match(src('src/App.jsx'), /writeJSON\('hoot:read', \[\.\.\.readIds, id\]\.slice\(-1500\)\)/)
  assert.match(src('index.html'), /nav\.type === 'back_forward'\) return s\.remove\(\)/)
  // De Stroom-tab staat in het adres (?rubriek=…), het verhaal ook (?verhaal=…): terug houdt beide.
  assert.match(src('src/App.jsx'), /route\.go\(route\.path, \{ \.\.\.route\.params, verhaal: id \}\)/)
})
