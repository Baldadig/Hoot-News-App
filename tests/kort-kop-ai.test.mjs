import { test } from 'node:test'
import assert from 'node:assert/strict'
import { korteKoppen, teVragen, nakijken, zelfdeTaal, aiEnabled, vraag, kosten, SWITCH, MAX_KOPPEN } from '../netlify/lib/kort-kop-ai.mjs'
import { metKorteKoppen, KORT_MAX } from '../shared/kort-kop.mjs'

// Een nepmodel: geeft per kop wat `antwoord` zegt (of gooit), en onthoudt wat het kreeg.
function nep(antwoord, { stop = 'end_turn' } = {}) {
  const gevraagd = []
  return {
    gevraagd,
    messages: {
      async create(body) {
        gevraagd.push(body)
        if (antwoord instanceof Error) throw antwoord
        const koppen = body.messages[0].content.split('\n').map((r) => r.replace(/^\d+\. /, ''))
        const uit = koppen.map((k, i) => ({ nr: i + 1, kort: typeof antwoord === 'function' ? antwoord(k) : antwoord }))
        return { stop_reason: stop, content: [{ type: 'text', text: JSON.stringify({ koppen: uit }) }], usage: { input_tokens: 700, output_tokens: 120 } }
      },
    },
  }
}
const stil = { log() {} }

const LANG_NL = 'Kabinet stelt de verhoging van de AOW-leeftijd naar 68 jaar voor de tweede keer uit'
const LANG_EN = 'Three Iran-backed suspects plotted attacks including RAF Fairford incident, US says'
const KORT = 'Storm raast over het noorden'
const GOED = { [LANG_NL]: 'Kabinet stelt AOW-leeftijd 68 opnieuw uit', [LANG_EN]: 'US: Iran-backed suspects plotted attacks' }

test('kort-kop-ai: standaard uit (HOOT_KORTE_KOP_AI), dan geen enkele vraag', async () => {
  assert.equal(SWITCH, 'HOOT_KORTE_KOP_AI')
  assert.equal(aiEnabled({}), false)
  assert.equal(aiEnabled({ HOOT_KORTE_KOP_AI: 'uit' }), false)
  assert.equal(aiEnabled({ HOOT_KORTE_KOP_AI: ' Aan ' }), true)
  const client = nep((k) => GOED[k])
  const r = await korteKoppen({ koppen: [LANG_NL], client, enabled: false, log: stil })
  assert.equal(client.gevraagd.length, 0)
  assert.equal(r.gevraagd, false)
  assert.deepEqual(r.korteKoppen, {})
  // Zonder client (geen sleutel) ook niet.
  assert.equal((await korteKoppen({ koppen: [LANG_NL], client: null, enabled: true, log: stil })).gevraagd, false)
})

test('kort-kop-ai: alleen koppen langer dan 45, één aanroep, elk resultaat nagekeken', async () => {
  const client = nep((k) => GOED[k] ?? null)
  const r = await korteKoppen({ koppen: [LANG_NL, KORT, LANG_EN, LANG_NL], client, enabled: true, log: stil })
  assert.equal(client.gevraagd.length, 1)
  const body = client.gevraagd[0]
  assert.equal(body.model, 'claude-haiku-5-5')
  assert.equal(body.output_config.format.type, 'json_schema')
  assert.equal(body.messages[0].content, `1. ${LANG_NL}\n2. ${LANG_EN}`, 'een kop die past gaat niet naar het model, en elke kop één keer')
  assert.match(body.system, /hooguit 45 tekens/)
  assert.deepEqual(r.korteKoppen, GOED)
  assert.equal(r.stats.herschreven, 2)
  // Al bekend: niet opnieuw gevraagd (één keer per Editie).
  const nog = await korteKoppen({ koppen: [LANG_NL, LANG_EN], bekend: r.korteKoppen, client, enabled: true, log: stil })
  assert.equal(client.gevraagd.length, 1)
  assert.equal(nog.gevraagd, false)
})

test('kort-kop-ai: een fout resultaat wordt null (geen korte kop), nooit iets ingekort', async () => {
  const slecht = {
    [LANG_NL]: 'Kabinet stelt de verhoging van de AOW-leeftijd', // afgekapt
    [LANG_EN]: 'VS: drie verdachten beraamden aanslagen', // andere taal
  }
  const r = await korteKoppen({ koppen: [LANG_NL, LANG_EN], client: nep((k) => slecht[k]), enabled: true, log: stil })
  assert.deepEqual(r.korteKoppen, { [LANG_NL]: null, [LANG_EN]: null })
  assert.equal(r.stats.afgewezen, 2)
  // En de Editie krijgt dan geen korte kop: de widget toont de hele kop.
  const ed = metKorteKoppen({ entries: [{ kind: 'item', id: 'a' }], items: [{ id: 'a', title: LANG_NL }] }, { herschreven: r.korteKoppen })
  assert.equal('kortKop' in ed.entries[0], false)
})

test('kort-kop-ai: fout, time-out of weigering = niets veranderd', async () => {
  const bekend = { 'Een al bekende lange kop die niet in vijfenveertig tekens past': null }
  const fout = await korteKoppen({ koppen: [LANG_NL], bekend, client: nep(new Error('time-out')), enabled: true, log: stil })
  assert.deepEqual(fout.korteKoppen, bekend)
  assert.equal(fout.stats.fout, 'Error')
  const weigert = await korteKoppen({ koppen: [LANG_NL], bekend, client: nep((k) => GOED[k], { stop: 'refusal' }), enabled: true, log: stil })
  assert.deepEqual(weigert.korteKoppen, bekend, 'geen oordeel: later nog eens')
  const onleesbaar = { messages: { create: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'geen json' }] }) } }
  assert.equal((await vraag(onleesbaar, [LANG_NL])).uit.size, 0)
})

test('kort-kop-ai: nakijken en taaltoets', () => {
  assert.equal(nakijken(LANG_NL, '“Kabinet stelt AOW-leeftijd 68 opnieuw uit.”'), 'Kabinet stelt AOW-leeftijd 68 opnieuw uit')
  assert.equal(nakijken(LANG_NL, 42), null)
  assert.equal(nakijken(LANG_NL, null), null)
  assert.equal(zelfdeTaal(LANG_EN, 'US: Iran-backed suspects plotted attacks'), true)
  assert.equal(zelfdeTaal(LANG_EN, 'VS: drie verdachten beraamden aanslagen op de basis'), false)
  assert.equal(zelfdeTaal(LANG_NL, 'Kabinet stelt de AOW opnieuw uit'), true)
  for (const k of Object.values(GOED)) assert.ok(k.length <= KORT_MAX)
})

test('kort-kop-ai: teVragen en een plafond per aanroep', () => {
  const veel = Array.from({ length: 50 }, (_, i) => `${LANG_NL} ${i}`)
  assert.equal(teVragen(veel).length, MAX_KOPPEN)
  assert.deepEqual(teVragen([KORT, LANG_NL, `  ${LANG_NL} `]), [LANG_NL])
  assert.deepEqual(teVragen([LANG_NL], { [LANG_NL]: null }), [])
})

test('kort-kop-ai: kosten per maand (3 Edities × 10 koppen per dag)', () => {
  // Gemeten bouw van één aanroep: de systeemtekst plus tien koppen, zie scripts/meet-kort-kop-ai.mjs. Hier alleen
  // de rekensom: 90 aanroepen per maand van ~800 invoer- en ~250 uitvoertokens blijft ruim onder een cent.
  const maand = 90 * kosten(800, 250)
  assert.ok(maand < 0.02, `${maand}`)
})
