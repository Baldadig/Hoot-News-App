// Controle van "Tien en de bubbel" op de echte Editie (geen productpagina): ?ms=laadduur&fout=1; window.restart() speelt opnieuw.
import React, {useEffect, useState} from 'react'
import {createRoot} from 'react-dom/client'
import {recordCorrection} from '../../src/lib/corrections.mjs'
import Edition from '../../src/views/Edition.jsx'
import {HootContext} from '../../src/components/Items.jsx'
import '@fontsource/newsreader/latin-800.css'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-800.css'
import '../../src/styles.css'
const q=new URLSearchParams(location.search),n=10
// ?at=ms: de klok staat stil op dat moment na de tik (stills); de rest van de pagina loopt gewoon.
const AT=q.get('at'),T0=performance.now()
let frozen=T0
if(AT!=null)performance.now=()=>frozen
const noop=()=>{}
const items=Array.from({length:n},(_,i)=>({id:String(i),kind:'article',source:'nos',sourceName:'NOS',title:i===0?'Kabinet en boeren vinden elkaar in nieuw stikstofplan':`Verhaal ${i+1}: een ander perspectief op het nieuws`,summary:'Een heldere inleiding met ruimte voor het verhaal.',url:'https://nos.nl/artikel/voorbeeld',publishedAt:'2026-11-02T05:00:00Z',topics:[],mainTopics:[]}))
const extra={...items[0],id:'bubbel',title:'Een verrassend verhaal naast je Editie'}
const entries=items.map((i,k)=>({kind:'item',id:i.id,desk:k===1?'extern':'binnenland',why:k===1?{code:'extern',text:'Aanvulling bij Tech',detail:true}:{code:'groot',text:'Groot nieuws · 8 bronnen'}}))
entries.push({kind:'item',id:extra.id,desk:'bubbel',why:{code:'bubbel',text:'Buiten je bubbel'}})
const edition={id:'fixture',slot:'ochtend',date:'2026-11-02',personal:true,entries,items:[...items,extra]}
const ctx={itemsById:new Map([...items,extra].map(i=>[i.id,i])),storiesById:new Map(),muted:new Set(),followStories:[],newInStory:()=>0,openStory:noop,less:[],account:{status:'out'},prefs:{topics:[],interests:['tech'],favorites:[],images:'aan',preview:2,bubble:true},sourcesById:new Map([['nos',{id:'nos',name:'NOS',cat:'nl'}]]),read:new Set(),saved:{},markRead:noop,toggleSave:noop,openSource:noop,voteOn:noop,reportMistake:(item,storyId,reason)=>recordCorrection(localStorage,'beta-fixture',{item,storyId,reason}),undoLess:noop}
function Fixture(){
  const ms=Number(q.get('ms')??0),fout=q.get('fout')==='1'
  const [loading,setLoading]=useState(ms>0),[run,setRun]=useState(0),[tien,setTien]=useState(()=>AT!=null?T0:performance.now())
  useEffect(()=>{try{localStorage.removeItem('hoot:editie-gezien')}catch{};setLoading(ms>0);const t=setTimeout(()=>setLoading(false),ms);return()=>clearTimeout(t)},[run])
  useEffect(()=>{if(AT!=null)requestAnimationFrame(()=>{frozen=T0+Number(AT)})},[])
  window.restart=()=>{setTien(performance.now());setRun(r=>r+1)}
  window.tienStart=()=>tien
  return <HootContext.Provider value={ctx}><main className="col col--read" style={{maxWidth:420,margin:'auto'}}><Edition active tien={tien} onTienDone={()=>setTien(null)} edition={loading||fout?null:{...edition,id:'fixture-'+run}} loading={loading} failedLoad={!loading&&fout} onRefresh={()=>setRun(r=>r+1)} statusProps={{online:true,meta:{updatedAt:'2026-11-02T05:00:00Z'}}}/></main></HootContext.Provider>
}
createRoot(document.getElementById('root')).render(<Fixture/>)
