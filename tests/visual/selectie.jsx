// Geïsoleerde echte Selectie-component. Alleen lokale fixtureknoppen, geen productroute.
import React,{useState} from 'react'
import{createRoot}from'react-dom/client'
import '@fontsource/newsreader/latin-800.css'
import '../../src/fonts/fonts.css'
import '../../src/styles.css'
import Vak from '../../src/views/Vak.jsx'
import{HootContext}from'../../src/components/Items.jsx'
import{VAK_FIELDS}from'../../shared/vak.mjs'
function Fixture(){
 const[storedCount,setStoredCount]=useState(null);const[owner,setOwner]=useState('A'),[ready,setReady]=useState(true),[chosen,setChosen]=useState(VAK_FIELDS.map(f=>f.id)),[week,setWeek]=useState(44)
 const fields=VAK_FIELDS.map((f,n)=>({...f,top:n===3?[]:[1,2,3].map(k=>({id:f.id+'-'+k,source:'test',sourceName:'Testbron',title:k===1?'Een zorgvuldig gekozen verhaal over '+f.label:'Een andere blik op '+f.label,summary:'Dit is lokale testinhoud voor de opmaak en bediening van de Selectie.',url:'https://example.com/'+f.id+'/'+k})),more:[],count:12}))
 const query=new URLSearchParams(location.search);if(query.has('large'))document.documentElement.style.fontSize='24px'
 return <><div style={{display:'flex',gap:12,padding:8,flexWrap:'wrap'}}><button onClick={()=>setOwner(owner==='A'?'B':'A')}>Testlezer {owner}</button><button onClick={()=>setWeek(week+1)}>Nieuwe testweek</button><button onClick={()=>setChosen(chosen.length>1?['ai']:VAK_FIELDS.map(f=>f.id))}>Aantal onderwerpen wisselen</button><button onClick={()=>{setOwner('B');setReady(false);setChosen(['ai'])}}>Wacht op testprofiel</button><button onClick={()=>{setReady(true);setChosen(VAK_FIELDS.map(f=>f.id))}}>Testprofiel geladen</button><button onClick={()=>setStoredCount(JSON.parse(localStorage.getItem('hoot:selectie:ui:v1:B')||'[]').length)}>Lees testopslag</button><output id="fold-stored-b">{storedCount}</output></div><div className="app" style={{height:'calc(100dvh - 48px)'}}><main className="main"><HootContext.Provider value={{selectionReady:ready,theme:'systeem',openDisplay:()=>{},prefs:{vak:chosen},setPref:(_,v)=>setChosen(v),account:{status:'in',user:{id:owner}},read:new Set(),saved:{},markRead:()=>{},toggleSave:()=>{},share:()=>{}}}><Vak active digest={{id:'test-'+week,week,from:'2026-10-26T06:00:00Z',to:'2026-11-02T06:00:00Z',fields}} status="ready" onRefresh={()=>{}}/></HootContext.Provider></main></div></>
}
createRoot(document.getElementById('root')).render(<Fixture/>);
