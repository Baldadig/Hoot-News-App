import {test} from 'node:test'
import assert from 'node:assert/strict'
import {composePersonal,withoutDebug} from '../src/lib/personal.js'
const builtAt = '2026-11-02T05:00:00Z', now = Date.parse(builtAt)
const titles = ['Amsterdam bouwt studentenwoningen bij de haven','Rotterdam opent nieuwe polikliniek voor kinderen','Groningen herstelt de historische draaibrug','Den Haag verhoogt de gemeentelijke afvalheffing','Utrecht investeert in ondergrondse fietsenstalling']
function compose(n, extra = []) {
  const items = titles.slice(0,n).map((title,k)=>({id:String(k),kind:'article',source:'nos',title,summary:'De plannen worden dit najaar uitgevoerd.',publishedAt:builtAt,url:'https://nos.nl/artikel/'+k}))
  const global = {id:'kort',builtAt,entries:items.map(i=>({kind:'item',id:i.id})),items,wide:[],bubble:[]}
  return composePersonal({global,items:[...items,...extra],sources:[{id:'nos',name:'NOS',cat:'nl',lang:'nl'}],followed:new Set(['nos']),interests:['binnenland'],now})
}
test('vijf is alleen geldig met volledig kandidatenbewijs, drie blijft een harde fout',()=>{
  const five=compose(5)
  assert.equal(five.entries.length,5)
  assert.equal(five._supply.proven,true)
  assert.equal(five._supply.unresolved,0)
  assert.equal(five._supply.ownArticles,5)
  assert.equal(withoutDebug(five)._supply,undefined)
  const three=compose(3)
  assert.equal(three.entries.length,3)
  assert.equal(three._supply.proven,false,'de vloer mag niet door gebrek aan aanbod verdwijnen')
})
test('een verdwenen verhaal-id mag een geschikt, actueel artikel niet laten verdwijnen',()=>{
  const extra={id:'wees',kind:'article',source:'nos',title:'Eindhoven koopt elektrische vuilniswagens',summary:'De voertuigen rijden vanaf het voorjaar.',publishedAt:builtAt,url:'https://nos.nl/artikel/wees',storyId:'verdwenen'}
  const result=compose(5,[extra])
  assert.ok(result.entries.some(e=>(e.leadId||e.id)==='wees'))
  assert.equal(result.entries.length,6)
})
