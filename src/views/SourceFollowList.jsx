import {useEffect,useState} from 'react'
import {SourceMark} from '../components/Items.jsx'
import {discoverSources} from '../lib/follow-welcome.js'
import './source-follow-list.css'
export default function SourceFollowList({sources,interests,on,onPick,onPages}) {
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('Ontdekken')
 useEffect(()=>{onPages(1)},[onPages])
 const list=discoverSources(sources,interests,on,filter,query)
 return <div className="ob-follow"><label>Zoek bronnen<input type="search" placeholder="Zoek op naam of onderwerp" value={query} onChange={e=>setQuery(e.target.value)}/></label><nav aria-label="Bronnen tonen">{['Ontdekken','Alle bronnen','Volgend'].map(f=><button type="button" className="pill" key={f} aria-pressed={filter===f} onClick={()=>{setFilter(f);setQuery('')}}>{f}</button>)}</nav>{!list.length && <p>Geen bron gevonden. Kies een andere zoekterm of bekijk Alle bronnen.</p>}<ul>{list.map(s=><li key={s.id}><SourceMark source={s} size={44}/><div><strong>{s.name}</strong><p>{s.about}</p>{s.paid && <small>Deels achter abonnement</small>}</div><button type="button" className="pill" aria-pressed={on.includes(s.id)} aria-label={`${on.includes(s.id)?'Volgend':'Volgen'}, ${s.name}`} onClick={()=>onPick(s.id)}>{on.includes(s.id)?'Volgend':'Volgen'}</button></li>)}</ul></div>
}
