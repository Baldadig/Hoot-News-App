// Vervangbeeld (14 november): de Stroom met stukken van The Washington Post zonder eigen beeld. Deze ids
// kregen tot 14 november beeld 14 (Eclips), dat Alex uit de reeks haalde; nu krijgen ze een van de andere
// zestien (sinds 15 november is ook beeld 15, Walsen, uit de reeks). Echte componenten (Entry, PlaceholderList). Parameters: ?theme=light|dark|night  &layout=krant
// Gebruikt door tests/visual/vervangbeeld-wapo-check.mjs.
import React from 'react'
import '../../src/fonts/fonts.css'
import { createRoot } from 'react-dom/client'
import { HootContext, Entry } from '../../src/components/Items.jsx'
import { PlaceholderList } from '../../src/components/Beeld.jsx'
import '../../src/styles.css'
import '../../src/placeholder.css'
import '../../src/styles/kaart.css'

const q = new URLSearchParams(location.search)
document.documentElement.dataset.theme = q.get('theme') || 'light'
const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString()
const wapo = (n) => `https://www.washingtonpost.com/world/2026/11/13/stuk-${n}/`
const S = [
  ['wapo', 'The Washington Post', 'Wereld', 'Ukraine’s grain corridor holds as winter shipping season begins', 'Insurers are returning to the Black Sea route, but port strikes keep costs high.', wapo(26)],
  ['nos', 'NOS', 'Binnenland', 'Storm trekt over het noorden: code oranje voor de Waddeneilanden', 'Veerdiensten varen aangepast en het KNMI waarschuwt voor zware windstoten.', 'https://nos.nl/artikel/1'],
  ['wapo', 'The Washington Post', 'Wereld', 'In Brazil, a drought reshapes the Amazon’s river towns', 'Boats sit on dry riverbeds as communities wait for the rains.', wapo(48)],
  ['nrc', 'NRC', 'Wetenschap', 'Een nieuwe kaart van de zeebodem onder Antarctica', 'Onderzoekers brachten valleien in kaart die het smelten van het ijs kunnen versnellen.', 'https://www.nrc.nl/nieuws/1'],
  ['wapo', 'The Washington Post', 'Wereld', 'Japan’s rural schools reopen as young families return', 'Remote work keeps drawing households away from Tokyo.', wapo(57)],
]
const items = S.map(([source, sourceName, section, title, summary, url], i) => ({ id: `${source}:${url}`, kind: 'article', source, sourceName, url, section, title, summary, image: null, publishedAt: ago(1 + i), topics: [], mainTopics: [], storyId: null }))
const noop = () => {}
const sourcesById = new Map(items.map((i) => [i.source, { id: i.source, name: i.sourceName, cat: i.source === 'wapo' ? 'int' : 'nl' }]))
const ctx = {
  itemsById: new Map(items.map((i) => [i.id, i])), storiesById: new Map(), muted: new Set(), followStories: [], newInStory: () => 0, openStory: noop, less: [], account: { status: 'out' },
  prefs: { topics: [], interests: [], favorites: [], images: 'aan', preview: 3, bubble: true }, sourcesById, read: new Set(), saved: {}, markRead: noop, toggleSave: noop, openSource: noop, voteOn: noop, reportMistake: noop, undoLess: noop, share: noop, layout: q.get('layout') === 'krant' ? 'krant' : 'tijdlijn',
}
await Promise.race([new Promise((r) => setTimeout(r, 3000)), Promise.all([document.fonts.load('800 32px Newsreader'), document.fonts.load('400 17px Newsreader')]).catch(() => {})])
createRoot(document.getElementById('root')).render(
  <HootContext.Provider value={ctx}>
    <section className="view" style={{ position: 'absolute', inset: 0 }}>
      <div className="col" style={{ maxWidth: 1000 }}>
        <h1 className="head-5" style={{ margin: '12px 0 24px' }}>Stroom</h1>
        <PlaceholderList rows={items.map((item) => ({ item, kind: ctx.layout === 'tijdlijn' ? 'tijdlijn' : 'krant' }))}>
          <div className="list rows list--lines-3">
            {items.map((item) => <div key={item.id}><Entry item={item} /></div>)}
          </div>
        </PlaceholderList>
      </div>
    </section>
  </HootContext.Provider>,
)
setTimeout(() => {
  document.documentElement.dataset.ph = [...document.querySelectorAll('[data-ph]')].map((e) => e.dataset.ph).join(',')
  document.documentElement.dataset.ready = '1'
}, 1500)
