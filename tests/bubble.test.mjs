import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanTerms, matchTrending, termMatches, termWords, briefInput } from '../netlify/lib/bubble.mjs'

const art = (id, title, summary = '', extra = {}) => ({ id, kind: 'article', title, summary, publishedAt: '2026-10-10T06:00:00Z', ...extra })

test('termen worden opgeschoond: onderstrepen, haakjes, generieke pagina’s en dubbelen', () => {
  const t = cleanTerms([
    { term: 'Hoofdpagina', via: 'wikipedia' },
    { term: 'Speciaal:Zoeken', via: 'wikipedia' },
    { term: 'Navanethem_Pillay', via: 'wikipedia' },
    { term: 'East_of_Eden_(miniserie_uit_2026)', via: 'wikipedia' },
    { term: 'navanethem pillay', via: 'google' },
    { term: 'Deaths_in_2026', via: 'wikipedia' },
  ])
  assert.deepEqual(
    t.map((x) => x.words),
    [['navanethem', 'pillay'], ['east', 'eden']]
  )
})

test('een term past alleen als (vrijwel) alle woorden in het bericht staan', () => {
  const text = new Set('navi pillay krijgt de nobelprijs voor de vrede'.split(' '))
  assert.equal(termMatches(termWords('Navi Pillay'), text), true)
  assert.equal(termMatches(termWords('Pillay'), text), true)
  assert.equal(termMatches(termWords('Trump approval poll results'), text), false)
  assert.equal(termMatches(termWords('Christa Pike'), text), false)
})

test('kiest berichten buiten de editie, één per verhaal, meerdere signalen eerst', () => {
  const articles = [
    art('a', 'Navi Pillay wint de Nobelprijs voor de Vrede', '', { storyId: 's1' }), // zit in de editie
    art('b', 'Christa Pike: executie mislukt', 'De terdoodveroordeelde Christa Pike overleefde de injectie.', { storyId: 's2' }),
    art('c', 'Pike case raises questions', 'Christa Pike and the death penalty.', { storyId: 's2' }), // zelfde verhaal
    art('d', 'Marinus Dijkhuizen ontslagen als trainer', ''),
    art('e', 'Chelsea verslaat Bournemouth', ''),
    art('f', 'Beurs sluit hoger', ''),
  ]
  const trends = [
    { term: 'navanethem pillay', via: 'google', rank: 1 },
    { term: 'Christa_Pike', via: 'wikipedia', rank: 5 },
    { term: 'Christa Pike execution', via: 'bluesky', rank: 2 },
    { term: 'marinus dijkhuizen', via: 'google', rank: 3 },
    { term: 'chelsea - bournemouth', via: 'google', rank: 2 },
  ]
  const out = matchTrending(trends, articles, { excludeStoryIds: new Set(['s1']), max: 3 })
  assert.deepEqual(
    out.map((o) => o.id),
    ['b', 'd', 'e']
  )
  assert.equal(out[0].terms.length, 2) // twee signalen voor Pike
  assert.ok(out.every((o) => o.id !== 'a' && o.id !== 'c'))
})

test('een signaal dat de editie al dekt telt niet mee', () => {
  const articles = [art('x', 'Why the US stopped public executions', 'The case of Nidal Hasan revives the debate.')]
  const trends = [{ term: 'Nidal_Hasan', via: 'wikipedia' }]
  assert.deepEqual(matchTrending(trends, articles, { coveredTitles: ['Pentagon wil executie Nidal Hasan live uitzenden'] }), [])
  assert.equal(matchTrending(trends, articles).length, 1)
})

test('zonder passende signalen is het blok leeg; sociale posts doen niet mee', () => {
  assert.deepEqual(matchTrending([{ term: 'iets anders', via: 'google' }], [art('a', 'Beurs sluit hoger')]), [])
  assert.deepEqual(matchTrending([{ term: 'beurs', via: 'google' }], [{ ...art('p', 'beurs sluit hoger'), kind: 'post' }]), [])
})

test('de invoer voor het AI-overzicht: bron, kop en samenvatting; zonder samenvatting gemarkeerd', () => {
  const s = briefInput([{ sourceName: 'NOS', title: 'Kop', summary: 'Kern.' }, { sourceName: 'NYT', title: 'Head' }])
  assert.equal(s, '1. [NOS] Kop — Kern.\n2. [NYT] Head [alleen kop]')
})
