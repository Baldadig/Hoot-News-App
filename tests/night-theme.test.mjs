import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import vm from 'node:vm'
import {themePref,darkPref,resolvedTheme} from '../src/lib/theme.js'
import {pickSynced} from '../src/lib/sync.js'
import {normalizePrefs} from '../src/lib/prefs.js'
import {movePayload,applyMove} from '../src/lib/domain-migration.js'
const store=init=>{const data=new Map(Object.entries(init));return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}}
test('vier keuzes en automatische avondvariant, onbekend blijft systeem',()=>{
 for(const system of [false,true])for(const value of ['system','light','dark','night','kapot',null])for(const evening of ['dark','night','kapot']) {
  const actual=resolvedTheme(value,evening,system)
  assert.equal(actual,themePref(value)==='system'?(system?darkPref(evening):'light'):value)
 }
 assert.equal(normalizePrefs({theme:'kapot',themeDark:'kapot'}).theme,'system')
 assert.equal(darkPref('kapot'),'dark')
})
test('eerste paint gebruikt dezelfde keuze inclusief nachtbalk vóór modules laden',()=>{
 const html=readFileSync('index.html','utf8');const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].find(x=>x[1].includes("var evening"))[1]
 for(const system of [false,true])for(const theme of ['system','light','dark','night','oud'])for(const themeDark of ['dark','night']){
  const root={dataset:{},style:{}};const meta={removeAttribute(){}}
  vm.runInNewContext(script,{localStorage:store({'hoot:theme':theme,'hoot:theme-dark':themeDark}),window:{matchMedia:()=>({matches:system})},document:{documentElement:root,querySelectorAll:()=>[meta]}})
  assert.equal(root.dataset.theme,resolvedTheme(theme,themeDark,system))
  if(root.dataset.theme==='night'){assert.equal(meta.content,'#000000');assert.equal(root.style.colorScheme,'dark')}
 }
})
test('profiel, opschoning en domeinverhuizing bewaren beide nachtkeuzes',()=>{
 assert.deepEqual(pickSynced({theme:'night',themeDark:'night'}),{theme:'night',themeDark:'night'})
 const input=store({'hoot:theme':'night','hoot:theme-dark':'night'}),output=store({})
 applyMove(output,movePayload(input),'https://hootnews.nl')
 assert.equal(output.getItem('hoot:theme'),'night');assert.equal(output.getItem('hoot:theme-dark'),'night')
})
test('Donker-tokenblok bytegelijk; Nacht erft die waarden met alleen zwarte grond',()=>{
 const css=readFileSync('src/styles.css','utf8'),old=execFileSync('git',['show','0a209da:src/styles.css'],{encoding:'utf8'})
 const body=s=>s.slice(s.indexOf('{',s.indexOf(":root[data-theme='dark']"))+1,s.indexOf('}',s.indexOf(":root[data-theme='dark']")))
 assert.equal(body(css),body(old))
 const colors=JSON.parse(readFileSync('docs/codex-blokken/nacht/contrast.json')).colors
 for(const [key,value] of Object.entries(colors).filter(([k])=>!['paper','brandRed'].includes(k)))assert.match(body(css),new RegExp('--'+key+': '+value))
 assert.match(css,/:root\[data-theme='night'\] \{ --paper: #000000/)
 const linear=c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4
 const lum=c=>c.slice(1).match(/../g).map(x=>linear(parseInt(x,16)/255)).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0)
 for(const key of ['ink','ink-2','ink-3','accent'])assert.ok((lum(colors[key])+.05)/.05 >= (key==='ink'?7:4.5))
})

// De echte hook: OS-wijzigingen mogen alleen Systeem beïnvloeden; afmelden voorkomt oude listeners.
test('hook volgt OS live alleen bij Systeem en ruimt de listener op',()=>{
 const source=readFileSync('src/hooks/useTheme.js','utf8').replace(/^import .*$/gm,'').replaceAll('export ','')
 for(const theme of ['system','light','dark','night']) {
  const root={dataset:{},style:{}},meta={removeAttribute(){}}
  let callback,removed,cleanup
  const mq={matches:false,addEventListener:(event,fn)=>{callback=fn},removeEventListener:(event,fn)=>{removed=fn}}
  const context=vm.createContext({themePref,darkPref,resolvedTheme,brandBarHeld:()=>false,useCallback:fn=>fn,useEffect:fn=>{cleanup=fn()},window:{matchMedia:()=>mq},document:{documentElement:root,querySelectorAll:()=>[meta]},getComputedStyle:()=>({getPropertyValue:()=>''}),localStorage:store({})})
  vm.runInContext(source+';useTheme("papier",'+JSON.stringify({theme,themeDark:'night'})+',()=>{})',context)
  assert.equal(root.dataset.theme,theme==='system'?'light':theme)
  assert.equal(!!callback,theme==='system')
  if(callback){mq.matches=true;callback();assert.equal(root.dataset.theme,'night');assert.equal(meta.content,'#000000');cleanup();assert.equal(removed,callback)}
 }
})
