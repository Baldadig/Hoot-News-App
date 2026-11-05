// Hoot 1.1.1: de backlogpunten na 1.1.0, web en app gelijk.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chosenIn, startsOpen, foldCount } from '../src/lib/follow-welcome.js'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

// 3. Onboarding, bronnenstap: categorieën inklapbaar.
test('bronnenstap: een categorie staat open met gekozen bronnen, de Basis altijd', () => {
  const list = [{ id: 'nos' }, { id: 'nu' }, { id: 'rtl' }]
  assert.equal(chosenIn(list, ['nu', 'nrc']), 1)
  assert.equal(startsOpen('basis', 0), true)
  assert.equal(startsOpen('b-sport', 0), false)
  assert.equal(startsOpen('b-sport', 2), true)
  assert.equal(foldCount(0, 8), '8 bronnen')
  assert.equal(foldCount(0, 1), '1 bron')
  assert.equal(foldCount(2, 8), '2 van 8 gevolgd')
})

test('bronnenstap: de kop is een knop met aria-expanded, ingeklapt geen lijst; iOS gebruikt dezelfde regels', () => {
  const web = read('src/views/Welcome.jsx')
  assert.match(web, /className="ob__gtoggle" aria-expanded=\{open\}/)
  assert.match(web, /\{open \? <ul className="ob__list"/)
  assert.match(read('src/main.jsx'), /import '\.\/styles\/inklap\.css'/)
  const ios = read('ios/Hoot/Views/WelcomeView.swift')
  assert.match(ios, /FollowList\.startsOpen/)
  assert.match(ios, /FollowList\.foldCount/)
})
