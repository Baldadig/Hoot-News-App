import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {insertBubble} from '../netlify/lib/bubble.mjs'
import {EDITION_TARGET,EDITION_AUDIT_BELOW,EDITION_FLOOR,editionStoryCount,hasEditionMinimum} from '../shared/edition-limits.mjs'
import {numberRows,countOf} from '../src/lib/edition.js'
test('tien genummerde verhalen plus hooguit één afzonderlijke bubbel, altijd erna',()=>{
 const regular=Array.from({length:10},(_,i)=>({kind:'item',id:String(i)}))
 const result=insertBubble(regular,{id:'outside',terms:[]})
 assert.equal(editionStoryCount(result),10)
 assert.equal(result.length,11)
 assert.equal(result.at(-1).desk,'bubbel')
 assert.deepEqual(result.slice(0,10),regular)
 assert.equal(countOf(numberRows(result)),10)
 assert.equal(numberRows(result).at(-1).n,null)
 assert.equal(insertBubble(regular,{id:'0',terms:[]}).length,10)
})
test('de bubbel kan een te korte Editie niet boven de vloer tillen; gedeelde grenzen blijven gelijk',()=>{
 const three=[{id:'a'},{id:'b'},{id:'c'}]
 assert.equal(hasEditionMinimum(editionStoryCount(insertBubble(three,{id:'x',terms:[]}))),false)
 assert.equal(hasEditionMinimum(4),true)
 assert.deepEqual([EDITION_TARGET,EDITION_AUDIT_BELOW,EDITION_FLOOR],[10,6,4])
 assert.deepEqual(readFileSync(new URL('../shared/edition-limits.json',import.meta.url)),readFileSync(new URL('../ios/Hoot/Resources/edition-limits.json',import.meta.url)))
})
