import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { SNAP } from './helpers/noodfix.mjs'
const { buildStories, signatures, sameEvent, sameSubject } = await import(process.env.HOOT_STORIES_MODULE ? pathToFileURL(process.env.HOOT_STORIES_MODULE) : new URL('../netlify/lib/stories.mjs', import.meta.url))

const article = (id, title, summary = title) => ({ id, kind: 'article', source: id, sourceName: id, title, summary, publishedAt: '2026-11-02T05:00:00Z' })
const bridged = () => [
  ...Array.from({ length: 6 }, (_, n) => article('a' + n, 'Acme Orion lanceert satelliet Alpha in Madrid', 'Vandaag meldt Acme Orion een satellietlancering van Alpha in Madrid.')),
  ...Array.from({ length: 6 }, (_, n) => article('b' + n, 'Cobalt Vega opent onderzoekscentrum Delta in Toronto', 'Vandaag meldt Cobalt Vega de opening van onderzoekscentrum Delta in Toronto.')),
  ...Array.from({ length: 2 }, (_, n) => article('brug' + n, 'Acme Orion lanceert satelliet Alpha in Madrid; Cobalt Vega opent onderzoekscentrum Delta in Toronto')),
]
test('twee brede overzichtskoppen rijgen twee zelfstandige gebeurtenissen niet aan elkaar', () => {
  const items = bridged(), stories = buildStories(items, {}, { extended: true })
  assert.ok(stories.some(s => s.itemIds.includes('a0') && s.sourceCount >= 6))
  assert.ok(stories.some(s => s.itemIds.includes('b0') && s.sourceCount >= 6))
  for (const s of stories) assert.ok(!(s.itemIds.some(id => /^a\d/.test(id)) && s.itemIds.some(id => /^b\d/.test(id))), s.itemIds.join(','))
  const groups = xs => buildStories(xs, {}, { extended: true }).map(s => [...s.itemIds].sort()).sort()
  assert.deepEqual(groups(items), groups([...items].reverse()), 'invoervolgorde verandert de splitsing niet')
})
test('F1 en een marathon zijn verschillende gebeurtenissen, ook bij gedeelde algemene woorden', () => {
  const a = article('f1', 'Antonelli wint race na spannende strijd, groot feest voor de winnaar')
  const b = article('run', 'Nageeye wint marathon na spannende strijd, groot feest voor de winnaar')
  const sig = signatures([a, b])
  assert.equal(sameEvent(sig.get(a.id), sig.get(b.id)), false)
  assert.equal(sameSubject(sig.get(a.id), sig.get(b.id)), false)
})
test('de bekende sportuitsnede bundelt F1 en marathon los, zonder de fixture te herschrijven', () => {
  const items = SNAP.items.filter(i => i.kind === 'article')
  const stories = buildStories(items, {}, { extended: true, keys: true })
  for (const s of stories) {
    const titles = s.itemIds.map(id => items.find(i => i.id === id).title)
    assert.ok(!(titles.some(t => /marathon/i.test(t)) && titles.some(t => /Antonelli|Formula One|F1/i.test(t))), titles.join(' | '))
  }
})
test('sameSubject respecteert dezelfde lokale gebeurtenisgrens als sameEvent', () => {
  const a = article('haag', 'Solidaire Jongeren protesteren in Den Haag, politie arresteert demonstranten', 'Arrestaties bij protest van beweging Solidaire Jongeren in Den Haag.')
  const b = article('paris', 'Solidaire Jongeren protesteren in Parijs, politie arresteert demonstranten', 'Arrestaties bij protest van beweging Solidaire Jongeren in Parijs.')
  const sig = signatures([a, b])
  assert.equal(sameEvent(sig.get(a.id), sig.get(b.id)), false)
  assert.equal(sameSubject(sig.get(a.id), sig.get(b.id)), false)
})

test('de Nederlandstalige en Engelstalige berichten over dezelfde vliegtuigcrash blijven samen', () => {
  const items = SNAP.items.filter(i => i.kind === 'article')
  const stories = buildStories(items, {}, { extended: true })
  const story = stories.find(s => s.itemIds.includes('3ruey4')) // Engelse kop
  assert.ok(story?.itemIds.includes('1r0eng4')) // Nederlandse NOS-kop
  assert.equal(story.itemIds.length, 12, 'de twaalf stukken uit de oorspronkelijke herberekening blijven samen')
  assert.equal(story.sourceCount, 11)
  assert.ok(story.publisherCount >= 8)
})
