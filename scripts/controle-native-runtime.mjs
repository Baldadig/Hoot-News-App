// Koude native-import in het echte bouwproces; geen secrets of netwerkverzoeken.
import {writeFileSync,mkdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

export function validateTarget({platform=process.platform,arch=process.arch,node=process.versions.node,netlify=process.env.NETLIFY==='true' && process.platform==='linux'}={}) {
 if(netlify && (platform!=='linux' || arch!=='x64' || Number(node.split('.')[0])!==20)) throw Error(`Onverwacht Netlify-doel: ${platform}/${arch} Node ${node}; verwacht Linux x64 Node 20`)
 return netlify
}
export async function checkNative() {
 validateTarget()
 const checkedLinux=process.platform==='linux' && process.arch==='x64' && Number(process.versions.node.split('.')[0])===20
 const {default:sharp}=await import('sharp')
 const {Resvg}=await import('@resvg/resvg-js')
 if(sharp.versions.sharp!=='0.35.5')throw Error('Sharp-versie wijkt af van de geteste 0.35.5')
 const png=await sharp({create:{width:32,height:32,channels:3,background:'#b3261e'}}).resize(16,16).png().toBuffer()
 const svg=new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#b3261e"/></svg>').render().asPng()
 for(const data of [png,svg])if(data.readUInt32BE(16)!==16 || data.readUInt32BE(20)!==16 || data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Native beeldcontrole gaf geen geldige PNG van 16×16')
 return {ok:true,platform:process.platform,arch:process.arch,node:process.versions.node,sharp:sharp.versions.sharp,sharpPNG:true,resvgPNG:true,checkedLinux,scope:checkedLinux?'Linux x64 Node 20 in het Netlify-bouwproces':'Lokale native controle; geen bewijs van een Linux-run'}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 try {
  const result=await checkNative();mkdirSync('.netlify',{recursive:true});writeFileSync('.netlify/native-runtime-check.json',JSON.stringify(result,null,2)+'\n');console.log('Native runtimecontrole: '+JSON.stringify(result))
 } catch(e){console.error('Native runtimecontrole mislukt: '+e.message);process.exitCode=1}
}
