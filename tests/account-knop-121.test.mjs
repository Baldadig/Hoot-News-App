// 1.2.1 · Account: het tandwiel wordt je accountknop rechtsboven (advies Hoot-design/instellingen-positie/ADVIES.md).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const views = readdirSync(new URL('../ios/Hoot/Views/', import.meta.url)).filter((f) => f.endsWith('.swift'))

test('app: geen tandwiel meer op een hoofdscherm; de accountknop staat in de kopregel', () => {
  for (const f of views) assert.doesNotMatch(read(`ios/Hoot/Views/${f}`), /systemImage: "gearshape"|systemName: "gearshape"/, f)
  const c = read('ios/Hoot/Views/Components.swift')
  assert.match(c, /AccountKnop \{ openSettings\(\) \}/)
  assert.match(c, /\.padding\(\.trailing, -AccountKnop\.inset\)/)
  const a = read('ios/Hoot/Views/AccountView.swift')
  assert.match(a, /static let maat: CGFloat = 32/)
  assert.match(a, /Image\(systemName: "person\.crop\.circle"\)/)
  assert.match(a, /\.foregroundStyle\(Theme\.ink3\)/)
})

test('app: Bewaard en Zoeken hebben dezelfde kop; geen tandwiel in de balk', () => {
  const s = read('ios/Hoot/Views/StreamView.swift')
  assert.doesNotMatch(s, /hootBrandHeader|settingsButton\(toolbar: true\)/)
  assert.match(s, /HootKop\(\)\n\s*ScreenTitle\("Bewaard"\)/)
  assert.match(s, /\.zoekKop\(\)/)
})

test('app: het blad sluit met de systeemknop, en wie niet is ingelogd ziet Inloggen bovenaan', () => {
  const s = read('ios/Hoot/Views/SettingsView.swift')
  assert.match(s, /Button\(role: \.close\) \{ dismiss\(\) \}/)
  assert.match(s, /InlogKnoppen\(\)/)
  assert.match(read('ios/Hoot/Views/AccountView.swift'), /struct InlogKnoppen[\s\S]*SignInWithAppleButton[\s\S]*Inloggen met Google/)
})

test('app: de verticale balk (Duo) toont je account met het label Instellingen', () => {
  const c = read('ios/Hoot/Views/Components.swift')
  assert.match(c, /Label \{ Text\("Instellingen"\) \} icon: \{ AccountKnopBeeld\(maat: 28\) \}/)
})

test('app: iPad, Editie, Stroom en Selectie op één kolombreedte', () => {
  assert.match(read('ios/Hoot/Views/Layout.swift'), /static let readable: CGFloat = 680/)
  assert.doesNotMatch(read('ios/Hoot/Views/EditionView.swift'), /Layout\.readable \+ hang/)
  assert.doesNotMatch(read('ios/Hoot/Views/DigestView.swift'), /Layout\.wide \* 0\.85/)
})

test('web: geen Instellingen in de zijbalk; je account rechtsboven heet Instellingen; Bronnen in de Stroom', () => {
  const shell = read('src/components/Shell.jsx')
  assert.doesNotMatch(shell, /href="#\/instellingen"/)
  assert.match(shell, /aria-label="Instellingen" title="Instellingen"/)
  assert.match(shell, /<AccountLineIcon \/>/)
  assert.match(shell, /className="iconbtn vh__bronnen" href="#\/bronnen"/)
  assert.match(read('src/views/Stream.jsx'), /tools=\{filterButton\} sources compare/)
  assert.match(read('src/staten.css'), /@media \(min-width: 960px\) \{\n  \.vh__row > \.vh__bronnen \{\n    display: none;/)
})

test('web: het silhouet als je niet bent ingelogd is dat van de app (person.crop.circle): cirkel als lijn, figuurtje gevuld', () => {
  const icons = read('src/components/icons.jsx')
  const m = icons.match(/export function AccountLineIcon[\s\S]*?\n\}\n/)
  assert.ok(m, 'AccountLineIcon bestaat')
  const svg = m[0]
  assert.match(svg, /viewBox="0 0 32 32"/)
  // De cirkel: alleen een lijn, geen vulling.
  assert.match(svg, /<circle cx="16" cy="16" r="14\.97" fill="none" stroke="currentColor" strokeWidth="2\.06" \/>/)
  // Hoofd en schouders: gevuld, zoals in de systeemtekening (niet de holle Phosphor UserCircle).
  assert.match(svg, /<ellipse [^>]*fill="currentColor"/)
  assert.match(svg, /<path fill="currentColor" d="M[^"]+A10\.8 5\.88 0 0 1 [^"]+A14\.3 14\.3 0 0 1 [^"]+Z" \/>/)
  assert.doesNotMatch(svg, /88 88 0 1 1|UserCircle"? regular/)
  assert.doesNotMatch(svg, /stroke="currentColor"[^/]*\/>\s*<(ellipse|path)[^>]*stroke=/)
})
