// Persona's 14 november, punt 6: de rubriek boven een plek kent de lezer. Belgisch nieuws heette voor een Gentse lezer
// Buitenland, schaatsen stond onder Buitenland en Wereld · China & Azië, beurstips en Miss Universe onder Wetenschap ·
// Ruimte. Nu: sport en cultuur vóór de geografie, de geografie vanaf het thuisland van de lezer, en een subonderwerp alleen
// als de indeling zeker is (die laatste twee regels staan als gedeelde gevallen in tests/fixtures/label-cases.json, die
// ook de app toetst).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { composePersonal } from '../src/lib/personal.js'
import { readerHome } from '../shared/lezer.mjs'
import { belgianSubject } from '../netlify/lib/desks.mjs'
import { labelFor } from '../src/lib/label.js'

const P = JSON.parse(readFileSync(new URL('../../Hoot-design/personas-2026-11-14/personas.json', import.meta.url), 'utf8')).personas
const load = (f) => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${f}.json.gz`, import.meta.url))).toString('utf8'))
const FEEDS = ['feed-2026-11-05-ochtend', 'live-feed-2026-11-07', 'live-feed-2026-11-09-middag', 'live-feed-2026-11-11-ochtend']

test('het thuisland komt uit je nieuwsbronnen', () => {
  const sources = load('live-feed-2026-11-11-ochtend').sources
  const of = (id) => readerHome({ followed: new Set(P.find((p) => p.id === id).followed), sources })
  assert.equal(of('lotte'), 'BE', 'VRT, De Standaard, Apache en BRUZZ')
  assert.equal(of('maarten'), 'NL', 'één Vlaamse krant tussen veel Nederlandse')
  assert.equal(of('henk'), 'NL')
  assert.equal(of('priya'), 'NL', 'alleen Engelse bronnen zeggen niets over waar je woont')
})

test('een Belgisch onderwerp herkennen', () => {
  assert.ok(belgianSubject({ source: 'vrt', title: 'Van 20 naar 19 graden: stad Gent bespaart door verwarming in kantoren en scholen' }))
  assert.ok(belgianSubject({ source: 'standaard', title: 'De Wever wil snel akkoord over begroting' }))
  assert.ok(belgianSubject({ source: 'vrt', title: 'Brand in rusthuis houdt hulpdiensten urenlang bezig', url: 'https://www.vrt.be/vrtnws/nl/2026/11/14/binnenland/brand/' }))
  assert.ok(!belgianSubject({ source: 'standaard', title: 'Doe Maar-drummer Jan Pijnenburg (70) onverwacht overleden' }), 'een Nederlandse drummer')
  assert.ok(!belgianSubject({ source: 'vrt', title: 'Trump benoemt Stephen Miller tot stafchef Witte Huis' }))
  assert.ok(!belgianSubject({ source: 'nos', title: 'Kabinet valt over stikstof' }))
})

// Een lezer in Vlaanderen met de Nederlandse kranten van de feed als enige nieuws: zijn Editie bestaat uit verhalen
// waarvan de server de rubriek voor iedereen gelijk zet.
test('voor een lezer in Vlaanderen is Belgisch nieuws Binnenland en Nederlands nieuws Buitenland', () => {
  const feed = load('live-feed-2026-11-11-ochtend')
  const now = Date.parse(feed.edition.builtAt)
  const nos = feed.items.filter((i) => i.source === 'nos' && i.kind === 'article' && now >= Date.parse(i.publishedAt))
  // Twee proefstukken van een Vlaamse bron: een Belgisch en een Nederlands onderwerp.
  const be = { ...nos[0], id: 'be-1', source: 'vrt', sourceName: 'VRT NWS', storyId: null, title: 'Vlaamse regering en Brussel ruziën over tram naar Leuven', summary: 'De Vlaamse regering wil de tram doortrekken.', topics: [], mainTopics: [], url: 'https://www.vrt.be/vrtnws/nl/2026/11/11/tram/' }
  const sources = feed.sources
  const base = { global: feed.edition, stories: feed.stories, sources, interests: ['wereld'], topics: [], now, builtAt: feed.edition.builtAt }
  const lotte = composePersonal({ ...base, items: [...feed.items, be], followed: new Set(['vrt', 'standaard', 'apache', 'bruzz', 'nos']) })
  const henk = composePersonal({ ...base, items: [...feed.items, be], followed: new Set(['nos', 'nu', 'vrt']) })
  const deskOf = (ed, id) => { const e = ed.entries.find((x) => (x.leadId || x.id) === id); return e && (e.rubriek || e.desk) }
  assert.equal(deskOf(lotte, 'be-1'), 'binnenland', 'Belgisch nieuws voor wie in Vlaanderen woont')
  if (deskOf(henk, 'be-1')) assert.equal(deskOf(henk, 'be-1'), 'buitenland', 'en Buitenland voor wie in Nederland woont')
  for (const e of lotte.entries) {
    const shown = e.rubriek || e.desk
    if (!['binnenland', 'regio', 'buitenland'].includes(shown)) continue
    const head = [...feed.items, be, ...feed.edition.items].find((i) => i.id === (e.leadId || e.id))
    assert.equal(shown === 'binnenland', belgianSubject(head), `${head?.title}: ${shown}`)
    if (e.rubriek) assert.notEqual(e.desk, e.rubriek, 'rubriek staat er alleen als die afwijkt')
  }
})

for (const f of FEEDS) {
  test(`${f}: een sportverhaal heet Sport, ook als de server het onder een land zette`, () => {
    const feed = load(f)
    const now = Date.parse(feed.edition.builtAt)
    const storyById = new Map(feed.stories.map((s) => [s.id, s]))
    const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
    const src = new Map(feed.sources.map((s) => [s.id, s]))
    for (const p of P) {
      const ed = composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed: new Set(p.followed), interests: p.welkom.interests, topics: p.prefs.topics || [], now, builtAt: feed.edition.builtAt })
      for (const e of ed?.entries || []) {
        if (['bubbel', 'breed', 'extern'].includes(e.desk)) continue
        const head = byId.get(e.leadId || e.id)
        const shown = e.rubriek || e.desk
        if (e.kind === 'story' && storyById.get(e.id)?.sport) assert.equal(shown, 'sport', `${p.id}: ${head?.title}`)
        const l = labelFor({ topics: head?.topics, mainTopics: head?.mainTopics, follows: p.prefs.topics || [], cat: src.get(head?.source)?.cat, desk: shown, deskLabel: shown, why: e.why })
        if (shown === 'sport') assert.match(l.kicker, /^Sport/, `${p.id}: ${head?.title} → ${l.kicker}`)
      }
    }
  })
}

test('label: Daleman in Peking op een sportplek is Sport, niet Wereld · China & Azië', () => {
  const l = labelFor({ topics: ['azie'], mainTopics: ['azie'], follows: ['azie', 'wintersport'], cat: 'sport', desk: 'sport', deskLabel: 'Sport' })
  assert.equal(l.kicker, 'Sport')
})
