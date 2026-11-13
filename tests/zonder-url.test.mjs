// Nachttest 14 november (A8, R2): de rekenkern draait in de app in JavaScriptCore, en daar bestaan `URL` en
// `URLSearchParams` niet. Rubriek, plaats, opinie en taal rekenen zonder URL-object even goed als met.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { urlDelen } from '../shared/url-delen.mjs'
import { isOpinie, opinieRubriek } from '../shared/opinie.mjs'
import { langFromUrl } from '../shared/lang.mjs'
import { subjectPlaceOf } from '../netlify/lib/desks.mjs'

const GEVALLEN = [
  () => isOpinie({ source: 'nos', title: 'Iets', url: 'https://www.volkskrant.nl/columns-opinie/iets~b1234/' }),
  () => isOpinie({ source: 'nos', title: 'Iets', url: 'https://www.nu.nl/binnenland/123/iets.html' }),
  () => opinieRubriek(['Ondertussen'], 'https://www.nrc.nl/nieuws/2026/11/13/iets'),
  () => opinieRubriek(['Ondertussen'], 'geen link'),
  () => langFromUrl('https://www.parool.nl/amsterdam-news/iets~b1/'),
  () => langFromUrl('https://www.parool.nl/amsterdam/iets~b1/'),
  () => langFromUrl('kapot'),
  () => subjectPlaceOf({ title: 'Een kop zonder land', url: 'https://www.example.org/nieuws/frankrijk/een-stuk' }),
  () => subjectPlaceOf({ title: 'Een kop zonder land', url: 'https://www.example.org/us/een-stuk' }),
]

test('zonder URL-object: dezelfde uitkomst als met (zoals in JavaScriptCore)', () => {
  const met = GEVALLEN.map((f) => f())
  const URL0 = globalThis.URL, USP0 = globalThis.URLSearchParams
  try {
    delete globalThis.URL
    delete globalThis.URLSearchParams
    assert.equal(typeof URL0, 'function')
    assert.equal(typeof globalThis.URL, 'undefined')
    assert.deepEqual(GEVALLEN.map((f) => f()), met)
  } finally {
    globalThis.URL = URL0
    globalThis.URLSearchParams = USP0
  }
  assert.equal(met[0], true)
  assert.equal(met[2], true)
  assert.equal(met[3], false)
  assert.equal(met[4], 'en')
  assert.equal(met[5], null)
  assert.equal(met[6], null)
})

test('urlDelen: host en pad zoals URL ze geeft', () => {
  for (const u of ['https://www.NOS.nl/artikel/123-iets?x=1#a', 'http://user:pw@example.org:8080/a/b/', 'https://example.org', 'https://example.org?q=1']) {
    const ref = new URL(u)
    assert.deepEqual(urlDelen(u), { host: ref.hostname, path: ref.pathname }, u)
  }
  assert.equal(urlDelen('geen link'), null)
  assert.equal(urlDelen('https://'), null)
  assert.equal(urlDelen(null), null)
})

test('de rekenkern van de app gebruikt geen new URL', () => {
  const core = readFileSync(new URL('../ios/Hoot/Resources/edition-core.js', import.meta.url), 'utf8')
  assert.doesNotMatch(core, /new URL\(|URLSearchParams/)
})
