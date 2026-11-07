import { test } from 'node:test'
import assert from 'node:assert/strict'
import { introOf } from '../netlify/lib/rss.mjs'

test('intro uit content:encoded, zonder de vaste aanhef van Nature', () => {
  const it = { contentEncoded: '<p>Nature, Published online: 21 October 2026; <a href="x">doi:10.1038/d41586-026-03376-6</a></p>Experiment shows how these ecosystems could protect coastlines.' }
  assert.equal(introOf(it, 'Scientists put a salt marsh in a giant wave-machine'), 'Experiment shows how these ecosystems could protect coastlines.')
})

test('een intro die alleen de kop herhaalt is geen intro', () => {
  const it = { contentEncoded: '<p>Nature, Published online: 21 October 2026; doi:10.1038/s41586</p><i>De novo</i> design of photocatalysts' }
  assert.equal(introOf(it, 'De novo design of photocatalysts'), '')
})

test('de gewone samenvatting gaat voor', () => {
  assert.equal(introOf({ contentSnippet: 'Korte samenvatting.', contentEncoded: '<p>Lange tekst</p>' }, 'Kop'), 'Korte samenvatting.')
})

// Kaartkwaliteit (7 november): een Atom-feed met dek (<summary>) én artikeltekst (<content>).
test('Atom: de dek van de redactie gaat voor de eerste alinea van de artikeltekst', () => {
  const it = {
    summary: 'Leo’s upcoming trip to South America is an early test of how he will handle the rise of right-wing populists.',
    contentSnippet: 'Less than a month after losing part of a lung, Pope Leo XIV set out this morning on one of the longest and most ambitious trips of his pontificate. More text follows here.',
  }
  assert.equal(introOf(it, 'The Pope Confronts One of His Toughest Political Challenges'), it.summary)
})

test('Atom: een dek die niets zegt (te kort of de kop) laat de artikeltekst staan', () => {
  const body = 'Een lange eerste alinea van het artikel die het nieuws vertelt. En nog een zin erbij.'
  assert.equal(introOf({ summary: 'Kort.', contentSnippet: body }, 'Kop'), body)
  assert.equal(introOf({ summary: 'De kop van dit stuk, precies zoals hij boven het artikel staat', contentSnippet: body }, 'De kop van dit stuk, precies zoals hij boven het artikel staat'), body)
})

test('reclame en nieuwsbrief-aanhef herkent het filter, ook vóór het inkorten', async () => {
  const { withoutPromo, PROMO_OWN, preview } = await import('../netlify/lib/text.mjs')
  for (const s of ['This is an edition of The Books Briefing, our editors’ weekly guide.', 'This article was featured in the One Story to Read Today newsletter.', 'Sign up for Inside the Trump Presidency, a newsletter featuring coverage.', 'Subscribe here: Apple Podcasts | Spotify | YouTube.'])
    assert.ok(PROMO_OWN.test(s), s)
  const t = 'Sign up for Inside the Trump Presidency, a newsletter featuring coverage of the second Trump term. The president named a new chief of staff on Friday.'
  assert.equal(preview(withoutPromo(t)), 'The president named a new chief of staff on Friday.')
  assert.ok(!PROMO_OWN.test('Subscribers to the service saw prices rise.'))
})
