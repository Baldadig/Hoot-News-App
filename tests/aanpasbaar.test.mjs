import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { EENMALIGE_TIPS, tipsTerug } from '../src/lib/tips.js'
import { SYNCED_PREFS } from '../src/lib/sync.js'

// Principe (17 november): elke keuze is altijd en overal aan te passen, op web en iOS gelijk.
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test("Wat Hoot leerde: 'Meer hiervan' als eigen groep, per onderwerp Ongedaan maken (web en iOS)", () => {
  const web = src('src/views/Settings.jsx')
  assert.match(web, /<p className="learned__sub">Meer hiervan<\/p>\s*<div className="rows">\s*\{summary\.more\.map\(\(t\) => \(\s*<Row key=\{t\} label=\{name\(t\)\}>\s*<button type="button" className="btn btn--quiet" onClick=\{\(\) => restore\(t\)\}>\s*Ongedaan maken/)
  assert.match(web, /supply: supplyOf\(pool\) \}\), prefs\.taste\)/, 'de smaak gaat mee naar profileSummary')
  // restore zet het onderwerp op nul, zoals bij Minder.
  assert.match(web, /const restore = \(t\) => setPref\('taste', \{ \.\.\.prefs\.taste, topics: \{ \.\.\.\(prefs\.taste\?\.topics \|\| \{\}\), \[t\]: 0 \} \}\)/)
  const ios = src('ios/Hoot/Views/SettingsView.swift')
  assert.match(ios, /Text\("Meer hiervan"\)/)
  assert.match(ios, /ForEach\(summary\.more, id: \\\.self\) \{ t in\s*LearnedRow\(title: Taste\.label\(t\), hint: nil, action: "Ongedaan maken"\) \{\s*withAnimation \{ store\.restoreLess\(t\) \}/)
  assert.match(src('ios/Hoot/Models.swift'), /var more: \[String\] = \[\]/)
})

test('Stel Hoot opnieuw in zet de eenmalige tips terug, je keuzes blijven', () => {
  const prefs = { kantenTip: true, installTipDone: true, interests: ['tech'], taste: { topics: { ai: 4 } }, onboarded: true }
  const out = tipsTerug(prefs)
  assert.equal(out.kantenTip, undefined)
  assert.equal(out.installTipDone, undefined)
  assert.deepEqual(out.interests, ['tech'])
  assert.deepEqual(out.taste, prefs.taste)
  assert.equal(out.onboarded, true)
  assert.equal(prefs.kantenTip, true, 'het origineel blijft ongemoeid')
  const zonder = { interests: [] }
  assert.equal(tipsTerug(zonder), zonder, 'niets te doen: hetzelfde object')
  // Tips horen bij het toestel, niet bij je account.
  for (const k of EENMALIGE_TIPS) assert.ok(!SYNCED_PREFS.includes(k), k)
  assert.match(src('src/App.jsx'), /onReset=\{\(\) => \{ setPrefs\(tipsTerug\); route\.go\('welkom'\) \}\}/)
  // iOS: dezelfde knop vergeet de kanten-tip.
  assert.match(src('ios/Hoot/Views/SettingsView.swift'), /private func reset\(\) \{[^}]*KantenTip\.terug\(\)/)
  assert.match(src('ios/Hoot/Views/EditionView.swift'), /static func terug\(_ defaults: UserDefaults = \.standard\) \{ defaults\.removeObject\(forKey: key\) \}/)
})
