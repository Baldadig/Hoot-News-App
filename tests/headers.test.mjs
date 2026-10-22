import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { headersFile, inlineScripts, sha256 } from '../scripts/headers.mjs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('beide inline scripts uit index.html staan met hun hash in script-src', () => {
  const scripts = inlineScripts(html)
  assert.equal(scripts.length, 2)
  const out = headersFile(html)
  for (const s of scripts) assert.ok(out.includes(sha256(s)))
})

test('een gewijzigd inline script krijgt een andere hash (de build rekent hem opnieuw uit)', () => {
  const changed = html.replace('hoot:theme', 'hoot:theme2')
  assert.notEqual(headersFile(changed), headersFile(html))
})

test('alle headers staan erin; CSP alleen op de pagina', () => {
  const out = headersFile(html)
  for (const h of ['\n  Content-Security-Policy: ', 'Referrer-Policy', 'X-Content-Type-Options', 'Permissions-Policy', 'Strict-Transport-Security: max-age=31536000; includeSubDomains', "frame-ancestors 'none'"]) assert.ok(out.includes(h), h)
  assert.ok(headersFile(html, { enforce: false }).includes('Content-Security-Policy-Report-Only'))
})
