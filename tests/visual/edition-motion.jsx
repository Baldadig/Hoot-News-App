import React, {useRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {usePrintEdition} from '../../src/hooks/usePrintEdition.js'
import '@fontsource/newsreader/latin-800.css'
import '../../src/fonts/fonts.css'
import '../../src/styles.css'
function Fixture(){const root=useRef();const [active,setActive]=useState(true);const [id,setId]=useState('controle-'+Date.now());usePrintEdition(root,id,active,true);window.startPrint=()=>setId('controle-'+Date.now());window.switchTab=()=>{setActive(false);setTimeout(()=>setActive(true),80)};return <main ref={root} style={{padding:24,maxWidth:600,margin:'auto'}}><p className="edmeta">Hoot · Perslijn</p><hr className="edrule"/><article className="front"><h1 style={{fontFamily:'Newsreader',fontSize:40}}>Een nieuw perspectief op de stad</h1><p>Een rustige blik op de wereld om ons heen.</p></article></main>}
createRoot(document.getElementById('root')).render(<React.StrictMode><Fixture/></React.StrictMode>)
