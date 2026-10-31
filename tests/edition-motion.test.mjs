import { test } from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {shouldPrintEdition,PRINT_TIMING} from '../shared/edition-motion.mjs'
test('M5: alleen een nieuwe, geladen Editie na de iris, nooit dezelfde bij tabwissel',()=>{
 for(const c of JSON.parse(readFileSync(new URL('./fixtures/edition-motion.json',import.meta.url))))assert.equal(shouldPrintEdition(c.id,c.lastSeen,c),c.expected)
 assert.equal(PRINT_TIMING.leadDelay-PRINT_TIMING.rule,80)
 assert.equal(PRINT_TIMING.lead,200)
})
