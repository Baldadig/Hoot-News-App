// Persona's 14 november, punt 7: lokaal nieuws van elders zakt. Australische deelstaatpolitiek en een rechtszaak in New
// South Wales kwamen als vulsel, en puur Amerikaans binnenland (een ceremonie van Hegseth, de laatste zwarte senatoren uit
// Mississippi, een rechtszaak in Delaware, het Senaatsleiderschap van de Democraten) als opener of als Waar iedereen over
// schrijft. Nu komt zo'n plek pas als al het andere toegelaten aanbod er staat, achteraan, nooit op 01 en nooit als Waar
// iedereen over schrijft, tenzij het verhaal breder speelt (groot nieuws).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { composePersonal } from '../src/lib/personal.js'
import { localAbroad } from '../netlify/lib/desks.mjs'
import { majorNews } from '../shared/edition-policy.mjs'

const P = JSON.parse(readFileSync(new URL('../../Hoot-design/personas-2026-11-14/personas.json', import.meta.url), 'utf8')).personas
const load = (f) => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${f}.json.gz`, import.meta.url))).toString('utf8'))
const FEEDS = ['feed-2026-11-05-ochtend', 'live-feed-2026-11-07', 'live-feed-2026-11-09-middag', 'live-feed-2026-11-11-ochtend', 'live-feed-2026-11-04-midterms']

test('lokaal van elders: Amerikaans binnenland en deelstaten, niet wat breder gaat', () => {
  const local = (title, desk = null, url = '') => localAbroad([{ title, url }], { desk })
  assert.ok(local('Military cemetery decorum: Hegseth’s Veterans Day reprimand', 'vs'))
  assert.ok(local('Before Scott Colom, these two men were the last black US senators from Mississippi'))
  assert.ok(local('Machtsstrijd bij Democraten voor leiderschap in Senaat', 'vs'))
  assert.ok(local('Delaware judge rules on House seat dispute'))
  assert.ok(local('NSW premier announces inquiry into council'))
  assert.ok(local('Teenager charged over Bondi stabbing', null, 'https://www.theguardian.com/australia-news/2026/nov/13/bondi'))
  assert.ok(!local('Trump kondigt heffingen op Europese auto’s aan', 'vs'), 'Europa')
  assert.ok(!local('Amerikaanse militair opgepakt in VK om spionage voor Rusland', 'vs'), 'een ander land')
  assert.ok(!local('Trump en Xi ontmoeten elkaar in Peking', 'vs'))
  assert.ok(!local('Trump threatens to leave NATO', 'vs'))
  assert.ok(!local('Kabinet valt over stikstof', 'binnenland'))
  assert.ok(!local('Storm Charles batters coastline of southern Spain', 'buitenland'))
})

for (const f of FEEDS) {
  test(`${f}: lokaal nieuws van elders staat nooit op 01, nooit als Waar iedereen over schrijft, en anders achteraan`, () => {
    const feed = load(f)
    const now = Date.parse(feed.edition.builtAt)
    const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
    const storyById = new Map(feed.stories.map((s) => [s.id, s]))
    for (const p of P) {
      const ed = composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed: new Set(p.followed), interests: p.welkom.interests, topics: p.prefs.topics || [], now, builtAt: feed.edition.builtAt })
      if (!ed) continue
      const regular = ed.entries.filter((e) => e.desk !== 'bubbel')
      const isLocal = (e) => {
        const head = byId.get(e.leadId || e.id)
        const xs = (e.itemIds || []).map((x) => byId.get(x)).filter(Boolean)
        const st = storyById.get(e.id) || {}
        return localAbroad([head, ...xs.filter((i) => i !== head)], { desk: st.desk ?? e.fromDesk ?? e.desk ?? null }) && !majorNews(st, xs)
      }
      // Een plek die een gekozen interesse of onderwerp raakt, zakt niet (keuring 14 november); composePersonal zegt het in
      // het debugveld `_local`. Wat volgens localAbroad lokaal is maar niet zakt, heeft een interesse als reden, nooit Wereld.
      for (const e of regular) if (isLocal(e) && !e._local) assert.match(e.why?.text || '', /^(Omdat je (?!Wereld)|Raakt )/, `${p.id}: "${byId.get(e.leadId || e.id)?.title}" zakt niet zonder gekozen interesse`)
      const flags = regular.map((e) => isLocal(e) && e._local)
      const title = (e) => byId.get(e.leadId || e.id)?.title
      if (regular.length) assert.ok(!flags[0], `${p.id}: plek 01 "${title(regular[0])}"`)
      for (const e of regular) if (e.desk === 'breed') assert.ok(!isLocal(e), `${p.id}: Waar iedereen over schrijft "${title(e)}"`)
      // Achteraan: na de eerste lokale plek alleen nog lokale plekken. Uitzondering: wat de opening, curiosaDown en heldDown
      // daarna verschuiven (een kuriositeit naar plek 6, een blijver onder de top 5).
      const first = flags.indexOf(true)
      if (first >= 0) {
        const after = regular.slice(first).filter((e, k) => !flags[first + k] && !e.held && !/^Vervolg/.test(e.why?.text || ''))
        assert.ok(after.length <= 1, `${p.id}: na "${title(regular[first])}" nog ${after.map(title).join(' | ')}`)
      }
    }
  })
}

// Keuring 14 november: een plek die een gekozen interesse of onderwerp raakt, zakt niet. Wie Politiek koos (met het
// onderwerp Verenigde Staten) houdt de Amerikaanse uitslag; wie dat niet koos, ziet hem zakken.
test('lokaal van elders: een gekozen interesse of onderwerp zakt niet, voor wie het niet koos wel', () => {
  const feed = load('feed-2026-11-05-ochtend')
  const now = Date.parse(feed.edition.builtAt)
  const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
  const followed = new Set(['nos', 'nu', 'rtl', 'nrc', 'volkskrant', 'trouw', 'ad', 'telegraaf'])
  const run = (interests) => composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed, interests, topics: [], now, builtAt: feed.edition.builtAt })
  const usResult = (ed) => ed.entries.find((e) => e.itemIds.some((x) => /veroveringstocht Democraten/.test(byId.get(x)?.title || '')))
  const withPol = usResult(run(['politiek', 'binnenland', 'wereld']))
  assert.ok(withPol, 'met Politiek: de uitslag staat erin')
  assert.ok(!withPol._local, 'en zakt niet')
  assert.match(withPol.why?.text || '', /Politiek/)
  const without = usResult(run(['binnenland', 'wereld']))
  assert.ok(!without || without._local, 'zonder Politiek zakt hij (of valt hij weg)')
})
