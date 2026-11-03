import React,{useState} from 'react'
import{createRoot}from'react-dom/client'
import '@fontsource/newsreader/latin-800.css'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-700.css'
import '../../src/styles.css'
import Stream from '../../src/views/Stream.jsx'
import Sources from '../../src/views/Sources.jsx'
import {Nav} from '../../src/components/Shell.jsx'
import{HootContext}from'../../src/components/Items.jsx'
import{webStream,addSocialProfile,removeSocialProfile}from'../../src/lib/social-stream.js'
import{normalizePrefs}from'../../src/lib/prefs.js'
const person={handle:'studio.bsky.social',name:'Studio voor wetenschap en technologie'}
const initialSources=[{id:'nos',name:'NOS',followed:true,ok:true,cat:'nieuws',avatarContain:true,avatar:'/lees/brand/hoot-mark-ink.svg'},{id:'bsky:'+person.handle,name:person.name,handle:'@'+person.handle,followed:true,ok:true,kind:'sociaal'}]
const now=Date.now(), time=n=>new Date(now-n*60000).toISOString()
const items=[{id:'post-1',source:'bsky:'+person.handle,sourceName:person.name,handle:'@'+person.handle,kind:'post',summary:'Een nieuw ontwerp maakt wetenschappelijk onderzoek toegankelijker. Mooi om te zien hoe verschillende teams hun kennis delen.',url:'https://example.test/post',publishedAt:time(5),image:'/lees/brand/hoot-app-icon-full.svg',imageRatio:1},{id:'article-1',source:'nos',sourceName:'NOS',kind:'article',title:'Onderzoekers delen een nieuwe blik op duurzame technologie',summary:'Een lokale voorbeeldkop voor de opmaak van nieuws en posts in dezelfde Stroom.',url:'https://example.test/artikel',publishedAt:time(10),topics:['ai']},{id:'post-2',source:'bsky:'+person.handle,sourceName:person.name,handle:'@'+person.handle,kind:'post',summary:'Rustig bijlezen: drie inzichten uit ons onderzoek van deze week.',url:'https://example.test/post-2',publishedAt:time(20)}]
function Fixture(){const[prefs,setPrefs]=useState(normalizePrefs({bluesky:true,bskyInStream:['bsky:'+person.handle],social:[person]}));const[page,setPage]=useState('stroom'),[params,setParams]=useState({}),[theme,setTheme]=useState('light');const sources=initialSources.filter(s=>s.kind!=='sociaal'||prefs.social.length),muted=new Set(prefs.muted),byId=new Map(sources.map(s=>[s.id,s]));const setPref=(k,v)=>setPrefs(p=>({...p,[k]:v}));document.documentElement.dataset.theme=theme;document.documentElement.dataset.palette='papier';const ctx={prefs,setPref,layout:'tijdlijn',sourcesById:byId,storiesById:new Map(),itemsById:new Map(items.map(i=>[i.id,i])),read:new Set(),saved:{},markRead:()=>{},toggleSave:()=>{},share:()=>{},openSource:id=>{setPage('stroom');setParams({bron:id})},muted,setMuted:(id,on)=>setPrefs(p=>({...p,muted:on?p.muted.filter(x=>x!==id):[...p.muted,id]})),openDisplay:()=>{}};
return <><div className="chips" style={{padding:16}} aria-label="Proefbediening">{[['light','Licht'],['dark','Donker'],['night','Nacht']].map(([t,label])=><button className="pill hit" key={t} aria-pressed={t===theme} onClick={()=>setTheme(t)}>{label}</button>)}<button className="pill hit" onClick={()=>setPage(page==='stroom'?'bronnen':'stroom')}>{page==='stroom'?'Bekijk bronbeheer':'Bekijk Stroom'}</button></div><HootContext.Provider value={ctx}><div className="app" style={{height:'calc(100dvh - 80px)'}}><Nav path={page}/><main className="main">{page==='stroom'?<Stream active stream={webStream(items,{prefs,muted,sources,now})} params={params} go={(_,p)=>setParams(p)} sources={sources} statusProps={{online:true}} onRefresh={()=>{}}/>:<Sources active sources={sources} muted={muted} onToggle={ctx.setMuted} ownHandles={new Set(prefs.social.map(p=>'bsky:'+p.handle))} onSocialAdd={p=>setPrefs(v=>addSocialProfile(v,p))} onSocialRemove={h=>setPrefs(v=>removeSocialProfile(v,h))} status={{failed:[],allDown:false}} online />}</main></div></HootContext.Provider></>}
createRoot(document.getElementById('root')).render(<Fixture/>);
