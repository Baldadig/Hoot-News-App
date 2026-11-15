// Knipsel (15 november): de Editie en de Stroom met beeldloze stukken, met de echte componenten (Edition, Entry,
// PlaceholderList) en de echte CSS. Wordt gebouwd en lokaal gepreviewd (tests/visual/knipsel-check.mjs), zodat
// de schermafdrukken de gebouwde WebP's en image-set tonen. Parameters: ?theme=light|dark|night &view=editie|stroom
import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/newsreader/latin-800.css'
import '../../src/fonts/fonts.css'
import Edition from '../../src/views/Edition.jsx'
import { HootContext, Entry } from '../../src/components/Items.jsx'
import { PlaceholderList } from '../../src/components/Beeld.jsx'
import '../../src/styles.css'
import '../../src/placeholder.css'
import '../../src/styles/kaart.css'

const q = new URLSearchParams(location.search)
document.documentElement.dataset.theme = q.get('theme') || 'light'
const view = q.get('view') === 'stroom' ? 'stroom' : 'editie'
const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString()
const KOPPEN = [
  ['nos', 'NOS', 'Storm trekt over het noorden: code oranje voor de Waddeneilanden', 'Veerdiensten varen aangepast en het KNMI waarschuwt voor zware windstoten.'],
  ['nrc', 'NRC', 'Een nieuwe kaart van de zeebodem onder Antarctica', 'Onderzoekers brachten valleien in kaart die het smelten van het ijs kunnen versnellen.'],
  ['volkskrant', 'de Volkskrant', 'Kabinet wil boeren meer ruimte geven bij stikstofregels', 'Het plan moet volgend jaar ingaan en geldt vooral voor melkveehouders.'],
  ['nos', 'NOS', 'Rijkswaterstaat sluit de Afsluitdijk een weekend', 'Het verkeer wordt omgeleid via Lelystad. Fietsers kunnen er wel langs.'],
  ['nrc', 'NRC', 'Musea zien meer bezoekers op doordeweekse dagen', 'Vooral jonge bezoekers komen vaker, blijkt uit nieuwe cijfers.'],
  ['volkskrant', 'de Volkskrant', 'Gemeenten bouwen sneller met vaste bouwteams', 'Een proef in drie steden laat zien dat het tot een jaar scheelt.'],
  ['nos', 'NOS', 'Treinverkeer rond Utrecht weer op gang na storing', 'Reizigers moesten urenlang omreizen; de oorzaak was een kapotte wissel.'],
  ['nrc', 'NRC', 'Onderzoekers vinden oudste brood van Noord-Europa', 'Het baksel is ruim vijfduizend jaar oud en lag in een veenmoeras.'],
  ['volkskrant', 'de Volkskrant', 'Scholen proberen een dag zonder telefoon', 'Leerlingen zeggen dat ze in de pauze meer met elkaar praten.'],
  ['nos', 'NOS', 'Nieuwe brug over de IJssel gaat open voor fietsers', 'De brug verbindt twee wijken die tot nu toe een omweg van vier kilometer hadden.'],
]
const items = KOPPEN.map(([source, sourceName, title, summary], i) => ({ id: `${source}:https://voorbeeld.nl/knipsel/${i + 3}`, kind: 'article', source, sourceName, url: `https://voorbeeld.nl/knipsel/${i + 3}`, section: 'Binnenland', title, summary, image: null, publishedAt: ago(1 + i), topics: [], mainTopics: [], storyId: null }))
const noop = () => {}
const sourcesById = new Map(items.map((i) => [i.source, { id: i.source, name: i.sourceName, cat: 'nl' }]))
const ctx = {
  itemsById: new Map(items.map((i) => [i.id, i])), storiesById: new Map(), muted: new Set(), followStories: [], newInStory: () => 0, openStory: noop, less: [], account: { status: 'out' },
  prefs: { topics: [], interests: [], favorites: [], images: 'aan', preview: 3, bubble: true }, sourcesById, read: new Set(), saved: {}, markRead: noop, toggleSave: noop, openSource: noop, voteOn: noop, reportMistake: noop, undoLess: noop, share: noop, layout: 'tijdlijn',
}
const entries = items.map((i, k) => ({ kind: 'item', id: i.id, desk: 'binnenland', why: k === 0 ? { code: 'groot', text: 'Groot nieuws · 8 bronnen' } : null }))
const edition = { id: 'knipsel', slot: 'ochtend', date: '2026-11-15', personal: true, entries, items }
await Promise.race([new Promise((r) => setTimeout(r, 3000)), Promise.all([document.fonts.load('800 32px Newsreader'), document.fonts.load('400 17px Newsreader')]).catch(() => {})])
createRoot(document.getElementById('root')).render(
  <HootContext.Provider value={ctx}>
    {view === 'editie' ? (
      <main className="col col--read" style={{ maxWidth: 1100, margin: 'auto' }}>
        <Edition active edition={edition} loading={false} failedLoad={false} onRefresh={noop} statusProps={{ online: true, meta: { updatedAt: ago(1) } }} />
      </main>
    ) : (
      <section className="view" style={{ position: 'absolute', inset: 0 }}>
        <div className="col" style={{ maxWidth: 1000 }}>
          <h1 className="head-5" style={{ margin: '12px 0 24px' }}>Stroom</h1>
          <PlaceholderList rows={items.map((item) => ({ item, kind: 'tijdlijn' }))}>
            <div className="list rows list--lines-3">
              {items.map((item) => <div key={item.id}><Entry item={item} /></div>)}
            </div>
          </PlaceholderList>
        </div>
      </section>
    )}
  </HootContext.Provider>,
)
setTimeout(() => {
  document.documentElement.dataset.ph = [...document.querySelectorAll('[data-ph]')].map((e) => e.dataset.ph).join(',')
  document.documentElement.dataset.ready = '1'
}, 2000)
