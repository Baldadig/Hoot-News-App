import { test } from 'node:test'
import assert from 'node:assert/strict'
import { articleId, parseSnippets, mergeSnippets, isLiveblog } from '../netlify/lib/snippets.mjs'

const XML = `<rss><channel>
<item><title>Kop</title><link>http://www.bing.com/news/apiclick.aspx?ref=x&amp;url=https%3a%2f%2fwww.volkskrant.nl%2fbuitenland%2fbritse-premier~b3767a6a%2f&amp;c=1</link><description>De Britse premier zegt dat er sprake was van Russische inmenging bij het Brexit-referendum in 2016. ...</description></item>
<item><title>Ander</title><link>http://www.bing.com/news/apiclick.aspx?url=https%3a%2f%2fwww.nu.nl%2fx~babcdef1%2f</link><description>Dit is een andere site en hoort er dus niet bij, hoe lang ook.</description></item>
<item><title>Kort</title><link>https://www.volkskrant.nl/sport/kort~b1111111/</link><description>Te kort.</description></item>
</channel></rss>`

test('artikel-id komt uit de URL', () => {
  assert.equal(articleId('https://www.volkskrant.nl/buitenland/britse-premier~b3767a6a/'), '3767a6a')
  assert.equal(articleId('https://www.volkskrant.nl/voorpagina'), null)
})

test('alleen snippets van het eigen domein, met de echte URL uit de Bing-link', () => {
  const s = parseSnippets(XML)
  assert.equal(s.length, 1)
  assert.equal(s[0].id, '3767a6a')
  assert.match(s[0].text, /^De Britse premier zegt .* 2016\. ?…$/)
})

test('bewaarde snippets blijven, nieuwe komen erbij, oude vervallen', () => {
  const day = 864e5
  const store = { oud: { s: 'x', at: 0 }, vers: { s: 'bewaard', at: 9 * day } }
  const out = mergeSnippets(store, [{ id: 'vers', text: 'nieuw' }, { id: 'n', text: 'erbij' }], 10 * day)
  assert.deepEqual(Object.keys(out).sort(), ['n', 'vers'])
  assert.equal(out.vers.s, 'bewaard') // wat we hadden wordt niet overschreven
})

test('een liveblog krijgt geen inleiding uit de zoekindex (kop en inhoud wisselen)', () => {
  assert.equal(isLiveblog('https://www.volkskrant.nl/buitenland/liveblog-oekraine-zelensky-nieuws~b12345678/'), true)
  assert.equal(isLiveblog('https://www.volkskrant.nl/buitenland/britse-premier~b3767a6a/'), false)
})
