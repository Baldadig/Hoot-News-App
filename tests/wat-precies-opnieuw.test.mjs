// Vraag van Alex (17 november): waar is de tweede laag interesses in het menu? Op het web opent Instellingen › Interesses
// het welkom bij opnieuw kiezen (#/welkom); daar staan nu, net als in de app (InterestsList, TopicChips), onder elke
// gekozen interesse de onderwerpen als pillen. Achterklap & showbizz (OPT_IN) staat in dezelfde groep onder Cultuur.
// Het eerste welkom blijft zoals het was: daar alleen de OPT_IN-pil.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { pickedFrom, withOptIn, applyWelcome } from '../src/lib/welcome.js'
import { INTERESTS, OPT_IN, resolveTopics } from '../src/lib/topics.js'

const web = readFileSync(new URL('../src/views/Welcome.jsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('../ios/Hoot/Views/SettingsView.swift', import.meta.url), 'utf8')
const toggleIn = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

// Wat Welcome.jsx doet: beginnen bij wat je volgt, aantikken, en bij Naar je Editie de onderwerpen uitrekenen.
const start = (topics, interests) => pickedFrom(topics.filter((t) => !OPT_IN.has(t)), interests, INTERESTS)
const save = (interests, picked, optIn) => withOptIn(resolveTopics(interests, picked.filter((t) => !OPT_IN.has(t))), interests, optIn)

test('opnieuw kiezen: onder elke gekozen interesse alle onderwerpen als pillen, alleen dan', () => {
  // Zelfde voorwaarde als de Selectie-uitklapper: opnieuw kiezen na een echte keuze.
  assert.match(web, /chosen=\{picked\} onTopic=\{\(id\) => setPicked\(\(l\) => toggleIn\(l, id\)\)\}[^\n]*selectie=\{reopen && !prefs\.browsing\}/)
  assert.match(web, /INTERESTS\.filter\(\(i\) => interests\.includes\(i\.id\) && \(selectie \|\| i\.topics\.some\(\(t\) => OPT_IN\.has\(t\)\)\)\)/)
  assert.match(web, /i\.topics\.filter\(\(t\) => selectie \|\| OPT_IN\.has\(t\)\)/)
  // Eén groep per interesse (Onder Cultuur, met Achterklap & showbizz erin), dezelfde pil en ChipGroup als de rest.
  assert.equal(web.match(/label=\{`Onder \$\{i\.label\}`\}/g)?.length, 1)
  assert.match(web, /className="pill" aria-pressed=\{OPT_IN\.has\(t\) \? optIn\.includes\(t\) : chosen\.includes\(t\)\} onClick=\{\(\) => \(OPT_IN\.has\(t\) \? onOptIn\(t\) : onTopic\(t\)\)\}/)
  // De voetnoot van de app, woord voor woord.
  const note = 'Kies je niets, dan krijg je alles. Groot nieuws staat altijd bovenaan.'
  assert.ok(app.includes(`Text("${note}")`))
  assert.match(web, new RegExp(`\\{selectie && interests\\.length \\? <p className="ob__selnote">${note.replace(/\./g, '\\.')}</p> : null\\}`))
})

test('aantikken wordt prefs.topics, op dezelfde manier als het welkom het opslaat', () => {
  const prefs = { onboarded: true, interests: ['politiek', 'cultuur'], topics: [...resolveTopics(['politiek', 'cultuur'], []), 'showbizz'], pinned: [] }
  // Alles gevolgd: niets staat aangetikt (alles), showbizz wel.
  let picked = start(prefs.topics, prefs.interests)
  assert.deepEqual(picked, [])
  const optIn = prefs.topics.filter((t) => OPT_IN.has(t))
  assert.deepEqual(save(prefs.interests, picked, optIn), prefs.topics, 'niets veranderd is niets veranderd')
  // Eén onderwerp onder Politiek aantikken: Politiek wordt alleen dat, Cultuur blijft alles met showbizz.
  const een = INTERESTS.find((i) => i.id === 'politiek').topics[0]
  picked = toggleIn(picked, een)
  const topics = save(prefs.interests, picked, optIn)
  const cultuur = resolveTopics(['cultuur'], [])
  assert.deepEqual(topics, [een, ...cultuur, 'showbizz'])
  const p = applyWelcome(prefs, { interests: prefs.interests, topics, sources: [], all: [] })
  assert.deepEqual(p.topics, topics, 'zo komt het in prefs (en via de sync in je account)')
  // Terug bij opnieuw kiezen staat het aangetikt.
  assert.deepEqual(start(p.topics, p.interests), [een])
  // Alles aantikken is hetzelfde als niets: alles.
  const alle = INTERESTS.find((i) => i.id === 'politiek').topics.filter((t) => !OPT_IN.has(t))
  assert.deepEqual(save(['politiek'], alle, []), save(['politiek'], [], []))
  assert.deepEqual(start(save(['politiek'], alle, []), ['politiek']), [])
})
