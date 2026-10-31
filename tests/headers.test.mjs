import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { headersFile, inlineScripts, inlineStyles, sha256 } from '../scripts/headers.mjs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

test('alle drie de inline scripts uit index.html staan met hun hash in script-src', () => {
  const scripts = inlineScripts(html)
  assert.equal(scripts.length, 3)
  const out = headersFile(html)
  for (const s of scripts) assert.ok(out.includes(sha256(s)))
})

test('de inline <style> van het opstartscherm staat met zijn hash in style-src', () => {
  const styles = inlineStyles(html)
  assert.equal(styles.length, 1)
  const out = headersFile(html)
  const line = out.split('; ').find((p) => p.startsWith('style-src'))
  assert.ok(line.includes(sha256(styles[0])), line)
  // Een gewijzigde stijl krijgt een andere hash.
  assert.notEqual(headersFile(html.replace('splash-hop', 'splash-hop2')), out)
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

test('samenvoegen van landing en app: één /*-blok, geen dubbele headers, COOP alleen op de landing', async () => {
  const { mergeHeaders, parseHeaders } = await import('../scripts/merge-headers.mjs')
  const landing = "/\n  Content-Security-Policy: x\n\n/*\n  Strict-Transport-Security: max-age=31536000\n  X-Frame-Options: DENY\n  Cross-Origin-Opener-Policy: same-origin\n\n/\n  Cache-Control: public, max-age=0, must-revalidate\n"
  const app = headersFile(html, { base: '/lees' })
  const out = mergeHeaders(landing, app, '/sw.js\n  Cache-Control: no-cache\n')
  const blocks = parseHeaders(out)
  assert.equal(blocks.filter((b) => b.path === '/*').length, 1)
  assert.equal(new Set(blocks.map((b) => b.path)).size, blocks.length) // elk pad één keer
  const all = blocks.find((b) => b.path === '/*').headers.map(([n]) => n.toLowerCase())
  assert.equal(all.filter((n) => n === 'strict-transport-security').length, 1)
  assert.equal(all.filter((n) => n === 'x-frame-options').length, 1)
  assert.ok(!all.includes('cross-origin-opener-policy'))
  assert.ok(out.includes('Strict-Transport-Security: max-age=31536000; includeSubDomains'))
  const root = blocks.find((b) => b.path === '/').headers.map(([n]) => n)
  assert.deepEqual(root.sort(), ['Cache-Control', 'Content-Security-Policy', 'Cross-Origin-Opener-Policy'])
  assert.ok(!blocks.find((b) => b.path === '/lees/').headers.some(([n]) => n === 'Cross-Origin-Opener-Policy'))
  assert.ok(blocks.find((b) => b.path === '/sw.js'))
})
