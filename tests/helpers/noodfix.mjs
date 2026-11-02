// Noodfix 2 november 2026: de F1/marathon-bundel (64 stukken, 18 uitgevers) stond als "Groot nieuws" bovenaan,
// met een NYT-fotogalerij als kop. Fixture: een uitsnede van de live feed van die ochtend.
import { readFileSync } from 'node:fs'
import { composePersonal } from '../../src/lib/personal.js'
import { MAIN_IDS } from '../../netlify/lib/sources.mjs'
import { selectEdition } from '../../netlify/lib/stories.mjs'
import { resolveTopics } from '../../src/lib/topics.js'

export const SNAP = JSON.parse(readFileSync(new URL('../fixtures/noodfix-sport-2026-11-02.json', import.meta.url), 'utf8'))
export const BUNDLE = 'stke0dt'
export const NOW = Date.parse(SNAP.meta.updatedAt)
export const byId = new Map([...SNAP.items, ...SNAP.edition.items].map((i) => [i.id, i]))
export const storyOf = (id) => SNAP.stories.find((s) => s.id === id)
export const itemsOf = (st) => st.itemIds.map((id) => byId.get(id)).filter(Boolean)

// Lezers die NYT volgen maar geen Sport kiezen, zoals Alex' eigen Editie.
export const FOLLOWED = ['nyt', 'nos', 'guardian', 'bbc']
export const PERSONAS = [
  { id: 'zonder-sport', interests: ['politiek', 'tech'] },
  { id: 'binnenland', interests: ['binnenland'] },
  { id: 'wereld', interests: ['wereld'] },
]
export function setupOf(p, extra = {}) {
  return { followed: new Set(FOLLOWED), interests: p.interests, topics: resolveTopics(p.interests, []), favorites: [], affinity: null, taste: { topics: {}, sources: {} }, readIds: new Set(), ...extra }
}
// Het toestel kent alleen de berichten van de bronnen die de lezer volgt (zo zag Alex' toestel van de bundel alleen de NYT).
export const composeFor = (p, extra) => composePersonal({ global: SNAP.edition, stories: SNAP.stories, items: SNAP.items.filter((i) => FOLLOWED.includes(i.source)), sources: SNAP.sources, now: NOW, builtAt: SNAP.meta.updatedAt, previous: null, ...setupOf(p, extra) })
export const generalEntries = () => selectEdition(SNAP.stories, SNAP.items.filter((i) => i.kind === 'article'), { mainIds: MAIN_IDS, now: NOW })
