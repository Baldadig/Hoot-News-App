// Placeholderbeelden (twaalf, placeholders-12): de Editie en de Stroom met echte componenten en alleen
// stukken zonder beeld, zodat de buurregel (nooit hetzelfde beeld, nooit dezelfde set) zichtbaar is.
// Parameters: ?ctx=editie|stroom  &theme=light|dark|night  &layout=krant  &scroll=<px>
import React from 'react'
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
const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString()
const S = [
  ['nrc', 'NRC', 'Buitenland', 'Op de VN-natuurtop dringt de tijd: over het geld voor arme landen is nog niets afgesproken', 'Onderhandelaars werkten de hele nacht door, maar rijke landen willen niet toezeggen wie de rekening betaalt.'],
  ['nos', 'NOS', 'Sport', 'Ajax wint kraker van AZ', 'Een treffer in de slotfase besliste het duel in Amsterdam. Ajax pakt daarmee de tweede plaats.'],
  ['volkskrant', 'de Volkskrant', 'Politiek', 'Kabinet wil boeren meer ruimte geven bij stikstofregels', 'Het plan moet volgend jaar ingaan en geldt vooral voor melkveehouders in kwetsbare gebieden.'],
  ['ad', 'AD', 'Nieuws', 'Verzakte straat in Wijk bij Duurstede: omwonenden kijken toe', 'Een gat van enkele meters opende zich in de nacht naast de Kerkgracht.'],
  ['theverge', 'The Verge', 'Tech', 'Valve brengt de Steam Machine uit', 'De console draait een eigen versie van Linux en moet het opnemen tegen de PlayStation.'],
  ['nyt', 'The New York Times', 'Wereld', 'In Argentinië loopt de inflatie terug, maar de armoede neemt toe', 'De bezuinigingen werken door in de cijfers. Voor veel gezinnen is het leven duurder geworden.'],
  ['trouw', 'Trouw', 'Wetenschap', 'Oudste bewijs van vuur maken gevonden in een grot in Noord-Spanje', 'De vondst schuift de beheersing van vuur bijna honderdduizend jaar op.'],
  ['fd', 'Het Financieele Dagblad', 'Economie', 'Rente blijft voorlopig hoog', 'De inflatie in de eurozone daalt langzamer dan verwacht.'],
  ['nu', 'NU.nl', 'Binnenland', 'Treinen rijden donderdag minder rond Utrecht Centraal', 'Reizigers moeten rekening houden met omleidingen en langere reistijden.'],
  ['wired', 'Wired', 'Tech', 'Waarom batterijen in de winter sneller leeg lijken', 'Kou vertraagt de chemie in de cel; de lading is er nog, maar komt moeilijker vrij.'],
  ['economist', 'The Economist', 'Economie', 'Europa zoekt een antwoord op goedkope elektrische auto’s', 'Importheffingen kopen tijd, maar lossen het kostenverschil niet op.'],
  ['atlantic', 'The Atlantic', 'Cultuur', 'De terugkeer van de lange brief', 'Wie schrijft er nog met de hand? Meer mensen dan je denkt.'],
  ['nos', 'NOS', 'Binnenland', 'Storm trekt over het noorden: code oranje voor de Waddeneilanden', 'Veerdiensten varen aangepast en het KNMI waarschuwt voor zware windstoten.'],
  ['nrc', 'NRC', 'Wetenschap', 'Een nieuwe kaart van de zeebodem onder Antarctica', 'Onderzoekers brachten valleien in kaart die het smelten van het ijs kunnen versnellen.'],
  ['volkskrant', 'de Volkskrant', 'Cultuur', 'Een museum dat je met je ogen dicht bezoekt', 'In Rotterdam opent een tentoonstelling over geluid.'],
  ['ad', 'AD', 'Sport', 'Schaatsers openen het seizoen in Thialf', 'Het eerste weekend levert meteen twee baanrecords op.'],
  ['trouw', 'Trouw', 'Religie', 'Kerken zoeken nieuwe bestemmingen', 'Steeds meer gebouwen worden bibliotheek, buurthuis of woning.'],
  ['nu', 'NU.nl', 'Tech', 'Gemeenten stoppen met verouderde software', 'Een landelijke afspraak moet de overstap betaalbaar maken.'],
  ['fd', 'Het Financieele Dagblad', 'Economie', 'Havenbedrijf investeert in walstroom', 'Schepen kunnen straks aan de kade hun motoren uitzetten.'],
  ['nyt', 'The New York Times', 'Wereld', 'Een dorp in Japan dat zijn scholen weer opent', 'Jonge gezinnen keren terug nu thuiswerken blijft.'],
]
const items = S.map(([source, sourceName, section, title, summary], i) => ({ id: `ph12-${i}-${source}`, kind: 'article', source, sourceName, url: 'https://example.org/' + i, section, title, summary, image: null, publishedAt: ago(1 + i), topics: [], mainTopics: [], storyId: null }))
const noop = () => {}
const sourcesById = new Map(items.map((i) => [i.source, { id: i.source, name: i.sourceName, cat: 'nl' }]))
const entries = items.map((it, k) => ({ kind: 'item', id: it.id, desk: ['binnenland', 'buitenland', 'tech', 'economie'][k % 4] }))
const edition = { id: 'ph12', slot: 'ochtend', date: '2026-11-05', personal: true, entries, items }
const ctx = {
  itemsById: new Map(items.map((i) => [i.id, i])), storiesById: new Map(), muted: new Set(), followStories: [], newInStory: () => 0, openStory: noop, less: [], account: { status: 'out' },
  prefs: { topics: [], interests: ['tech'], favorites: [], images: 'aan', preview: 3, bubble: true }, sourcesById, read: new Set(), saved: {}, markRead: noop, toggleSave: noop, openSource: noop, voteOn: noop, reportMistake: noop, undoLess: noop, share: noop, layout: q.get('layout') === 'krant' ? 'krant' : 'tijdlijn',
}
await Promise.race([new Promise((r) => setTimeout(r, 3000)), Promise.all([document.fonts.load('800 32px Newsreader'), document.fonts.load('400 17px Newsreader')]).catch(() => {})])
createRoot(document.getElementById('root')).render(
  <HootContext.Provider value={ctx}>
    {ctxName === 'editie' ? (
      <main style={{ position: 'absolute', inset: 0 }}>
        <Edition active edition={edition} loading={false} failedLoad={false} onRefresh={noop} statusProps={{ online: true, meta: { updatedAt: ago(1) } }} />
      </main>
    ) : (
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
    )}
  </HootContext.Provider>,
)
setTimeout(() => {
  const v = document.querySelector('.view'); const y = Number(q.get('scroll') || 0)
  if (v && y) v.scrollTo(0, y)
  document.documentElement.dataset.ready = '1'
}, 1500)
