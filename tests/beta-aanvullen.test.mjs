import {test} from 'node:test'
import assert from 'node:assert/strict'
import {profileOf} from '../shared/editor.mjs'
import {internationalNews,cappedInternational,allowedNews} from '../shared/edition-policy.mjs'
import {composePersonal} from '../src/lib/personal.js'
const now=Date.parse('2026-11-02T05:00:00Z'),publishedAt=new Date(now).toISOString()
const sources=[{id:'nos',name:'NOS',cat:'nl',lang:'nl'},{id:'theverge',name:'The Verge',cat:'tech',lang:'en'},{id:'guardian',name:'Guardian',cat:'int',lang:'en'}]
const tech=profileOf({interests:['tech'],sources}),plain=profileOf({sources})
const chip={id:'chip',source:'guardian',sourceName:'Guardian',kind:'article',title:'TSMC expands semiconductor production in Taiwan',summary:'The chipmaker is building a new factory.',topics:['tech'],mainTopics:['tech'],publishedAt,url:'https://example.com/chips'}
const st={id:'chips',sourceCount:3,publisherCount:3,itemIds:['chip'],desk:'buitenland',latestAt:publishedAt}
test('relevant internationaal vaknieuws houdt zijn land, maar verbruikt geen algemene Wereld-plek',()=>{
  assert.equal(internationalNews([chip],st.desk,st),true)
  assert.equal(cappedInternational(tech,[chip],st.desk,st),false)
  assert.equal(cappedInternational(plain,[chip],st.desk,st),true)
  assert.equal(allowedNews(tech,st,[chip],st.desk),true)
  assert.equal(allowedNews(plain,st,[chip],st.desk),false)
  const noise={...chip,source:'theverge',title:'Get in the spirit with these horrors from YouTube',summary:'Some spooky videos to watch.',topics:[],mainTopics:[]}
  assert.equal(cappedInternational(tech,[noise],'buitenland',st),true,'alleen het merk van een techbron is geen vakinhoudelijk bewijs')
})
test('eerst een passende kandidaat van buiten de voorpagina zoeken; kop en aanvulreden gaan mee',()=>{
  const home={id:'home',kind:'article',source:'nos',title:'Den Haag bouwt extra sociale huurwoningen',summary:'De bouw gaat beginnen.',publishedAt}
  const global={id:'slot',builtAt:publishedAt,entries:[{kind:'item',id:'home',desk:'binnenland'}],items:[home],near:[{storyId:'chips',sourceCount:3,item:chip}],wide:[]}
  const ed=composePersonal({global,stories:[st],items:[home],sources,followed:new Set(['nos']),interests:['tech'],now})
  const chosen=ed.entries.find(e=>(e.leadId||e.id)==='chip')
  assert.ok(chosen)
  assert.equal(chosen.desk,'extern')
  assert.equal(chosen.supplement,'passend')
  assert.ok(ed.items.some(i=>i.id==='chip'))
})
