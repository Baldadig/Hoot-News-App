// Redacteur 3b · ronde 2 · 5: de taalsplitsing in zeer duidelijke gevallen. Dezelfde eigen naam in beide koppen én
// dezelfde handeling in beide koppen (een vonnis, een sluiting, een opstappen, een arrestatie, een overlijden), vlak
// na elkaar, is dezelfde gebeurtenis, ook over de taalgrens (sameEvent regel E). Een Nederlandse naam met een
// bijvoeglijke -s ("Woudenbergs stel") is dezelfde naam. Geen megabundels: precies één soort handeling per kop.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { signatures, sameEvent, buildStories } from '../netlify/lib/stories.mjs'

const T = Date.parse('2026-11-03T15:00:00Z')
const at = (h) => new Date(T - h * 36e5).toISOString()
let n = 0
const art = (source, title, summary, h = 1) => ({ id: `t${++n}`, kind: 'article', source, title, summary, publishedAt: at(h) })
const same = (a, b, pool = [a, b]) => {
  const sig = signatures(pool, [], { extended: true })
  return sameEvent(sig.get(a.id), sig.get(b.id), true)
}

test('taalsplitsing: zelfde naam en zelfde handeling, ook in een andere taal', () => {
  const nrc = art('nrc', 'Onafhankelijke Russische krant Novaja Gazeta stopt onder druk', 'De krant Novaja Gazeta werd steeds meer onder druk gezet.')
  const guardian = art('guardian', 'Russian society crushed, says Novaya Gazeta as newspaper announces closure', 'The outlet Novaya Gazeta, whose editor won the Nobel prize, will close.')
  assert.equal(same(nrc, guardian), true)
  const nos = art('nos', 'Woudenbergs stel krijgt 20 en 12 jaar cel met tbs voor misbruiken oppaskinderen', 'De 57-jarige man uit Woudenberg en zijn ex-vrouw moeten de cel in.')
  const nrc2 = art('nrc', 'Celstraffen van twintig en twaalf jaar voor ouders Woudenberg die oppaskinderen misbruikten', 'Het Openbaar Ministerie had meer geëist tegen het stel uit Woudenberg.')
  assert.equal(same(nos, nrc2), true)
})

test('taalsplitsing: geen binding zonder dezelfde naam, zonder dezelfde handeling, of met een overzichtskop', () => {
  // Zelfde handeling, andere naam.
  const a = art('nos', 'Rechtbank veroordeelt Amsterdamse vastgoedhandelaar Dekker tot vier jaar cel', 'De rechter in Amsterdam vond Dekker schuldig.')
  const b = art('bbc', 'London court sentences banker Whitmore to prison term for fraud', 'The judge said Whitmore had shown no remorse.')
  assert.equal(same(a, b), false)
  // Zelfde naam, andere handeling.
  const c = art('nrc', 'Krant Novaja Gazeta stopt onder druk van het Kremlin', 'Novaja Gazeta was de laatste onafhankelijke krant.')
  const d = art('guardian', 'Novaya Gazeta editor Muratov arrested in Moscow', 'Police detained the editor of Novaya Gazeta.')
  assert.equal(same(c, d), false)
  // Een overzichtskop met meer handelingen bindt niet.
  const e = art('nos', 'Wekdienst: Gazeta stopt, Woudenberg-zaak: vonnis vandaag', 'Goedemorgen! Vandaag het vonnis in Woudenberg en de Gazeta stopt.')
  const f = art('nrc', 'Krant Novaja Gazeta stopt onder druk', 'Novaja Gazeta was de laatste onafhankelijke krant.')
  assert.equal(same(e, f), false)
  // Ver uit elkaar (meer dan twaalf uur) bindt regel E niet.
  const g = art('nrc', 'Krant Novaja Gazeta stopt onder druk', 'Novaja Gazeta was de laatste onafhankelijke krant.', 1)
  const h = art('guardian', 'Novaya Gazeta announces closure amid pressure', 'The outlet Novaya Gazeta will close.', 20)
  assert.equal(same(g, h), false)
})

test('taalsplitsing: een Engelse meervouds-s is geen naam (Democrats, Elections), en er ontstaat geen megabundel', () => {
  const pool = [
    art('nyt', 'Democrats Win the House as Voters Reject Trump', 'Many Democrat candidates won.'),
    art('atlantic', 'The Real Threat of Election Interference', 'The Democrat party warned about Election interference.'),
    art('nos', 'Woudenbergs stel krijgt 20 jaar cel', 'Het stel uit Woudenberg moet de cel in.'),
    art('rtl', 'Tot 20 jaar cel voor misbruik in Woudenberg', 'Het stel uit Woudenberg is veroordeeld.'),
  ]
  const sig = signatures(pool, [], { extended: true })
  assert.ok(!sig.get(pool[0].id).strong.has('democrat'))
  const stories = buildStories(pool, {}, { keys: true, extended: true })
  const of = (id) => stories.find((s) => s.itemIds.includes(id))?.id ?? id
  assert.equal(of(pool[2].id), of(pool[3].id))
  assert.notEqual(of(pool[0].id), of(pool[2].id))
  assert.notEqual(of(pool[0].id), of(pool[1].id))
})
