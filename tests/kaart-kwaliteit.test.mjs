// Kaartkwaliteit (7 november): elke plek in de Editie verzorgd — kop, intro en beeld.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { introMax, wholeSentences, INTRO_LINES } from '../shared/zinnen.mjs'

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const POPE = 'Less than a month after losing part of a lung, Pope Leo XIV set out this morning on one of the longest and most ambitious trips of his pontificate.'

test('web: de intro van een Editie-plek rekent op de gemeten kolom, niet op de telefoon', () => {
  const e = src('src/views/Edition.jsx')
  assert.match(e, /const width = useColumnWidth\(textRef\)/)
  assert.match(e, /className="fitem__text" ref=\{textRef\}/)
  assert.match(src('src/lib/intro.js'), /export function useColumnWidth\(ref\)/)
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
