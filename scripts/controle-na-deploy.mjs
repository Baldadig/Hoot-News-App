// Openbare GET-controles. Geen accounts, secrets, opslagmutaties of refresh-trigger.
import {readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {isSport} from '../shared/editor.mjs'
import {sportStory,isGallery,exceptionalDutchSport} from '../shared/edition-policy.mjs'
import {eventScope,conflictingEvents} from '../shared/article-signals.mjs'
import {desksOf,primaryDesk,DESK_LABEL} from '../netlify/lib/desks.mjs'
import {labelFor} from '../src/lib/label.js'
import {CDN_HOSTS} from '../src/lib/img.js'

const ORIGINS=['https://gethoot.app','https://hootnews.nl']
const record=(check,ok,detail,critical=false)=>({check,status:ok==null?'overgeslagen':ok?'goed':'fout',detail,critical})
const unique=items=>[...new Map(items.filter(Boolean).map(i=>[i.id,i])).values()]
const numbered=entries=>entries.filter(e=>e.desk!=='bubbel')
const signature=entries=>entries.map(e=>[e.kind,e.id,e.leadId||null])
export const pngSize=bytes=>bytes.length>=45 && Buffer.from(bytes).subarray(0,8).toString('hex')==='89504e470d0a1a0a' && Buffer.from(bytes).subarray(-12).toString('hex')==='0000000049454e44ae426082' ? [Buffer.from(bytes).readUInt32BE(16),Buffer.from(bytes).readUInt32BE(20)] : null

export function analyseFeed(feed,{origin='',baseline=null}={}) {
 const checks=[],ed=feed?.edition,entries=ed?.entries
 if(!Array.isArray(entries)||!entries.length||!Array.isArray(ed?.items))return {checks:[record('Editie',false,'Geen gevulde Editie met items',true)],context:null}
 const items=unique([...(ed.items||[]),...(feed.items||[]),...(feed.related||[])]),byId=new Map(items.map(i=>[i.id,i])),sources=new Map((feed.sources||[]).map(s=>[s.id,s])),stories=new Map((feed.stories||[]).map(s=>[s.id,s]))
 const first=entries[0],lead=byId.get(first.leadId||first.id),story=stories.get(first.id)||{},members=(story.itemIds||first.itemIds||[lead?.id]).map(id=>byId.get(id)).filter(Boolean),catOf=new Map([...sources.values()].map(s=>[s.id,s.cat]))
 checks.push(record('Hoofdverhaal',!!lead?.title?.trim(),lead?{title:lead.title,desk:first.desk||primaryDesk([desksOf(lead)]),sources:first.sourceCount||story.sourceCount||new Set(members.map(i=>i.source)).size||1,label:labelFor({topics:lead.topics,mainTopics:lead.mainTopics||[],desk:first.desk,deskLabel:DESK_LABEL[first.desk]||'Nieuws'}).kicker}:'Kopstuk niet gevonden',true))
 if(lead){const sport=isSport(lead,catOf)||sportStory(story,members,catOf);checks.push(record('Veilig kopstuk',!isGallery(lead)&&(!sport||exceptionalDutchSport(story,members)),{gallery:isGallery(lead),sport,exceptionalDutchSport:sport&&exceptionalDutchSport(story,members)},true))}
 const regular=numbered(entries),bubbles=entries.filter(e=>e.desk==='bubbel')
 checks.push(record('Nummering',regular.length>=4&&regular.length<=10&&new Set(entries.map(e=>e.id)).size===entries.length&&regular.every(e=>byId.get(e.leadId||e.id)?.title?.trim())&&bubbles.length<=1&&(!bubbles.length||entries.at(-1).desk==='bubbel'),{numbered:regular.length,optionalBubble:bubbles.length,bubbleLast:!bubbles.length||entries.at(-1).desk==='bubbel'},true))
 const headLabel=(it,desk)=>labelFor({topics:it.topics,mainTopics:it.mainTopics||[],follows:['middenoosten','oekraine','vs-politiek'],desk,deskLabel:DESK_LABEL[desk]||'Buitenland'}).kicker
 const michigan=items.filter(i=>/michigan/i.test(i.title||'')&&/el.sayed|stevens|democra/i.test(i.title||''))
 checks.push(record('Michigan',michigan.length?michigan.every(i=>{const desk=primaryDesk([desksOf(i)]);return desk==='vs'&&/\bVS\b/.test(headLabel(i,desk)||'')}):null,michigan.length?michigan.map(i=>({id:i.id,desk:primaryDesk([desksOf(i)]),label:headLabel(i,primaryDesk([desksOf(i)]))})):'Niet in live aanbod; gedeelde fixture blijft de regressiecontrole'))
 const walkers=items.filter(i=>/avonturier|explorer|adventurer/i.test(i.title||'')&&/wereldtocht|world.*walk|world.*tour|world.*journey|round.the.world/i.test(i.title||''))
 checks.push(record('Britse wandelaar: label',walkers.length?walkers.every(i=>{const desk=primaryDesk([desksOf(i)]);return desk!=='oekraine'&&!/Oekraïne/.test(headLabel(i,desk)||'')}):null,walkers.length?walkers.map(i=>({id:i.id,desk:primaryDesk([desksOf(i)]),label:headLabel(i,primaryDesk([desksOf(i)]))})):'Niet in live aanbod'))
 const freshWalker=(feed.items||[]).filter(i=>walkers.some(w=>w.id===i.id))
 checks.push(record('Britse wandelaar: verse tags',freshWalker.length?freshWalker.every(i=>!(i.topics||[]).includes('oekraine')):null,freshWalker.length?freshWalker.map(i=>({id:i.id,topics:i.topics||[],note:'Oude Editie-items mogen bevroren metadata houden; verse Stroom-items niet'})):'Niet in de verse Stroom aanwezig'))
 const running=items.filter(i=>/marathon|hardloop|nageeye|kipruto|chepkirui/i.test(i.title||'')),runningIds=new Set(running.map(i=>i.id))
 const bundles=[...stories.values()].filter(st=>(st.itemIds||[]).some(id=>runningIds.has(id)))
 const mixed=bundles.filter(st=>{const scopes=(st.itemIds||[]).map(id=>byId.get(id)).filter(Boolean).map(eventScope).filter(s=>s.sports.length);return scopes.some((a,j)=>scopes.slice(j+1).some(b=>conflictingEvents(a,b)))})
 checks.push(record('Marathon/F1-bundels',running.length?!mixed.length:null,running.length?{runningArticles:running.length,bundles:bundles.length,mixedDisciplineBundles:mixed.map(st=>st.id)}:'Niet in live aanbod'))
 const snapshot={id:ed.id,builtAt:ed.builtAt,entries:signature(entries)}
 if(baseline?.id===ed.id)checks.push(record('Huidig dagdeel behouden',baseline.builtAt===ed.builtAt&&JSON.stringify(baseline.entries)===JSON.stringify(snapshot.entries),{before:baseline.builtAt,after:ed.builtAt},true))
 else if(baseline)checks.push(record('Nieuw dagdeel',true,{before:baseline.id,after:ed.id}))
 return {checks,context:{origin,edition:ed.id,lead,items,entries,snapshot}}
}

async function request(fetcher,url){const r=await fetcher(url,{headers:{'User-Agent':'Hoot-release-controle/1.0',Accept:'application/json,image/png,image/jpeg'},signal:AbortSignal.timeout(45000)});return r}
export async function runChecks({fetcher=fetch,origins=ORIGINS,baseline={}}={}) {
 const sites=[]
 for(const origin of origins){
  const checks=[];let context=null
  try {const r=await request(fetcher,origin+'/api/feed');checks.push(record('Feed HTTP',r.status===200,{status:r.status},true));if(r.status===200){const feed=await r.json(),a=analyseFeed(feed,{origin,baseline:baseline[origin]});checks.push(...a.checks);context=a.context}}
  catch(e){checks.push(record('Feed JSON/verzoek',false,e.message,true))}
  try {const r=await request(fetcher,origin+'/api/voorpagina');let valid=r.status===503;if(r.status===200){const d=await r.json();valid=d.edition?.entries?.length===3&&d.edition.entries.every(e=>typeof e.title==='string'&&e.title.trim())}checks.push(record('Voorpagina',valid,{status:r.status,contract:'drie echte koppen of 503'}))}catch(e){checks.push(record('Voorpagina',false,e.message))}
  if(context?.lead){
   try {const r=await request(fetcher,origin+'/api/deelkaart?id='+encodeURIComponent(context.lead.id));const size=pngSize(new Uint8Array(await r.arrayBuffer()));checks.push(record('Deelkaart PNG',r.status===200&&size?.[0]===1200&&size?.[1]===630,{status:r.status,size}))}catch(e){checks.push(record('Deelkaart PNG',false,e.message))}
   const candidates=context.items.filter(i=>{try{return new URL(i.image).protocol==='https:'&&CDN_HOSTS.includes(new URL(i.image).hostname)}catch{return false}}).slice(0,3)
   let imageOK=false;const attempts=[]
   for(const item of candidates){try{const r=await request(fetcher,origin+'/.netlify/images?url='+encodeURIComponent(item.image)+'&w=160&fm=png'),bytes=new Uint8Array(await r.arrayBuffer()),size=pngSize(bytes);attempts.push({source:item.source,status:r.status,size});if(r.status===200&&size){imageOK=true;break}}catch(e){attempts.push({source:item.source,error:e.message})}}
   checks.push(record('Afbeeldingsproxy',candidates.length?imageOK:null,candidates.length?attempts:'Geen allowlist-beeld in deze feed; niet als geslaagde proxyproef tellen'))
  }
  sites.push({origin,checks,snapshot:context?.snapshot||null})
 }
 const parity=sites.length===2&&sites.every(s=>s.snapshot)?record('Zelfde Editie op beide domeinen',sites[0].snapshot.id===sites[1].snapshot.id&&JSON.stringify(sites[0].snapshot.entries)===JSON.stringify(sites[1].snapshot.entries),sites.map(s=>({origin:s.origin,id:s.snapshot.id}))):null
 const checks=[...sites.flatMap(s=>s.checks),...(parity?[parity]:[])];return {ok:!checks.some(c=>c.status==='fout'),criticalFailure:checks.some(c=>c.status==='fout'&&c.critical),sites,parity,checkedAt:new Date().toISOString()}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),option=n=>{const i=args.indexOf(n);return i<0?null:args[i+1]};let baseline={}
 try {
  if(option('--baseline'))baseline=JSON.parse(readFileSync(option('--baseline'),'utf8'))
  const result=await runChecks({baseline})
  if(option('--json'))writeFileSync(option('--json'),JSON.stringify(result,null,2)+'\n')
  if(option('--save-baseline'))writeFileSync(option('--save-baseline'),JSON.stringify(Object.fromEntries(result.sites.filter(s=>s.snapshot).map(s=>[s.origin,s.snapshot])),null,2)+'\n')
  for(const site of result.sites){console.log(site.origin);for(const c of site.checks)console.log(`  ${c.status.toUpperCase()} ${c.check}: ${typeof c.detail==='string'?c.detail:JSON.stringify(c.detail)}`)}
  if(result.parity)console.log(`${result.parity.status.toUpperCase()} ${result.parity.check}`)
  console.log(result.ok?'Alle uitgevoerde controles geslaagd.':'Controlefout: niet verder publiceren; zie terugdraaiplan.');process.exitCode=result.ok?0:1
 }catch(e){console.error('Controle niet uitvoerbaar: '+e.message);process.exitCode=1}
}
