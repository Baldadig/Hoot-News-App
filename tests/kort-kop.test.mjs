import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { kortKop, metKorteKoppen, KORT_MAX } from '../shared/kort-kop.mjs'

// tests/fixtures/kort-kop.json wordt ook door iOS gelezen (KortKopTests): dezelfde korte kop op beide.
const fx = JSON.parse(readFileSync(new URL('./fixtures/kort-kop.json', import.meta.url), 'utf8'))

test('korte kop: dezelfde uitkomst als de gedeelde gevallen', () => {
  assert.equal(fx.max, KORT_MAX)
  assert.ok(fx.gevallen.length >= 20)
  for (const c of fx.gevallen) assert.equal(kortKop(c.kop), c.verwacht, c.kop)
})

test('korte kop: hooguit 60 tekens, en een kop die past blijft precies zo', () => {
  for (const c of fx.gevallen) assert.ok(kortKop(c.kop).length <= KORT_MAX, c.kop)
  const past = 'Een kop van precies zestig tekens die nog net past, wel fijn'
  assert.equal(past.length, 60)
  assert.equal(kortKop(past), past)
  assert.equal(kortKop(''), '')
  assert.equal(kortKop(null), '')
})

test('korte kop: afkappen op een woordgrens, met een beletselteken en zonder los lidwoord of voorzetsel', () => {
  const k = kortKop('Iraanse dreiging is zó groot dat Amerikaanse minister met gezin moet verhuizen naar zwaar beveiligde legerbasis')
  assert.equal(k, 'Iraanse dreiging is zó groot dat Amerikaanse minister…')
  for (const c of fx.gevallen) {
    const out = kortKop(c.kop)
    if (!out.endsWith('…')) continue
    const laatste = out.slice(0, -1).split(' ').pop()
    // Elk woord voor het beletselteken staat zo in de kop: nooit een half woord (behalve één woord dat alles vult).
    if (out.slice(0, -1).includes(' ')) assert.ok(c.kop.replace(/\s+/g, ' ').includes(`${laatste} `) || c.kop.includes(`${laatste},`), out)
    assert.ok(!['de', 'het', 'een', 'van', 'met', 'in', 'op', 'naar', 'en', 'the', 'of', 'to'].includes(laatste.toLowerCase()), out)
  }
})

test('korte kop: een spreker voor de dubbele punt blijft, een uitwerking erna valt weg', () => {
  assert.match(kortKop('Raad van State: minister van Asiel moet veiligheid Syrië opnieuw beoordelen na nieuwe berichten uit Damascus'), /^Raad van State: /)
  assert.equal(kortKop('Emma Heesters is de nieuwe Bachelorette: ‘Geloof nog steeds in de liefde’ en meer woorden'), 'Emma Heesters is de nieuwe Bachelorette')
  assert.equal(kortKop('Kabinet valt over stikstof – oppositie wil nu snel verkiezingen in het voorjaar van volgend jaar'), 'Kabinet valt over stikstof')
  // Te korte kern voor de streep: dan niet weglaten maar afkappen.
  assert.match(kortKop('Kabinet valt – oppositie wil nu snel verkiezingen in het voorjaar van volgend jaar en daarna'), /^Kabinet valt – .+…$/)
})

test('metKorteKoppen: per plek de kop van het hoofdstuk ingekort, de rest ongemoeid', () => {
  const lang = 'Iraanse dreiging is zó groot dat Amerikaanse minister met gezin moet verhuizen naar zwaar beveiligde legerbasis'
  const ed = {
    id: '2026-11-11-middag',
    entries: [{ kind: 'story', id: 's1', leadId: 'a' }, { kind: 'item', id: 'b' }, { kind: 'item', id: 'zonder' }, { kind: 'story', id: 's2', leadId: 'x', title: 'Getoonde kop van De Redacteur' }],
    items: [{ id: 'a', title: lang }, { id: 'b', title: 'Korte kop' }],
  }
  const uit = metKorteKoppen(ed)
  assert.equal(uit.entries[0].kortKop, 'Iraanse dreiging is zó groot dat Amerikaanse minister…')
  assert.equal(uit.entries[1].kortKop, 'Korte kop')
  assert.equal('kortKop' in uit.entries[2], false)
  assert.equal(uit.entries[3].kortKop, 'Getoonde kop van De Redacteur')
  assert.equal(uit.items, ed.items)
  assert.equal(ed.entries[0].kortKop, undefined) // het origineel blijft zoals het was
  assert.equal(metKorteKoppen(null), null)
})
