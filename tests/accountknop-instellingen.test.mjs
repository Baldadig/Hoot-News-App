// Besluit Alex 17 november: "waarom niet alles in 1x". De accountknop rechtsboven opent op het web meteen de volledige
// Instellingen (#/instellingen), zoals de accountknop in de app (SettingsView). Het tussenblad DisplaySheet is weg.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('web: de accountknop opent meteen Instellingen, zonder tussenblad', () => {
  const app = read('src/App.jsx')
  const shell = read('src/components/Shell.jsx')
  assert.match(app, /const openSettings = useCallback\(\(\) => route\.go\('instellingen'\), \[route\.go\]\)/)
  assert.match(shell, /<AccountButton account=\{hoot\?\.account\} onClick=\{hoot\?\.openSettings\} \/>/)
  // Een knop naar een pagina, geen knop die een dialoog opent.
  assert.doesNotMatch(shell.slice(shell.indexOf('function AccountButton')), /aria-haspopup/)
  for (const f of ['src/App.jsx', 'src/components/Shell.jsx', 'src/components/Display.jsx']) assert.doesNotMatch(read(f), /DisplaySheet|openDisplay|DisplayControls/, f)
  assert.doesNotMatch(read('src/styles.css'), /sheet--display|\.sheet__label/)
})

test('web: terug uit Instellingen brengt je waar je was, ook vanuit Zoeken', () => {
  const app = read('src/App.jsx')
  assert.match(app, /settingsBack = \{ onBack: \(\) => route\.back\(settingsFrom\.current\), backLabel: \{ \.\.\.FROM_LABEL, zoek: 'Zoeken' \}/)
  assert.match(app, /\{\.\.\.\(route\.params\.blad \? bladBack : settingsBack\)\}/)
})

test('web: alles wat het tussenblad had staat in Instellingen', () => {
  const s = read('src/views/Settings.jsx')
  assert.match(s, /<AccountCard account=\{account\} syncStatus=\{syncStatus\}/) // account met synchronisatie; Uitloggen op het blad Account
  assert.match(read('src/components/Account.jsx'), /Uitloggen/)
  assert.match(s, /<WeergaveTegels theme=\{theme\} setTheme=\{setTheme\} \/>/)
  assert.match(s, /theme === 'system' \? <DonkerKeuze/)
  for (const label of ['Kleur', 'Beeld', 'Intro', 'Lees de Stroom als']) assert.match(s, new RegExp(`label="${label}"`), label)
  assert.match(s, /Tekstgrootte/)
})
