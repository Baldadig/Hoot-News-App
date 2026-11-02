import {test} from 'node:test'
import assert from 'node:assert/strict'
import {recordCorrection,readCorrections,CORRECTION_LIMIT} from '../src/lib/corrections.mjs'
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)}}
const item={id:'a',title:'Een verhaal',url:'https://example.com/nieuws?token=private#deel'}
test('meldingen blijven per eigenaar lokaal en veranderen geen smaak',()=>{
  const store=memory();store.setItem('hoot:prefs','{"taste":{"topics":{}}}')
  assert.equal(recordCorrection(store,'alice',{item,reason:'country'}),true)
  assert.equal(readCorrections(store,'bob').length,0)
  assert.equal(readCorrections(store,'anon').length,0)
  assert.equal(readCorrections(store,'alice')[0].url,'https://example.com/nieuws')
  assert.equal(store.getItem('hoot:prefs'),'{"taste":{"topics":{}}}')
  assert.equal(recordCorrection(store,null,{item,reason:'country'}),false)
})
test('herhaalbare meldingen zijn begrensd, ongeldige opslag of redenen worden opgevangen',()=>{
 const store=memory()
 for(let i=0;i<205;i++)recordCorrection(store,'anon',{item:{...item,id:String(i)},reason:'desk'})
 assert.equal(readCorrections(store,'anon').length,CORRECTION_LIMIT)
 recordCorrection(store,'anon',{item:{...item,id:'204'},reason:'desk'})
 assert.equal(readCorrections(store,'anon').length,CORRECTION_LIMIT)
 assert.equal(recordCorrection(store,'anon',{item,reason:'smaak'}),false)
 assert.equal(recordCorrection({getItem:()=>null,setItem:()=>{throw Error('vol')}},'anon',{item,reason:'desk'}),false)
 const bad=memory();bad.setItem('hoot:corrections:anon','geen-json');assert.deepEqual(readCorrections(bad,'anon'),[])
})
