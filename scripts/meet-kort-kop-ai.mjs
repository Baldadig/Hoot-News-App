// De kosten van de herschreven korte kop (netlify/lib/kort-kop-ai.mjs), geschat op echte koppen.
// Neemt de live koppen uit ios/HootTests/Fixtures/widget-live-koppen.json, deelt ze in Edities van tien, en rekent per
// Editie één aanroep: de systeemtekst, het schema en de koppen langer dan 45 tekens als invoer, per kop een korte kop
// als uitvoer. Zonder sleutel: geschat op ~3,5 tekens per token (Nederlands en Engels door elkaar). Met --tel en een
// sleutel telt de API de invoer (messages.countTokens, kost niets); de uitvoer blijft een schatting.
//   node scripts/meet-kort-kop-ai.mjs [--tel]
import { readFileSync } from 'node:fs'
import { SYSTEM, SCHEMA, MODEL, promptOf, teVragen, kosten } from '../netlify/lib/kort-kop-ai.mjs'
import { KORT_MAX } from '../shared/kort-kop.mjs'

const live = JSON.parse(readFileSync(new URL('../ios/HootTests/Fixtures/widget-live-koppen.json', import.meta.url), 'utf8')).koppen.map((k) => k.kop)
const edities = []
for (let i = 0; i + 10 <= live.length; i += 10) edities.push(live.slice(i, i + 10))
const tokens = (s) => Math.ceil(s.length / 3.5)
const OVERHEAD = 30 // berichtopbouw
const UIT_PER_KOP = 25 // {"nr":1,"kort":"…"} met hooguit 45 tekens
let client = null
if (process.argv.includes('--tel')) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  client = new Anthropic()
}
let invoer = 0, uitvoer = 0, gevraagd = 0
for (const e of edities) {
  const open = teVragen(e)
  if (!open.length) continue
  gevraagd += open.length
  if (client) {
    const r = await client.messages.countTokens({ model: MODEL, system: SYSTEM, messages: [{ role: 'user', content: promptOf(open) }], output_config: { format: { type: 'json_schema', schema: SCHEMA } } })
    invoer += r.input_tokens
  } else invoer += tokens(SYSTEM) + tokens(JSON.stringify(SCHEMA)) + tokens(promptOf(open)) + OVERHEAD
  uitvoer += 15 + open.length * UIT_PER_KOP
}
const n = edities.length
const perEditie = { invoer: invoer / n, uitvoer: uitvoer / n, koppen: gevraagd / n }
const perMaand = 3 * 30 // drie Edities per dag
const euro = (x) => `$${x.toFixed(4)}`
console.log(`${n} Edities van tien live koppen; gemiddeld ${perEditie.koppen.toFixed(1)} koppen langer dan ${KORT_MAX} tekens per Editie`)
console.log(`per aanroep: ~${Math.round(perEditie.invoer)} invoer- en ~${Math.round(perEditie.uitvoer)} uitvoertokens (${client ? 'invoer geteld' : 'geschat'})`)
console.log(`per Editie ${euro(kosten(perEditie.invoer, perEditie.uitvoer))}, per maand (3 x 30) ${euro(perMaand * kosten(perEditie.invoer, perEditie.uitvoer))}`)
console.log(`ruim gerekend (2 pogingen per Editie, alle tien koppen): per maand ${euro(2 * perMaand * kosten(perEditie.invoer / perEditie.koppen * 10, 15 + 10 * UIT_PER_KOP))}`)
