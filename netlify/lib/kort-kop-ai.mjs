// De korte kop, herschreven (besluit Alex 13 november 2026: "bijschrijven mag", voor de bladerwidget).
// Een kop die niet in KORT_MAX (45) tekens past, mag het taalmodel van de server herschrijven tot hooguit 45 tekens: in
// de taal van de kop, met de volledige betekenis (geen weggelaten voorwaarde, ontkenning, bron of afloop), zonder nieuwe
// feiten. Een kop die al past, gaat niet naar het model: dan is de korte kop de kop zelf (shared/kort-kop.mjs).
//
// Veilig falen, net als editie-ai.mjs: geen sleutel, schakelaar uit, een fout, een time-out, een weigering of een
// onleesbaar antwoord = geen korte kop, en de widget toont de hele kop. Elk resultaat gaat langs `controle`
// (shared/kort-kop.mjs: lengte, geen beletselteken, niet afgekapt, geen nieuwe getallen of namen, ontkenning gelijk) en
// de taaltoets hieronder; bij twijfel of fout geen korte kop.
// Eén keer per Editie: build.mjs bewaart de uitkomst bij de Editie (`korteKoppen`, kop → korte kop of null) en vraagt
// alleen koppen die er nog niet in staan. Een persoonlijke Editie neemt ze over uit de algemene (herschrevenVan); zij
// vraagt het model nooit zelf. Geen persoonsgegevens: alleen koppen. We loggen alleen aantallen.
import { KORT_MAX, schoon, controle } from '../../shared/kort-kop.mjs'
import { MODEL, langOf } from './editie-ai.mjs'

export { MODEL }
export const TIMEOUT_MS = 8000
export const MAX_KOPPEN = 30 // per aanroep; een Editie heeft er tien
export const MAX_TRIES = 2 // per Editie, voor koppen zonder uitkomst (fout, time-out)
// Eigen uitknop: alleen als HOOT_KORTE_KOP_AI=aan. Standaard UIT; Alex beslist over aanzetten.
export const SWITCH = 'HOOT_KORTE_KOP_AI'
export const aiEnabled = (env = process.env) => String(env?.[SWITCH] || '').trim().toLowerCase() === 'aan'

export const SYSTEM = `Je bent eindredacteur van Hoot, een Nederlandse nieuwsapp. Een widget op het beginscherm heeft plek voor een korte kop van hooguit ${KORT_MAX} tekens (spaties meegeteld). Je herschrijft nieuwskoppen tot zo'n korte kop.

Regels:
- Hooguit ${KORT_MAX} tekens. Tel na.
- Dezelfde taal als de oorspronkelijke kop. Een Engelse kop blijft Engels, een Nederlandse Nederlands.
- De volledige betekenis blijft: laat geen voorwaarde, uitzondering, ontkenning, bron of afloop weg. Staat er "niet", "geen", "not" of "no", dan blijft die ontkenning. Zegt de kop wie iets beweert ("volgens de politie", "US says"), dan blijft die bron.
- Geen nieuwe feiten: geen namen, getallen of beweringen die niet in de kop staan. Getallen schrijf je in cijfers zoals in de kop.
- Herschrijf, kap niet af: geen beletselteken (…), geen kop die halverwege stopt.
- Geen kloktijden, geen aanhalingstekens om de hele kop, geen punt aan het eind.
- Lukt het niet zonder betekenis te verliezen, geef dan null. Liever geen korte kop dan een die iets anders zegt.

Antwoord alleen met JSON volgens het schema: per kop het nummer en de korte kop (of null).`

export const SCHEMA = {
  type: 'object',
  properties: {
    koppen: {
      type: 'array',
      items: {
        type: 'object',
        properties: { nr: { type: 'integer' }, kort: { anyOf: [{ type: 'string' }, { type: 'null' }] } },
        required: ['nr', 'kort'],
        additionalProperties: false,
      },
    },
  },
  required: ['koppen'],
  additionalProperties: false,
}

export const promptOf = (koppen) => koppen.map((k, i) => `${i + 1}. ${k}`).join('\n')

// Dezelfde taal: eerst de lidwoorden en voorzetsels, en zonder duidelijke uitslag de klanken van editie-ai (langOf:
// ij, oe, aa, sch tegen th, wh, -ing). Bij twijfel wint de strenge kant: een andere uitslag = geen korte kop.
const NL_W = /(?<![\p{L}])(de|het|een|van|en|op|voor|met|niet|naar|bij|uit|zijn|wordt|over|om|ook|nog|maar|dat|die|deze|dit|wil|gaat|krijgt|na|geen)(?![\p{L}])/giu
const EN_W = /(?<![\p{L}])(the|a|an|of|and|to|for|with|on|are|after|as|at|by|from|its|how|why|what|this|that|will|says|new|your|not|no|over|in)(?![\p{L}])/giu
const duidelijk = (s) => {
  const nl = (s.match(NL_W) || []).length, en = (s.match(EN_W) || []).length
  return nl === en ? null : nl > en ? 'nl' : 'en'
}
export function zelfdeTaal(kop, kort) {
  const taal = (s) => duidelijk(s) ?? langOf({ title: s })
  return taal(kop) === taal(kort)
}

// Een uitkomst van het model nalopen: de korte kop, of null.
export function nakijken(kop, kort) {
  if (typeof kort !== 'string') return null
  const k = schoon(kort).replace(/^["“‘'](.*)["”’']$/u, '$1').replace(/\.$/u, '')
  return controle(kop, k) && zelfdeTaal(kop, k) ? k : null
}

// Eén aanroep voor deze koppen: Map(kop → korte kop of null) en het gebruik. Gooit bij een fout.
export async function vraag(client, koppen, { timeoutMs = TIMEOUT_MS } = {}) {
  const res = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 4000,
      // Een korte herschrijfklus: geen denkstap, lage inspanning (sneller en goedkoper), net als editie-ai.
      thinking: { type: 'disabled' },
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content: promptOf(koppen) }],
    },
    { timeout: timeoutMs, maxRetries: 0, signal: AbortSignal.timeout(timeoutMs + 250) },
  )
  const uit = new Map()
  if (res?.stop_reason !== 'end_turn') return { uit, usage: res?.usage || null }
  const text = (res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
  let data
  try {
    data = JSON.parse(text)
  } catch {
    return { uit, usage: res.usage || null }
  }
  for (const r of Array.isArray(data?.koppen) ? data.koppen : []) {
    const kop = koppen[Number(r?.nr) - 1]
    if (kop === undefined || uit.has(kop)) continue
    uit.set(kop, nakijken(kop, r.kort))
  }
  return { uit, usage: res.usage || null }
}

// De koppen van een Editie die het model nog moet zien: langer dan KORT_MAX en nog zonder uitkomst in `bekend`.
export function teVragen(koppen, bekend = {}) {
  const out = []
  for (const k of koppen.map(schoon)) if (k.length > KORT_MAX && !(k in bekend) && !out.includes(k)) out.push(k)
  return out.slice(0, MAX_KOPPEN)
}

// De stap voor build.mjs. `bekend`: wat de Editie al heeft (kop → korte kop of null). Geeft altijd een object terug:
// `korteKoppen` (bekend plus het nieuwe; een kop zonder geldige korte kop krijgt null, en wordt dus niet opnieuw
// gevraagd) en `gevraagd` (of er een aanroep was). Bij een fout blijft `bekend` zoals het was.
export async function korteKoppen({ koppen = [], bekend = {}, client = null, enabled = aiEnabled(), log = console, timeoutMs = TIMEOUT_MS } = {}) {
  const stats = { gevraagd: 0, herschreven: 0, afgewezen: 0, invoerTokens: 0, uitvoerTokens: 0, fout: null }
  if (!enabled || !client) return { korteKoppen: bekend, gevraagd: false, stats: { ...stats, uit: !enabled } }
  const open = teVragen(koppen, bekend)
  if (!open.length) return { korteKoppen: bekend, gevraagd: false, stats }
  stats.gevraagd = open.length
  try {
    const { uit, usage } = await vraag(client, open, { timeoutMs })
    stats.invoerTokens = usage?.input_tokens || 0
    stats.uitvoerTokens = usage?.output_tokens || 0
    const nieuw = { ...bekend }
    for (const k of open) {
      if (!uit.has(k)) continue // geen oordeel: later nog eens (MAX_TRIES per Editie)
      nieuw[k] = uit.get(k)
      if (uit.get(k)) stats.herschreven++
      else stats.afgewezen++
    }
    log.log?.(`[kort-kop-ai] gevraagd ${stats.gevraagd}, herschreven ${stats.herschreven}, geen ${stats.afgewezen}, tokens ${stats.invoerTokens}/${stats.uitvoerTokens}`)
    return { korteKoppen: nieuw, gevraagd: true, stats }
  } catch (e) {
    stats.fout = String(e?.constructor?.name || 'fout')
    log.log?.(`[kort-kop-ai] gevraagd ${stats.gevraagd}, fout ${stats.fout}`)
    return { korteKoppen: bekend, gevraagd: true, stats }
  }
}

// De geschatte kosten (Claude Haiku 5.5: $0,10 per miljoen invoertokens, $0,50 per miljoen uitvoertokens).
export const PRIJS = { invoer: 0.1 / 1e6, uitvoer: 0.5 / 1e6 }
export const kosten = (invoer, uitvoer) => invoer * PRIJS.invoer + uitvoer * PRIJS.uitvoer
