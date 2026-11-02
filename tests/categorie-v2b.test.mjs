import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inputs, validateV2b } from '../scripts/validate-categorie-v2b.mjs'
test('V2b blijft een nieuwe, verzegelde controle zonder identiteitsoverlap',()=>{
  const [bytes,frozen,baseline]=inputs()
  assert.equal(validateV2b(bytes,frozen,baseline).count,78)
  const changed=JSON.parse(bytes); changed.cases[0].label.desk='vs'
  assert.throws(()=>validateV2b(Buffer.from(JSON.stringify(changed)),frozen,baseline),/Blinde labels zijn gewijzigd/)
})
