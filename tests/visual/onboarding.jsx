import React,{useEffect,useState} from 'react'
import {createRoot} from 'react-dom/client'
import Welcome from '../../src/views/Welcome.jsx'
import '@fontsource/newsreader/latin-400.css'
import '@fontsource/newsreader/latin-800.css'
import '../../src/styles.css'
// Dezelfde stijlen als de webapp (src/main.jsx), ook de eigen bestanden van 1.1.1 (inklap.css: de regel Alvast gevolgd).
import '../../src/fonts/fonts.css'
import '../../src/placeholder.css'
import '../../src/staten.css'
import '../../src/styles/rust.css'
import '../../src/styles/inklap.css'
import '../../src/styles/welkom-bewijs.css'
import fixture from '../fixtures/onboarding-sources.json'
import { SOURCES } from '../../netlify/lib/sources.mjs'
// De aanbevelingen uit de echte catalogus erbij (pick, for, forTopic), zoals de server ze meestuurt (netlify/lib/build.mjs).
const sources=fixture.map(s=>{const c=SOURCES.find(x=>x.id===s.id);return c?{...s,pick:!!c.pick,for:c.for||null,forTopic:c.forTopic||null}:s})
const params=new URLSearchParams(location.search)
const theme=params.get('theme')||'light'
if(params.get('text')==='large')document.documentElement.style.fontSize='24px'
if(params.get('text')==='huge')document.documentElement.style.fontSize='32px'
document.documentElement.dataset.theme=theme
function Preview(){const [done,setDone]=useState(null);const [items,setItems]=useState([]);const [edition,setEdition]=useState(params.has('proof')?{entries:[{kind:'story',id:'a'}],items:[{id:'a',title:'Kabinet haalt akkoord over stikstof na nacht onderhandelen',sourceName:'NOS'}]}:null);useEffect(()=>{fetch('/api/feed').then(r=>r.json()).then(d=>{setItems(d.items||[]);if(d.edition&&!params.has('proof'))setEdition(d.edition)}).catch(()=>{})},[]);return done?<main><h1>Klaar</h1><pre id="result">{JSON.stringify({...done,all:undefined},null,2)}</pre></main>:<Welcome sources={sources} items={items} edition={edition} prefs={params.has('reopen')?{interests:['politiek','wereld','tech','cultuur'],topics:[],vak:['ux']}:{interests:[],topics:[],vak:[]}} onClose={params.has('reopen')?()=>setDone({cancelled:true}):null} onDone={setDone}/>}
createRoot(document.getElementById('root')).render(<Preview/> )
