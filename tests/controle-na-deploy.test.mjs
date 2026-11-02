import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import sharp from 'sharp'
import {analyseFeed,runChecks,pngSize} from '../scripts/controle-na-deploy.mjs'
const walker=JSON.parse(fs.readFileSync(new URL('./fixtures/server-wandelaar.json',import.meta.url))).item
function feed(){
 const items=[
  {id:'a',kind:'article',source:'nos',title:'Nieuwe bibliotheek opent in Utrecht',image:'https://images.nrc.nl/test.jpg'},
  {id:'mi',kind:'article',source:'nyt',title:'Inside the Abdul El-Sayed-Haley Stevens Meltdown in Michigan',topics:['middenoosten']},
  {...walker,topics:[]},
  {id:'b',kind:'article',source:'nos',title:'Amsterdam verbetert de fietsenstalling'},
  {id:'bubble',kind:'article',source:'nrc',title:'Hoe een nieuw boek het verleden vertelt'},
 ]
 const entries=items.map((i,n)=>({kind:'item',id:i.id,desk:['binnenland','vs','buitenland','binnenland','bubbel'][n]}))
 return {sources:[{id:'nos',cat:'nl'},{id:'nyt',cat:'us'},{id:'nrc',cat:'nl'}],items,stories:[],edition:{id:'2026-11-02-avond',builtAt:'2026-11-02T16:00:00Z',entries,items:items.map(i=>i.id===walker.id?{...i,topics:['oekraine']}:i)}}
}
test('een bevroren Editie kan oude tags houden terwijl verse tags en labelcorrectie goed zijn',()=>{
 const result=analyseFeed(feed());assert.ok(result.checks.every(c=>c.status!=='fout'),JSON.stringify(result.checks));assert.equal(result.context.snapshot.entries.length,5)
})
test('lege Editie, galerij en gewoon sportnieuws als hoofdverhaal zijn kritieke fouten',()=>{
 const empty=feed();empty.edition.entries=[];assert.ok(analyseFeed(empty).checks.some(c=>c.status==='fout'&&c.critical))
 for(const title of ['In pictures: the New York marathon','Formule 1: Verstappen wint de Grand Prix']){
  const f=feed();f.items[0].title=title;f.edition.items[0].title=title;if(title.startsWith('Formule')){f.items[0].topics=['f1'];f.edition.items[0].topics=['f1']}assert.ok(analyseFeed(f).checks.some(c=>c.check==='Veilig kopstuk'&&c.status==='fout'&&c.critical))
 }
})
test('te veel plekken, dubbele ids, onvindbare koppen en bubbel tussen de nummers vallen op',()=>{
 const variants=[f=>f.edition.entries.push(...Array.from({length:7},(_,i)=>({id:'extra'+i,kind:'item'}))),f=>f.edition.entries.push({...f.edition.entries[0]}),f=>f.edition.entries[3].id='niet-gevonden',f=>{const b=f.edition.entries.pop();f.edition.entries.splice(1,0,b)}]
 for(const change of variants){const f=feed();change(f);assert.ok(analyseFeed(f).checks.some(c=>c.check==='Nummering'&&c.status==='fout'))}
})
test('een nieuwe geopolitieke route-tag in verse items en verandering van huidig dagdeel falen',()=>{
 const f=feed();f.items.find(i=>i.id===walker.id).topics=['oekraine'];assert.ok(analyseFeed(f).checks.some(c=>c.check==='Britse wandelaar: verse tags'&&c.status==='fout'))
 const base=analyseFeed(feed()).context.snapshot;const current=feed();current.edition.builtAt='2026-11-02T17:00:00Z';assert.ok(analyseFeed(current,{baseline:base}).checks.some(c=>c.check==='Huidig dagdeel behouden'&&c.status==='fout'))
})
test('een PNG-header alleen bewijst geen geldige volledige PNG',()=>{const header=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(header);header.writeUInt32BE(1200,16);header.writeUInt32BE(630,20);assert.equal(pngSize(header),null)})
test('alle URL-controles gebruiken alleen openbare GETs en accepteren voorpagina-503',async()=>{
 const card=await sharp({create:{width:1200,height:630,channels:3,background:'#b3261e'}}).png().toBuffer(),image=await sharp({create:{width:16,height:16,channels:3,background:'#b3261e'}}).png().toBuffer(),calls=[]
 const fetcher=async(url,opts)=>{calls.push({url,opts});const p=new URL(url).pathname;if(p==='/api/feed')return Response.json(feed());if(p==='/api/voorpagina')return Response.json({edition:null},{status:503});return new Response(p==='/api/deelkaart'?card:image,{headers:{'Content-Type':'image/png'}})}
 const r=await runChecks({fetcher,origins:['https://a.test','https://b.test']});assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.parity.status,'goed');assert.ok(calls.every(c=>!c.opts.method||c.opts.method==='GET'));assert.ok(calls.every(c=>!Object.hasOwn(c.opts.headers,'Authorization')))
})
test('HTTP 500 maakt de controles rood en kan niet door een goede voorpagina worden verborgen',async()=>{
 const r=await runChecks({fetcher:async()=>new Response('fout',{status:500}),origins:['https://a.test']});assert.equal(r.ok,false);assert.equal(r.criticalFailure,true)
})
