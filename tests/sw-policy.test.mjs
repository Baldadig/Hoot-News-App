import {test} from 'node:test'
import assert from 'node:assert/strict'
import {canCleanShell} from '../src/lib/sw-policy.js'
const scope='https://example.test/lees/', current='https://example.test/lees/assets/current.js'
const setup={scope,senderId:'new',clientUrl:scope,bundleUrl:current,currentAssets:[current],clients:[{id:'new',url:scope}]}
test('alleen een actuele bevestigde client kan oude publieke chunks laten opruimen',()=>{
 assert.equal(canCleanShell(setup),true)
 assert.equal(canCleanShell({...setup,bundleUrl:'https://example.test/lees/assets/old.js'}),false)
 assert.equal(canCleanShell({...setup,clients:[...setup.clients,{id:'old',url:scope+'#/stroom'}]}),false)
 assert.equal(canCleanShell({...setup,clients:[...setup.clients,{id:'landing',url:'https://example.test/'}]}),true)
})
test('andere oorsprong, andere appscope, onbekende zender en ongeldige URLs mogen niet opruimen',()=>{
 for(const change of [{senderId:''},{clientUrl:'https://foreign.test/lees/'},{clientUrl:'https://example.test/lees-ander/'},{bundleUrl:'https://foreign.test/lees/assets/current.js'},{bundleUrl:null},{clients:[]}])assert.equal(canCleanShell({...setup,...change}),false)
})

test('oude rootworker schrijft geen opslag en navigeert geen open leessessie',async()=>{
 const {readFileSync}=await import('node:fs'),{runInNewContext}=await import('node:vm')
 const listeners={},requests=[],marker={saved:['eigen-bericht'],read:['gelezen'],prefs:{theme:'night'}}
 const before=JSON.stringify(marker)
 const self={location:{origin:'https://example.test'},registration:{unregister:async()=>{requests.push('unregister');return true}},skipWaiting:async()=>requests.push('activate'),addEventListener:(type,fn)=>listeners[type]=fn}
 runInNewContext(readFileSync(new URL('../scripts/retire-root-worker.js',import.meta.url),'utf8'),{self,URL,caches:{match:async()=>({cached:true})},fetch:async()=>({network:true})})
 const pending=[];listeners.install();listeners.activate({waitUntil:p=>pending.push(p)});await Promise.all(pending)
 let response;listeners.fetch({request:{url:'https://example.test/assets/oud.js',destination:'script'},respondWith:p=>response=p})
 assert.equal((await response).cached,true);assert.deepEqual(requests,['activate','unregister']);assert.equal(JSON.stringify(marker),before)
 let claimed=false;listeners.fetch({request:{url:'https://example.test/api/feed',destination:''},respondWith:()=>claimed=true});assert.equal(claimed,false)
})
