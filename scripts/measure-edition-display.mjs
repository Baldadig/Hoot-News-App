import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import{pathToFileURL}from'node:url';
const root=process.cwd();const{editionsNu,contextOf,leadOf}=await import(pathToFileURL(root+'/tests/helpers/snapshot.mjs'));
const files=fs.readdirSync(root+'/tests/fixtures').filter(n=>n.startsWith('snapshot-')&&n.endsWith('.json.gz'));
const {heroFirst}=await import(pathToFileURL(root+'/src/lib/edition.js')); const {fitsHero}=await import(pathToFileURL(root+'/src/lib/img.js'));
const rows=[],snapshots=[],promotions=[];
for(const file of files){const snap=JSON.parse(gunzipSync(fs.readFileSync(root+'/tests/fixtures/'+file))),ctx=contextOf(snap);snapshots.push({file,date:snap.meta.updatedAt,items:snap.items.length});for(const{persona,edition}of editionsNu(snap)){
const frozen = new Map((edition?.items||[]).map(i=>[i.id,i]));
const order = (edition?.entries||[]).map(e=>({desk:e.desk,item:frozen.get(leadOf(e))||ctx.itemById.get(leadOf(e))})).filter(r=>r.item);
const rendered = heroFirst(order,fitsHero);
if(order[0]?.item.id!==rendered[0]?.item.id) promotions.push({snapshot:file,persona:persona.id,chosenBinnenland:persona.interests.includes('binnenland'),beforeId:order[0]?.item.id,beforeDesk:order[0]?.desk,afterId:rendered[0]?.item.id,afterDesk:rendered[0]?.desk});
for(const[eIndex,e]of(edition?.entries||[]).entries()){const i=(edition.items||[]).find(i=>i.id===leadOf(e))||ctx.itemById.get(leadOf(e));rows.push({snapshot:file,persona:persona.id,slot:eIndex+1,id:leadOf(e),titleChars:i?.title?.length||0,introChars:(i?.summary||'').length,image:!!i?.image,title:i?.title,intro:i?.summary||''});}}}
const pct=(rs,p)=>rs.sort((a,b)=>a-b)[Math.floor((rs.length-1)*p)]||0;
const stats=rs=>({n:rs.length,title:{p50:pct(rs.map(r=>r.titleChars),.5),p75:pct(rs.map(r=>r.titleChars),.75),p90:pct(rs.map(r=>r.titleChars),.9),max:Math.max(...rs.map(r=>r.titleChars))},introCoverage:rs.filter(r=>r.introChars).length/rs.length,imageCoverage:rs.filter(r=>r.image).length/rs.length});
const out={snapshots,promotions,all:stats(rows),topThree:stats(rows.filter(r=>r.slot<=3)),bySnapshot:Object.fromEntries(files.map(f=>[f,stats(rows.filter(r=>r.snapshot===f))])),rows};fs.writeFileSync(process.argv[2],JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({all:out.all,topThree:out.topThree,promotions:out.promotions}));
