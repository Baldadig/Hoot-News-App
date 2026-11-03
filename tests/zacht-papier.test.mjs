import {test} from 'node:test'
import assert from 'node:assert/strict'
import{readFileSync}from'node:fs'
import{createHash}from'node:crypto'
const baseline=JSON.parse(readFileSync(new URL('./fixtures/zacht-papier-baseline.json',import.meta.url)))
const root=new URL('../',import.meta.url),sha=x=>createHash('sha256').update(x).digest('hex')
const lum=h=>{const c=h.match(/[\da-f]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]}
const contrast=(a,b)=>{const aa=lum(a),bb=lum(b);return(Math.max(aa,bb)+.05)/(Math.min(aa,bb)+.05)}
test('Nacht heeft gekozen leesinkten zonder enige wijziging aan bestaande Licht/Donker-CSS',()=>{
 const css=readFileSync(new URL('src/styles.css',root),'utf8').replace(baseline.approvedCrossfadeAppendix,''),at=css.indexOf('\n/* Nacht Zacht papier:')
 assert.ok(at>0);assert.equal(sha(css.slice(0,at)),baseline.cssBeforeNightOverrideSha256)
 const block=css.slice(at);assert.match(block.replace(/\/\*[\s\S]*?\*\//g,'' ).trim(),/^:root\[data-theme='night'\]\s*\{[^{}]*\}$/);assert.match(block,/:root\[data-theme='night'\]/);assert.doesNotMatch(block,/data-theme='(?:dark|light)'/)
 for(const color of ['#d8d0c2','#bdb3a2','#a79b87','#df8276'])assert.ok(block.includes(color))
})
test('gewone Nacht-tekst behoudt contrast op de daadwerkelijk gebruikte leesoppervlakken',()=>{
 assert.ok(contrast('#d8d0c2','#000000')>=12)
 for(const ink of ['#a79b87','#df8276'])for(const background of ['#000000','#1e1b17','#27231e','#3a1e1b','#151310'])assert.ok(contrast(ink,background)>=4.5,`${ink} op ${background}: ${contrast(ink,background)}`)
})
test('alle oorspronkelijke native kleurassets zijn bytegelijk, inclusief Donker en merkrood',()=>{
 for(const[path,hash]of Object.entries(baseline.nativeAssets))assert.equal(sha(readFileSync(new URL(path,root))),hash,path)
})
