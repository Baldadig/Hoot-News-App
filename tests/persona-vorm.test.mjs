// Persona's 14 november, punt 4: columns en commentaren, dagoverzichten en koppen zonder informatie krijgen geen plek in
// de Editie (shared/vorm.mjs, via excludedFromEdition), langs geen enkele route. Stroom en Selectie houden ze.
// Generiek: alleen de vorm van de kop; de voorbeelden zijn illustraties.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { vormMark } from '../shared/vorm.mjs'
import { excludedFromEdition } from '../shared/editie-filter.mjs'
import { opinieRubriek } from '../shared/opinie.mjs'
import { composePersonal } from '../src/lib/personal.js'

const it = (title, source = 'nu') => ({ id: title, kind: 'article', source, title })

test('ik-vorm: een column in de eerste persoon, ook achter een rubrieklabel; een citaat is nieuws', () => {
  for (const t of ['Schermtijd / Ik gaf een prentenboek uit, koop het alsjeblieft niet', 'Ik ben mijn eigen onbetaalde mantelzorger geworden', 'Mijn moeder was geen begrotingspost', 'Experience: I live in the house from a horror movie', 'Het gaat nu echt gebeuren: ik verhuis mijn spaargeld'])
    assert.equal(vormMark(it(t)), 'ik-vorm', t)
  for (const t of ['‘Ik voelde er niks bij’', 'Erasmusschutter koos hoger beroep om zijn verhaal te vertellen: ‘Ik voelde er niks bij’', 'My Chemical Romance Land First #1 Album', 'I asked every TV manufacturer 17 questions about how they spy on you', 'Iran sluit Straat van Hormuz', 'Ikea verhoogt prijzen', 'In Gaza is het stil'])
    assert.equal(vormMark(it(t)), null, t)
})

test('dagoverzicht: meerdere onderwerpen met een opsommingsteken, of een label met een datum', () => {
  assert.equal(vormMark(it('Wekdienst 14/11: Crisisgesprekken van kabinet gaan verder • Intocht Sint in Grave', 'nos')), 'dagoverzicht')
  assert.equal(vormMark(it('Ochtendnieuws 3/11: de stembus gaat open')), 'dagoverzicht')
  assert.equal(vormMark(it('Kabinet valt na ruzie over asiel · NOS')), null, 'een middenpunt is geen opsomming')
  assert.equal(vormMark(it('Kabinet valt na ruzie over asiel, 24/7 overleg')), null)
  assert.equal(vormMark(it('Uitslag 2-1: Ajax wint van PSV')), null)
})

test('lege kop: één woord of een dateline in kapitalen; een korte nieuwskop niet', () => {
  for (const t of ['MEXICO CITY', 'Quotezakkenexodus', 'Rugpijn', 'Repudiation', 'NEW YORK']) assert.equal(vormMark(it(t)), 'lege-kop', t)
  for (const t of ['Kabinet gevallen', 'Brand in Stiens', 'NAVO-top begint', 'Trump wint']) assert.equal(vormMark(it(t)), null, t)
})

test('excludedFromEdition weert de vorm, voor elke route; Foreign Policy "Argument" is opinie', () => {
  assert.ok(excludedFromEdition(it('MEXICO CITY', 'nyt')))
  assert.ok(excludedFromEdition(it('Wekdienst 14/11: A • B', 'nos')))
  assert.ok(!excludedFromEdition(it('Kabinet valt na ruzie over asiel', 'nos')))
  assert.ok(opinieRubriek(['Argument'], 'https://foreignpolicy.com/2026/11/13/congress-alliances-defend/'))
  assert.ok(!opinieRubriek(['Argument'], 'https://www.nu.nl/politiek/1/x.html'), 'alleen bij die uitgever')
})

test('in de persoonlijke Editie staat geen dagoverzicht, ik-column of lege kop als kop van een plek', () => {
  const P = JSON.parse(readFileSync(new URL('../../Hoot-design/personas-2026-11-14/personas.json', import.meta.url), 'utf8')).personas
  let checked = 0
  for (const f of ['live-feed-2026-11-11-ochtend', 'live-feed-2026-11-09-middag', 'live-feed-2026-11-07', 'feed-2026-11-05-ochtend']) {
    const feed = JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/${f}.json.gz`, import.meta.url))).toString('utf8'))
    const now = Date.parse(feed.edition.builtAt)
    const byId = new Map([...(feed.related || []), ...feed.items, ...feed.edition.items].map((i) => [i.id, i]))
    for (const p of P) {
      const ed = composePersonal({ global: feed.edition, stories: feed.stories, items: feed.items, sources: feed.sources, followed: new Set(p.followed), interests: p.welkom.interests, topics: p.prefs.topics || [], now, builtAt: feed.edition.builtAt })
      for (const e of ed.entries) {
        const head = byId.get(e.leadId || e.id)
        if (!head) continue
        checked++
        assert.equal(vormMark(head), null, `${f} ${p.id}: ${head.title}`)
      }
    }
  }
  assert.ok(checked > 100)
})
