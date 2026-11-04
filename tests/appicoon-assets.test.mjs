import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile}from'node:fs/promises'
import{createHash}from'node:crypto'
import sharp from 'sharp'
const root=new URL('../ios/Hoot/Assets.xcassets/',import.meta.url)
test('vier iconen zijn compleet, licht ondoorzichtig, getint grijs en donker identiek',async()=>{
 const names=['AppIcon','AppIconRuim','AppIconPapier','AppIconZwart']
 for(const name of names){
  const dir=new URL(name+'.appiconset/',root),json=JSON.parse(await readFile(new URL('Contents.json',dir)))
  assert.equal(json.images.length,3)
  for(const file of ['icon-1024.png','icon-1024-dark.png','icon-1024-tinted.png']){
   const data=await readFile(new URL(file,dir)),meta=await sharp(data).metadata()
   assert.equal(meta.width,1024);assert.equal(meta.height,1024)
   if(file==='icon-1024-dark.png')assert.equal(createHash('sha256').update(data).digest('hex'),'79085c6c00329bec72b1b1a04bbbac0cf48d3301e0c98c943f81a64fae3bb2b3')
   else {assert.equal(meta.hasAlpha,false);assert.equal((await sharp(data).stats()).isOpaque,true)}
   if(file==='icon-1024-tinted.png')assert.equal(meta.space,'b-w')
  }
 }
})
