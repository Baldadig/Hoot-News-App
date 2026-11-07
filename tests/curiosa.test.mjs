// Redacteur 3b · 5 (besluit van Alex, keuring 6 november 2026): curiosa nooit in de top 3, liefst plek 6–10.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { curioStory, curiosaDown } from '../netlify/lib/stories.mjs'

const t = '2026-11-06T04:00:00Z'
const it = (id, title, source = 'nos', url = undefined) => ({ id, kind: 'article', source, title, publishedAt: t, ...(url ? { url } : {}) })

test('curiosum: een kuriositeit in een derde van de koppen, of een licht verhaal', () => {
  const oval = [it('o1', 'Goud glimmend Oval Office tot nationaal monument verklaard door Trump'), it('o2', 'Trump declares the gilded Oval Office a national monument', 'nyt'), it('o3', 'Trump en het Witte Huis', 'ad')]
  assert.equal(curioStory({ light: false }, oval), true)
  assert.equal(curioStory({ light: 'cultuur' }, [it('b1', 'Dirigent Herbert Blomstedt (99) overleden')]), true)
  // De goudprijs is economie, geen kuriositeit; gewoon nieuws ook niet.
  assert.equal(curioStory({ light: false }, [it('g1', 'Goudprijs stijgt naar record'), it('g2', 'Gold price hits record high', 'ft')]), false)
  assert.equal(curioStory({ light: false }, [it('k1', 'Kabinet valt over belastingplan'), it('k2', 'Dutch cabinet falls', 'bbc')]), false)
})

// Ronde 2 (keuring 6 november): generiek, zonder woorden die bij één dag horen; ernstig nieuws is nooit een curiosum.
test('curiosum: generiek herkend aan rubriek, vorm en onderwerp; ernstig nieuws nooit (3b · ronde 2)', async () => {
  const src = (await import('node:fs')).readFileSync(new URL('../netlify/lib/stories.mjs', import.meta.url), 'utf8')
  const head = src.match(/const CURIO_HEAD = (.*)/)[1]
  assert.ok(!/oval office|komiek|comedian/i.test(head), 'geen woorden van één dag')
  // Zonder het woord "Oval Office": een gouden werkkamer die monument wordt, blijft een curiosum.
  assert.equal(curioStory({ light: false }, [it('o1', 'Trump verklaart zijn werkkamer tot nationaal monument'), it('o2', 'Trump makes his office a national monument', 'nyt'), it('o3', 'Trump en het Witte Huis', 'ad')]), true)
  // Een bekende luchtige sectie, of de vorm van de kop.
  assert.equal(curioStory({ light: false }, [it('r1', 'Man vindt fiets terug na veertig jaar', 'nu', 'https://www.nu.nl/opmerkelijk/123/man-vindt-fiets.html'), it('r2', 'Fiets na veertig jaar terug', 'ad')]), true)
  assert.equal(curioStory({ light: false }, [it('q1', 'Opmerkelijk: koe loopt mee in optocht'), it('q2', 'Koe in optocht', 'ad'), it('q3', 'Koe loopt mee', 'rtl')]), true)
  // Ernstig nieuws (rechtszaak, geweld, dood) nooit, ook niet bij een beroemdheid of in een cultuurrubriek.
  const brand = [it('b1', 'Britse komiek Russell Brand schuldig aan verkrachting en aanranding', 'nrc'), it('b2', 'Russell Brand Is Found Guilty of Rape and Sexual Assault', 'nyt', 'https://www.nytimes.com/2026/11/05/arts/russell-brand-verdict.html'), it('b3', 'Celebrity Russell Brand faces prison term', 'guardian-culture', 'https://www.theguardian.com/culture/2026/nov/05/russell-brand')]
  assert.equal(curioStory({ light: 'cultuur' }, brand), false)
  assert.equal(curioStory({ light: false }, [it('d1', 'Beroemdheid doodgeschoten bij overval'), it('d2', 'Celebrity killed in robbery', 'bbc')]), false)
  // Een gewone algemene sectie (varia, binnenland) maakt niets luchtig.
  assert.equal(curioStory({ light: false }, [it('z1', 'Zeehondencentrum stelt faillissement uit', 'nd', 'https://www.nd.nl/varia/varia/1337040/zeehondencentrum'), it('z2', 'Zeehondencentrum gered', 'nu', 'https://www.nu.nl/binnenland/1/zeehondencentrum.html')]), false)
})

test('curiosaDown: een curiosum uit de top 3 schuift naar plek 6, de rest houdt zijn volgorde', () => {
  const stories = { c: { light: 'cultuur' }, d: { light: 'games' } }
  const e = (id) => ({ kind: 'story', id })
  const itemsOf = (x) => [it(x.id, x.id === 'c' || x.id === 'd' ? 'Iets lichts' : 'Kabinet neemt besluit')]
  const storyOf = (x) => stories[x.id] || { light: false }
  const ids = (xs) => xs.map((x) => x.id)
  assert.deepEqual(ids(curiosaDown(['c', 'a', 'b', 'x', 'y', 'z', 'w'].map(e), { itemsOf, storyOf })), ['a', 'b', 'x', 'y', 'z', 'c', 'w'])
  // Twee curiosa: allebei omlaag, in hun eigen volgorde, en wat op 4 en verder stond niet.
  assert.deepEqual(ids(curiosaDown(['a', 'c', 'd', 'x', 'y', 'z', 'w'].map(e), { itemsOf, storyOf })), ['a', 'x', 'y', 'z', 'c', 'd', 'w'])
  // Een korte Editie: achteraan. De bubbel doet niet mee.
  assert.deepEqual(ids(curiosaDown(['c', 'a'].map(e), { itemsOf, storyOf })), ['a', 'c'])
  assert.deepEqual(ids(curiosaDown([{ kind: 'item', id: 'c', desk: 'bubbel' }, e('a')], { itemsOf, storyOf })), ['c', 'a'])
})
