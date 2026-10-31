import React,{useState} from 'react'
import {createRoot} from 'react-dom/client'
import Welcome from '../../src/views/Welcome.jsx'
import '@fontsource/newsreader/latin-400.css'
import '@fontsource/newsreader/latin-800.css'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-800.css'
import '../../src/styles.css'
import sources from '../fixtures/onboarding-sources.json'
const params=new URLSearchParams(location.search)
const theme=params.get('theme')||'light'
if(params.get('text')==='large')document.documentElement.style.fontSize='24px'
if(params.get('text')==='huge')document.documentElement.style.fontSize='32px'
document.documentElement.dataset.theme=theme
function Preview(){const [done,setDone]=useState(null);return done?<main><h1>Klaar</h1><pre id="result">{JSON.stringify({...done,all:undefined},null,2)}</pre></main>:<Welcome sources={sources} prefs={{interests:['politiek','wereld','tech','cultuur'],topics:[],vak:[]}} onDone={setDone}/>}
createRoot(document.getElementById('root')).render(<Preview/> )
