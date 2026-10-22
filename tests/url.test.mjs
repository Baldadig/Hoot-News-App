import { test } from 'node:test'
import assert from 'node:assert/strict'
import { safeHttpUrl } from '../shared/util.mjs'

test('safeHttpUrl laat alleen http(s) door', () => {
  assert.equal(safeHttpUrl('https://nrc.nl/a'), 'https://nrc.nl/a')
  assert.equal(safeHttpUrl('  http://x.nl/  '), 'http://x.nl/')
  for (const bad of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', ' javascript:x', 'data:text/html,x', 'vbscript:x', '//evil.com', '/relatief', 'https://', '', null, undefined, 42]) assert.equal(safeHttpUrl(bad), null, String(bad))
})
