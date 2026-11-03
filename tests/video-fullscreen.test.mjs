import{test}from'node:test';import assert from'node:assert/strict'
import{enterVideoFullscreen,supportsVideoFullscreen,isPlayableVideo}from'../src/lib/video-fullscreen.js'
test('fullscreen gebruikt standaard API of iPhone-systeemfallback, weigering blijft herstelbaar',async()=>{
 let calls=[];assert.equal(await enterVideoFullscreen({requestFullscreen:async()=>calls.push('standard'),webkitEnterFullscreen:()=>calls.push('webkit')}),true);assert.deepEqual(calls,['standard'])
 assert.equal(await enterVideoFullscreen({webkitEnterFullscreen:()=>calls.push('webkit')}),true)
 assert.equal(await enterVideoFullscreen({requestFullscreen:async()=>{throw Error('geweigerd')}}),false)
 assert.equal(await enterVideoFullscreen(null),false);assert.equal(supportsVideoFullscreen({}),false)
})
test('standaard MP4 werkt ook zonder HLS; ontbrekende HLS-steun behoudt bronfallback',()=>{
 assert.equal(isPlayableVideo('https://example.test/a.mp4',false),true)
 assert.equal(isPlayableVideo('https://example.test/a.m3u8?token=x',false),false)
 assert.equal(isPlayableVideo('https://example.test/a.m3u8',true),true)
})
