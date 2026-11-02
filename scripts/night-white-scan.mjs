// Manifest: [{file, exclusions:[{x,y,width,height,reason}]}]. Geen automatische vrijstelling
// van onbekende witte delen: alleen vooraf vastgelegde foto-/merk-/systeemgebieden.
import sharp from 'sharp'
import {readFileSync,writeFileSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
const input=JSON.parse(readFileSync(process.argv[2],'utf8'))
const luminance=([r,g,b])=>[r,g,b].map(c=>c/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0)
const ceiling=luminance([241,236,226])
const linear=Array.from({length:256},(_,c)=>{const v=c/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4})
const report=[]
for(const entry of input){
 const {data,info}=await sharp(resolve(dirname(process.argv[2]),entry.file)).removeAlpha().raw().toBuffer({resolveWithObject:true})
 const tiles=new Map()
 let count=0,minX=info.width,minY=info.height,maxX=0,maxY=0
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  if((entry.exclusions||[]).some(r=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height))continue
  const i=(y*info.width+x)*info.channels
  if(linear[data[i]]*.2126+linear[data[i+1]]*.7152+linear[data[i+2]]*.0722>ceiling+0.005){count++;const tile=`${Math.floor(x/32)*32},${Math.floor(y/32)*32}`;tiles.set(tile,(tiles.get(tile)||0)+1);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
 }
 report.push({...entry,width:info.width,height:info.height,brightPixels:count,hotspots:[...tiles].sort((a,b)=>b[1]-a[1]).map(([at,pixels])=>({at,pixels})),bounds:count?{minX,minY,maxX,maxY}:null})
}
const result={ceiling:'#f1ece2',luminance:ceiling,tolerance:.005,report}
if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify(result,null,2))
