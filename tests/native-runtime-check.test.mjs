import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {validateTarget,checkNative} from '../scripts/controle-native-runtime.mjs'
test('productiebouw vereist hetzelfde Linux x64 Node 20-doel als de functies',()=>{
 for(const target of [{platform:'darwin',arch:'arm64',node:'20.20.0'},{platform:'linux',arch:'arm64',node:'20.20.0'},{platform:'linux',arch:'x64',node:'18.20.0'}])assert.throws(()=>validateTarget({...target,netlify:true}),/Onverwacht Netlify-doel/)
 assert.equal(validateTarget({platform:'linux',arch:'x64',node:'20.20.0',netlify:true}),true)
 assert.equal(validateTarget({platform:'darwin',arch:'arm64',node:'22.19.0',netlify:false}),false)
})
// Lokaal is node_modules soms een symlink met een andere sharp dan de lockfile; dan slaan we de test over.
// Op Netlify en in een schone installatie (npm ci) is de versie gelijk en draait hij gewoon.
const lock=JSON.parse(readFileSync(new URL('../package-lock.json',import.meta.url),'utf8')).packages['node_modules/sharp'].version
let geinstalleerd='onbekend'
try{geinstalleerd=JSON.parse(readFileSync(new URL('../node_modules/sharp/package.json',import.meta.url),'utf8')).version}catch{}
const skip=geinstalleerd===lock?false:`geinstalleerde sharp ${geinstalleerd} wijkt af van package-lock.json (${lock}); draait wel op Netlify en na npm ci`
test('beide echte native modules importeren en verwerken een beeld',{skip},async()=>{
 const result=await checkNative();assert.equal(result.sharpPNG,true);assert.equal(result.resvgPNG,true)
})
