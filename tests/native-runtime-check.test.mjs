import {test} from 'node:test'
import assert from 'node:assert/strict'
import {validateTarget,checkNative} from '../scripts/controle-native-runtime.mjs'
test('productiebouw vereist hetzelfde Linux x64 Node 20-doel als de functies',()=>{
 for(const target of [{platform:'darwin',arch:'arm64',node:'20.20.0'},{platform:'linux',arch:'arm64',node:'20.20.0'},{platform:'linux',arch:'x64',node:'18.20.0'}])assert.throws(()=>validateTarget({...target,netlify:true}),/Onverwacht Netlify-doel/)
 assert.equal(validateTarget({platform:'linux',arch:'x64',node:'20.20.0',netlify:true}),true)
 assert.equal(validateTarget({platform:'darwin',arch:'arm64',node:'22.19.0',netlify:false}),false)
})
test('beide echte native modules importeren en verwerken een beeld',async()=>{
 const result=await checkNative();assert.equal(result.sharpPNG,true);assert.equal(result.resvgPNG,true)
})
