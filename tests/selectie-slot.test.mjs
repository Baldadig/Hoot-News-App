// Selectie-review 14 november, punt 6 (eerste deel): de Selectie heeft een einde. Onder het laatste onderwerp staat
// "Je weet genoeg." met daaronder "Maandag een nieuwe.", op web en in de app woord voor woord gelijk, en "Ook deze week"
// is standaard ingeklapt. Nooit "houdt op".
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SLOT } from '../src/lib/selection-index.js'

const web = readFileSync(new URL('../src/views/Vak.jsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('../ios/Hoot/Views/DigestView.swift', import.meta.url), 'utf8')

test('het slot: twee zinnen, web en app gelijk', () => {
  assert.deepEqual(SLOT, ['Je weet genoeg.', 'Maandag een nieuwe.'])
  const swift = app.match(/static let slot = \[([^\]]+)\]/)
  assert.ok(swift, 'SelectionOverview.slot in DigestView.swift')
  assert.deepEqual(JSON.parse(`[${swift[1]}]`), SLOT)
  for (const t of [web, app]) assert.ok(!/houdt op/i.test(t))
})

test('het slot staat na het laatste onderwerp en vóór "Hoe kiest Hoot deze stukken?"', () => {
  const end = web.indexOf('className="dslot"')
  assert.ok(end > web.lastIndexOf('fields.map((f) =>'), 'na de onderwerpen')
  assert.ok(end < web.lastIndexOf('{how}'), 'voor de uitleg')
  assert.match(web, /\{SLOT\[0\]\}[\s\S]*\{SLOT\[1\]\}/)
  // App: na de ForEach van de onderwerpen, binnen de volle Selectie.
  assert.match(app, /\.id\(field\.id\)\s*\}\s*slot\s*\}/)
})

test('"Ook deze week" is standaard ingeklapt, op web en in de app', () => {
  assert.match(web, /<Disclosure className="dmore"[^>]*summary="Ook deze week">/)
  assert.ok(!/<Disclosure className="dmore"[^>]*\bopen\b/.test(web), 'niet open bij het laden')
  assert.match(app, /DisclosureGroup \{\s*ForEach\(field\.more\)/)
  assert.ok(!/DisclosureGroup\(isExpanded:\s*\.constant\(true\)/.test(app))
})
