// Hoot 1.1.1, ronde 3 (keuzes van 5 november, "Na de review"): de app gelijk aan web-nu. Teksten en
// vormen die web en app allebei moeten hebben; het gedrag zelf staat in de eigen toetsen
// (stroom-einde, kanten-tip, selectie-voorproef, maak-van-jou en ios/HootTests/Ronde3Tests.swift).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('r5-stroom-einde: web en app eindigen bij je vorige bezoek, met dezelfde woorden', () => {
  const web = read('src/views/Stream.jsx')
  const app = read('ios/Hoot/Views/StreamView.swift')
  for (const zin of ['Hier was je gebleven', 'Je bent bij.', 'Ouder nieuws tonen']) {
    assert.ok(web.includes(zin), `web: ${zin}`)
    assert.ok(app.includes(zin), `app: ${zin}`)
  }
  assert.doesNotMatch(app, /Button\("Meer berichten"\)/, 'de Stroom laadt niet meer per knop door tot het eind')
  // Dezelfde grens: een dag, per keer zestig.
  const swift = read('ios/Hoot/StroomEinde.swift')
  assert.match(swift, /dag: TimeInterval = 24 \* 60 \* 60/)
  assert.match(swift, /page = 60/)
  assert.match(read('src/lib/stroom-einde.js'), /DAG = 24 \* 60 \* 60 \* 1000/)
})
