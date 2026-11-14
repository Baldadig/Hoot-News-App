// Persona's 14 november, punt 2: één onderwerp hooguit twee plekken per Editie (de kabinetscrisis stond bij één lezer op
// vier plekken), één gebeurtenis in twee verhalen wordt één plek met alle stukken, en geen kruisbonus ("Raakt Politiek én
// Binnenland") voor gebieden die bijna altijd samen staan: een plaats is geen tweede gebied.
// Generiek: de koppen hieronder zijn verzonnen; de regels kennen geen namen of onderwerpen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { signatures, sameTopic, sameEvent, sameHeadEventOf, sameEventToMerge, TOPIC_MAX } from '../netlify/lib/stories.mjs'
import { composePersonal } from '../src/lib/personal.js'
import { profileOf, personalParts, PLACE_HIT, GEO_NL } from '../shared/editor.mjs'
import { SOURCES } from '../netlify/lib/sources.mjs'

const T0 = Date.parse('2026-11-14T09:00:00Z')
const art = (id, title, text = '', h = 0, source = 'nos') => ({ id, kind: 'article', source, title, summary: text, text, publishedAt: new Date(T0 + h * 36e5).toISOString() })

test('sameTopic: invalshoeken van één dossier zijn één onderwerp, zonder lijst van namen', () => {
  const a = art('a', 'Crisisoverleg Pavlic, Dorsman en Krul in Hilversum, radiostilte afgesproken', 'De partijleiders van de Groenpartij en de Middenunie spreken in Hilversum over de toekomst van het kabinet. Pavlic wil duidelijkheid.')
  const b = art('b', 'Kabinetscrisis duurt voort: coalitie praat door', 'De Groenpartij en de Middenunie praten verder. Dorsman spreekt van een mislukt experiment.', 2)
  const c = art('c', 'Focus op beeldvorming maakt ontbreken regie Pavlic extra pijnlijk', 'Pavlic en Dorsman staan tegenover elkaar in het overleg over de Middenunie.', 3)
  const d = art('d', 'Opnieuw vogelgriep in Hierden, duizenden kippen gedood', 'In Hierden is opnieuw vogelgriep vastgesteld op een pluimveebedrijf.', 1)
  const sig = signatures([a, b, c, d])
  assert.ok(sameTopic(sig, a, b), 'kabinetscrisis en crisisoverleg: dezelfde stam, gedeelde namen')
  assert.ok(sameTopic(sig, a, c), 'twee gedeelde namen, één in de kop')
  assert.ok(!sameTopic(sig, a, d) && !sameTopic(sig, b, d) && !sameTopic(sig, c, d), 'vogelgriep is een ander onderwerp')
})

test('sameTopic: één gedeelde naam zonder meer is geen onderwerp; ver uit elkaar ook niet', () => {
  const a = art('a', 'Lumora-vlucht vast in Boekarest na bommelding', 'Een toestel van Lumora staat aan de grond.')
  const b = art('b', 'Lumora schrapt vijfduizend banen', 'Het bedrijf Lumora snijdt in het personeel.', 3)
  const c = art('c', 'Crisisoverleg Pavlic en Dorsman', 'De Groenpartij en de Middenunie spreken.', 0)
  const e = art('e', 'Kabinetscrisis: Pavlic en Dorsman', 'De Groenpartij en de Middenunie spreken.', 60)
  const sig = signatures([a, b, c, e])
  assert.ok(!sameTopic(sig, a, b), 'twee verhalen over één bedrijf')
  assert.ok(!sameTopic(sig, c, e), 'meer dan anderhalve dag ertussen')
})

const P = JSON.parse(readFileSync(new URL('../../Hoot-design/personas-2026-11-14/personas.json', import.meta.url), 'utf8')).personas
const READERS = [
  { id: 'politiek', followed: ['nos', 'nu', 'nrc', 'volkskrant', 'nyt', 'atlantic', 'wired', 'economist'], interests: ['politiek', 'binnenland', 'wereld'], topics: [] },
  { id: 'alles', followed: ['nos', 'nrc', 'volkskrant', 'nyt', 'atlantic', 'economist', 'theverge', 'wired', 'parool', 'fd'], interests: ['politiek', 'binnenland', 'wereld', 'economie', 'tech', 'wetenschap', 'cultuur', 'sport'], topics: [] },
  ...P.map((p) => ({ id: p.id, followed: p.followed, interests: p.welkom.interests, topics: p.prefs.topics || [] })),
]
const FEEDS = ['feed-2026-11-05-ochtend', 'live-feed-2026-11-09-middag', 'live-feed-2026-11-11-ochtend']

for (const f of FEEDS) {
  test(`${f}: geen drie plekken over één onderwerp, geen twee over één gebeurtenis`, () => {
    const feed = JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${f}.json.gz`, import.meta.url))).toString('utf8'))
    const now = Date.parse(feed.edition.builtAt)
    const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
    const sig = signatures([...byId.values()].filter((i) => i.kind !== 'post'))
    for (const r of READERS) {
      const ed = composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed: new Set(r.followed), interests: r.interests, topics: r.topics, now, builtAt: feed.edition.builtAt })
      const heads = ed.entries.map((e) => byId.get(e.leadId || e.id)).filter(Boolean)
      assert.equal(TOPIC_MAX, 2)
      for (let i = 0; i < heads.length; i++) for (let j = i + 1; j < heads.length; j++) {
        if (!sig.has(heads[i].id) || !sig.has(heads[j].id)) continue
        assert.ok(!sameEvent(sig.get(heads[i].id), sig.get(heads[j].id)) && !sameHeadEventOf(sig, heads[i], heads[j]), `${r.id}: dezelfde gebeurtenis twee keer: ${heads[i].title} | ${heads[j].title}`)
        for (let k = j + 1; k < heads.length; k++) {
          const tri = sameTopic(sig, heads[i], heads[j]) && sameTopic(sig, heads[i], heads[k]) && sameTopic(sig, heads[j], heads[k])
          assert.ok(!tri, `${r.id}: drie plekken over één onderwerp: ${heads[i].title} | ${heads[j].title} | ${heads[k].title}`)
        }
      }
    }
  })
}

test('één gebeurtenis in twee verhalen (Nederlands en Engels): één plek met de stukken van beide', () => {
  const feed = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/live-feed-2026-11-04.json.gz', import.meta.url))).toString('utf8'))
  const now = Date.parse(feed.edition.builtAt)
  const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
  const reader = READERS.find((r) => r.id === 'priya')
  const ed = composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed: new Set(reader.followed), interests: reader.interests, topics: reader.topics, now, builtAt: feed.edition.builtAt })
  const storyById = new Map(feed.stories.map((s) => [s.id, s]))
  // Een plek die stukken van een ander verhaal opnam: de stukken van dat verhaal staan nergens anders in de Editie.
  const base = (e) => new Set([...(storyById.get(e.id)?.itemIds || []), ...(feed.edition.entries.find((g) => g.id === e.id)?.itemIds || []), e.leadId])
  const grown = ed.entries.filter((e) => e.kind === 'story' && e.itemIds.some((x) => !base(e).has(x)))
  assert.ok(grown.length >= 1, 'er is samengevoegd')
  for (const e of grown) {
    // De opgenomen stukken gaan over dezelfde gebeurtenis als de plek (dezelfde kop-gebeurtenis), hier over de taalgrens.
    const langs = new Set(e.itemIds.map((x) => byId.get(x)).filter(Boolean).map((i) => SOURCES.find((s) => s.id === i.source)?.lang))
    assert.ok(langs.has('nl') && langs.has('en'), [...langs].join(','))
    const others = ed.entries.filter((x) => x !== e).flatMap((x) => x.itemIds)
    for (const x of e.itemIds) assert.ok(!others.includes(x), 'geen stuk op twee plekken')
  }
})

test('kruisbonus: een plaats is geen tweede gebied; twee onderwerpen wel', () => {
  const prof = profileOf({ interests: ['politiek', 'binnenland'], followed: new Set(['nos']), sources: SOURCES })
  const haags = { id: 'h', kind: 'article', source: 'nos', title: 'Kabinet en Kamer praten door over belastingplan', summary: 'De coalitie praat in Den Haag verder over het belastingplan.', topics: ['nederland'], publishedAt: new Date(T0).toISOString() }
  const parts = personalParts([haags], prof, {}, { desk: 'binnenland' })
  assert.ok(parts.interest, 'wel een interesse')
  assert.equal(parts.cross, undefined, 'geen "Raakt Politiek én Binnenland" voor een Haags stuk')
  const zorg = { ...haags, id: 'z', title: 'Kabinet wil eigen risico in de zorg verlagen', summary: 'Het kabinet wil het eigen risico in de zorg omlaag.', topics: ['nederland', 'zorg'] }
  const both = personalParts([zorg], prof, {}, { desk: 'binnenland' })
  assert.deepEqual([...(both.cross?.f || [])].sort(), ['binnenland', 'politiek'], 'politiek en zorg: twee onderwerpen, wel een snijvlak')
  assert.ok(PLACE_HIT({ t: GEO_NL }) && PLACE_HIT({ t: 'middenoosten' }) && PLACE_HIT({ t: 'bron:tech' }) && !PLACE_HIT({ t: 'zorg' }) && !PLACE_HIT({ t: 'vs-politiek' }))
  const world = profileOf({ interests: ['politiek', 'wereld'], followed: new Set(['nyt']), sources: SOURCES })
  const abroad = { id: 'w', kind: 'article', source: 'nyt', title: 'Iran talks stall as Vance visits Gulf allies', summary: 'The vice president met leaders in the Middle East.', topics: ['vs-politiek', 'middenoosten'], publishedAt: new Date(T0).toISOString() }
  assert.equal(personalParts([abroad], world, {}, { desk: 'middenoosten' }).cross, undefined, 'geen "Raakt Politiek én Wereld" voor politiek in een werelddeel')
})

// Keuring 14 november: samenvoegen alleen bij dezelfde gebeurtenis. Hetzelfde onderwerp of cluster geeft geen tweede plek,
// maar ook geen samenvoeging. Een gedeelde naam die zelf een gebeurtenis-woord is (een verkiezing in een kop in titelkast)
// is geen handelende partij.
const loadFeed = (f) => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${f}.json.gz`, import.meta.url))).toString('utf8'))
const grownOf = (feed, r) => {
  const now = Date.parse(feed.edition.builtAt)
  const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
  const storyById = new Map(feed.stories.map((s) => [s.id, s]))
  const ed = composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed: new Set(r.followed), interests: r.interests, topics: r.topics, now, builtAt: feed.edition.builtAt })
  const base = (e) => new Set([...(storyById.get(e.id)?.itemIds || []), ...(feed.edition.entries.find((g) => g.id === e.id)?.itemIds || []), e.leadId])
  return ed.entries.filter((e) => e.kind === 'story').map((e) => ({ head: byId.get(e.leadId || e.id)?.title || '', extra: e.itemIds.filter((x) => !base(e).has(x)).map((x) => byId.get(x)?.title || '') }))
}

test('samenvoegen: een gedeelde verkiezing is geen gebeurtenis (sameEventToMerge)', () => {
  const a = art('a', 'Trump Emerges After the Midterms: ‘Did You Guys See the Helipad?’', '', 0, 'nyt')
  const b = art('b', 'The Biggest Pro-AI Super PAC Network Didn’t Really Impact the Midterms', '', 1, 'wired')
  const c = art('c', 'Stafchef Witte Huis weg, Trump kiest hardliner Stephen Miller als opvolger', '', 0, 'nos')
  const d = art('d', 'Na de verkiezingsnederlaag vervangt Trump stafchef Wiles door Miller', '', 1, 'volkskrant')
  const sig = signatures([a, b, c, d])
  assert.ok(!sameEventToMerge(sig, a, b), 'twee feiten rond één verkiezing')
  assert.ok(sameEventToMerge(sig, c, d), 'dezelfde wissel van stafchef')
})

test('samenvoegen op bewaarde feeds: verkeerde paren niet, goede paren wel', () => {
  const byIdR = new Map(READERS.map((r) => [r.id, r]))
  // Fout: Helipad krijgt het Super PAC-stuk erbij (5 november ochtend, Maarten en de lezer met Politiek).
  for (const id of ['maarten', 'politiek']) {
    const helipad = grownOf(loadFeed('feed-2026-11-05-ochtend'), byIdR.get(id)).find((e) => /Helipad/.test(e.head))
    if (helipad) assert.ok(!helipad.extra.some((t) => /Super PAC/.test(t)), `${id}: ${helipad.extra.join(' | ')}`)
  }
  // Goed: de vertrekkende stafchef bij de nieuwe (7 november) en Binance in twee talen (4 november).
  const miller = grownOf(loadFeed('live-feed-2026-11-07'), byIdR.get('henk')).find((e) => /Miller/.test(e.head))
  assert.ok(miller?.extra.some((t) => /Wiles/.test(t)), 'Wiles bij Miller')
  const binance = grownOf(loadFeed('live-feed-2026-11-04'), byIdR.get('priya')).find((e) => /Binance/.test(e.head))
  assert.ok(binance?.extra.length >= 1, 'Binance in twee talen')
})
