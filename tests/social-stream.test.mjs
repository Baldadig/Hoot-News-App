import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { inStream } from '../src/lib/sourcesel.js'
import { forEdition } from '../shared/stroom.mjs'
import { cleanClosed, selectionKey, selectionOwnerReady } from '../src/lib/selection-fold.js'
const fixture=JSON.parse(readFileSync(new URL('./fixtures/social-stream-cases.json',import.meta.url)))
test('Bluesky: gedeeld web/iOS-contract voor keuze, uitschakelen, datum en venster',()=>{
  const now=Date.parse(fixture.now)
  for(const c of fixture.cases){
    const item={kind:'post',source:fixture.source,publishedAt:c.ageHours==null?null:new Date(now-c.ageHours*36e5).toISOString(),editionOnly:c.editionOnly,streamOnly:c.streamOnly}
    const prefs={bluesky:c.enabled,bskyInStream:c.selected?[fixture.source]:[]}
    // App voegt uitsluitend bestaande, gevolgde accounts samen; muting gebeurt vóór inStream.
    assert.equal(c.followed&&inStream(item,prefs,now),c.expected,c.name)
  }
})
test('Stroomkeuze wijzigt geen Editie-toelating en gewone artikelen houden hun contract',()=>{
  const article={kind:'article',source:'nos'}
  assert.equal(inStream(article,{}),true)
  assert.equal(inStream({...article,editionOnly:true},{}),false)
  assert.equal(forEdition({...article,streamOnly:true}),false)
  assert.equal(forEdition({...article,streamOnly:false}),true)
})
test('Selectie: lokale sleutels gescheiden, nieuwe onderwerpen open en ongeldige opslag begrensd',()=>{
  assert.notEqual(selectionKey('A'),selectionKey('B'))
  assert.notEqual(selectionKey('A'),selectionKey(null))
  assert.deepEqual(cleanClosed(['ai','ai','weg',null],['ai','design']),['ai'])
  assert.deepEqual(cleanClosed('kapot',['ai']),[])
  assert.deepEqual(cleanClosed(['ai'],['design']),[])
  // Een nieuw onderwerp staat niet in de gesloten set, ook niet in een nieuwe week.
  assert.deepEqual(cleanClosed(['ai'],['ai','design']),['ai'])
})

test('Selectie wacht op de voorkeuren van de juiste eigenaar, niet alleen op een nieuwe login-id',()=>{
  const storage={getItem:()=>JSON.stringify({uid:'A'})}
  assert.equal(selectionOwnerReady({status:'in',user:{id:'B'}},storage),false)
  assert.equal(selectionOwnerReady({status:'in',user:{id:'A'}},storage),true)
  assert.equal(selectionOwnerReady({status:'in',user:{id:'B'}},{getItem:()=>'{kapot'}),false)
  assert.equal(selectionOwnerReady({status:'loading'},storage),false)
  assert.equal(selectionOwnerReady({status:'out'},storage),true)
})
