import { useEffect, useRef, useState } from 'react'
import { BrandLogo } from '../components/Brand.jsx'
import { SourceMark } from '../components/Items.jsx'
import { INTERESTS, resolveTopics } from '../lib/topics.js'
import { VAK_DOMAINS, VAK_FIELDS } from '../../shared/vak.mjs'
import { pickedFrom, proposeSources } from '../lib/welcome.js'
import { discoverSources, toggleFollow } from '../lib/follow-welcome.js'
import './follow-welcome.css'
const titles = ['Wat houdt je bezig?', 'Kies wat je volgt.', 'Zo begint je Hoot.', 'Je Hoot, om te beginnen.', 'Waar wil je in groeien?', 'Kies je vakgebied of interesse.', 'Wat wil je volgen?', 'Ruimte voor je Selectie.']
export default function FollowWelcome({sources, prefs, muted = new Set(), onDone, onClose, leaving, onLeft}) {
  const [step,setStep] = useState(0), [interests,setInterests] = useState(onClose ? prefs.interests || [] : [])
  const all = sources.filter(s => s.followed && s.kind !== 'sociaal')
  const sourceReady = useRef(all.length > 0)
  const [chosen,setChosen] = useState(() => onClose ? all.filter(s => !muted.has(s.id)).map(s => s.id) : [])
  useEffect(() => { if (!sourceReady.current && all.length) { sourceReady.current = true; if (onClose) setChosen(all.filter(s => !muted.has(s.id)).map(s => s.id)) } }, [sources,onClose,muted])
  const [fields,setFields] = useState(onClose ? prefs.vak || [] : []), [domains,setDomains] = useState([]), [intents,setIntents] = useState([])
  const [query,setQuery] = useState(''),[filter,setFilter] = useState('Ontdekken'), head = useRef(null)
  useEffect(() => { head.current?.focus(); head.current?.scrollIntoView({block:'start'}) }, [step])
  useEffect(() => { if (leaving) onLeft?.() }, [leaving,onLeft])
  useEffect(() => { const key = e => { if(e.key === 'Escape') onClose?.() }; document.addEventListener('keydown',key); return () => document.removeEventListener('keydown',key) }, [onClose])
  const next = () => {setQuery('');setStep(s => Math.min(7,s+1))}
  const finish = () => onDone({interests,topics:resolveTopics(interests,onClose ? pickedFrom(prefs.topics || [],prefs.interests || [],INTERESTS) : []),sources:chosen.length ? chosen : proposeSources(all,interests),all,vak:fields})
  const choice = (label,on,action) => <button type="button" className="follow42-choice" aria-pressed={on} onClick={action}>{label}{on && <span aria-hidden="true"> ✓</span>}</button>
  const recommended = discoverSources(all,interests,chosen).find(s => !s.paid && !chosen.includes(s.id))
  const list = discoverSources(all,interests,chosen,filter,query)
  const available = VAK_FIELDS.filter(f => (!domains.length || domains.includes(f.domain)) && (!query || `${f.label} ${f.about}`.toLocaleLowerCase('nl').includes(query.toLocaleLowerCase('nl'))))
  return <section role="dialog" aria-modal="true" className="welcome follow42" aria-label="Stel je Hoot samen" inert={leaving ? '' : undefined}>
    <header><BrandLogo/><nav>{step > 0 && <button onClick={() => {setQuery('');setStep(s=>s-1)}}>Terug</button>}{onClose && <button onClick={onClose}>Sluiten zonder opslaan</button>}</nav></header>
    <main><h1 ref={head} tabIndex={-1}>{titles[step]}</h1>
      {step === 0 && <><p>Kies je hoofdrubrieken voor de Stroom. Je kunt dit later veranderen.</p>{INTERESTS.map(i => <div key={i.id}>{choice(i.label,interests.includes(i.id),()=>setInterests(toggleFollow(interests,i.id)))}</div>)}</>}
      {step === 1 && <><p>Volg je vaste bronnen. Ontdek ook iets nieuws.</p><label>Zoek bronnen<input type="search" placeholder="Zoek op naam of onderwerp" value={query} onChange={e=>setQuery(e.target.value)}/></label><nav aria-label="Bronnen tonen">{['Ontdekken','Alle bronnen','Volgend'].map(f=><div key={f}>{choice(f,filter===f,()=>{setFilter(f);setQuery('')})}</div>)}</nav>
        {!list.length && <p>{query ? 'Geen bron gevonden. Probeer een andere naam of onderwerp.' : 'Je volgt nog geen bronnen. Kies Ontdekken om bronnen te vinden.'}</p>}
        <ul>{list.map(s=><li key={s.id}><SourceMark source={s} size={44}/><div className="follow42-copy"><h2>{s.name}</h2><p>{s.about}</p>{s.paid && <small>Deels achter abonnement</small>}</div><button aria-pressed={chosen.includes(s.id)} aria-label={`${chosen.includes(s.id)?'Volgend':'Volgen'}, ${s.name}`} onClick={()=>setChosen(toggleFollow(chosen,s.id))}>{chosen.includes(s.id)?'Volgend':'Volgen'}</button></li>)}</ul></>}
      {(step===2 || step===3) && <><p>Je bronnen komen samen in de Stroom. De Redacteur maakt je Editie uit het beschikbare nieuws.</p><p>{chosen.length ? all.filter(s=>chosen.includes(s.id)).map(s=>s.name).join(' · ') : 'Zonder bronkeuze begin je met gratis nieuwsbronnen. Je kunt ze later aanpassen.'}</p>{recommended ? <aside><h2>Buiten je bronnen · gratis</h2><p>{recommended.name}</p><p>{recommended.about}</p></aside> : <p>Een gratis aanbeveling buiten je bronnen verschijnt zodra er passend aanbod is.</p>}{step===3 && <p>Je Selectie kies je hierna apart. Dan ben je bij.</p>}</>}
      {step===4 && <><p>Voor je werk, voor jezelf, of allebei. Je volgt pas iets als je een onderwerp kiest.</p>{['Voor mijn werk','Voor mezelf'].map(i=><div key={i}>{choice(i,intents.includes(i),()=>setIntents(toggleFollow(intents,i)))}</div>)}</>}
      {step===5 && VAK_DOMAINS.map(d=><div key={d.id}>{choice(d.label,domains.includes(d.id),()=>setDomains(toggleFollow(domains,d.id)))}</div>)}
      {step===6 && <><label>Zoek een onderwerp<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>{!available.length && <p>Geen onderwerp gevonden. Probeer een andere zoekterm.</p>}{available.map(f=><div key={f.id}>{choice(f.label,fields.includes(f.id),()=>setFields(toggleFollow(fields,f.id)))}<p>{f.about}</p></div>)}</>}
      {step===7 && <><p>Elke maandag verdieping bij wat je volgt. Naast Editie en Stroom.</p>{fields.length ? VAK_FIELDS.filter(f=>fields.includes(f.id)).map(f=><article key={f.id}><h2>{f.label}</h2><p>Voorbeeld: nieuwe inzichten voor de dagelijkse praktijk.</p></article>) : <p>Je kunt onderwerpen later kiezen in Instellingen.</p>}</>}
    </main><footer><button className="primary" disabled={step===7 && !all.length} onClick={step===7 ? finish : next}>{step===7 ? 'Naar je Editie' : 'Verder'}</button>{step<7 && <button onClick={next}>Later kiezen</button>}</footer>
  </section>
}
