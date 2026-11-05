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

test('r5-einde-rust en r5-seintje: de seintje-kaart staat onder het einde, met een dagdeel en de ochtend voorgekozen', () => {
  const app = read('ios/Hoot/Views/EditionView.swift')
  // Niet meer zwevend over de eindkaart (safeAreaInset), maar als kaart in de lijst ná het einde.
  const inset = app.slice(app.indexOf('.safeAreaInset(edge: .bottom)'), app.indexOf('// De stappen van het welkom vanaf de interesses'))
  assert.doesNotMatch(inset, /AlertOffer\(/)
  assert.match(app, /AlertOffer\(done: alertYes, slot: \$alertSlot/)
  assert.match(app, /static let standaard = "ochtend"/)
  assert.match(app, /\("avond", "Vroege avond"\)/)
  assert.match(app, /store\.notifySlots = AlertOffer\.slots\(for: alertSlot\)/)
  assert.doesNotMatch(app, /store\.notifySlots = EditionAlerts\.slots\.map/)
})

test('r5-selectie-onderwerpen: de app toont bij een lege Selectie hetzelfde voorproefje als het web', async () => {
  const { VOORPROEF } = await import('../src/lib/selection-index.js')
  const app = read('ios/Hoot/Views/DigestView.swift')
  assert.ok(app.includes(`static let voorproef = "${VOORPROEF}"`))
  assert.match(app, /voorproef\(SelectionOverview\.voorproefje\(store\.digest\)\)/)
})
