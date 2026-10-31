// P7: het waarom als label in de Editie (Why.js), 'Vergeet dit' (forgetTopic) en de drie lijsten
// van "Wat Hoot van je leerde" (profileSummary). Het label renderen we met react-dom/server:
// dezelfde component als de app, zonder browser.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Why, whyLine, WHY_IN_LABEL } from '../src/components/Why.js'
import { forgetTopic, emptyAffinity, learn, MIN_EVENTS } from '../src/lib/affinity.js'
import { profileOf, profileSummary, whyOf, LEARNED_SHOWN } from '../shared/editor.mjs'
import { composePersonal, withoutDebug } from '../src/lib/personal.js'
import { loadSnapshot, composeFor, setupFor, PERSONAS } from './helpers/snapshot.mjs'

const render = (why) => renderToStaticMarkup(createElement(Why, { why }))

test('why-label: één stille zin, zonder kapitalen-klasse en zonder rood', () => {
  const html = render({ code: 'groot', text: 'Groot nieuws · 12 bronnen' })
  assert.equal(html, '<p class="why">Groot nieuws · 12 bronnen</p>')
  assert.ok(!/label|kicker|accent/.test(html))
  assert.equal(render({ code: 'learned', text: 'Omdat je vaak over AI leest' }), '<p class="why">Omdat je vaak over AI leest</p>')
  assert.equal(render({ code: 'buur', text: 'Naast je bubbel · grenst aan Sport' }), '<p class="why">Naast je bubbel · grenst aan Sport</p>')
})

test('why-label: niets zonder why (algemene of oudere Editie) en niets als het label het al zegt', () => {
  assert.equal(render(null), '')
  assert.equal(render(undefined), '')
  assert.equal(render({}), '')
  assert.equal(render({ code: 'groot', text: '' }), '')
  for (const code of WHY_IN_LABEL) assert.equal(whyLine({ code, text: 'x' }), null, code)
  assert.equal(whyLine(whyOf({ desk: 'extern' })), null)
  assert.equal(whyLine(whyOf({ desk: 'breed' }, { sourceCount: 9 })), null)
  assert.equal(whyLine(whyOf({ desk: 'bubbel' })), null)
  assert.equal(whyLine(whyOf({}, { desk: 'vs', plannedDesk: true })), null)
  // Wat wél iets toevoegt aan het rubrieklabel.
  assert.equal(whyLine(whyOf({ desk: 'bubbel', near: 'sport' })), 'Naast je bubbel · grenst aan Sport')
  assert.equal(whyLine(whyOf({}, { sourceCount: 7, desk: 'binnenland' })), 'Groot nieuws · 7 bronnen')
})

test('why-label: geen getallen behalve de bronnen- of stukkentelling', () => {
  const snap = loadSnapshot()
  for (const p of PERSONAS) {
    const ed = composeFor(snap, setupFor(p, snap.sources, 'echt'))
    for (const e of ed.entries) {
      const line = whyLine(e.why)
      // Een getal mag alleen een telling zijn (of in een onderwerpnaam staan, zoals Formule 1):
      // nooit punten, gewichten of een kloktijd.
      if (line) assert.ok(!/\d+(,\d+)?\s*(punten|pts|%|:\d\d|uur)/.test(line) && (!/^\d|·\s*\d/.test(line) || /\d+ (bronnen|nieuwe stukken|van je bronnen)/.test(line)), `${p.id}: ${line}`)
    }
  }
})

test('vastgelegde Editie: het why gaat mee, en een plek zonder why rendert gewoon', () => {
  const snap = loadSnapshot()
  const p = PERSONAS.find((x) => x.interests.length) || PERSONAS[0]
  const ed = withoutDebug(composeFor(snap, setupFor(p, snap.sources, 'echt'), composePersonal))
  assert.ok(ed.entries.length)
  for (const e of ed.entries) {
    assert.ok(e.why?.code && e.why?.text, e.id)
    assert.ok(!('_parts' in e))
  }
  // Zoals hoot:my-edition en user_state.edition hem bewaren: JSON heen en terug houdt het why.
  const back = JSON.parse(JSON.stringify(ed))
  assert.deepEqual(back.entries.map((e) => e.why), ed.entries.map((e) => e.why))
  // Een Editie van vóór het waarom: geen why, dus geen label — en geen fout.
  const oud = back.entries.map(({ why, ...rest }) => rest)
  for (const e of oud) assert.equal(render(e.why), '')
})

test('forgetTopic: alleen dat onderwerp weg, teller en bronnen blijven', () => {
  let a = emptyAffinity()
  for (let i = 0; i < MIN_EVENTS + 2; i++) a = learn(a, { id: 'x' + i, kind: 'article', source: 'nos', topics: ['ai', 'klimaat'] })
  const n = a.n
  const b = forgetTopic(a, 'ai')
  assert.equal(b.topics.ai, undefined)
  assert.ok(b.topics.klimaat > 0)
  assert.equal(b.n, n)
  assert.deepEqual(b.sources, a.sources)
  assert.ok(a.topics.ai > 0, 'de oude blijft onaangeroerd')
  // Onbekend onderwerp of geen profiel: niets kapot.
  assert.equal(forgetTopic(a, 'voetbal'), a)
  assert.deepEqual(forgetTopic(null, 'ai'), emptyAffinity())
  assert.deepEqual(forgetTopic(a, ''), a)
})

test('forgetTopic: daarna leert het profiel dat onderwerp niet meer', () => {
  const affinity = { n: 30, topics: { klimaat: 10, ai: 10 }, sources: { x: 20 } }
  const supply = { klimaat: 0.05, ai: 0.05 }
  const before = profileOf({ affinity, supply })
  assert.equal(before.origin.klimaat, 'geleerd')
  const after = profileOf({ affinity: forgetTopic(affinity, 'klimaat'), supply })
  assert.equal(after.topicP.klimaat, undefined)
  assert.equal(after.origin.ai, 'geleerd')
})

test('profileSummary: gekozen, geleerd (≥ 0,4) en minder, in vaste volgorde', () => {
  const affinity = { n: 30, topics: { klimaat: 10, ruimte: 2 }, sources: { x: 12 } }
  const prof = profileOf({ interests: ['tech'], topics: ['ai', 'privacy'], affinity, taste: { topics: { voetbal: -12, f1: -4 }, sources: {} }, supply: { klimaat: 0.05, ruimte: 0.05 } })
  const s = profileSummary(prof)
  assert.deepEqual(s.chosen, ['ai', 'privacy']) // catalogusvolgorde bij gelijke sterkte
  assert.ok(s.learned.includes('klimaat'))
  assert.ok(!s.learned.includes('ruimte'), 'te zwak geleerd blijft weg')
  assert.ok(prof.topicP.klimaat >= LEARNED_SHOWN)
  assert.deepEqual(s.less, ['voetbal', 'f1']) // sterkste 'minder' eerst
  // Niets geleerd en niets gekozen: drie lege lijsten.
  assert.deepEqual(profileSummary(profileOf({})), { chosen: [], learned: [], less: [] })
  assert.deepEqual(profileSummary(null), { chosen: [], learned: [], less: [] })
})

test("profileSummary: 'meer hiervan' telt als gekozen, 'minder' op nul valt weg", () => {
  const s = profileSummary(profileOf({ taste: { topics: { muziek: 8, voetbal: 0 }, sources: {} } }))
  assert.deepEqual(s.chosen, ['muziek'])
  assert.deepEqual(s.less, [])
})
