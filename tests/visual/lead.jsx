import React from 'react'
import '@fontsource/newsreader/latin-800.css'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-800.css'
import { createRoot } from 'react-dom/client'
import { HootContext, LeadStory } from '../../src/components/Items.jsx'
import '../../src/styles.css'
const q = new URLSearchParams(location.search)
document.documentElement.dataset.theme = q.get('theme') || 'light'
const portrait = q.get('portrait') === '1'
const item = { id: 'a1-test', kind: 'article', source: 'nos', sourceName: 'NOS', url: 'https://nos.nl/a', section: 'Cultuur', title: 'Een nieuw perspectief op de stad', summary: 'Een rustige blik op de wereld om ons heen. Het verhaal en de foto krijgen ieder hun eigen ruimte.', publishedAt: new Date().toISOString(), image: `/tests/fixtures/images/${portrait ? 'portrait' : 'white-sides'}.png`, imageMeta: portrait ? { w: 60, h: 100, crop: { l: 0, r: 0, t: 0, b: 0 }, ratio: .6 } : { w: 160, h: 100, crop: { l: 24, r: 16, t: 0, b: 0 }, ratio: 1.2 } }
await Promise.all([document.fonts.load('800 32px Newsreader'), document.fonts.load('400 17px "Source Sans 3"')])
window.cls = 0
window.shifts = []
new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) { window.cls += e.value; window.shifts.push({value:e.value,sources:e.sources.map(s=>({node:s.node?.outerHTML.slice(0,100),previous:s.previousRect,current:s.currentRect}))}) } }).observe({ type: 'layout-shift', buffered: true })
if (q.get('long') === '1') { item.title = '500 Patriot-raketten van VS deze winter nog niet ingezet, waarschuwt Zelensky: ‘Leveringen beginnen pas over paar jaar’'; item.summary = 'Updated at 6:16 p.m. De levering van de raketten begint pas later. De afspraken worden verder uitgewerkt.' }
const noop = () => {}
const context = { read: new Set(), saved: [], markRead: noop, toggleSave: noop, openSource: noop, sourcesById: new Map(), share: noop }
createRoot(document.getElementById('root')).render(<HootContext.Provider value={context}><main style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 16px' }}><LeadStory item={item} priority /></main></HootContext.Provider>)
