// Lezer bij een tijdelijke fout (build 47): één stille nieuwe poging in ArticleLoader, daarna de melding met
// drie knoppen, "Probeer opnieuw" als hoofdknop. Gedrag zelf: ios/HootTests/ReaderRetryTests.swift.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('elke foutweg loopt via temporaryFailure, nergens meer direct naar .failed', () => {
  const loader = read('ios/Hoot/Reader/ArticleLoader.swift')
  assert.equal((loader.match(/state = \.failed/g) || []).length, 1, 'alleen temporaryFailure zet .failed')
  for (const weg of ['didFail navigation', 'didFailProvisionalNavigation', 'Task.sleep(for: .seconds(20))']) {
    const i = loader.indexOf(weg)
    assert.ok(i > 0, weg)
    assert.match(loader.slice(i, i + 400), /temporaryFailure\(\)/, weg)
  }
  assert.match(loader.slice(loader.indexOf('} else if attempts < 2')), /temporaryFailure\(\)/, 'extractie')
})

test('melding: tekst en drie knoppen, Probeer opnieuw als hoofdknop', () => {
  const view = read('ios/Hoot/Reader/ArticleReaderView.swift')
  assert.match(view, /"Dit artikel lukt even niet in de lezer"/)
  assert.match(view, /"Soms laadt de pagina niet goed\. Probeer het opnieuw, of lees het op de website\."/)
  const failed = view.slice(view.indexOf('case .failed:'), view.indexOf('.background(Theme.paper)'))
  const order = ['Probeer opnieuw', 'Open op de website', 'Toon de pagina hier'].map((t) => failed.indexOf(`Button("${t}")`))
  assert.ok(order.every((i) => i > 0) && order[0] < order[1] && order[1] < order[2], 'volgorde')
  assert.match(failed, /Button\("Probeer opnieuw"\) \{ loader\.reload\(\) \}\.buttonStyle\(\.ink\)/)
  assert.ok(!/lukt niet in de lezer/.test(view.replace('lukt even niet in de lezer', '')), 'de oude definitieve melding is weg')
})
