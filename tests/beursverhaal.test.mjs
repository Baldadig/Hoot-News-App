// Beursverhaal (Redacteur ronde 3a, keuring 6 november 2026). In de feed van vrijdagochtend stond de beurscrash van
// 5 november ("grootste verliesdag van 2026 op Wall Street") verdeeld: een verhaal van acht uitgevers, een van twee
// (ND, AD) en losse stukken (de Volkskrant, FT, SCMP). De app toonde 28 bronnen, maar dat was de midterms-bundel
// van de server met een beurskop: het toestel bundelt niet zelf. Een koersval heeft geen eigen naam, alleen een
// markt; attachLoose eiste twee eigen namen. Nu: bij een groot beursverhaal horen ook de beursstukken en kleine
// beursgroepen over dezelfde markt, binnen twaalf uur.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildStories } from '../netlify/lib/stories.mjs'

const { items } = JSON.parse(readFileSync(new URL('./fixtures/beurscrash-2026-11-05.json', import.meta.url), 'utf8'))
const storyOf = (stories, id) => stories.find((s) => s.itemIds.includes(id))

test('beursverhaal: de beurscrash is één verhaal, met ND en AD, de Volkskrant, FT en SCMP', () => {
  const stories = buildStories(items, {}, { extended: true })
  const crash = storyOf(stories, '1r0c9rt')
  assert.ok(crash)
  for (const id of ['161xlhu', '1r2f21r', 'o80a80', '18o5lfk', 'cd5qe6', '1i8gs84']) assert.equal(storyOf(stories, id)?.id, crash.id, id)
  assert.ok(crash.publisherCount >= 12, `${crash.publisherCount} uitgevers`)
  // Een andere markt (de Nikkei, zonder de VS) en ander nieuws blijven erbuiten.
  assert.notEqual(storyOf(stories, 'b5e24f')?.id, crash.id)
  assert.notEqual(storyOf(stories, '1r0c7dj')?.id, crash.id)
})

test('beursverhaal: alleen in de uitgebreide stand, en zonder groot beursverhaal verandert er niets', () => {
  const plain = buildStories(items, {}, { extended: false })
  assert.notEqual(storyOf(plain, 'o80a80')?.id, storyOf(plain, '1r0c9rt')?.id)
  // Zonder het grote verhaal (minder dan zes bronnen) geen beursregel: de losse stukken blijven los.
  const klein = items.filter((i) => !['1wir9nt', 'ub46qt', '12sqgxq', '1ewubnh', '2dregx', '19tdun', 'ewu1qv'].includes(i.id))
  const stories = buildStories(klein, {}, { extended: true })
  assert.ok(!storyOf(stories, 'o80a80') || storyOf(stories, 'o80a80').itemIds.every((id) => ['o80a80', '18o5lfk'].includes(id)))
})
