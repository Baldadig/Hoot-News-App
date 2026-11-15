// De Selectie-keuzes van 15 november: de maat (hooguit acht, geen "alles in één keer"), de taal ("Ook Engelstalige
// stukken") en Sport en Geschiedenis uit de keuze. Web en app gelijk.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { VAK_MAX, VAK_MAX_TEKST, canChoose, pickDomains, ENGELS, englishOn, followsEnglish, inLanguage, voorproefje } from '../src/lib/selection-index.js'
import { vakByDomain, VAK_UIT_KEUZE, inKeuze, VAK_FIELDS } from '../shared/vak.mjs'
import { normalizePrefs, DEFAULT_PREFS } from '../src/lib/prefs.js'
import { SYNCED_PREFS } from '../src/lib/sync.js'

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const digestView = read('ios/Hoot/Views/DigestView.swift')
const settingsView = read('ios/Hoot/Views/SettingsView.swift')
const welcomeView = read('ios/Hoot/Views/WelcomeView.swift')
const store = read('ios/Hoot/HootStore.swift')

test('de maat: hooguit acht, wie al meer volgt houdt ze; zelfde tekst in de app', () => {
  assert.equal(VAK_MAX, 8)
  const acht = ['merk', 'seo', 'pr', 'ux', 'ai', 'dev', 'data', 'hr']
  assert.equal(canChoose(acht.slice(0, 7), 'film'), true)
  assert.equal(canChoose(acht, 'film'), false)
  assert.equal(canChoose(acht, 'ux'), true, 'weghalen kan altijd')
  assert.equal(canChoose([...acht, 'film', 'muziek'], 'film'), true, 'een zachte grens: wie meer had, houdt ze')
  assert.match(digestView, new RegExp(`static let max = ${VAK_MAX}\\b`))
  assert.ok(digestView.includes(`static let maxTekst = "${VAK_MAX_TEKST}"`))
  // Geen "alles in één keer" meer, nergens.
  for (const f of ['src/views/Settings.jsx', 'src/views/Vak.jsx', 'src/views/Welcome.jsx', 'src/lib/selection-index.js', 'ios/Hoot/Views/SettingsView.swift', 'ios/Hoot/Views/DigestView.swift']) assert.doesNotMatch(read(f), /Alle onderwerpen|chooseAll|allChosen/, f)
  // Elke plek waar je kiest, kent de grens.
  for (const f of ['src/views/Settings.jsx', 'src/views/Vak.jsx', 'src/views/Welcome.jsx']) assert.match(read(f), /canChoose\(/, f)
  for (const [f, src] of [['SettingsView', settingsView], ['DigestView', digestView], ['WelcomeView', welcomeView]]) assert.match(src, /SelectionOverview\.canChoose\(/, f)
})

test('Sport en Geschiedenis uit de keuze; wie ze volgt ziet ze nog, en de app weet hetzelfde', () => {
  assert.deepEqual(VAK_UIT_KEUZE, ['sport', 'geschiedenis'])
  const sport = VAK_FIELDS.find((f) => f.id === 'sport')
  assert.equal(inKeuze(sport, []), false)
  assert.equal(inKeuze(sport, ['sport']), true)
  const ids = (chosen) => pickDomains(vakByDomain(), null, chosen).flatMap((d) => d.fields.map((f) => f.id))
  assert.ok(!ids([]).includes('sport') && !ids([]).includes('geschiedenis'))
  assert.ok(ids(['sport']).includes('sport'))
  assert.ok(ids([]).includes('film'))
  // De app: dezelfde lijst.
  const m = settingsView.match(/static let uitKeuze: Set<String> = \[([^\]]*)\]/)
  assert.ok(m, 'DigestFieldsList.uitKeuze')
  assert.deepEqual(m[1].split(',').map((x) => x.trim().replace(/"/g, '')).sort(), [...VAK_UIT_KEUZE].sort())
  // Het voorproefje toont ze niet.
  const domains = vakByDomain()
  const fields = VAK_FIELDS.map((f) => ({ id: f.id, top: f.domain === 'cultuur' && f.id === 'sport' ? [{ id: 's' }] : [] }))
  assert.ok(!voorproefje(domains, fields).some((p) => p.id === 'sport'))
  assert.match(digestView, /DigestFieldsList\.uitKeuze\.contains/)
})

test('de taal: "Ook Engelstalige stukken", standaard aan voor wie een Engelse bron volgt', () => {
  assert.equal(ENGELS, 'Ook Engelstalige stukken')
  assert.equal(englishOn(null, true), true)
  assert.equal(englishOn(null, false), false)
  assert.equal(englishOn(false, true), false)
  assert.equal(englishOn(true, false), true)
  const sources = [{ id: 'nos', lang: 'nl' }, { id: 'verge', lang: 'en' }, { id: 'bsky:x', lang: 'en', kind: 'sociaal' }]
  assert.equal(followsEnglish(sources, new Set()), true)
  assert.equal(followsEnglish(sources, new Set(['verge'])), false, 'een uitgezette bron telt niet, Bluesky ook niet')
  const items = [{ id: 1, lang: 'en' }, { id: 2, lang: 'nl' }, { id: 3, lang: null }]
  assert.deepEqual(inLanguage(items, true).map((i) => i.id), [1, 2, 3])
  assert.deepEqual(inLanguage(items, false).map((i) => i.id), [2, 3], 'uit: minder stukken, nooit aangevuld met Engels')
  // De instelling: null tot je kiest, gaat mee met je account, en de app schrijft hetzelfde veld.
  assert.equal(DEFAULT_PREFS.vakEngels, null)
  assert.equal(normalizePrefs({ vakEngels: 'ja' }).vakEngels, null)
  assert.equal(normalizePrefs({ vakEngels: false }).vakEngels, false)
  assert.ok(SYNCED_PREFS.includes('vakEngels'))
  assert.match(store, /"vakEngels": vakEngels/)
  assert.match(store, /case muted, enabled, vak, vakEngels,/)
  assert.ok(digestView.includes(`static let engels = "${ENGELS}"`))
  assert.match(digestView, /SelectionOverview\.inLanguage\(field\.top, english: engels\)/)
  assert.match(read('src/views/Vak.jsx'), /inLanguage\(byId\.get\(f\.id\)\?\.top/)
  assert.match(read('ios/Hoot/Models.swift'), /var lang: String\? \/\/ taal van het stuk/)
})
