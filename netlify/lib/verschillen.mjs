// "Waar media verschillen": bij een verhaal in de Editie met drie of meer uitgevers een korte tekst
// (hooguit ± 70 woorden) over wat iedereen zegt, waar de media echt verschillen en wat nog open is.
// Geschreven uit uitsluitend de koppen en intro's die Hoot al toont (nooit uit artikelen zelf).
//
// Drie keuringen, per zin:
//   1. Schrijven (Sonnet 5.5): per zin de bronnen en letterlijke fragmenten (citeerplicht).
//   2. Code (toetsZin): elk fragment, getal, citaat, telwoord en elke bronnaam is letterlijk terug te
//      vinden; "alleen X" en "geen van" worden nageteld in alle stukken van het verhaal.
//   3. Controle (Haiku 5.5): draagt de lijst de zin, en is een verschil echt een verschil (geen vals contrast)?
// Faalt een zin, dan valt hij weg. Blijft er geen verschil over, of minder dan twee zinnen: geen blok.
// Liever niets dan iets vaags.
//
// Achter de vlag HOOT_VERSCHILLEN=aan (standaard uit). Gecachet per verhaal-versie (verhaal-id + de
// gesorteerde bronnen) in KV, zonder persoonsgegevens. Met een tijdsbudget per ronde: de Editie wacht
// nooit en faalt nooit; wat niet af is, komt een volgende ronde.
import { SOURCES } from './sources.mjs'
import { kvGet, kvSet } from './kv.mjs'
import { hash } from '../../shared/util.mjs'
import { coverageOf } from '../../shared/edition-policy.mjs'

export const VERSCHILLEN_SCHRIJVER = 'claude-sonnet-5-5'
export const VERSCHILLEN_CONTROLE = 'claude-haiku-5-5'
// Versie van de regels: hoort bij de cachesleutel, zodat betere regels opnieuw schrijven.
export const VERSCHILLEN_VERSIE = 1
export const MIN_UITGEVERS = 3
export const MAX_WOORDEN = 80 // hard plafond in code; de opdracht vraagt hooguit 70
export const MAX_ZINNEN = { gedeeld: 1, verschil: 2, onbekend: 1 }
const MAX_RIJEN = 20
const OUDER = 48 * 36e5 // een stuk van twee dagen vóór het nieuwste is achtergrond, geen melding
const DAG_PLAFOND = 60 // nieuwe blokken per dag (kosten)
const POGINGEN = 3 // per verhaal-versie per dag

export const verschillenAan = (env = process.env) => env?.HOOT_VERSCHILLEN === 'aan'

const SCHRIJF = `Je vergelijkt hoe verschillende media hetzelfde nieuws brengen, voor het blok "Waar media verschillen" in Hoot, een rustige nieuwsapp. Je krijgt genummerde regels: [n] Bron · datum · kop — intro. Meer weet je niet: je ziet de artikelen zelf niet.

Schrijf hooguit 70 woorden in drie korte delen:
- soort "gedeeld": één zin over wat (bijna) alle bronnen melden.
- soort "verschil": één, hooguit twee zinnen over waar ze echt verschillen. Liever één scherp verschil dan vijf.
- soort "onbekend": hooguit één zin over wat volgens de bronnen nog open is. Mag ontbreken.

Wat telt als verschil:
- Alleen als bronnen echt iets anders zeggen: een ander woord voor hetzelfde, een ander cijfer, een andere nadruk of toon in de kop, iemand anders aan het woord.
- Dat de ene bron iets noemt en de andere er niets over zegt, is géén verschil. Dat mag alleen als "alleen X noemt …", en dat moet dan kloppen voor álle regels.
- Noem je een groep ("NOS en NU.nl melden …"), kijk dan of andere bronnen hetzelfde zeggen. Zo ja: noem ze ook, of laat de tegenstelling weg.
- Twijfel je, of is er geen echt verschil: oordeel "geen" en geef geen zinnen. Liever niets dan iets vaags.

Regels:
- Elke bewering staat letterlijk in een kop of intro. Voeg niets toe, maak niets steviger ("zeker", "ten minste" alleen als de bron dat zegt).
- Telwoorden ("negen bronnen", "zes van hen", "de meeste") alleen als het precies klopt, en hooguit één telwoord per zin. De bronnen bij die zin zijn dan precies de bronnen die je telt.
- Citaten tussen ‘ ’ alleen letterlijk uit een Nederlandstalige kop of intro, hooguit vijf woorden. Engels vertaal je, nooit tussen aanhalingstekens.
- Bronnamen precies zoals in de lijst, zonder bijvoeglijk naamwoord.
- Beschrijf, beoordeel niet: geen oordeel over media (eenzijdig, sensationeel, misleidend, terecht, framing), geen motieven (wil, probeert), geen kloktijden.
- Nederlands, neutraal, kort.

Citeerplicht per zin:
- "bronnen": de nummers van álle regels die de zin draagt of noemt.
- "fragmenten": per bron uit "bronnen" minstens één letterlijk stuk (een paar woorden, exact gekopieerd, zelfde spelling en hoofdletters) uit die kop of intro dat de zin draagt.
- "uniek": bij "alleen …" of "als enige" de woorden die alleen in die regels staan; anders leeg.
- "afwezig": bij "geen van de bronnen …" of "nergens" de woorden die in geen enkele regel staan; anders leeg.`

const CONTROLE = `Je controleert een korte vergelijking van media tegen de bronregels waaruit hij is geschreven. Je krijgt de genummerde bronregels (bron, datum, kop, intro) en de genummerde zinnen, elk met zijn soort en de regels die hij aanhaalt.

Per zin:
- "gedragen": staat álles wat de zin beweert (feiten, cijfers, namen, wie wat zegt, telwoorden zoals "negen bronnen" of "de meeste") in de aangehaalde regels? Herformuleren mag; iets toevoegen, steviger maken ("zeker" waar de bron het niet zegt) of een toeschrijving verschuiven niet. Engels mag vertaald zijn.
- "echt_verschil" (alleen voor soort "verschil"; anders true): zeggen de genoemde bronnen echt iets anders? Onwaar als het alleen gaat om de ene die iets noemt en de andere die zwijgt (tenzij de zin zegt "alleen X" en dat klopt voor alle regels), of als de zin een groep tegenover een andere zet terwijl ook bronnen buiten die groep hetzelfde zeggen.
- "reden": één korte zin.`

const SCHRIJF_SCHEMA = {
  type: 'object',
  properties: {
    oordeel: { type: 'string', enum: ['verschil', 'geen'] },
    zinnen: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          soort: { type: 'string', enum: ['gedeeld', 'verschil', 'onbekend'] },
          tekst: { type: 'string' },
          bronnen: { type: 'array', items: { type: 'integer' } },
          fragmenten: {
            type: 'array',
            items: { type: 'object', properties: { bron: { type: 'integer' }, tekst: { type: 'string' } }, required: ['bron', 'tekst'], additionalProperties: false },
          },
          uniek: { type: 'array', items: { type: 'string' } },
          afwezig: { type: 'array', items: { type: 'string' } },
        },
        required: ['soort', 'tekst', 'bronnen', 'fragmenten', 'uniek', 'afwezig'],
        additionalProperties: false,
      },
    },
  },
  required: ['oordeel', 'zinnen'],
  additionalProperties: false,
}

const CONTROLE_SCHEMA = {
  type: 'object',
  properties: {
    zinnen: {
      type: 'array',
      items: {
        type: 'object',
        properties: { zin: { type: 'integer' }, gedragen: { type: 'boolean' }, echt_verschil: { type: 'boolean' }, reden: { type: 'string' } },
        required: ['zin', 'gedragen', 'echt_verschil', 'reden'],
        additionalProperties: false,
      },
    },
  },
  required: ['zinnen'],
  additionalProperties: false,
}

// ---------- Invoer ----------
const SOURCE = new Map(SOURCES.map((s) => [s.id, s]))
const LANG_BY_NAME = new Map(SOURCES.map((s) => [s.name, s.lang]))
const langOf = (it) => it.lang || SOURCE.get(it.source)?.lang || LANG_BY_NAME.get(it.sourceName) || 'nl'
const dag = (iso) => (iso ? String(iso).slice(0, 10) : '?')

// De regels voor het model: één per stuk, nieuwste eerst, zonder achtergrondstukken van eerder.
// `alle`: elk stuk van het verhaal (ook de oudere), voor het natellen van "alleen" en "geen van".
export function verschillenRows(story, itemsById) {
  const alle = (story?.itemIds || []).map((id) => itemsById.get(id)).filter((i) => i && i.title)
  alle.sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))
  const nieuwste = Date.parse(alle[0]?.publishedAt || '') || 0
  const vers = alle.filter((i) => !nieuwste || !Date.parse(i.publishedAt || '') || nieuwste - Date.parse(i.publishedAt) <= OUDER)
  const rows = vers.slice(0, MAX_RIJEN).map((i, k) => ({ n: k + 1, id: i.id, sourceName: i.sourceName, source: i.source, lang: langOf(i), datum: dag(i.publishedAt), title: i.title, summary: i.summary || '' }))
  return { rows, alle: alle.map((i) => ({ id: i.id, sourceName: i.sourceName, title: i.title, summary: i.summary || '' })) }
}

export const rowsInput = (rows) => rows.map((r) => `[${r.n}] ${r.sourceName} · ${r.datum} · ${r.title}${r.summary ? ` — ${r.summary}` : ''}`).join('\n')

// ---------- Codecontrole ----------
// Vergelijkbaar maken: kleine letters, rechte aanhalingstekens, gewone spaties en streepjes.
export const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[­]/g, '')
    .replace(/[  \s]+/g, ' ')
    .replace(/[‘’‚‛′`]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[–—‒]/g, '-')
    .trim()
const textOf = (r) => norm(`${r.title} ${r.summary || ''}`)

// Getallen: "6.000" en "6000" zijn hetzelfde; 1,5 en 1.5 ook.
const numbersIn = (t) => (String(t).match(/\d+(?:[.,]\d+)*/g) || []).map((n) => (/^\d{1,3}(?:\.\d{3})+$/.test(n) ? n.replace(/\./g, '') : n.replace(',', '.')))

const TELWOORD = { een: 1, één: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9, tien: 10, elf: 11, twaalf: 12, dertien: 13, veertien: 14, vijftien: 15, zestien: 16, zeventien: 17, achttien: 18, negentien: 19, twintig: 20 }
const TELNAAM = `(?:${Object.keys(TELWOORD).join('|')}|\\d+)`
const TEL_RE = new RegExp(`(?<![\\p{L}\\d])(alle\\s+)?(${Object.keys(TELWOORD).join('|')}|\\d+)\\s+(?:van\\s+(?:hen|de\\s+(?:bronnen|media|kranten|uitgevers|${TELNAAM}))|bronnen|media|kranten|uitgevers|omroepen|sites|titels|nieuwsmedia)(?![\\p{L}\\d])`, 'giu')
const MEESTE_RE = /\b(de meeste|meeste bronnen|de meerderheid|bijna alle)\b/i
const ALLE_RE = /\balle\s+(bronnen|media|kranten|uitgevers)\b/i
const ALLEEN_RE = /\b(alleen|als enige|enkel)\b/i
const AFWEZIG_RE = /\b(geen van|nergens|niemand|in geen enkele?)\b/i
// Een citaat staat tussen ‘ ’, “ ” of " " (de rechte apostrof van zo'n en intro's telt niet).
// Noemen tegenover zwijgen is geen verschil ("de andere vijf niet", "de rest zwijgt erover").
const ZWIJG_RE = /\b(de (andere|overige)n?\b[^.;]*\bniet\b|de rest\b[^.;]*\bniet\b|zwijg|zwijgen|zegt (er )?niets|zeggen (er )?niets|noemt (het )?niet|noemen (het )?niet)|[,;]\s[^,;.]{1,40}\sniet\s*([.,;]|$)/i
const QUOTE_RE = /[‘“"]([^‘’“”"]{2,}?)[’”"]/g
// Oordelen over media, motieven, kloktijden en de huisregels.
const VERBODEN = [
  /\beenzijdig/i, /\bsensatio/i, /\bmisleid/i, /\b(on)?terecht(e)?\b/i, /\bframing\b/i, /\bframe[nt]?\b/i, /\btendentieu/i, /\bpropaganda/i,
  /\boverdrijf|\boverdrijv|\boverdreven/i, /\bbevooroordeeld/i, /\bgekleurd/i, /\bclickbait/i, /\bwil(len|t)?\b/i, /\bprobe(er|ert|erde|erden)\b/i,
  /\b\d{1,2}[:.]\d{2}\s*uur\b/i, /\b\d{1,2}\s*uur\b/i, /\bhoudt op\b/i, /\bomdat je\b/i,
]

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Elke bekende bronnaam, ook de korte vorm zonder lidwoord ("Telegraaf") en met een klein lidwoord midden
// in de zin ("de Volkskrant"). Altijd op hoofdletters: "trouw" of "wired" als gewoon woord is geen bron.
// Afkortingen die redacties zelf gebruiken: ook die tellen als het noemen van de bron.
const AFKORTING = { 'Het Financieele Dagblad': ['FD'], 'Nederlands Dagblad': ['ND'], 'Het Laatste Nieuws': ['HLN'], 'Deutsche Welle': ['DW'], 'Le Monde in English': ['Le Monde'], 'The New York Times': ['NYT', 'New York Times'], 'The Guardian': ['Guardian'] }
const vormen = (name) => {
  const kaal = name.replace(/^(De|Het|The|Le|La|Die|Der)\s+/, '')
  return [...new Set([name, kaal, name.replace(/^(De|Het|The)\s/, (m) => m.toLowerCase()), ...(AFKORTING[name] || [])])].filter((f) => f.length >= 2)
}
const naamRe = (f) => new RegExp(`(?<![\\p{L}\\d])${escRe(f)}(?![\\p{L}\\d])`, 'u')
const NAAM_VORMEN = [...new Set(SOURCES.map((s) => s.name).filter(Boolean))].flatMap((name) => vormen(name).map((f) => ({ name, f, re: naamRe(f) })))
export function namenIn(tekst, extra = []) {
  const vorm = new Map() // naam → de vorm die in de tekst staat
  for (const v of [...NAAM_VORMEN, ...extra.flatMap((name) => vormen(name).map((f) => ({ name, f, re: naamRe(f) })))]) if (!vorm.has(v.name) && v.re.test(tekst)) vorm.set(v.name, v.f)
  // "NOS Economie" bevat "NOS": "NOS" telt alleen als het ook buiten "NOS Economie" staat.
  return [...vorm.keys()].filter((n) => {
    let rest = tekst
    for (const [m, f] of vorm) if (m !== n && m.includes(n)) rest = rest.split(f).join(' ')
    return naamRe(vorm.get(n)).test(rest)
  })
}

const woorden = (t) => String(t).trim().split(/\s+/).filter(Boolean).length

// Toetst één zin. Geeft de redenen waarom hij wegvalt (leeg = goed). `ctx`: { rows, alle, storyNames }.
export function toetsZin(zin, { rows, alle, storyNames = [] }) {
  const fouten = []
  const tekst = String(zin?.tekst || '').trim()
  if (!tekst) return ['lege zin']
  const byN = new Map(rows.map((r) => [r.n, r]))
  const bronnen = [...new Set((zin.bronnen || []).filter(Number.isInteger))]
  if (!bronnen.length) fouten.push('geen bronnen')
  const onbekend = bronnen.filter((n) => !byN.has(n))
  if (onbekend.length) fouten.push(`onbekende bron ${onbekend.join(', ')}`)
  const refs = bronnen.map((n) => byN.get(n)).filter(Boolean)
  const refText = refs.map(textOf).join(' \u0001 ')

  // 1. Citeerplicht: per aangehaalde bron minstens één letterlijk fragment, en elk fragment staat er echt.
  const frags = (zin.fragmenten || []).filter((f) => f && String(f.tekst || '').trim())
  for (const f of frags) {
    const r = byN.get(f.bron)
    if (!r) fouten.push(`fragment bij onbekende bron ${f.bron}`)
    else if (!bronnen.includes(f.bron)) fouten.push(`fragment bij bron ${f.bron} die de zin niet aanhaalt`)
    else if (norm(f.tekst).length < 4) fouten.push(`fragment te kort: "${f.tekst}"`)
    else if (!textOf(r).includes(norm(f.tekst))) fouten.push(`fragment niet letterlijk in [${f.bron}] ${r.sourceName}: "${f.tekst}"`)
  }
  for (const r of refs) if (!frags.some((f) => f.bron === r.n)) fouten.push(`geen fragment voor [${r.n}] ${r.sourceName}`)

  // 2. Bronnamen: elke genoemde bron hoort bij de aangehaalde regels.
  const refNames = new Set(refs.map((r) => r.sourceName))
  for (const naam of namenIn(tekst, storyNames)) if (!refNames.has(naam)) fouten.push(`noemt ${naam} zonder bron`)

  // 3. Getallen staan in de aangehaalde regels.
  const have = new Set(numbersIn(refText))
  for (const n of numbersIn(tekst)) if (!have.has(n)) fouten.push(`getal ${n} niet in de bronnen`)

  // 4. Citaten: letterlijk, hooguit vijf woorden, uit een Nederlandstalige bron.
  for (const [, q] of tekst.matchAll(QUOTE_RE)) {
    if (woorden(q) > 5) fouten.push(`citaat te lang: ‘${q}’`)
    const in_ = refs.filter((r) => textOf(r).includes(norm(q)))
    if (!in_.length) fouten.push(`citaat niet letterlijk: ‘${q}’`)
    else if (!in_.some((r) => r.lang === 'nl')) fouten.push(`citaat uit een anderstalige bron: ‘${q}’`)
  }

  // 5. Telwoorden kloppen met het aantal aangehaalde bronnen.
  const telBronnen = refNames.size
  const totaal = new Set([...storyNames, ...rows.map((r) => r.sourceName)]).size
  const tellen = [...tekst.matchAll(TEL_RE)]
  if (tellen.length > 1) fouten.push('meer dan één telwoord in een zin')
  for (const m of tellen) {
    const n = /^\d+$/.test(m[2]) ? Number(m[2]) : TELWOORD[m[2].toLowerCase()]
    if (n !== telBronnen) fouten.push(`telwoord "${m[0]}" maar ${telBronnen} bron(nen) aangehaald`)
    if (m[1] && n !== totaal) fouten.push(`"${m[0]}" maar het verhaal heeft ${totaal} bronnen`)
  }
  if (ALLE_RE.test(tekst) && telBronnen !== totaal) fouten.push(`"alle" maar ${telBronnen} van ${totaal} bronnen aangehaald`)
  if (MEESTE_RE.test(tekst) && telBronnen * 2 <= totaal) fouten.push(`"de meeste" maar ${telBronnen} van ${totaal} bronnen`)

  // 6. "Alleen X": nageteld in alle stukken van het verhaal.
  const uniek = (zin.uniek || []).map(norm).filter(Boolean)
  if (ALLEEN_RE.test(tekst)) {
    if (!uniek.length) fouten.push('"alleen" zonder woorden om na te tellen')
    const refIds = new Set(refs.map((r) => r.id))
    for (const w of uniek) {
      if (!refs.some((r) => textOf(r).includes(w))) fouten.push(`"${w}" staat niet bij de genoemde bron`)
      const ook = alle.filter((i) => !refIds.has(i.id) && textOf(i).includes(w))
      if (ook.length) fouten.push(`"alleen" klopt niet: "${w}" staat ook bij ${[...new Set(ook.map((i) => i.sourceName))].join(', ')}`)
    }
  }
  // 7. "Geen van de bronnen": de woorden staan nergens.
  const afwezig = (zin.afwezig || []).map(norm).filter(Boolean)
  if (AFWEZIG_RE.test(tekst)) {
    if (!afwezig.length) fouten.push('"geen van" zonder woorden om na te tellen')
    for (const w of afwezig) {
      const wel = alle.filter((i) => textOf(i).includes(w))
      if (wel.length) fouten.push(`"${w}" staat wel bij ${[...new Set(wel.map((i) => i.sourceName))].join(', ')}`)
    }
  }

  // 8. Verboden woorden.
  for (const re of VERBODEN) if (re.test(tekst)) fouten.push(`verboden woord: ${tekst.match(re)[0]}`)

  // 9. Per soort: gedeeld door minstens de helft; een verschil heeft twee kanten (of een nagetelde "alleen").
  if (zin.soort === 'gedeeld' && telBronnen * 2 < totaal) fouten.push(`gedeeld maar ${telBronnen} van ${totaal} bronnen`)
  if (zin.soort === 'verschil') {
    const kanten = new Set(frags.filter((f) => byN.has(f.bron)).map((f) => `${byN.get(f.bron).sourceName}|${norm(f.tekst)}`))
    const verschillend = new Set([...kanten].map((k) => k.split('|')[1])).size >= 2 && refNames.size >= 2
    const alleenOk = ALLEEN_RE.test(tekst) && uniek.length > 0
    if (!verschillend && !alleenOk) fouten.push('verschil zonder twee kanten (vals contrast)')
    if (ZWIJG_RE.test(tekst)) fouten.push('noemen tegenover zwijgen is geen verschil (vals contrast)')
  }
  if (!['gedeeld', 'verschil', 'onbekend'].includes(zin.soort)) fouten.push(`onbekende soort ${zin.soort}`)
  return [...new Set(fouten)]
}

// ---------- Samenstellen ----------
// Houdt per soort de eerste zinnen (MAX_ZINNEN) en blijft onder MAX_WOORDEN (laatste verschil eerst eraf).
// Geen verschil over, of alleen een verschil (zonder wat iedereen zegt of wat open is): null.
export function stelSamen(zinnen) {
  const per = { gedeeld: [], verschil: [], onbekend: [] }
  const weg = []
  for (const z of zinnen) {
    if (per[z.soort].length < MAX_ZINNEN[z.soort]) per[z.soort].push(z)
    else weg.push({ ...z, reden: [`meer dan ${MAX_ZINNEN[z.soort]} zin(nen) van soort ${z.soort}`] })
  }
  const telling = () => [...per.gedeeld, ...per.verschil, ...per.onbekend].reduce((n, z) => n + woorden(z.tekst), 0)
  while (telling() > MAX_WOORDEN && (per.verschil.length > 1 || per.onbekend.length)) {
    const z = per.verschil.length > 1 ? per.verschil.pop() : per.onbekend.pop()
    weg.push({ ...z, reden: [`te lang (meer dan ${MAX_WOORDEN} woorden)`] })
  }
  const alles = [...per.gedeeld, ...per.verschil, ...per.onbekend]
  if (!per.verschil.length) return { delen: null, weg, waarom: 'geen verschil over' }
  if (!per.gedeeld.length && !per.onbekend.length) return { delen: null, weg, waarom: 'te weinig over (alleen een verschil, zonder wat iedereen zegt)' }
  if (telling() > MAX_WOORDEN) return { delen: null, weg, waarom: 'te lang' }
  const delen = ['gedeeld', 'verschil', 'onbekend'].filter((s) => per[s].length).map((soort) => ({ soort, tekst: per[soort].map((z) => z.tekst.trim()).join(' ') }))
  return { delen, zinnen: alles, weg, woorden: telling() }
}

const textBlocks = (res) => (res?.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')

// Schrijven, toetsen en controleren voor één verhaal. Geeft { resultaat, verslag }: `resultaat` is het
// blok (of null), `verslag` per zin het bewijs en de weggevallen zinnen met reden (voor de proef).
// `client`: de Anthropic-client (of in tests een nep met dezelfde messages.create). Gooit bij fouten
// van het netwerk of een time-out (de aanroeper telt dat als poging).
export async function maakVerschillen(client, { rows, alle, storyNames = [] }, { signal, now = Date.now(), timeout = 25000 } = {}) {
  const verslag = { rijen: rows.length, oordeel: null, zinnen: [], weg: [], waarom: null }
  const uitgevers = new Set(rows.map((r) => r.sourceName)).size
  if (uitgevers < MIN_UITGEVERS) return { resultaat: null, verslag: { ...verslag, waarom: 'minder dan drie bronnen' } }
  const opts = { signal, timeout }
  const res = await client.messages.create(
    {
      model: VERSCHILLEN_SCHRIJVER,
      max_tokens: 6000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHRIJF_SCHEMA } },
      system: SCHRIJF,
      messages: [{ role: 'user', content: rowsInput(rows) }],
    },
    opts,
  )
  if (res?.stop_reason !== 'end_turn') return { resultaat: null, verslag: { ...verslag, waarom: `schrijver stopte: ${res?.stop_reason}` } }
  const out = JSON.parse(textBlocks(res))
  verslag.oordeel = out.oordeel
  if (out.oordeel !== 'verschil' || !out.zinnen?.length) return { resultaat: null, verslag: { ...verslag, waarom: 'schrijver: geen echt verschil' } }

  // Codecontrole eerst: goedkoop en zeker. Wat faalt, gaat niet naar de tweede controle.
  const ctx = { rows, alle, storyNames }
  const getoetst = out.zinnen.map((z, k) => ({ ...z, nr: k + 1, reden: toetsZin(z, ctx) }))
  for (const z of getoetst) if (z.reden.length) verslag.weg.push({ ...z, stap: 'code' })
  let over = getoetst.filter((z) => !z.reden.length)
  if (!over.some((z) => z.soort === 'verschil') || !over.some((z) => z.soort !== 'verschil')) {
    return { resultaat: null, verslag: { ...verslag, waarom: 'na de codecontrole te weinig over' } }
  }

  // Tweede controle (Haiku 5.5): gedragen, en geen vals contrast.
  const lijst = over.map((z, k) => `${k + 1}. (${z.soort}; regels ${z.bronnen.join(', ')}) ${z.tekst}`).join('\n')
  const check = await client.messages.create(
    {
      model: VERSCHILLEN_CONTROLE,
      max_tokens: 3000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: CONTROLE_SCHEMA } },
      system: CONTROLE,
      messages: [{ role: 'user', content: `Bronregels:\n${rowsInput(rows)}\n\nZinnen:\n${lijst}` }],
    },
    opts,
  )
  if (check?.stop_reason !== 'end_turn') return { resultaat: null, verslag: { ...verslag, waarom: `controle stopte: ${check?.stop_reason}` } }
  const oordelen = new Map((JSON.parse(textBlocks(check)).zinnen || []).map((v) => [v.zin, v]))
  over = over.filter((z, k) => {
    const v = oordelen.get(k + 1)
    const reden = !v ? 'controle gaf geen oordeel' : !v.gedragen ? `niet gedragen: ${v.reden}` : z.soort === 'verschil' && !v.echt_verschil ? `vals contrast: ${v.reden}` : null
    if (reden) verslag.weg.push({ ...z, reden: [reden], stap: 'controle' })
    return !reden
  })

  const s = stelSamen(over)
  for (const z of s.weg) verslag.weg.push({ ...z, stap: 'samenstellen' })
  if (!s.delen) return { resultaat: null, verslag: { ...verslag, waarom: s.waarom } }
  const byN = new Map(rows.map((r) => [r.n, r]))
  verslag.zinnen = s.zinnen.map((z) => ({ soort: z.soort, tekst: z.tekst, bewijs: z.fragmenten.map((f) => ({ bron: byN.get(f.bron)?.sourceName, id: byN.get(f.bron)?.id, fragment: f.tekst })) }))
  const refs = [...new Set(s.zinnen.flatMap((z) => z.bronnen.map((n) => byN.get(n)?.id).filter(Boolean)))]
  return {
    resultaat: { versie: VERSCHILLEN_VERSIE, delen: s.delen, refs, woorden: s.woorden, model: res.model || VERSCHILLEN_SCHRIJVER, at: new Date(now).toISOString() },
    verslag,
  }
}

// ---------- Per Editie: cache, plafond en tijdsbudget ----------
export const verschillenKey = (story, rows) => `verschillen-v${VERSCHILLEN_VERSIE}:${hash(`${story.id}|${[...new Set(rows.map((r) => r.sourceName))].sort().join(',')}`)}`
const laatstKey = (id) => `verschillen-v${VERSCHILLEN_VERSIE}-laatst:${id}`
const dagKey = (now) => `verschillen-v${VERSCHILLEN_VERSIE}-dag:${new Date(now).toISOString().slice(0, 10)}`

// Welke verhalen in de Editie een blok kunnen krijgen: verhalen (geen losse stukken), niet vastgehouden
// (`held`), met drie of meer uitgevers (zusterkranten tellen als één).
export function kandidaten(entries = [], storyById = new Map(), itemsById = new Map()) {
  const out = []
  for (const e of entries) {
    if (e?.kind !== 'story' || e.held) continue
    const st = storyById.get(e.id)
    if (!st || out.some((s) => s.id === st.id)) continue
    const items = st.itemIds.map((id) => itemsById.get(id)).filter(Boolean)
    if (coverageOf(items).publisherCount >= MIN_UITGEVERS) out.push(st)
  }
  return out
}

// Voor de verhalen van de Editie: een Map verhaal-id → blok. Met de vlag uit: meteen een lege Map,
// zonder KV of model aan te raken. Nooit een fout naar buiten; na `budget` ms houdt het op (wat niet af
// is, wordt afgebroken en komt een volgende ronde).
export async function verschillenVoorEditie({ aan = verschillenAan(), client, entries, storyById, itemsById, now = Date.now(), get = kvGet, set = kvSet, budget = 15000, maxNieuw = 6, dagPlafond = DAG_PLAFOND, timeout = 25000 } = {}) {
  const uit = new Map()
  if (!aan) return uit
  try {
    const lijst = kandidaten(entries, storyById, itemsById)
    if (!lijst.length) return uit
    const vandaag = new Date(now).toISOString().slice(0, 10)
    const werk = []
    let dagDoc = null
    for (const st of lijst) {
      const { rows, alle } = verschillenRows(st, itemsById)
      const key = verschillenKey(st, rows)
      const entry = await get(key).catch(() => null)
      if (entry?.status === 'klaar' && entry.resultaat) {
        uit.set(st.id, entry.resultaat)
        continue
      }
      const vorige = await get(laatstKey(st.id)).catch(() => null)
      if (vorige?.delen) uit.set(st.id, vorige) // de oude versie blijft tot er een nieuwe is
      if (entry?.status === 'geen') {
        uit.delete(st.id)
        continue
      }
      const pogingen = entry?.dag === vandaag ? entry.pogingen || 0 : 0
      if (!client || pogingen >= POGINGEN || werk.length >= maxNieuw) continue
      dagDoc ??= (await get(dagKey(now)).catch(() => null)) || { n: 0 }
      if (dagDoc.n >= dagPlafond) continue
      dagDoc.n++
      werk.push({ st, rows, alle, key, pogingen })
    }
    if (!werk.length) return uit
    await set(dagKey(now), dagDoc).catch(() => {})

    const stop = new AbortController()
    const een = async (w) => {
      const storyNames = w.st.sourceNames || []
      try {
        const { resultaat, verslag } = await maakVerschillen(client, { rows: w.rows, alle: w.alle, storyNames }, { signal: stop.signal, now, timeout })
        await set(w.key, { status: resultaat ? 'klaar' : 'geen', dag: vandaag, pogingen: w.pogingen + 1, resultaat, verslag, at: new Date(now).toISOString() })
        if (resultaat) {
          await set(laatstKey(w.st.id), resultaat)
          uit.set(w.st.id, resultaat)
        } else uit.delete(w.st.id)
      } catch (e) {
        // Netwerk, time-out of afgebroken: later nog eens (hooguit POGINGEN per dag); de oude versie blijft.
        console.error('verschillen', w.st.id, String(e?.message || e))
        await set(w.key, { status: 'fout', dag: vandaag, pogingen: w.pogingen + 1, fout: String(e?.message || e).slice(0, 200), at: new Date(now).toISOString() }).catch(() => {})
      }
    }
    let timer
    await Promise.race([Promise.allSettled(werk.map(een)), new Promise((r) => (timer = setTimeout(r, budget)))])
    clearTimeout(timer)
    stop.abort()
    return new Map(uit)
  } catch (e) {
    console.error('verschillen', String(e?.message || e))
    return uit
  }
}

// De verhalen met hun blok erbij (`story.verschillen`); verhalen zonder blok blijven dezelfde objecten.
export function metVerschillen(stories, blokken) {
  if (!blokken?.size) return stories
  return stories.map((st) => (blokken.has(st.id) ? { ...st, verschillen: blokken.get(st.id) } : st))
}
