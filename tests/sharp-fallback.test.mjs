import {test} from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises'
import {join} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import sharp from 'sharp'
import {measureImage} from '../netlify/lib/image-measure.mjs'

test('feedmodule kan koud laden als de native Sharp-runtime ontbreekt',async()=>{
 const root=fileURLToPath(new URL('../',import.meta.url)),cache=join(root,'node_modules/.cache')
 await mkdir(cache,{recursive:true})
 const dir=await mkdtemp(join(cache,'hoot-sharp-fallback-'))
 try {
  const result=await build({stdin:{contents:"export {buildFeed} from './netlify/lib/build.mjs'; export {measureImage} from './netlify/lib/image-measure.mjs'",resolveDir:root},bundle:true,platform:'node',format:'esm',packages:'external',write:false,logLevel:'silent',plugins:[{name:'missing-sharp-runtime',setup(b){b.onResolve({filter:/^sharp$/},()=>({path:'unavailable',namespace:'missing-sharp'}));b.onLoad({filter:/.*/,namespace:'missing-sharp'},()=>({contents:"throw new Error('ERR_DLOPEN_FAILED: synthetic missing native binary'); export default null",loader:'js'}))}}]})
  const file=join(dir,'feed.mjs');await writeFile(file,result.outputFiles[0].text)
  const cold=await import(pathToFileURL(file))
  assert.equal(typeof cold.buildFeed,'function','feed moet kunnen initialiseren vóór beeldmeting')
  const png=await sharp({create:{width:64,height:64,channels:3,background:'#b3261e'}}).png().toBuffer()
  assert.equal((await measureImage(png)).w,64,'controle: het beeld is geldig')
  assert.equal(await cold.measureImage(png),null,'native fout geeft geen feed-500')
 } finally {await rm(dir,{recursive:true,force:true})}
})
