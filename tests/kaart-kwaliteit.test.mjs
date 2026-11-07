// Kaartkwaliteit (7 november): elke plek in de Editie verzorgd — kop, intro en beeld.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { introMax, wholeSentences, INTRO_LINES } from '../shared/zinnen.mjs'

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const POPE = 'Less than a month after losing part of a lung, Pope Leo XIV set out this morning on one of the longest and most ambitious trips of his pontificate.'

test('web: de intro van een Editie-plek rekent op de gemeten kolom, niet op de telefoon', () => {
  const e = src('src/views/Edition.jsx')
  assert.match(e, /const width = useColumnWidth\(linkRef, introColumn\)/)
  assert.match(e, /className="fitem__link" ref=\{linkRef\}/)
  // Zijkolom, breed: de intro onder kop en beeld, over de hele kolom.
  assert.match(src('src/styles.css'), /\.front__side \.fitem__link \{\n    grid-template-areas: 'kop beeld' 'intro intro';/)
  assert.match(src('src/lib/intro.js'), /export function useColumnWidth\(ref, measure/)
  // De telefoonmaat (267 px) liet de pauszin van 147 tekens vallen; de echte kolom van een paar (± 400 px) niet.
  const smal = introMax(INTRO_LINES, { width: 267, font: 15 })
  const breed = introMax(INTRO_LINES, { width: 400, font: 15 })
  assert.equal(wholeSentences(POPE, smal.max, smal.rek), '')
  assert.equal(wholeSentences(POPE, breed.max, breed.rek), POPE)
})

test('breed: elke plek in de zijkolom houdt zijn beeld, web en app', () => {
  assert.doesNotMatch(src('src/styles.css'), /\.front__side \.fitem:not\(:last-child\) \.thumb/)
  assert.doesNotMatch(src('ios/Hoot/Views/EditionView.swift'), /thumbShown: phone \|\| i == side\.count - 1/)
})

test('een paar zonder intro: geen gat tussen kop en bron, web en app', () => {
  assert.match(src('src/styles.css'), /\.pairs > \.fitem:not\(:has\(\.fitem__sum\)\) > \.fitem__link \{\n    flex: 0 0 auto;/)
  const c = src('ios/Hoot/Views/Components.swift')
  assert.match(c, /if pinSource && krantIntro != nil \{ Spacer\(minLength: 0\) \}/)
  assert.match(c, /if pinSource && krantIntro == nil \{ Spacer\(minLength: 0\) \}/)
})

test('cardIntro: eigen intro eerst; past die niet, dan de reserve uit hetzelfde verhaal met via', async () => {
  const { cardIntro } = await import('../shared/kaart-intro.mjs')
  const fit = introMax(INTRO_LINES, { width: 267, font: 15 })
  const kort = 'Pope Leo travels to Uruguay just three weeks after having surgery for lung cancer.'
  assert.deepEqual(cardIntro({ summary: kort }, fit), { text: kort, via: null })
  assert.deepEqual(cardIntro({ summary: POPE, introAlt: kort, introAltFrom: 'BBC' }, fit), { text: kort, via: 'BBC' })
  // Op een brede kolom past de eigen intro: dan nooit de reserve.
  assert.deepEqual(cardIntro({ summary: POPE, introAlt: kort, introAltFrom: 'BBC' }, introMax(INTRO_LINES, { width: 400, font: 15 })), { text: POPE, via: null })
  assert.deepEqual(cardIntro({ summary: POPE }, fit), { text: '', via: null })
})

test('server: beeld en reserve-intro alleen van een stuk over hetzelfde feit, intro in de taal van de kop', async () => {
  const { borrowImagesFromStories, introAlternatives } = await import('../netlify/lib/build.mjs')
  const a = (id, source, sourceName, title, extra = {}) => ({ id, kind: 'article', source, sourceName, title, url: `https://${source}.example/${id}`, ...extra })
  const atl = a('atl', 'atlantic', 'The Atlantic', 'Pope Leo travels to Uruguay after lung surgery', { summary: POPE })
  const bbc = a('bbc', 'bbc', 'BBC', 'Pope Leo travels to Uruguay weeks after lung surgery', { summary: 'Pope Leo travels to Uruguay just three weeks after having surgery for lung cancer.', image: 'https://bbc.example/pope.jpg' })
  const nos = a('nos', 'nos', 'NOS', 'Paus Leo reist naar Uruguay na longoperatie', { summary: 'De paus reist naar Uruguay.', image: 'https://nos.example/paus.jpg' })
  const ander = a('ander', 'guardian', 'The Guardian', 'Pope Leo meets Argentina president Milei in Buenos Aires', { summary: 'Short.', image: 'https://g.example/x.jpg' })
  const byId = new Map([atl, bbc, nos, ander].map((i) => [i.id, i]))
  const stories = [{ id: 's', itemIds: ['atl', 'bbc', 'nos', 'ander'] }]
  assert.equal(introAlternatives(stories, byId), 1)
  assert.equal(atl.introAlt, bbc.summary)
  assert.equal(atl.introAltFrom, 'BBC') // Engels bij een Engelse kop, nooit de NOS
  assert.equal(borrowImagesFromStories(stories, byId), 1)
  assert.equal(atl.image, bbc.image)
  assert.equal(atl.imageFrom, 'BBC')
  // Botsende eigen namen (een ander geval): geen beeld.
  const los = a('los', 'nyt', 'NYT', 'Pope Leo visits Montevideo cathedral on Sunday')
  const leeg = a('leeg', 'wapo', 'Washington Post', 'Pope Leo visits Buenos Aires cathedral on Sunday', { image: 'https://w.example/y.jpg' })
  assert.equal(borrowImagesFromStories([{ id: 't', itemIds: ['los', 'leeg'] }], new Map([[los.id, los], [leeg.id, leeg]])), 0)
  assert.equal(los.image, undefined)
})

test('app: in de zijkolom staat de intro onder kop en beeld, net als op het web', () => {
  const c = src('ios/Hoot/Views/Components.swift')
  assert.match(c, /private var introBelow: Bool \{ narrow && !timeline && thumbShown \}/)
  assert.match(c, /if introBelow \{ introView \}/)
  assert.match(c, /if !introBelow \{ introView \}/)
})
