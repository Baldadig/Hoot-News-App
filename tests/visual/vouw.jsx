// 01 boven de vouw (variant e, src/lib/vouw.js) op de web-app: de echte Editie in de echte schil (tabbalk onderaan).
// Parameters: ?kop=kort|mediaan|lang  &theme=light|night  &text=groot
// Na het zetten schrijft de pagina de maten in <html data-vouw-meting="…"> (tests/visual/vouw-check.mjs leest ze).
import React from 'react'
import '@fontsource/newsreader/latin-800.css'
import '../../src/fonts/fonts.css'
import { createRoot } from 'react-dom/client'
import Edition from '../../src/views/Edition.jsx'
import { HootContext } from '../../src/components/Items.jsx'
import { Nav } from '../../src/components/Shell.jsx'
import '../../src/styles.css'
import '../../src/placeholder.css'
import '../../src/styles/kaart.css'
import '../../src/styles/vouw.css'

const q = new URLSearchParams(location.search)
document.documentElement.dataset.theme = q.get('theme') || 'light'
if (q.get('text')) document.documentElement.dataset.text = q.get('text')
const KOPPEN = {
  kort: ['Rubberboot met tientallen migranten van zee gehaald bij Breskens', 'Hulpdiensten hebben vanochtend een rubberboot met 38 mensen van zee gehaald bij Breskens. De boot is naar een jachthaven in Cadzand gesleept, meldt Omroep Zeeland.'],
  mediaan: ['Ahold Delhaize ziet schade van tientallen miljoenen door cyberaanval', 'De cyberaanval vorige maand scheelt Ahold Delhaize 200 à 250 miljoen euro aan omzet. De uiteindelijke winst valt hierdoor tussen de 75 en 100 miljoen euro lager uit.'],
  lang: ['Britse komiek Russell Brand schuldig aan verkrachting en aanranding, aanklager noemt hem ‘berekenend seksueel roofdier’', 'De Britse komiek Russell Brand is schuldig bevonden aan verkrachting en aanranding. Dat heeft de rechtbank in Londen zojuist geoordeeld.'],
}
const [title, summary] = KOPPEN[q.get('kop')] || KOPPEN.lang
const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString()
const beeld = import.meta.env.BASE_URL + 'tests/fixtures/images/normal.png'
const items = [
  { id: 'v0', kind: 'article', source: 'nos', sourceName: 'NOS', url: 'https://nos.nl/a', section: 'Binnenland', title, summary, image: null, publishedAt: ago(1), topics: [], mainTopics: [], storyId: 's0' },
  { id: 'v1', kind: 'article', source: 'volkskrant', sourceName: 'de Volkskrant', url: 'https://example.org/1', section: 'Politiek', title: 'Kabinet wil boeren meer ruimte geven bij stikstofregels', summary: 'Het plan moet volgend jaar ingaan en geldt vooral voor melkveehouders.', image: beeld, publishedAt: ago(3), topics: [], mainTopics: [] },
  { id: 'v2', kind: 'article', source: 'nrc', sourceName: 'NRC', url: 'https://example.org/2', section: 'Buitenland', title: 'Op de VN-natuurtop in Cali dringt de tijd', summary: 'Onderhandelaars werkten de hele nacht door.', image: null, publishedAt: ago(4), topics: [], mainTopics: [] },
  { id: 'v3', kind: 'article', source: 'nu', sourceName: 'NU.nl', url: 'https://example.org/3', section: 'Binnenland', title: 'Treinen rijden donderdag minder rond Utrecht', summary: 'Reizigers moeten rekening houden met omleidingen.', image: null, publishedAt: ago(5), topics: [], mainTopics: [] },
  { id: 'v4', kind: 'article', source: 'trouw', sourceName: 'Trouw', url: 'https://example.org/4', section: 'Wetenschap', title: 'Oudste bewijs van vuur maken gevonden', summary: 'De vondst schuift de beheersing van vuur op.', image: null, publishedAt: ago(6), topics: [], mainTopics: [] },
  { id: 'v5', kind: 'article', source: 'fd', sourceName: 'FD', url: 'https://example.org/5', section: 'Economie', title: 'Rente blijft voorlopig hoog', summary: 'De inflatie daalt langzamer dan verwacht.', image: null, publishedAt: ago(7), topics: [], mainTopics: [] },
]
// Het hoofdbeeld groot genoeg (fitsHero): een echte foto uit de fixtures met zijn maat in de url-loze test.
items[0].image = beeld
const stories = new Map([['s0', { id: 's0', leadId: 'v0', itemIds: ['v0'], sourceCount: 8 }]])
const entries = items.map((it, k) => ({ kind: 'item', id: it.id, desk: ['binnenland', 'binnenland', 'buitenland', 'binnenland', 'wetenschap', 'economie'][k], why: k === 0 ? { code: 'breed', text: 'Acht bronnen brengen dit' } : undefined }))
const edition = { id: 'vouw', slot: 'avond', date: '2026-11-05', personal: true, entries, items }
const noop = () => {}
const ctx = {
  itemsById: new Map(items.map((i) => [i.id, i])), storiesById: stories, muted: new Set(), followStories: [], newInStory: () => 0, openStory: noop, less: [], account: { status: 'out' },
  prefs: { topics: [], interests: [], favorites: [], images: 'aan', preview: 3, bubble: true }, sourcesById: new Map(items.map((i) => [i.source, { id: i.source, name: i.sourceName, cat: 'nl' }])), read: new Set(), saved: {}, markRead: noop, toggleSave: noop, openSource: noop, voteOn: noop, reportMistake: noop, undoLess: noop, share: noop, layout: 'tijdlijn',
}
await Promise.race([new Promise((r) => setTimeout(r, 3000)), Promise.all([document.fonts.load('800 32px Newsreader'), document.fonts.load('400 17px Newsreader')])])
createRoot(document.getElementById('root')).render(
  <HootContext.Provider value={ctx}>
    <div className="app">
      <main className="main" style={{ position: 'relative' }}>
        <Edition active edition={edition} loading={false} failedLoad={false} onRefresh={noop} statusProps={{ online: true, meta: { updatedAt: ago(1) } }} />
      </main>
      <div className="app__nav"><Nav path="editie" /></div>
    </div>
  </HootContext.Provider>,
)
setTimeout(() => {
  const lead = document.querySelector('.kaart--lead')
  const meta = lead?.querySelector('.kmeta')
  const nav = document.querySelector('.nav')
  const beeldEl = lead?.querySelector('.kaart__beeld')
  const t = lead?.querySelector('.kaart__title--lead')
  const sum = lead?.querySelector('.kaart__sum')
  const lh = (el) => (el ? Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)) : 0)
  document.documentElement.dataset.vouwMeting = JSON.stringify({
    w: innerWidth, h: innerHeight, scherm: screen.height, profiel: lead?.dataset.vouw || null,
    bron: Math.round(meta?.getBoundingClientRect().bottom), vouw: Math.round(nav?.getBoundingClientRect().top),
    beeld: Math.round(beeldEl?.getBoundingClientRect().height), kop: t?.classList.contains('kaart__title--26') ? 26 : 30, kopRegels: lh(t), introRegels: lh(sum),
  })
  document.documentElement.dataset.ready = '1'
}, 2000)
