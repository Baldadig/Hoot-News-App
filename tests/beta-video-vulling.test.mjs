import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {selectForReader} from '../netlify/lib/stories.mjs'
import {profileOf} from '../shared/editor.mjs'
import {lightVideoFiller} from '../shared/edition-policy.mjs'
import {SOURCES} from '../netlify/lib/sources.mjs'
const {item}=JSON.parse(readFileSync(new URL('./fixtures/beta-youtube-vulling.json',import.meta.url)))
const mainIds=new Set([item.source]),now=Date.parse(item.publishedAt)+14*36e5
const select=interests=>selectForReader([],[item],{mainIds,now,plan:false,prof:profileOf({interests,sources:SOURCES,followed:mainIds}),ctx:{tempo:new Map([[item.source,24]])}})
test('de gemelde YouTube-vulling krijgt geen plek door alleen een gekozen techmerk',()=>{
 assert.equal(select([]).length,0)
 assert.equal(select(['tech']).length,0)
 assert.equal(select(['wereld']).length,0)
 assert.equal(select(['cultuur']).length,1,'bewuste interesse in Film mag zulke lijstjes toelaten')
})
test('geen algemene celebrity- of videoban: reportage, analyse en cultuur blijven mogelijk',()=>{
 for(const title of ['YouTube footage shows the aftermath of attacks in Gaza','An analysis of YouTube’s new recommendation algorithm','New exhibition examines celebrity culture','These horror videos reveal evidence of crimes in Gaza']) {
  assert.equal(lightVideoFiller({title}),false,title)
 }
 assert.equal(lightVideoFiller({title:'The best Halloween videos to watch on YouTube'}),true)
})
