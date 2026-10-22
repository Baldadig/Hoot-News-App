// "De editie in één minuut": een AI-overzicht van de tien verhalen, geschreven uit
// uitsluitend de koppen en samenvattingen die in de editie staan. Drie keer per dag,
// één keer per editie (het resultaat wordt met de editie bewaard).
import { briefInput } from './bubble.mjs'
import { parseBrief } from '../../shared/brief.mjs'

export { parseBrief, briefSections } from '../../shared/brief.mjs'

export const BRIEF_MODEL = 'claude-haiku-5-5'

const SYSTEM = `Je bent de eindredacteur van Hoot, een rustige, persoonlijke nieuwseditie. Je krijgt een genummerde lijst met de verhalen van vandaag: bron, kop en samenvatting.

Schrijf een overzicht van 140 tot 180 woorden in het Nederlands dat in één minuut te lezen is: wat speelt er vandaag en wat is het grootste verhaal.

Vorm: drie of vier korte blokken. Elk blok begint met een eigen regel "## " gevolgd door een korte kop van twee tot vijf woorden (zoals een tussenkop in een krant: zakelijk, geen punt, geen dubbele punt). Daaronder één alinea van twee tot vier zinnen. Het eerste blok gaat over het grootste verhaal. Geen opsommingen, geen aanhef, geen afsluiting.

Regels:
- Elke bewering moet letterlijk terug te vinden zijn in een kop of samenvatting uit de lijst. Voeg geen feiten, cijfers, namen, citaten, oorzaken, gevolgen of duidingen toe, ook niet als ze voor de hand liggen of algemeen bekend zijn.
- Neem precies over wat er staat over: wie iets zegt of beweert (bron en toeschrijving, "volgens"), onzekerheid ("mogelijk", "zou", "verdacht"), eigendom ("eigenaar van" is iets anders dan "neemt over"), wie wat doet met wie (handelende persoon en lijdend voorwerp), bedragen, datums en oorzaak-gevolg. Draai niets om en maak niets steviger dan de bron.
- Regels met "[alleen kop]" hebben geen samenvatting. Leid uit zo'n kop niets af (geen handelende persoon, oorzaak of gevolg). Noem zo'n verhaal hooguit door de kop letterlijk tussen aanhalingstekens te citeren, of sla het over.
- Twijfel je of iets in de lijst staat, laat de zin dan weg. Liever korter dan iets wat er niet staat.
- Leg alleen een verband tussen verhalen als dat verband in de koppen of samenvattingen zelf staat.
- Geen afleidingen: begin geen zin met "Het bedrijf", "Dit betekent", "Daarmee", "Dat wijst erop" of iets vergelijkbaars. Noem het onderwerp bij naam, zoals het in de lijst staat.
- Begin niet met "In deze editie" of "Vandaag". Begin bij het verhaal.
- Noem een bron alleen als dat iets toevoegt (bijvoorbeeld bij een opiniestuk), kort tussen haakjes.
- Neutraal, helder, zonder bijvoeglijke naamwoorden die een oordeel geven.
- Nederlandse spelling; namen en titels van Engelstalige media blijven zoals ze zijn.`

// Tweede, goedkope controle: elke zin moet bij een regel uit de lijst horen. Zinnen waarvoor dat
// niet lukt, schrappen we. (Temperatuur 0 kan niet op Haiku 5.5: afwijkende sampling geeft een 400.)
const CHECK = `Je controleert een nieuwsoverzicht tegen de bronregels waaruit het is geschreven. Je krijgt de genummerde bronregels (bron, kop, samenvatting) en de genummerde zinnen van het overzicht.

Geef per zin de nummers van de bronregels waarin álles staat wat de zin beweert (feiten, namen, cijfers, datums, oorzaken, gevolgen, verbanden). Herformulering mag; iets toevoegen of veranderen niet. Geef een lege lijst als de zin:
- iets beweert dat in geen enkele bronregel staat;
- eigendom, toeschrijving of onzekerheid anders weergeeft (bijvoorbeeld "eigent zich toe" waar de bron "eigenaar van" zegt, of een bewering zonder het "volgens" van de bron);
- de handelende persoon en het lijdend voorwerp anders verdeelt dan de bron;
- iets afleidt uit een regel met "[alleen kop]" in plaats van die kop letterlijk te citeren.`

const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    zinnen: {
      type: 'array',
      items: {
        type: 'object',
        properties: { zin: { type: 'integer' }, bronnen: { type: 'array', items: { type: 'integer' } } },
        required: ['zin', 'bronnen'],
        additionalProperties: false,
      },
    },
  },
  required: ['zinnen'],
  additionalProperties: false,
}

// Zinnen in een blok (punt, vraag- of uitroepteken, gevolgd door een nieuwe zin).
export const sentencesOf = (text) => text.split(/(?<=[.!?])\s+(?=["'‘“(]?[A-ZÀ-Ý0-9])/).map((x) => x.trim()).filter(Boolean)

// Getallen in een zin (bedragen, aantallen, jaartallen) moeten in de bronregels staan waar de
// controle de zin aan koppelde. Vangnet naast de controle door het model: een verzonnen of
// veranderd getal valt er altijd uit.
const numbersIn = (t) => (String(t).match(/\d+(?:[.,]\d+)?/g) || []).map((n) => n.replace(',', '.'))
export function numbersSupported(sentence, sourceText) {
  const have = new Set(numbersIn(sourceText))
  return numbersIn(sentence).every((n) => have.has(n))
}

// Alleen zinnen houden met een bron (en kloppende getallen); een blok zonder zinnen vervalt.
// Elk blok krijgt `refs`: de nummers (vanaf 0) van de editie-onderdelen waar het uit komt.
export function keepSupported(sections, verdicts, rows = []) {
  const byZin = new Map((verdicts || []).filter((v) => Array.isArray(v.bronnen) && v.bronnen.length).map((v) => [v.zin, v.bronnen]))
  const rowText = (n) => (rows[n - 1] ? `${rows[n - 1].title} ${rows[n - 1].summary || ''}` : '')
  let n = 0
  const out = []
  for (const s of sections) {
    const keep = []
    const refs = new Set()
    for (const zin of sentencesOf(s.text)) {
      const bronnen = byZin.get(++n)
      if (!bronnen) continue
      if (rows.length && !numbersSupported(zin, bronnen.map(rowText).join(' '))) continue
      keep.push(zin)
      for (const b of bronnen) if (rows[b - 1]) refs.add(rows[b - 1].entry ?? b - 1)
    }
    if (keep.length) out.push({ ...s, text: keep.join(' '), refs: [...refs].sort((a, b) => a - b) })
  }
  return out
}

async function checkBrief(client, rows, sections) {
  let n = 0
  const list = sections.flatMap((s) => sentencesOf(s.text)).map((z) => `${++n}. ${z}`).join('\n')
  const res = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 1500,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: CHECK_SCHEMA } },
    system: CHECK,
    messages: [{ role: 'user', content: `Bronregels:\n${briefInput(rows)}\n\nZinnen:\n${list}` }],
  })
  if (res.stop_reason !== 'end_turn') return null
  const text = (res.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
  return JSON.parse(text).zinnen
}

// Eén rij per editie-onderdeel, met `entry` (de plek in de editie) zodat elk blok van het
// overzicht naar zijn verhalen kan verwijzen.
export function briefRows(entries, storiesById, itemsById) {
  const rows = []
  entries.forEach((e, entry) => {
    const story = e.kind === 'story' ? storiesById.get(e.id) : null
    const item = story ? itemsById.get(e.leadId) || itemsById.get(story.leadId) || story.itemIds.map((id) => itemsById.get(id)).find(Boolean) : itemsById.get(e.id)
    if (item) rows.push({ entry, sourceName: item.sourceName, title: item.title, summary: item.summary || '' })
  })
  return rows
}

// `client` is de Anthropic-client (of in tests een nep met dezelfde messages.create).
export async function createBrief(client, rows, { now = Date.now() } = {}) {
  if (!rows.length) return null
  const res = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 800,
    output_config: { effort: 'low' },
    system: SYSTEM,
    messages: [{ role: 'user', content: briefInput(rows) }],
  })
  if (res.stop_reason === 'refusal') return null
  const text = (res.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
  let sections = parseBrief(text)
  if (!sections.length) return null
  // Controle: wat niet in de lijst staat gaat eruit. Lukt de controle niet, dan geen overzicht
  // (veilig terugvallen: de editie zelf staat er gewoon; een volgende verversing probeert opnieuw).
  let verdicts = null
  try {
    verdicts = await checkBrief(client, rows, sections)
  } catch (e) {
    console.error('brief-check', String(e?.message || e))
  }
  if (!verdicts) return null
  sections = keepSupported(sections, verdicts, rows)
  if (!sections.length) return null
  return { checked: true, sections, model: res.model || BRIEF_MODEL, at: new Date(now).toISOString(), words: sections.reduce((n, s) => n + s.text.split(/\s+/).length, 0) }
}
