import test from 'node:test'
import assert from 'node:assert/strict'
import { toggleFollow, discoverSources } from '../src/lib/follow-welcome.js'
import { applyWelcome } from '../src/lib/welcome.js'
const catalog=[{id:'a',name:'Algemeen',about:'Nieuws',followed:true},{id:'t',name:'Techniek',cat:'tech',about:'Reviews',followed:true},{id:'s',name:'Sport',cat:'sport',followed:true}]
test('ontdekken rangschikt interesses zonder stil bronnen te volgen; alle is alfabetisch',()=>{
 assert.equal(discoverSources(catalog,['tech'],[])[0].id,'t')
 assert.equal(discoverSources(catalog,['tech'],[],'Alle bronnen')[0].id,'a')
 assert.equal(discoverSources(catalog,[],[]).some(s=>s.id==='s'),false)
 assert.equal(discoverSources(catalog,['sport'],[]).some(s=>s.id==='s'),true)
})
test('meer dan zestien bronnen, ontvolgen en zoeken behouden onafhankelijke conceptkeuze',()=>{
 let ids=[]; for(let n=0;n<20;n++)ids=toggleFollow(ids,String(n))
 assert.equal(ids.length,20);assert.equal(toggleFollow(ids,'8').length,19);assert.equal(ids.length,20)
 assert.equal(discoverSources(catalog,['tech'],['t'],'Volgend','reviews')[0].id,'t')
 assert.deepEqual(discoverSources(catalog,[],[],'Ontdekken','onbekend'),[])
})
test('opslaan gebruikt bestaande voorkeuren; een geannuleerd concept wijzigt ze niet',()=>{
 const original={onboarded:true,interests:['tech'],topics:['ai'],muted:[],vak:['ux'],saved:['artikel']}
 const before=structuredClone(original)
 const draft={interests:['tech'],topics:['ai'],sources:['t'],all:catalog,vak:['ux','design']}
 const applied=applyWelcome(original,draft)
 assert.deepEqual(original,before);assert.deepEqual(applied.saved,['artikel']);assert.deepEqual(applied.vak,['ux','design']);assert.ok(applied.muted.includes('a'));assert.ok(!applied.muted.includes('t'))
})
