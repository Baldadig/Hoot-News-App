import React from 'react'
import {createRoot} from 'react-dom/client'
import {recordCorrection} from '../../src/lib/corrections.mjs'
import Edition from '../../src/views/Edition.jsx'
import {HootContext} from '../../src/components/Items.jsx'
import '@fontsource/newsreader/latin-800.css'
import '../../src/fonts/fonts.css'
import '../../src/styles.css'
const q=new URLSearchParams(location.search),n=q.get('n')==='3'?3:10
const noop=()=>{}
const items=Array.from({length:n},(_,i)=>({id:String(i),kind:'article',source:'nos',sourceName:'NOS',title:i===0?'Een rustige Editie met aandacht voor wat telt':`Verhaal ${i+1}: een ander perspectief op het nieuws`,summary:'Een heldere inleiding met ruimte voor het verhaal.',url:'https://nos.nl/artikel/voorbeeld',publishedAt:'2026-11-02T05:00:00Z',topics:[],mainTopics:[]}))
const extra={...items[0],id:'bubbel',title:'Een verrassend verhaal naast je Editie'}
const entries=items.map((i,k)=>({kind:'item',id:i.id,desk:k===1?'extern':'binnenland',why:k===1?{code:'extern',text:'Aanvulling bij Tech',detail:true}:{code:'groot',text:'Groot nieuws · 8 bronnen'}}))
entries.push({kind:'item',id:extra.id,desk:'bubbel',why:{code:'bubbel',text:'Buiten je bubbel'}})
const edition={id:'fixture',slot:'ochtend',date:'2026-11-02',personal:true,entries,items:[...items,extra]}
const ctx={itemsById:new Map([...items,extra].map(i=>[i.id,i])),storiesById:new Map(),muted:new Set(),followStories:[],newInStory:()=>0,openStory:noop,less:[],account:{status:'out'},prefs:{topics:[],interests:['tech'],favorites:[],images:'aan',preview:2,bubble:true},sourcesById:new Map([['nos',{id:'nos',name:'NOS',cat:'nl'}]]),read:new Set(),saved:{},markRead:noop,toggleSave:noop,openSource:noop,voteOn:noop,reportMistake:(item,storyId,reason)=>recordCorrection(localStorage,'beta-fixture',{item,storyId,reason}),undoLess:noop}
createRoot(document.getElementById('root')).render(<HootContext.Provider value={ctx}><main className="col col--read" style={{maxWidth:1100,margin:'auto'}}><Edition active edition={edition} loading={false} failedLoad={false} onRefresh={noop} statusProps={{online:true,meta:{updatedAt:'2026-11-02T05:00:00Z'}}}/></main></HootContext.Provider>)
