// Feedback 31 oktober, punten 3 en 4: Binnenland is Nederland, en de eerste Editie van een nieuwe lezer
// leunt niet op buitenland. Op twee vaste momentopnames: de avond van 30 oktober en de live feed van
// 31 oktober (ochtend, de feed waarop het keurpunt de vorige ronde zag falen). Dezelfde maten draait
// meting/acceptatie.mjs (tests/helpers/eerste.mjs) ook op de latere momentopnames.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { loadSnapshot } from './helpers/snapshot.mjs'
import { FIRST, measureFirst, verdictFirst, DREMPELS_EERSTE, measureBinnenland } from './helpers/eerste.mjs'

const ochtend = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/snapshot-2026-10-31-ochtend.json.gz', import.meta.url))).toString('utf8'))
const SNAPS = [['30 oktober avond', loadSnapshot()], ['31 oktober ochtend (live)', ochtend]]

for (const [label, snap] of SNAPS) {
  const rows = measureFirst(snap)
  const v = verdictFirst(rows)

  test(`${label} · eerste Editie: zeven nieuwe lezers, elk een volle Editie`, (t) => {
    t.diagnostic(rows.map((r) => `${r.id}: NL ${r.nl}, buitenland ${r.int}, passend ${r.passend}`).join(' · '))
    assert.equal(rows.length, FIRST.length)
    for (const r of rows) assert.equal(r.plekken, 10, r.id)
  })

  for (const d of DREMPELS_EERSTE.filter((x) => x.hard)) {
    test(`${label} · ${d.label} ${d.min !== undefined ? '≥ ' + d.min : '≤ ' + d.max}`, () => {
      if (d.min !== undefined) assert.ok(v[d.key] >= d.min, `${v[d.key]}`)
      else assert.ok(v[d.key] <= d.max, `${v[d.key]}`)
    })
  }

  test(`${label} · eerste Editie: de vriendin krijgt een Nederlandse voorpagina en meer Nederland dan buitenland`, () => {
    const r = rows.find((x) => x.id === 'vriendin')
    assert.ok(r.entries.some((e) => e.front && e.geo === 'NL'))
    assert.ok(r.nl > r.int, `NL ${r.nl}, buitenland ${r.int}`)
  })

  test(`${label} · Binnenland: geen bericht en geen plek in de algemene Editie die aantoonbaar niet Nederlands is`, (t) => {
    const b = measureBinnenland(snap)
    t.diagnostic(`${b.berichten} Binnenland-berichten, ${b.algemeen} Binnenland-plekken in de algemene Editie`)
    assert.equal(b.zonderNl, 0, b.fout.map((i) => `${i.source} (${i.reden}): ${i.title}`).join(' | '))
    assert.equal(b.algemeenZonderNl, 0)
    assert.ok(b.berichten > 146, 'het aanbod Binnenland is breder dan alleen NOS, NRC en de Volkskrant')
  })
}

// Het keurpunt van de vorige ronde, op de live feed: deze stukken stonden onder Binnenland.
test('31 oktober ochtend (live) · Binnenland: Apple, Google, Pangram en Anthropic staan er niet meer onder', () => {
  const b = measureBinnenland(ochtend, { sample: 1e4 })
  const titles = b.steekproef.map((i) => i.title)
  for (const kop of ['Apple haalt Nvidia in', 'Met AI snijdt Google', 'Pangram als oldschool actieheld', 'Beursgang Anthropic']) assert.ok(!titles.some((x) => x.startsWith(kop)), kop)
  assert.ok(titles.some((x) => x.startsWith('Zeehondencentrum')), 'het zeehondencentrum blijft Binnenland')
})

// De vriendin op de live feed: geen Wetenschap-rubriek of -reden bij buitenlands nieuws.
test('31 oktober ochtend (live) · eerste Editie: de vriendin krijgt geen buitenland met een reden van haar interesses', () => {
  const r = measureFirst(ochtend, FIRST.filter((p) => p.id === 'vriendin'))[0]
  for (const e of r.entries.filter((x) => x.geo === 'INT' && !x.fixed && !x.front)) assert.ok(!/Wetenschap|Binnenland/.test(e.whyText), `${e.title}: ${e.whyText}`)
})
