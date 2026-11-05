// Instellingen D (Hoot-design/woensdag-2026-11-04/instellingen-concept/D-richtlijnen.html): web en app
// hebben dezelfde bladen en labels, elke rij uit de inventaris van build 47 heeft een plek, de
// Tekstgrootte telt op bij het systeem, en de accountkaart toont je foto of een monogram.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { TEXT_SIZES, textSizePref, textSizeOf, effectiveFactor, PLAFOND } from '../src/lib/tekstgrootte.js'
import { normalizePrefs } from '../src/lib/prefs.js'
import { pickSynced } from '../src/lib/sync.js'

const read = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8')
const web = read('src/views/Settings.jsx')
const device = read('src/views/Device.jsx')
const account = read('src/components/Account.jsx')
const ios = read('ios/Hoot/Views/SettingsView.swift') + read('ios/Hoot/Views/SettingsPages.swift')
const iosAccount = read('ios/Hoot/Views/AccountView.swift')

test('hoofdblad: account bovenaan, Jouw Hoot met Editie/Stroom/Selectie als drie rijen, Lezen, Op dit toestel en Over Hoot', () => {
  const order = (src, re) => [...src.matchAll(re)].map((m) => m[1])
  assert.deepEqual(order(ios, /FormHeader\("(Jouw Hoot|Lezen)"\)/g), ['Jouw Hoot', 'Lezen'])
  for (const label of ['Interesses', 'Bronnen', 'Editie', 'Stroom', 'Selectie', 'Tekstgrootte', 'Beeld en intro', 'Op dit toestel', 'Over Hoot']) {
    assert.match(ios, new RegExp(`SettingsRow\\("${label}"`), 'iOS: ' + label)
    assert.match(web, new RegExp(`label="${label}"`), 'web: ' + label)
  }
  assert.match(ios, /SettingsRow\("Artikelen"/, 'iOS: Artikelen (alleen in de app)')
  assert.ok(ios.indexOf('SettingsAccountCard()') < ios.indexOf('FormHeader("Jouw Hoot")'))
  assert.ok(web.indexOf('<AccountCard') < web.indexOf('>Jouw Hoot<'))
  // Geen uitleg op het hoofdblad (KISS): de oude voetregels zijn weg.
  assert.doesNotMatch(web, /Automatisch volgt je toestel|Kies je accounts bij Bronnen|Een extra verhaal naast je Editie/)
  assert.doesNotMatch(ios, /Automatisch volgt je toestel|De tekstgrootte volgt je toestel/)
})

test('Weergave heet "Zoals je toestel" (web en iOS), nergens "Automatisch" of "Systeem"', () => {
  const display = read('src/components/Display.jsx')
  const nacht = read('ios/Hoot/Theme/NachtThema.swift')
  assert.match(display, /value: 'system', label: 'Zoals je toestel'/)
  assert.match(nacht, /case \.system: "Zoals je toestel"/)
  assert.doesNotMatch(display + nacht, /"Automatisch"|'Automatisch'|'Systeem'|"Systeem"/)
})

// INVENTARIS.md: elke rij heeft een plek. [label, waar het nu staat in de broncode]
const INVENTARIS_WEB = [
  ['Account (kaart, Inloggen, Uitloggen)', account, /Uitloggen/],
  ['Lezen kan zonder account.', account, /Lezen kan zonder account\./],
  ['Nu synchroniseren', account, /Nu synchroniseren/],
  ['Account verwijderen', account, /Account verwijderen/],
  ['Interesses', web, /label="Interesses"/],
  ['Bronnen', web, /label="Bronnen"/],
  ['Selectie (alles aan of uit)', web, /label="Alle onderwerpen"/],
  ['Selectie per onderwerp', web, /vakByDomain\(\)\.map/],
  ['Buiten je bubbel', web, /label="Buiten je bubbel"/],
  ['De Editie in één minuut', web, /label="De Editie in één minuut"/],
  ['Weer', web, /label="Weer"/],
  ['Gekozen', web, /label="Gekozen"/],
  ['Vergeet dit', web, /Vergeet dit/],
  ['Ongedaan maken', web, /Ongedaan maken/],
  ['Nog niets geleerd', web, /Nog niets geleerd/],
  ['Weergave', web, /label="Weergave"/],
  ['Als het donker is', web, /label="Als het donker is"/],
  ['Kleur', web, /label="Kleur"/],
  ['Tekstgrootte', web, /label="Tekstgrootte"/],
  ['Beeld', web, /label="Beeld"/],
  ['Intro', web, /label="Intro"/],
  ['Lees de Stroom als', web, /label="Lees de Stroom als"/],
  ['Bluesky in de Stroom', web, /label="Bluesky in de Stroom"/],
  ['Bluesky-accounts', web, /label="Bluesky-accounts"/],
  ['Op dit toestel', web, /href="#\/toestel" label="Op dit toestel"/],
  ['Alles als ongelezen markeren', device, /Alles als ongelezen markeren/],
  ['Bewaarde artikelen verwijderen', device, /Bewaarde artikelen verwijderen/],
  ['Stel Hoot opnieuw in', device, /Stel Hoot opnieuw in/],
  ['Hulp en contact (was: Over en contact)', web, /label="Hulp en contact"/],
  ['Privacy', web, /label="Privacy"/],
  ['versie in de voet', web, /Hoot \{__APP_VERSION__\} · gemaakt door/],
]
test('web: elke rij uit de inventaris heeft een plek', () => {
  for (const [label, src, re] of INVENTARIS_WEB) assert.match(src, re, label)
  // Elk blad is te openen vanaf het hoofdblad (één tik), en nergens dieper.
  for (const blad of ['editie', 'stroom', 'selectie', 'tekstgrootte', 'beeld', 'over']) assert.match(web, new RegExp(`open\\('${blad}'\\)`), blad)
  assert.match(web, /onOpen=\{\(\) => open\('account'\)\}/)
  assert.match(read('src/App.jsx'), /blad=\{route\.params\.blad \|\| null\} onOpen=\{\(b\) => route\.go\('instellingen', \{ blad: b \}\)\}/)
})

test('iOS: de rijen die alleen in de app staan, en wissen in rood met een action sheet', () => {
  for (const t of ['Seintje bij een nieuwe Editie', 'Seintjes staan uit', 'Artikelen openen', 'App-icoon', 'Hulp en contact', 'gethoot.app', 'Wat Hoot leerde', 'Nog niets geleerd', 'Meer of minder van iets? Druk lang op een verhaal.', 'Hoot opnieuw instellen?', 'Stel opnieuw in']) assert.ok(ios.includes(`"${t}"`), t)
  assert.match(ios, /SettingsRow\("Alles als ongelezen markeren", ink: Theme\.accent\)/)
  assert.match(ios, /\.confirmationDialog\(title/)
  assert.match(iosAccount, /\.confirmationDialog\("Je account verwijderen\?"/)
  assert.match(iosAccount, /Button\("Account verwijderen", role: \.destructive\)[\s\S]{0,80}Theme\.accent/)
  assert.match(device, /resetTitle: 'Hoot opnieuw instellen\?'/)
})

test('Tekstgrootte: vijf standen, dezelfde factoren als de app, oude keuzes omgezet, per toestel', () => {
  assert.deepEqual(TEXT_SIZES.map((s) => s.label), ['Kleiner', 'Zoals je toestel', 'Groter', 'Nog groter', 'Grootst'])
  const swift = read('ios/Hoot/Views/Letters.swift')
  assert.match(swift, /namen = \["Kleiner", "Zoals je toestel", "Groter", "Nog groter", "Grootst"\]/)
  assert.match(swift, new RegExp(`factoren: \\[CGFloat\\] = \\[${TEXT_SIZES.map((s) => String(s.factor)).join(', ')}\\]`))
  assert.equal(textSizePref('klein'), 'kleiner')
  assert.equal(textSizePref('groot'), 'groter')
  assert.equal(textSizePref('xxl'), 'normaal')
  assert.equal(normalizePrefs({ textSize: 'groot' }).textSize, 'groter')
  assert.equal(textSizeOf('grootst').factor, 1.45)
  assert.deepEqual(pickSynced({ textSize: 'grootst', layout: 'krant' }), { layout: 'krant' }, 'niet in de profielsync')
  assert.doesNotMatch(read('ios/Hoot/HootStore.swift').match(/var tekstgrootte: Int \{[\s\S]*?\n    \}/)[0], /synced\(\)/)
})

test('Tekstgrootte telt op, maar nooit voorbij de grootste maat van het systeem', () => {
  assert.equal(effectiveFactor(1.45, 17), 1.45)
  assert.equal(effectiveFactor(0.9, 53), 0.9, 'kleiner mag altijd')
  assert.equal(effectiveFactor(1.45, PLAFOND), 1, 'bij AX5 gelijk aan je toestel')
  assert.ok(effectiveFactor(1.45, 40) > 1 && effectiveFactor(1.45, 40) * 40 <= PLAFOND + 0.001)
  assert.equal(effectiveFactor(1.3, NaN), 1.3)
  // De oude vaste standen (html[data-text='klein'|'groot'] in styles.css) gelden niet meer: data-text is
  // nu kleiner … grootst, en de maat komt van setSchaal. (styles.css blijft bytegelijk: zacht-papier-baseline.)
  for (const s of TEXT_SIZES) assert.ok(!['klein', 'groot'].includes(s.value))
  assert.match(read('src/lib/systeemtekst.js'), /export function setSchaal/)
})

// ---- de accountkaart: foto of monogram ----
const load = async (entry) => {
  const out = await build({ entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', packages: 'external', loader: { '.css': 'empty' }, define: { __APP_VERSION__: '"1.1.0"' } })
  const m = { exports: {} }
  new Function('require', 'module', 'exports', out.outputFiles[0].text)(createRequire(import.meta.url), m, m.exports)
  return m.exports
}
const { Avatar, avatarUrl, accountName } = await load('src/components/Account.jsx')

test('accountkaart: de Google-foto zonder Referer, anders een monogram; alleen https', () => {
  const google = { email: 'jan@voorbeeld.nl', user_metadata: { full_name: 'Jan Jansen', avatar_url: 'https://lh3.googleusercontent.com/a/x=s96-c' } }
  const html = renderToStaticMarkup(React.createElement(Avatar, { user: google, size: 48 }))
  assert.match(html, /<img[^>]*src="https:\/\/lh3\.googleusercontent\.com\/a\/x=s96-c"/)
  assert.match(html, /referrerPolicy="no-referrer"|referrerpolicy="no-referrer"/i)
  assert.match(html, /role="img" aria-label="Jan Jansen"/)
  assert.equal(avatarUrl({ user_metadata: { picture: 'https://example.com/p.jpg' } }), 'https://example.com/p.jpg')
  assert.equal(avatarUrl({ user_metadata: { avatar_url: 'http://example.com/p.jpg' } }), null)
  assert.equal(avatarUrl({ user_metadata: { avatar_url: 'javascript:alert(1)' } }), null)
  const mono = renderToStaticMarkup(React.createElement(Avatar, { user: { email: 'piet@voorbeeld.nl', user_metadata: {} }, size: 48 }))
  assert.doesNotMatch(mono, /<img/)
  assert.match(mono, /data-letter="P"/)
  assert.match(mono, /aria-label="piet@voorbeeld\.nl"/)
  assert.equal(accountName({ email: 'a@b.nl', user_metadata: { name: 'Anna' } }), 'Anna')
  const out = renderToStaticMarkup(React.createElement(Avatar, { user: null }))
  assert.match(out, /acard__av/)
})

test('accountkaart in de app: foto uit user_metadata, zonder cookies of Referer, met cache; anders een monogram', () => {
  const acc = read('ios/Hoot/Account.swift')
  assert.match(acc, /var avatar: String\? = nil/)
  assert.match(acc, /meta\?\["avatar_url"\] \?\? meta\?\["picture"\]/)
  assert.match(acc, /url\.scheme == "https"/)
  assert.match(acc, /avatar: Self\.avatar\(from: meta\)/)
  assert.match(iosAccount, /Monogram\(name: name\.uppercased\(\), size: size\)/)
  assert.match(iosAccount, /httpCookieAcceptPolicy = \.never/)
  assert.match(iosAccount, /setValue\(nil, forHTTPHeaderField: "Referer"\)/)
  assert.match(iosAccount, /returnCacheDataElseLoad/)
  assert.match(iosAccount, /\.accessibilityLabel\(name \?\? "Geen account"\)/)
})
