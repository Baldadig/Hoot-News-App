// Kaart A+ op de web-app: de Editie en de Stroom met echte componenten en vaste inhoud.
// Parameters: ?ctx=editie|stroom  &theme=light|dark|night  &text=groot  &layout=krant  &scroll=<px>
// De beelden en logo's staan in de concept-map (symlink tests/visual/kaart-gedeeld, niet in git).
import React from 'react'
import '@fontsource/newsreader/latin-800.css'
import '../../src/fonts/fonts.css'
import { createRoot } from 'react-dom/client'
import Edition from '../../src/views/Edition.jsx'
import { HootContext, Entry } from '../../src/components/Items.jsx'
import { PlaceholderList } from '../../src/components/Beeld.jsx'
import '../../src/styles.css'
import '../../src/placeholder.css'
import '../../src/styles/kaart.css'

const q = new URLSearchParams(location.search)
const ctxName = q.get('ctx') === 'stroom' ? 'stroom' : 'editie'
document.documentElement.dataset.theme = q.get('theme') || 'light'
if (q.get('text')) document.documentElement.dataset.text = q.get('text')
const G = import.meta.env.BASE_URL + 'tests/visual/kaart-gedeeld/'
const img = (n) => G + 'beelden/' + n
const logo = (n) => G + 'logos/' + n
const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString()
const S = [
  ['nrc', 'NRC', 'nrc.webp', 'Buitenland', 'Op de VN-natuurtop in Cali dringt de tijd: over het geld voor arme landen is na twee weken nog altijd niets afgesproken', 'Onderhandelaars werkten de hele nacht door, maar rijke landen willen niet toezeggen wie de rekening betaalt. Een deal voor vrijdag lijkt steeds onwaarschijnlijker.', '330059ef01.jpg', true, 4],
  ['nos-sport', 'NOS Sport', 'nos-sport.png', 'Sport', 'Ajax wint kraker van AZ', 'Een treffer in de slotfase besliste het duel in Amsterdam. Ajax pakt daarmee de tweede plaats, AZ zakt naar de zesde.', '4879b33efb.jpg', false, 1],
  ['volkskrant', 'de Volkskrant', 'volkskrant.webp', 'Politiek', 'Kabinet wil boeren meer ruimte geven bij stikstofregels, maar kan rekenen op felle kritiek', 'Het plan moet volgend jaar ingaan en geldt vooral voor melkveehouders in kwetsbare gebieden. Natuurorganisaties spreken van een stap terug; de coalitie is verdeeld.', null, true, 1],
  ['ad', 'AD', 'ad.webp', 'Nieuws', 'Verzakte straat in Wijk bij Duurstede: omwonenden kijken toe', 'Een gat van enkele meters opende zich in de nacht naast de Kerkgracht. De gemeente heeft het gebied afgezet en laat onderzoek doen naar de oorzaak.', '2a77ba8ef7.jpg', false, 3],
  ['theverge', 'The Verge', 'theverge.webp', 'Tech', 'Valve brengt de Steam Machine uit, en dit keer is het geen halfbakken experiment', 'De console draait een eigen versie van Linux en moet het opnemen tegen de PlayStation. Verkoop begint volgende week in Europa.', '1a6df1d08c.jpg', false, 1],
  ['nyt', 'The New York Times', 'nyt.webp', 'Wereld', 'In Argentinië loopt de inflatie terug, maar de armoede neemt juist toe', 'De bezuinigingen van president Milei werken door in de cijfers. Voor veel gezinnen is het leven duurder geworden dan een jaar geleden.', null, true, 2],
  ['trouw', 'Trouw', 'trouw.webp', 'Wetenschap', 'Onderzoekers vinden het oudste bewijs van vuur maken in een grot in Noord-Spanje', 'De vondst schuift de beheersing van vuur bijna honderdduizend jaar op. Neanderthalers waren waarschijnlijk veel handiger dan gedacht.', '3e35ade164.jpg', false, 1],
  ['fd', 'Het Financieele Dagblad', 'fd.webp', 'Economie', 'Rente blijft voorlopig hoog: centrale bank ziet nog geen reden om te versoepelen', 'De inflatie in de eurozone daalt langzamer dan verwacht. Huizenkopers moeten er rekening mee houden dat hypotheken duur blijven.', '21f8e756f1.jpg', true, 1],
  ['nu', 'NU.nl', 'nu.webp', 'Binnenland', 'Treinen rijden donderdag minder door werkzaamheden rond Utrecht Centraal', 'Reizigers moeten rekening houden met omleidingen en langere reistijden. De NS adviseert om voor vertrek de planner te raadplegen.', '06ff175563.jpg', false, 1],
  ['nos', 'NOS', 'nos.jpg', 'Nieuws', 'Recordaantal lopers bij de Zevenheuvelenloop: voor het eerst meer dan veertigduizend deelnemers', 'Meer dan veertigduizend lopers stonden aan de start in Nijmegen, een record. De organisatie paste de route aan vanwege de drukte; de snelste liep de tien Engelse mijl in minder dan drie kwartier.', 'e4b027f854.webp', false, 1],
]
const items = S.map(([source, sourceName, lg, section, title, summary, image, paid, count], i) => ({ id: 'k' + i, kind: 'article', source, sourceName, avatar: logo(lg), avatarContain: true, url: 'https://example.org/' + i, section, title, summary, image: image ? img(image) : null, publishedAt: ago(i % 3 ? 3 + i : 9), topics: [], mainTopics: [], storyId: count > 1 ? 's' + i : null, _paid: paid, _count: count }))
// Het hoofdverhaal (01) is het laatste uit de lijst met het grote beeld.
const order = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8]
const ordered = order.map((i) => items[i])
const stories = new Map(items.filter((i) => i._count > 1).map((i) => ['s' + i.id.slice(1), { id: 's' + i.id.slice(1), leadId: i.id, itemIds: [i.id], sourceCount: i._count }]))
const noop = () => {}
const sourcesById = new Map(items.map((i) => [i.source, { id: i.source, name: i.sourceName, cat: 'nl', paid: i._paid }]))
const why = [{ code: 'groot', text: 'Het verhaal van de dag' }, { code: 'favorite', text: 'Uit je voorkeursbron NRC', detail: true }, null, { code: 'favorite', text: 'Uit je voorkeursbron de Volkskrant', detail: true }, { code: 'breed', text: 'Meerdere bronnen schrijven erover', detail: true }]
const entries = ordered.map((it, k) => ({ kind: 'item', id: it.id, desk: ['binnenland', 'buitenland', 'binnenland', 'binnenland', 'tech'][k % 5], why: why[k] || undefined }))
const edition = { id: 'kaart', slot: 'ochtend', date: '2026-11-04', personal: true, entries, items: ordered }
const ctx = {
  itemsById: new Map(items.map((i) => [i.id, i])), storiesById: stories, muted: new Set(), followStories: [], newInStory: () => 0, openStory: noop, less: [], account: { status: 'out' },
  prefs: { topics: [], interests: ['tech'], favorites: [], images: 'aan', preview: 3, bubble: true }, sourcesById, read: new Set(), saved: {}, markRead: noop, toggleSave: noop, openSource: noop, voteOn: noop, reportMistake: noop, undoLess: noop, share: noop, layout: q.get('layout') === 'krant' ? 'krant' : 'tijdlijn',
}
await Promise.race([new Promise((r) => setTimeout(r, 3000)), Promise.all([document.fonts.load('800 32px Newsreader'), document.fonts.load('400 17px Inter'), document.fonts.load('400 17px Newsreader')])])
const feed = items.filter((i) => i.id !== 'k9').concat(items[9])
const root = createRoot(document.getElementById('root'))
root.render(
  <HootContext.Provider value={ctx}>
    {ctxName === 'editie' ? (
      <main style={{ position: 'absolute', inset: 0 }}>
        <Edition active edition={edition} loading={false} failedLoad={false} onRefresh={noop} statusProps={{ online: true, meta: { updatedAt: ago(1) } }} />
      </main>
    ) : (
      <section className="view" style={{ position: 'absolute', inset: 0 }}>
        <div className="col" style={{ maxWidth: 1000 }}>
          <h1 className="head-5" style={{ margin: '12px 0 24px' }}>Stroom</h1>
          <PlaceholderList rows={feed.map((item) => ({ item, kind: ctx.layout === 'tijdlijn' ? 'tijdlijn' : 'krant' }))}>
            <div className="list rows list--lines-3">
              {feed.map((item) => <div key={item.id}><Entry item={item} story={item.storyId ? stories.get(item.storyId) : null} /></div>)}
            </div>
          </PlaceholderList>
        </div>
      </section>
    )}
  </HootContext.Provider>,
)
setTimeout(() => {
  const v = document.querySelector('.view'); const y = Number(q.get('scroll') || 0)
  if (v && y) v.scrollTo(0, y)
  document.documentElement.dataset.ready = '1'
}, 1500)
