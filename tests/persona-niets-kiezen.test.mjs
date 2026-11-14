// Persona's 14 november, punt 10: wie niets kiest (Liever meteen lezen), krijgt de algemene Editie als basis, met hooguit
// NO_CHOICE_FILL_MAX vulplekken per rubriek. Jan, met Tweakers in de startset, kreeg vijf Tech-plekken in één Editie en
// maar drie tot zeven plekken van de algemene Editie.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { composePersonal, NO_CHOICE_FILL_MAX } from '../src/lib/personal.js'

const P = JSON.parse(readFileSync(new URL('../../Hoot-design/personas-2026-11-14/personas.json', import.meta.url), 'utf8')).personas
const jan = P.find((p) => p.id === 'jan')
const load = (f) => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${f}.json.gz`, import.meta.url))).toString('utf8'))
const compose = (feed, extra = {}) => composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed: new Set(jan.followed), interests: [], topics: [], now: Date.parse(feed.edition.builtAt), builtAt: feed.edition.builtAt, ...extra })
const ids = (e) => [e.id, e.leadId, ...(e.itemIds || [])].filter(Boolean)
const fromGeneral = (feed) => {
  const gen = new Set(feed.edition.entries.filter((e) => e.desk !== 'bubbel').flatMap(ids))
  return (e) => ids(e).some((x) => gen.has(x))
}

test('wie niets koos en zes verse Tweakers-stukken heeft: hooguit twee Tech-plekken, en toch een volle Editie', () => {
  // Zes verzonnen Tweakers-stukken over verschillende onderwerpen, en een lezer met de startset zonder NOS (zoals Jan op
  // za 14 november middag, toen NU.nl en RTL weinig hadden): vroeger zes Tech-plekken, nu twee.
  const feed = load('live-feed-2026-11-11-ochtend')
  const now = Date.parse(feed.edition.builtAt)
  const T = ['Manjaro Linux brengt grote update uit met nieuwe installatieprocedure', 'Kritieke kwetsbaarheid in routers van Zyxel laat aanvallers binnen', 'Raspberry Pi verhoogt prijzen van compacte computers met vijftien procent', 'Firefox schakelt ondersteuning voor oude extensies volgend voorjaar uit', 'Glasvezelaanbieder Delta sluit koperen netwerk in Zeeland af', 'Nieuwe versie van Steam Deck krijgt helderder scherm en grotere accu']
  const tech = T.map((title, k) => ({ id: `tw-${k}`, kind: 'article', source: 'tweakers', sourceName: 'Tweakers', title, summary: `${title}.`, url: `https://tweakers.net/nieuws/${1000 + k}/x.html`, publishedAt: new Date(now - (k + 1) * 36e5).toISOString(), topics: [], image: 'x' }))
  const ed = composePersonal({ global: feed.edition, stories: feed.stories, items: [...feed.items, ...tech], sources: feed.sources, followed: new Set(['nu', 'rtl', 'tweakers', 'nos-cultuur', '3voor12']), interests: [], topics: [], now, builtAt: feed.edition.builtAt })
  const regular = ed.entries.filter((e) => e.desk !== 'bubbel')
  const techPlaces = regular.filter((e) => e.desk === 'tech' && ids(e).some((x) => x.startsWith('tw-')))
  assert.ok(techPlaces.length <= NO_CHOICE_FILL_MAX, `${techPlaces.length} Tech-plekken van Tweakers`)
  assert.equal(regular.length, 10, 'en toch een volle Editie')
})

// 9 november middag: 4, want een deel van de plekken van de algemene Editie heeft alleen een betaalde kop van een bron die Jan niet
// volgt (buiten je bronnen alleen gratis, tweede keuring).
for (const [f, min] of [['live-feed-2026-11-09-middag', 4], ['live-feed-2026-11-11-ochtend', 5], ['live-feed-2026-11-07', 5]]) {
  test(`${f}: wie niets koos, krijgt de algemene Editie als basis`, () => {
    const feed = load(f)
    const ed = compose(feed)
    const regular = ed.entries.filter((e) => e.desk !== 'bubbel')
    const general = fromGeneral(feed)
    assert.ok(regular.filter(general).length >= min, `${regular.filter(general).length} plekken uit de algemene Editie`)
    // Een voorkeursbron is een keuze: dan geldt de basis niet.
    const fav = compose(feed, { favorites: ['nos'] })
    assert.ok(fav.entries.length > 0)
  })
}
