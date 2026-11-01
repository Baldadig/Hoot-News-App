import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coverageOf, majorNews, allowedNews, internationalNews, exceptionalDutchSport } from '../shared/edition-policy.mjs'
import { profileOf } from '../shared/editor.mjs'
import { selectForReader, buildStories, widelyCovered } from '../netlify/lib/stories.mjs'
import { composePersonal } from '../src/lib/personal.js'
const now = Date.parse('2026-11-01T06:00:00Z')
const at = new Date(now-60000).toISOString()
const mk = (id, title, source='nos', topics=[]) => ({ id, kind:'article', source, sourceName:source, title, summary:`Verslag: ${title}`, publishedAt:at, topics })
const titles = [
  ['dom','Gemeente Utrecht bouwt woningen voor studenten','binnenland'],
  ['india','India Congress Party plans mass protest in New Delhi','buitenland'],
  ['france','Franse president ontbindt parlement in Parijs','buitenland'],
  ['us','US Congress approves new budget in Washington','vs'],
  ['germany','Duitse politie arresteert smokkelbende in Frankfurt','buitenland'],
]
function fixture() {
  const items=[], stories=[]
  for (const [id,title,desk] of titles) {
    const members = ['nos','nu','nrc','ad','trouw','nyt','bbc','guardian'].map((s,k)=>mk(`${id}-${k}`,title,s))
    items.push(...members)
    stories.push({ id, desk, sourceCount:8, ...coverageOf(members), itemIds:members.map(i=>i.id), leadId:members[0].id, latestAt:at })
  }
  return { items, stories, followed:new Set(items.map(i=>i.source)), sources:[...new Set(items.map(i=>i.source))].map(id=>({id,cat:['nyt','bbc','guardian'].includes(id)?'int':'nl'})) }
}
const foreignEntries = (entries, stories, items) => entries.filter(e => {
  const st=stories.find(s=>s.id===e.id)
  const members=(st?.itemIds || [e.leadId || e.id]).map(id=>items.find(i=>i.id===id)).filter(Boolean)
  return internationalNews(members, st?.desk ?? e.fromDesk ?? e.desk)
})
test('major news boundaries: eight publishers, or five with two countries; languages do not count', () => {
  assert.equal(majorNews({sourceCount:7}),false)
  assert.equal(majorNews({sourceCount:8}),true)
  assert.equal(majorNews({sourceCount:4,publisherCountries:['NL','GB']}),false)
  assert.equal(majorNews({sourceCount:5,publisherCountries:['NL','GB']}),true)
  assert.equal(majorNews({sourceCount:5,publisherCountries:['NL','NL']}),false)
  const sameCountry=['nos','nu','nrc','ad','trouw'].map(source=>({source,lang:source==='nos'?'en':'nl'}))
  assert.equal(majorNews({sourceCount:5},sameCountry),false)
  assert.equal(majorNews({sourceCount:5},[...sameCountry.slice(0,4),{source:'bbc'}]),true)
  assert.deepEqual(coverageOf([{source:'nos'},{source:'nos-sport'},{source:'nos-cultuur'}]),{publisherCount:1,publisherCountries:['NL']})
  assert.equal(majorNews({sourceCount:5},[{source:'nos'},{source:'nos-sport'},{source:'nos-cultuur'},{source:'bbc'},{source:'guardian'}]),false)
  assert.equal(majorNews({sourceCount:8,publisherCount:7}),false,'section feeds cannot inflate eight publishers')
  assert.equal(majorNews({sourceCount:5},[{source:'unknown'},{source:'nos'}]),false,'unknown is not a second country')
})
test('no World: interests, favorite sources, forced fill and front page cannot bypass the cap', () => {
  const f=fixture()
  const prof=profileOf({interests:['binnenland','politiek'],favorites:['nyt'],sources:f.sources})
  const entries=selectForReader(f.stories,f.items,{mainIds:f.followed,prof,now,size:10})
  assert.equal(foreignEntries(entries,f.stories,f.items).length,2)
  assert.equal(entries[0].id,'dom')
  const onlyForeign=selectForReader(f.stories.slice(1),f.items.filter(i=>!i.id.startsWith('dom-')),{mainIds:f.followed,prof,now,size:10})
  assert.equal(onlyForeign.length,2,'do not force ten by breaking the cap')
})
test('World has no cap; Binnenland still opens Dutch when both are selected', () => {
  const f=fixture()
  const prof=profileOf({interests:['wereld','binnenland'],sources:f.sources})
  const entries=selectForReader(f.stories,f.items,{mainIds:f.followed,prof,now,size:10})
  assert.ok(foreignEntries(entries,f.stories,f.items).length>2)
  assert.equal(entries[0].id,'dom')
})
test('five-country coverage qualifies; ordinary international news is excluded without World', () => {
  const prof=profileOf({interests:['politiek']})
  const members=[mk('x','India Congress Party plans mass protest in New Delhi','nyt')]
  assert.equal(allowedNews(prof,{sourceCount:7},members,'buitenland'),false)
  assert.equal(allowedNews(prof,{sourceCount:5,publisherCountries:['US','GB']},members,'buitenland'),true)
  assert.equal(allowedNews(profileOf({interests:['wereld']}),{sourceCount:1},members,'buitenland'),true)
})
test('sport requires an explicit choice, not learned affinity or a general-news fallback', () => {
  const sport=mk('s','Eredivisiewedstrijd Cambuur tegen Go Ahead gestaakt','nos',['voetbal'])
  const learned=profileOf({interests:['binnenland'],affinity:{n:100,topics:{voetbal:100},sources:{nos:100}},supply:{voetbal:.01}})
  assert.equal(allowedNews(learned,{sourceCount:20},[sport]),false)
  assert.equal(allowedNews(profileOf({interests:['sport']}),{sourceCount:20},[sport]),true)
  const final=mk('wk','Nederland bereikt WK-finale voetbal','nos',['voetbal'])
  assert.equal(exceptionalDutchSport({sourceCount:8},[final]),true)
  assert.equal(exceptionalDutchSport({sourceCount:7},[final]),false)
  assert.equal(exceptionalDutchSport({sourceCount:20},[{...final,title:'Frankrijk bereikt WK-finale voetbal'}]),false)
  assert.equal(exceptionalDutchSport({sourceCount:20},[{...final,title:'Nederland wint eredivisiewedstrijd'}]),false)
  assert.equal(allowedNews(profileOf(),{sourceCount:8},[final]),true)
})
test('compose: wide, bubble and server fallback together obey two; World can exceed two', () => {
  const f=fixture()
  const global={id:'e',slot:'ochtend',date:'2026-11-01',builtAt:new Date(now).toISOString(),entries:f.stories.map(s=>({kind:'story',id:s.id,leadId:s.leadId,desk:s.desk,sourceCount:s.sourceCount})),items:f.items,wide:f.stories.slice(1).map(s=>({storyId:s.id,item:f.items.find(i=>i.id===s.leadId),sourceCount:s.sourceCount,topics:[]}))}
  for (const followed of [f.followed,new Set()]) {
    const e=composePersonal({...f,global,followed,interests:['binnenland'],now})
    assert.equal(e.entries[0].id,'dom')
    assert.equal(foreignEntries(e.entries,f.stories,f.items).length,2)
  }
  const world=composePersonal({...f,global,interests:['wereld','binnenland'],now})
  assert.ok(foreignEntries(world.entries,f.stories,f.items).length>2)
  assert.equal(world.entries[0].id,'dom')
})
test('backend stores country evidence for the whole story even when the client sees one source', () => {
  const pair=[mk('a','Gemeente Utrecht bouwt woningen voor studenten','nos'),mk('b','Gemeente Utrecht bouwt woningen voor studenten','bbc')]
  const [story]=buildStories(pair,{now})
  assert.deepEqual(story.publisherCountries,['GB','NL'])
  assert.equal(story.publisherCount,2)
  assert.equal(majorNews({...story,sourceCount:5,publisherCount:5},[pair[0]]),true)
})

test('Binnenland reserves a Dutch opening even if only a single unbundled Dutch article exists', () => {
  const f=fixture()
  const domestic=mk('loose','Storm beschadigt woningen in Zeeland')
  const entries=selectForReader(f.stories.slice(1),[...f.items.filter(i=>!i.id.startsWith('dom-')),domestic],{mainIds:f.followed,prof:profileOf({interests:['binnenland','wereld']}),now,size:2})
  assert.equal(entries.length,2)
  assert.equal(entries[0].id,'loose')
})
test('server fallback and bubble cannot leak ordinary football into a non-sport edition', () => {
  const sport=mk('sport','Eredivisiewedstrijd Cambuur tegen Go Ahead definitief gestaakt','nos',['voetbal'])
  const home=mk('home','Gemeente Utrecht bouwt woningen voor studenten')
  const global={id:'e',entries:[{kind:'item',id:'sport',desk:'extern'},{kind:'item',id:'home',desk:'binnenland'}],items:[sport,home]}
  const e=composePersonal({global,items:[],stories:[],followed:new Set(),interests:['binnenland'],now})
  assert.deepEqual(e.entries.map(x=>x.id),['home'])
})

test('the broad-news pool includes a five-publisher story covered in two countries', () => {
  const items=['nos','nu','nrc','ad','bbc'].map((s,k)=>mk(String(k),'India Congress Party plans mass protest in New Delhi',s))
  const story={id:'s',sourceCount:5,...coverageOf(items),itemIds:items.map(i=>i.id)}
  const broad=widelyCovered([story],new Map(items.map(i=>[i.id,i])),{isFree:()=>true})
  assert.equal(broad.length,1)
  assert.deepEqual(broad[0].publisherCountries,['GB','NL'])
})

test('onbekende plaats uit een buitenlandse nieuwsbron telt mee voor het plafond (NPR, hooggerechtshof)', () => {
  const npr = mk('npr-scotus','Supreme Court hears religious freedom case centered on universal pre-K program','npr')
  npr.summary = 'The justices weigh whether a state can exclude religious preschools from a universal program.'
  assert.equal(internationalNews([npr], null), true)
  const prof = profileOf({ interests:['politiek'], sources:[{ id:'npr', cat:'int' }] })
  assert.equal(allowedNews(prof, { sourceCount:1 }, [npr], null), false, 'geen groot nieuws: niet toegelaten zonder Wereld')
  // Een Nederlandse bron zonder plaats blijft onbekend en telt niet als buitenland.
  assert.equal(internationalNews([mk('nos-x','Kabinet presenteert plannen','nos')], null), false)
  // Een vakstuk is geen buitenlands nieuws; met een Nederlandse uitgever erbij blijft onbekend onbekend.
  assert.equal(internationalNews([mk('npr-ai','The two most interesting risks to Anthropic','npr',['ai'])], null), false)
  assert.equal(internationalNews([npr], null, { publisherCountries:['NL','US'] }), false)
  // Wetenschap uit een buitenlandse bron is geen buitenlands nieuws.
  assert.equal(internationalNews([mk('g-sci','New telescope images reveal early galaxies','guardian')], 'wetenschap'), false)
})
