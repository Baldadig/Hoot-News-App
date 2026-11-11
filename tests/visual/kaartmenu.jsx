// Kaartmenu (⋯ bij de bronregel): de Editie met echte vormen — hoofdverhaal, zijkolom (smal) en de
// tweekoloms rij — en ?view=kaart voor kaart A+ op volle breedte. Voor tests/visual/kaartmenu-check.mjs.
import React from 'react'
import { createRoot } from 'react-dom/client'
import Edition from '../../src/views/Edition.jsx'
import { HootContext, KaartItem } from '../../src/components/Items.jsx'
import '@fontsource/newsreader/latin-800.css'
import '../../src/fonts/fonts.css'
import '../../src/styles.css'
import '../../src/placeholder.css'
import '../../src/staten.css'
import '../../src/styles/kaart.css'
import '../../src/styles/vouw.css'
import '../../src/styles/rust.css'
import '../../src/styles/inklap.css'
import '../../src/styles/vergelijken.css'
import '../../src/styles/popmenu.css'

const q = new URLSearchParams(location.search)
if (q.get('theme') === 'night') document.documentElement.dataset.theme = 'night'
const noop = () => {}
const at = (h) => new Date(Date.now() - h * 3600e3).toISOString()
const src = {
  nos: { name: 'NOS', cat: 'nl' }, volkskrant: { name: 'de Volkskrant', cat: 'nl', paid: true }, wired: { name: 'Wired', cat: 'tech' },
  nrc: { name: 'NRC', cat: 'nl', paid: true }, verge: { name: 'The Verge', cat: 'tech' }, guardian: { name: 'The Guardian', cat: 'wereld' },
}
const mk = (id, source, title, h, n) => ({ id, kind: 'article', source, sourceName: src[source].name, title, summary: 'Een heldere inleiding met ruimte voor het verhaal, in twee rustige zinnen. Zo leest de kaart als een krant.', url: `https://example.org/${id}`, publishedAt: at(h), topics: [], mainTopics: [], storyId: n > 1 ? `s-${id}` : undefined, readMin: 6 })
const rows = [
  ['a1', 'nos', 'Kabinet presenteert plan voor betaalbare huurwoningen in de grote steden', 1, 7],
  ['a2', 'wired', 'Wat de midterms betekenen voor de grote techbedrijven in Washington', 48, 3],
  ['a3', 'nrc', 'Waterschappen waarschuwen voor droogte in het oosten van het land', 2, 4],
  ['a4', 'guardian', 'Europese ministers eens over nieuwe regels voor kunstmatige intelligentie', 5, 2],
  ['a5', 'volkskrant', 'Doodsbedreigingen aan het adres van de kerkvorst in Argentinië', 3, 9],
  ['a6', 'verge', 'Nieuwe chip belooft een dag langer batterijduur voor laptops', 6, 1],
  ['a7', 'nos', 'Ajax wint met ruime cijfers van Heracles en klimt naar de derde plaats', 7, 5],
  ['a8', 'nrc', 'Rechter: gemeente mag festival niet zomaar verbieden', 8, 2],
]
const items = rows.map(([id, s, t, h, n]) => mk(id, s, t, h, n))
const stories = rows.filter((r) => r[4] > 1).map(([id, , , , n]) => ({ id: `s-${id}`, leadId: id, itemIds: [id], sourceCount: n }))
const entries = items.map((i, k) => ({ kind: 'item', id: i.id, desk: k % 2 ? 'buitenland' : 'binnenland', why: null }))
const edition = { id: 'kaartmenu', slot: 'ochtend', date: '2026-11-08', personal: true, entries, items }
const ctx = {
  itemsById: new Map(items.map((i) => [i.id, i])), storiesById: new Map(stories.map((s) => [s.id, s])), muted: new Set(), followStories: [], newInStory: () => 0, openStory: noop, less: [],
  account: { status: 'out' }, prefs: { topics: [], interests: ['tech'], favorites: [], images: 'uit', preview: 2, bubble: false },
  sourcesById: new Map(Object.entries(src).map(([id, s]) => [id, { id, ...s }])), read: new Set(), saved: {}, markRead: noop, toggleSave: noop, openSource: noop,
  voteOn: noop, reportMistake: () => true, undoLess: noop, share: noop, notify: (t) => (document.documentElement.dataset.notice = t),
}
const view = q.get('view') || 'editie'
createRoot(document.getElementById('root')).render(
  <HootContext.Provider value={ctx}>
    <main className="view" style={{ maxWidth: 'var(--page)', margin: '0 auto', paddingInline: 'var(--gutter)' }}>
      {view === 'kaart' ? (
        <div className="col col--stroom rows" style={{ maxWidth: '36rem', margin: '0 auto' }}>
          {items.slice(3, 6).map((i) => <KaartItem key={i.id} item={i} story={stories.find((s) => s.leadId === i.id)} taste={i.id} />)}
        </div>
      ) : (
        <Edition active edition={edition} loading={false} failedLoad={false} onRefresh={noop} statusProps={{ online: true, meta: { updatedAt: at(1) } }} />
      )}
    </main>
  </HootContext.Provider>,
)
