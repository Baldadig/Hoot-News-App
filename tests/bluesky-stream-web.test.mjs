import {test} from 'node:test'
import assert from 'node:assert/strict'
import {webStream,addSocialProfile,removeSocialProfile} from '../src/lib/social-stream.js'
import {normalizePrefs} from '../src/lib/prefs.js'
import {parseHash,MAIN} from '../src/lib/context.js'
import {pickSynced} from '../src/lib/sync.js'
const now=Date.parse('2026-11-03T10:00:00Z'),source='bsky:proef.bsky.social',profile={handle:'proef.bsky.social',name:'Proef'}
const item=(n=0)=>({id:'post-'+n,source,kind:'post',url:'https://example.test/'+n,publishedAt:new Date(now-n*60000).toISOString()})
const prefs={bluesky:true,bskyInStream:[source],social:[profile]};const options={prefs,sources:[{id:source}],now}
test('één Stroom dedupliceert, sorteert en begrenst posts op 60 per account',()=>{
 const items=Array.from({length:70},(_,i)=>item(i));assert.equal(webStream([...items,...items],options).length,60)
 assert.equal(webStream(items.reverse(),options)[0].id,'post-0')
 assert.equal(webStream([item(36*60+1),item(36*60),item(-6)],options).length,1)
})
test('uitzetten, ontvolgen en een oud laadantwoord kunnen geen post laten staan',()=>{
 for(const change of [{prefs:{...prefs,bluesky:false}},{prefs:{...prefs,bskyInStream:[]}},{sources:[]},{muted:new Set([source])}])assert.deepEqual(webStream([item()],{...options,...change}),[])
 const removed=removeSocialProfile(prefs,profile.handle);assert.deepEqual(webStream([item()],{...options,prefs:removed}),[])
 const readded=addSocialProfile(removed,profile);assert.equal(webStream([item()],{...options,prefs:readded}).length,1)
 assert.deepEqual(pickSynced(readded).bskyInStream,[source])
})
test('ontbrekende oude keuzes migreren, expliciet uit blijft uit, nieuwe accounts staan aan',()=>{
 assert.equal(normalizePrefs({social:[profile]}).bluesky,true)
 assert.deepEqual(normalizePrefs({social:[profile]}).bskyInStream,[source])
 assert.equal(normalizePrefs({...prefs,bluesky:false}).bluesky,false)
 assert.deepEqual(normalizePrefs({...prefs,bskyInStream:[]}).bskyInStream,[])
 assert.equal(addSocialProfile({social:[],bskyInStream:[],bluesky:false},profile).bluesky,true)
})
test('oude Bluesky-links wijzen naar de Stroom, geen tweede hoofdbestemming',()=>{
 assert.equal(MAIN.includes('bluesky'),false)
 assert.deepEqual(parseHash('#/bluesky?wie='+encodeURIComponent(source)),{path:'stroom',params:{bron:source}})
 assert.deepEqual(parseHash('#/bluesky'),{path:'stroom',params:{}})
})
