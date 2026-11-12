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
// Getoond wordt hooguit één verschil (het eerste dat alle keuringen doorstaat).
// Liever niets dan iets vaags.
//
// Achter de vlag HOOT_VERSCHILLEN=aan (standaard uit). Gecachet per verhaal-versie (verhaal-id + de
// gesorteerde bronnen) in KV, zonder persoonsgegevens. Een nieuwe bronnenset toont geen oud blok (de telwoorden
// zouden niet meer kloppen).
//
// Buiten de kritieke route: de feed-build leest alleen wat al gekeurd in KV staat (verschillenUitKV, zonder model,
// met een kort leesbudget). Schrijven en keuren gebeurt los, in een eigen geplande functie
// (functions/verschillen-refresh.mjs → verschillenRonde → schrijfVerschillen), met een dagplafond, hooguit N per
// ronde, hooguit drie pogingen per dag en een tijdsbudget; wat niet af is, komt een volgende ronde (een al
// geschreven antwoord wordt bewaard en alleen nog gecontroleerd).
//
// Taal volgt bronkeuze: het blok wordt alleen uit Nederlandstalige koppen en intro's geschreven en noemt alleen
// Nederlandstalige bronnen. Zo ziet een lezer die geen Engelse bronnen koos er nooit een Engelse bron in, en is
// het blok voor iedereen (web en app) hetzelfde.
import { SOURCES } from './sources.mjs'
import { kvGet, kvSet } from './kv.mjs'
import { hash } from '../../shared/util.mjs'
import { coverageOf } from '../../shared/edition-policy.mjs'

export const VERSCHILLEN_SCHRIJVER = 'claude-sonnet-5-5'
export const VERSCHILLEN_CONTROLE = 'claude-haiku-5-5'
// Versie van de regels: hoort bij de cachesleutel, zodat betere regels opnieuw schrijven.
export const VERSCHILLEN_VERSIE = 4
export const MIN_UITGEVERS = 3
export const MAX_WOORDEN = 75 // hard plafond in code; de schrijver krijgt hooguit 70 mee
export const MAX_ZINNEN = { gedeeld: 1, verschil: 1, onbekend: 1 } // één scherp verschil
const MAX_RIJEN = 20
const OUDER = 48 * 36e5 // een stuk van twee dagen vóór het nieuwste is achtergrond, geen melding
const DAG_PLAFOND = 60 // nieuwe blokken per dag (kosten)
const POGINGEN = 3 // per verhaal-versie per dag
export const BLOK_TAAL = 'nl' // taal volgt bronkeuze: alleen Nederlandstalige bronnen in het blok

export const verschillenAan = (env = process.env) => env?.HOOT_VERSCHILLEN === 'aan'

const SCHRIJF = `Je vergelijkt hoe verschillende media hetzelfde nieuws brengen, voor het blok "Waar media verschillen" in Hoot, een rustige nieuwsapp. Je krijgt genummerde regels: [n] Bron · datum · kop — intro. Meer weet je niet: je ziet de artikelen zelf niet.

Schrijf hooguit 70 woorden in drie korte delen:
- soort "gedeeld": één zin over wat (bijna) alle bronnen melden.
- soort "verschil": één zin over het scherpste echte verschil. Je mag er één reservezin achter zetten (een ander verschil); getoond wordt er hooguit één.
- soort "onbekend": hooguit één zin over wat volgens de bronnen nog open is. Mag ontbreken.

Wat telt als verschil:
- Alleen als bronnen echt iets anders zeggen: een ander woord voor hetzelfde, een ander cijfer, een andere nadruk of toon in de kop, iemand anders aan het woord.
- Dat de ene bron iets noemt en de andere er niets over zegt, is géén verschil. Dat mag alleen als "alleen X noemt …", en dat moet dan kloppen voor álle regels.
- Noem je een groep ("NOS en NU.nl melden …"), kijk dan of andere bronnen hetzelfde zeggen. Zo ja: noem ze ook, of laat de tegenstelling weg. Een bron staat nooit aan beide kanten: zegt hij ook wat de andere kant zegt, dan hoort hij niet in de tegenstelling.
- Twee dingen die allebei waar kunnen zijn ("Democraten afwezig" en "Republikeinen blokkeerden") zijn geen tegenstelling. Hooguit een andere nadruk, en schrijf het dan ook zo.
- Een verschil noemt beide kanten eerlijk. Zeggen meer bronnen hetzelfde als één kant, noem ze dan ook; anders vertekent het beeld. Drie koppen die allemaal hetzelfde zeggen ("spanning", "crisis") zijn één kant, geen verschil.
- Twijfel je, of is er geen echt verschil: oordeel "geen" en geef geen zinnen. Liever niets dan iets vaags.

Regels:
- Elke bewering staat letterlijk in een kop of intro. Voeg niets toe, maak niets steviger ("zeker", "ten minste" alleen als de bron dat zegt).
- Telwoorden ("negen bronnen", "zes van hen", "de meeste") alleen als het precies klopt, en hooguit één telwoord per zin. De bronnen bij die zin zijn dan precies de bronnen die je telt.
- Elk getal (ook in woorden: "driehonderd", "elf", "anderhalf", "een derde", "de tweede keer", "verdubbelt") en elke weekdag staat bij de bron die je ervoor noemt.
- Citaten tussen ‘ ’ alleen letterlijk uit een Nederlandstalige kop of intro van de bron die je ervoor noemt, hooguit vijf woorden. Engels vertaal je, nooit tussen aanhalingstekens.
- Bronnamen precies zoals in de lijst, zonder bijvoeglijk naamwoord. Noem geen andere media of persbureaus (ANP, Reuters) dan die in de lijst, en geen groep ("Amerikaanse media", "Engelstalige kranten").
- Beschrijf, beoordeel niet: zeg wat de bronnen schrijven, niet wat je ervan vindt. Geen oordeel over media of hun toon (eenzijdig, sensationeel, alarmistisch, overtrokken, dramatisch, kiest voor drama, genuanceerd, misleidend, terecht, framing), geen motieven (wil, probeert, bewust), geen kloktijden.
- Elke zin staat los: hij moet kloppen als de andere zinnen wegvallen. Dus geen "ook", "eveneens", "daarnaast", "bovendien", "net als", en geen zin die begint met "die", "dat", "deze", "ze", "maar", "hetzelfde", "opnieuw" of "weer" en zo naar een andere zin verwijst.
- Nederlands, neutraal, kort.

Citeerplicht per zin:
- "bronnen": de nummers van álle regels die de zin draagt of noemt.
- "fragmenten": per bron uit "bronnen" minstens één letterlijk stuk (een paar woorden, exact gekopieerd, zelfde spelling en hoofdletters) uit die kop of intro dat de zin draagt.
- "uniek": bij "alleen …" of "als enige" de woorden die alleen in die regels staan; anders leeg.
- "afwezig": bij "geen van de bronnen …" of "nergens" de woorden die in geen enkele regel staan; anders leeg.
- "kanten": alleen bij soort "verschil" (anders leeg). Precies twee kanten; alleen bij "alleen X …" mag het er één zijn. Per kant: "bronnen", de nummers van álle regels die zeggen wat die kant zegt (ook die je liever niet noemt: dan noem je ze toch, of je kiest een ander verschil), en "kenmerk", een paar woorden die letterlijk bij elke bron van die kant staan en bij geen enkele andere bron. Een bron staat nooit aan beide kanten.`

const CONTROLE = `Je controleert een korte vergelijking van media tegen de bronregels waaruit hij is geschreven. Je krijgt de genummerde bronregels (bron, datum, kop, intro) en de genummerde zinnen, elk met zijn soort en de regels die hij aanhaalt.

Per zin:
- "gedragen": staat álles wat de zin beweert (feiten, cijfers, namen, wie wat zegt, telwoorden zoals "negen bronnen" of "de meeste") in de aangehaalde regels? Herformuleren mag; iets toevoegen, steviger maken ("zeker" waar de bron het niet zegt) of een toeschrijving verschuiven niet. Engels mag vertaald zijn.
- "echt_verschil" (alleen voor soort "verschil"; anders true): zeggen de genoemde bronnen echt iets anders? Lees daarvoor álle bronregels, niet alleen de aangehaalde. Onwaar als:
  - het alleen gaat om de ene die iets noemt en de andere die zwijgt (tenzij de zin zegt "alleen X" en dat klopt voor alle regels);
  - een bron aan de ene kant staat, terwijl zijn kop of intro ook zegt wat de andere kant zegt;
  - bronnen buiten de genoemde groep hetzelfde zeggen als die groep, maar niet genoemd worden;
  - de twee kanten elkaar niet uitsluiten (allebei waar kunnen zijn) en de zin ze toch als tegenstelling brengt;
  - de zin maar één kant noemt (een opsomming van bronnen die hetzelfde zeggen is geen verschil), of een kant eenzijdig neerzet doordat bronnen die hetzelfde zeggen ontbreken.
- "beschrijft": zegt de zin alleen wat de bronnen schrijven? Onwaar bij elk oordeel over media of hun toon, ook in andere woorden dan deze: alarmistisch, overtrokken, sensationeel, dramatisch, "kiest voor drama", genuanceerd, eenzijdig, misleidend, terecht; en bij motieven (wil, probeert, bewust).
- "los": klopt de zin als enige zin, zonder de andere? Onwaar bij "ook", "eveneens", "daarnaast", of een verwijzing ("die", "dat", "deze", "ze") naar een andere zin.
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
          kanten: {
            type: 'array',
            items: { type: 'object', properties: { bronnen: { type: 'array', items: { type: 'integer' } }, kenmerk: { type: 'string' } }, required: ['bronnen', 'kenmerk'], additionalProperties: false },
          },
        },
        required: ['soort', 'tekst', 'bronnen', 'fragmenten', 'uniek', 'afwezig', 'kanten'],
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
        properties: { zin: { type: 'integer' }, gedragen: { type: 'boolean' }, echt_verschil: { type: 'boolean' }, beschrijft: { type: 'boolean' }, los: { type: 'boolean' }, reden: { type: 'string' } },
        required: ['zin', 'gedragen', 'echt_verschil', 'beschrijft', 'los', 'reden'],
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

// De regels voor het model: één per stuk, nieuwste eerst, zonder achtergrondstukken van eerder, en alleen in de
// taal van het blok (Nederlands: taal volgt bronkeuze). `alle`: elk stuk van het verhaal (ook de oudere en de
// anderstalige), voor het natellen van "alleen", "geen van" en wie aan welke kant staat.
export function verschillenRows(story, itemsById, { taal = BLOK_TAAL } = {}) {
  const alle = (story?.itemIds || []).map((id) => itemsById.get(id)).filter((i) => i && i.title)
  alle.sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))
  const nieuwste = Date.parse(alle[0]?.publishedAt || '') || 0
  const vers = alle.filter((i) => !nieuwste || !Date.parse(i.publishedAt || '') || nieuwste - Date.parse(i.publishedAt) <= OUDER)
  const rows = vers.filter((i) => !taal || langOf(i) === taal).slice(0, MAX_RIJEN).map((i, k) => ({ n: k + 1, id: i.id, sourceName: i.sourceName, source: i.source, lang: langOf(i), datum: dag(i.publishedAt), title: i.title, summary: i.summary || '' }))
  return { rows, alle: alle.map((i) => ({ id: i.id, sourceName: i.sourceName, lang: langOf(i), title: i.title, summary: i.summary || '' })) }
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
// Elke soort aanhalingstekens telt als citaat: ‘ ’, “ ”, „ ”, « », ‹ ›, ‚ ‘, " " en ' ' (een apostrof
// tussen letters, zoals in zo'n of intro's, opent geen citaat).
const QUOTE_RES = [
  /‘([^‘’]{2,}?)’/g, /“([^“”]{2,}?)”/g, /„([^„“”]{2,}?)[”“]/g, /«\s*([^«»]{2,}?)\s*»/g, /‹([^‹›]{2,}?)›/g, /‚([^‚‘’]{2,}?)[‘’]/g,
  /"([^"]{2,}?)"/g, /(?<![\p{L}\d])'([^']{2,}?)'(?![\p{L}\d])/gu,
]
export const citatenIn = (t) => {
  const uit = []
  for (const re of QUOTE_RES) for (const m of String(t).matchAll(re)) if (!uit.some((u) => u.start <= m.index && m.index < u.end)) uit.push({ q: m[1].trim(), start: m.index, end: m.index + m[0].length })
  return uit.sort((a, b) => a.start - b.start)
}
// Persbureaus en media die nooit een bron in Hoot zijn: genoemd mag alleen als het in de aangehaalde regels staat.
const BUITEN = ['ANP', 'Reuters', 'AP', 'AFP', 'Belga', 'DPA', 'dpa', 'Associated Press', 'Bloomberg', 'CNN', 'Fox News', 'Politico', 'Axios', 'Le Monde']
// Oordelen over media, motieven, kloktijden en de huisregels.
const VERBODEN = [
  /\beenzijdig/i, /\bsensatio/i, /\bmisleid/i, /\b(on)?terecht(e)?\b/i, /\bframing\b/i, /\bframe[nt]?\b/i, /\btendentieu/i, /\bpropaganda/i,
  /\boverdrijf|\boverdrijv|\boverdreven/i, /\bbevooroordeeld/i, /\bgekleurd/i, /\bclickbait/i, /\bwil(len|t)?\b/i, /\bprobe(er|ert|erde|erden)\b/i,
  /\b\d{1,2}[:.]\d{2}\s*uur\b/i, /\b\d{1,2}\s*uur\b/i, /\bhoudt op\b/i, /\bomdat je\b/i,
  // Oordelen over toon, ook in andere woorden (keuring 2): "alarmistisch", "overtrokken", "kiest voor drama".
  /\balarm(is|erend)/i, /\bovertrokken/i, /\bopgeklopt/i, /\bopgeblazen/i, /\bhysteri/i, /\bpaniekzaai/i, /\bbangmakerij/i,
  /\bstemmingmak/i, /\bdrama/i, /\bsensatie/i, /\bspektakel/i, /\bschreeuwerig/i, /\bsmeuïg/i, /\bhype/i, /\bonheilspellend/i,
  /\bkie(st|zen)\s+voor\s+(drama|sensatie|spektakel|het\s+drama)/i, /\bkoos\s+voor\s+(drama|sensatie)/i, /\bspeelt?\s+in\s+op\b/i,
  /\bpopulistisch/i, /\bpartijdig/i, /\bsuggestief/i, /\b(on)?genuanceerd/i, /\bnuance/i, /\bnuchter/i, /\bobjectie[fv]/i, /\bneutra(al|le)\b/i,
  /\beerlijk(er|e)?\b/i, /\bkritiekloos/i, /\bbagatellis/i, /\b(doel)?bewust\b/i,
  // Engels (alleen ter verdediging: het blok is Nederlands en citeert geen Engelse bron).
  /\balarmist/i, /\bsensationalis/i, /\boverblown/i, /\boverhyped/i, /\bhyperbol/i, /\bexaggerat/i, /\bbiased\b/i, /\bone-sided/i,
  /\bmisleading/i, /\bfearmonger/i, /\bspin\b/i, /\bslant(ed)?\b/i, /\bpartisan/i, /\bdownplay/i, /\bplay(s|ed)?\s+up\b/i,
  // Oordelen in gewone woorden (keuring 3 en 4): uitpakken, aanzetten, aandikken, sussen, meegaan in een lezing.
  /(?<![\p{L}])(pak|pakt|pakken|pakte|pakten)\s+(?:\p{L}+\s+){0,2}(groot|flink|stevig|zwaar|dik|breed)\s+uit(?![\p{L}])/iu,
  /(?<![\p{L}])(zet|zetten|zette|zetten)\s+(?:het|dat|dit|de\s+toon|het\s+verhaal)\s+(?:\p{L}+\s+)?aan(?![\p{L}])/iu,
  /(?<![\p{L}])(dik|dikt|dikken|dikte)\s+(?:\p{L}+\s+){0,2}aan(?![\p{L}])|\baangedikt|\baandik/iu,
  /\bsussen\b|\bsust\b|\bsuste\b|\bgesust\b/i, /\bkritische?\s+(noot|vragen\s+ontbreken)/i, /\bga(at|an)\s+mee\s+in\b|\bmeegaand/i,
  /\bingetogen/i, /\bbreed\s+uit(gemeten|meten|meet)?\b|\buitgemeten\b/i,
]
// Woorden die een oordeel zijn, tenzij de aangehaalde regels ze zelf gebruiken ("Artsen slaan alarm",
// "sombere vooruitzichten", "akkoord met afgezwakt voorstel"): dan beschrijft de zin wat de bron schrijft.
// `stam` wordt gezocht in de kop en intro van de aangehaalde bronnen.
const OORDEEL_TENZIJ_BRON = [
  { re: /\balarm/i, stam: /alarm/i },
  { re: /\bopvallend/i, stam: /opvallend/i },
  { re: /\bopmerkelijk/i, stam: /opmerkelijk/i },
  { re: /\bspecul/i, stam: /specul/i },
  { re: /\bsomber/i, stam: /somber/i },
  { re: /\bzakelijk/i, stam: /zakelijk/i },
  { re: /\bstevig/i, stam: /stevig/i },
  { re: /\bverontrust|\bzorgwekkend|\bschokkend|\bonthutsend/i, stam: /verontrust|zorgwekkend|schokkend|onthutsend/i },
  { re: /\bsuggere/i, stam: /suggere/i },
  { re: /\bthriller/i, stam: /thriller/i },
  { re: /(?<![\p{L}])(zwak|zwakt|zwakken|zwakte|zwakten)\s+(?:\p{L}+\s+){0,2}af(?![\p{L}])|\bafgezwakt|\bafzwak/iu, stam: /zwak/i },
]
// Elke zin staat los (keuring 2): geen verwijzing naar een zin die kan wegvallen.
// Keuring 3 en 4: ook "hierboven", "het tweede verschil", "hetzelfde patroon" en "het verschil zit weer in".
const VERWIJST = /(?<![\p{L}])(ook|eveneens|daarnaast|bovendien|tevens|evenzo|evenmin|evenals|net als|nog een|een ander(e)? verschil|hetzelfde geldt|zelfde geldt|hierboven|hieronder|hiertegenover|eerder genoemd\p{L}*|zelfde patroon|(?:het|een) (?:eerste|tweede|derde|vorige|volgende|laatste|andere) verschil|(?:weer|opnieuw|wederom) (?:een )?verschil|verschil\p{L}* (?:\p{L}+ ){0,2}(?:weer|opnieuw|wederom))(?![\p{L}])/iu
const VERWIJST_BEGIN = /^(die|dat|dit|deze|ze|zij|hij|daar\p{L}*|wel|toch|maar|en|dus|daarentegen|anderzijds|hetzelfde|dezelfde|zelfde|weer|opnieuw|wederom|hiertegenover|hierbij|anders dan (?:hierboven|eerder|daar|zij|die))(?![\p{L}])/iu
// Taal volgt bronkeuze (keuring 3 en 4): ook geen algemene groep anderstalige of buitenlandse media
// ("Engelstalige kranten", "Amerikaanse media", "de Britse pers", "volgens buitenlandse media"), tenzij een
// aangehaalde regel die groep zelf zo noemt.
const MEDIAGROEP = '(?:media|pers|kranten|dagbladen|bladen|omroepen|zenders|nieuwssites|nieuwsmedia|persbureaus|journalisten|commentatoren|correspondenten)'
const ALGEMENE_GROEP = new RegExp(`(?<![\\p{L}])(?:(?:engels|ander|frans|duits)talig\\p{L}*|angelsaksisch\\p{L}*|(?:amerikaanse?|britse?|engelse?|internationale?|buitenlandse?|duitse?|franse?|westerse?|europese?)\\s+${MEDIAGROEP}|volgens\\s+(?:de\\s+)?(?:\\p{L}+\\s+)?${MEDIAGROEP})(?![\\p{L}])`, 'giu')
// Weekdagen: alleen als ze in een aangehaalde regel staan (een verzonnen "dinsdag" is een verzonnen feit).
const WEEKDAG = /(?<![\p{L}])(maan|dins|woens|donder|vrij|zater|zon)dag(?:\p{L}*)/giu
// De tekst zonder citaten: wat tussen aanhalingstekens staat, is (nagezocht) de bron, niet ons oordeel.
const zonderCitaten = (t) => {
  let uit = String(t)
  for (const c of citatenIn(t).reverse()) uit = uit.slice(0, c.start) + ' … ' + uit.slice(c.end)
  return uit
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Elke bekende bronnaam, ook de korte vorm zonder lidwoord ("Telegraaf") en met een klein lidwoord midden
// in de zin ("de Volkskrant"). Altijd op hoofdletters: "trouw" of "wired" als gewoon woord is geen bron.
// Afkortingen die redacties zelf gebruiken: ook die tellen als het noemen van de bron.
const AFKORTING = { 'Het Financieele Dagblad': ['FD'], 'Nederlands Dagblad': ['ND'], 'Het Laatste Nieuws': ['HLN'], 'Deutsche Welle': ['DW'], 'Le Monde in English': ['Le Monde'], 'The New York Times': ['NYT', 'New York Times'], 'The Guardian': ['Guardian'] }
const vormen = (name) => {
  const kaal = name.replace(/^(De|Het|The|Le|La|Die|Der)\s+/i, '')
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

// Alle plekken waar een bron genoemd wordt (langste vorm wint: "NOS Economie" is niet ook "NOS").
export function naamTreffers(tekst, extra = []) {
  const alle = []
  for (const v of [...NAAM_VORMEN, ...extra.flatMap((name) => vormen(name).map((f) => ({ name, f, re: naamRe(f) })))]) {
    const re = new RegExp(v.re.source, 'gu')
    for (const m of tekst.matchAll(re)) alle.push({ name: v.name, start: m.index, end: m.index + m[0].length })
  }
  alle.sort((a, b) => a.start - b.start || b.end - a.end)
  const uit = []
  for (const t of alle) if (!uit.some((u) => t.start < u.end && u.start < t.end)) uit.push(t)
  return uit
}
// Groepen: namen die alleen door komma's, "en"/"and"/"of" en een lidwoord gescheiden zijn ("NRC, RTL Nieuws,
// het AD en ND") horen bij elkaar; wat daarna gezegd wordt, geldt voor elk van hen.
const VOEG = /^[\s,]*(?:(?:en|and|of|or|&)\s+)?(?:(?:het|de|the)\s+)?$/i
export function groepenIn(tekst, extra = []) {
  const groepen = []
  for (const t of naamTreffers(tekst, extra)) {
    const g = groepen.at(-1)
    if (g && VOEG.test(tekst.slice(g.end, t.start))) (g.namen.includes(t.name) || g.namen.push(t.name), (g.end = t.end))
    else groepen.push({ namen: [t.name], start: t.start, end: t.end })
  }
  return groepen
}
// Bij welke groep hoort een bewering op plek `pos`: de laatste groep ervóór, anders de eerste erna.
const groepBij = (groepen, pos) => [...groepen].reverse().find((g) => g.end <= pos) || groepen.find((g) => g.start >= pos) || null

// Getallen in woorden (Nederlands en Engels): "driehonderd", "eenentwintig", "elf", "eleven", "three hundred".
// "een"/"one" alleen vóór honderd/duizend (anders is het een lidwoord).
const NL_GETAL = { twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9, tien: 10, elf: 11, twaalf: 12, dertien: 13, veertien: 14, vijftien: 15, zestien: 16, zeventien: 17, achttien: 18, negentien: 19, twintig: 20, dertig: 30, veertig: 40, vijftig: 50, zestig: 60, zeventig: 70, tachtig: 80, negentig: 90 }
const NL_EEN = { een: 1, één: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9 }
const EN_GETAL = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 }
const MAAL = { honderd: 100, duizend: 1000, hundred: 100, thousand: 1000 }
function nlWoord(w) {
  if (w in NL_GETAL) return NL_GETAL[w]
  const m = w.match(/^(een|één|twee|drie|vier|vijf|zes|zeven|acht|negen)(?:en|ën)(twintig|dertig|veertig|vijftig|zestig|zeventig|tachtig|negentig)$/)
  if (m) return NL_EEN[m[1]] + NL_GETAL[m[2]]
  for (const [deel, maal] of [['duizend', 1000], ['honderd', 100]]) {
    const i = w.lastIndexOf(deel)
    if (i < 0 || w === deel) continue
    const links = w.slice(0, i), rechts = w.slice(i + deel.length)
    const l = links ? NL_EEN[links] ?? nlWoord(links) : 1
    const r = rechts ? nlWoord(rechts) : 0
    if (l == null || r == null || (maal === 100 && l > 9)) return null
    return l * maal + r
  }
  return null
}
// Telwoord-vage woorden: moeten in dezelfde orde bij de bron staan ("honderden" is geen "duizenden").
const VAAG = { tientallen: 'tientallen', dozens: 'tientallen', honderden: 'honderden', hundreds: 'honderden', duizenden: 'duizenden', thousands: 'duizenden', tienduizenden: 'tienduizenden', honderdduizenden: 'honderdduizenden', miljoenen: 'miljoenen', millions: 'miljoenen' }
// Rangtelwoorden, noemers van breuken, breuken in één woord en vermenigvuldigingen (Nederlands).
const RANG = { tweede: 2, derde: 3, vierde: 4, vijfde: 5, zesde: 6, zevende: 7, achtste: 8, negende: 9, tiende: 10, elfde: 11, twaalfde: 12, twintigste: 20, honderdste: 100, duizendste: 1000 }
const BREUK_NOEMER = { derde: 3, kwart: 4, vierde: 4, vijfde: 5, zesde: 6, zevende: 7, achtste: 8, negende: 9, tiende: 10 }
const BREUK_WOORD = { anderhalf: '3/2', anderhalve: '3/2', half: '1/2', halve: '1/2', kwart: '1/4' }
const MAAL_WOORD = [
  [/^(ge)?verdubbel/, 2], [/^(ge)?verdrievoudig/, 3], [/^(ge)?verviervoudig/, 4], [/^(ge)?vertienvoudig/, 10],
  [/^(ge)?halve(er|r)|^halvering/, '1/2'], [/^(twee|drie|vier|vijf|tien)maal$/, (w) => NL_GETAL[w.slice(0, -4)]],
]
// "Tweede Kamer", "Tweede Wereldoorlog": een naam, geen rangtelwoord.
const eigenNaam = (tekst, ws, i) => {
  const nxt = ws[i + 1]
  return !!nxt && (/^\p{Lu}/u.test(tekst.slice(nxt.start, nxt.end)) || /^(kamer|wereldoorlog)/.test(nxt.w))
}
// Alle getallen in een tekst, met hun plek: cijfers ("6.000" = "6000"), woorden en vage aantallen.
export function getallenIn(t, taal = 'nl') {
  const tekst = String(t)
  const uit = []
  for (const m of tekst.matchAll(/(?<![\p{L}\d])\d+(?:[.,]\d+)*/gu)) uit.push({ v: /^\d{1,3}(?:\.\d{3})+$/.test(m[0]) ? m[0].replace(/\./g, '') : m[0].replace(',', '.'), start: m.index, end: m.index + m[0].length })
  const ws = [...tekst.matchAll(/\p{L}+/gu)].map((m) => ({ w: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length }))
  const naast = (j) => j + 1 < ws.length && !tekst.slice(ws[j].end, ws[j + 1].start).trim()
  for (let i = 0; i < ws.length; i++) {
    const { w } = ws[i]
    if (VAAG[w]) { uit.push({ v: VAAG[w], start: ws[i].start, end: ws[i].end }); continue }
    // Breuken, rangtelwoorden en vermenigvuldigingen (keuring 3 en 4): "anderhalf", "een derde", "tweederde",
    // "een kwart", "half miljard", "voor de tweede keer", "verdubbelt". Ook dat zijn getallen die bij de bron staan.
    if (taal !== 'en') {
      const teller = NL_EEN[w]
      if (teller && naast(i) && BREUK_NOEMER[ws[i + 1].w]) {
        uit.push({ v: `deel:${teller}/${BREUK_NOEMER[ws[i + 1].w]}`, start: ws[i].start, end: ws[i + 1].end })
        i++
        continue
      }
      if (BREUK_WOORD[w]) { uit.push({ v: `deel:${BREUK_WOORD[w]}`, start: ws[i].start, end: ws[i].end }); continue }
      const samen = w.match(/^(een|twee|drie|vier)(derde|kwart|vijfde)n?$/)
      if (samen) { uit.push({ v: `deel:${NL_EEN[samen[1]]}/${BREUK_NOEMER[samen[2]]}`, start: ws[i].start, end: ws[i].end }); continue }
      const maal = MAAL_WOORD.find(([re]) => re.test(w))
      if (maal) { uit.push({ v: `maal:${typeof maal[1] === 'function' ? maal[1](w) : maal[1]}`, start: ws[i].start, end: ws[i].end }); continue }
      if (RANG[w] && !eigenNaam(tekst, ws, i)) { uit.push({ v: `rang:${RANG[w]}`, start: ws[i].start, end: ws[i].end }); continue }
    }
    // Een reeks getalwoorden ("three hundred", "zes duizend", "twenty-one").
    let tot = 0, cur = null, j = i
    for (; j < ws.length; j++) {
      const x = ws[j].w
      const tussen = j > i ? tekst.slice(ws[j - 1].end, ws[j].start).trim() : ''
      if (tussen && tussen !== '-') break
      // Engelse woorden alleen in een Engelse tekst ("ten minste" is geen tien).
      const en = taal === 'en'
      if (en && x === 'and' && cur != null && EN_GETAL[ws[j + 1]?.w]) continue // "three hundred and twenty"
      const los = en ? EN_GETAL[x] ?? (x === 'one' && j > i ? 1 : null) : nlWoord(x)
      const een = (en ? x === 'one' || x === 'a' : x === 'een' || x === 'één') && MAAL[ws[j + 1]?.w] ? 1 : null
      if (MAAL[x] && en === (x === 'hundred' || x === 'thousand')) {
        if (cur == null && j === i) cur = 1
        else if (cur == null) break
        cur *= MAAL[x]
        if (MAAL[x] === 1000) (tot += cur), (cur = 0)
        continue
      }
      const v = los ?? een
      if (v == null) break
      cur = (cur || 0) + v
    }
    if (j > i && (cur != null)) {
      uit.push({ v: String(tot + cur), start: ws[i].start, end: ws[j - 1].end })
      i = j - 1
    }
  }
  return uit.sort((a, b) => a.start - b.start)
}
// Leesbaar in het verslag: "deel:1/3" → "1/3", "rang:2" → "2e", "maal:3" → "×3".
const toonGetal = (v) => String(v).replace(/^deel:/, '').replace(/^rang:(.+)$/, '$1e').replace(/^maal:/, '×')
const heeftGetal = (row, v) => getallenIn(`${row.title} ${row.summary || ''}`, row.lang || 'nl').some((g) => g.v === v)
const heeftCitaat = (row, q) => textOf(row).includes(norm(q))

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

  // 2b. Andere media of persbureaus ("volgens het ANP", "Reuters meldt") alleen als de aangehaalde regels ze noemen;
  // "volgens <Naam>" met een naam die geen bron is, alleen als die naam in de aangehaalde regels staat.
  const refRuw = refs.map((r) => `${r.title} ${r.summary || ''}`).join(' \u0001 ')
  for (const b of BUITEN) if (naamRe(b).test(tekst) && !naamRe(b).test(refRuw) && !namenIn(tekst, storyNames).some((n) => n.includes(b))) fouten.push(`noemt ${b}, geen bron van dit verhaal`)
  for (const m of tekst.matchAll(/(?<![\p{L}])[Vv]olgens\s+(?:(?:het|de|the)\s+)?(\p{Lu}[\p{L}.&’'-]*(?:\s+\p{Lu}[\p{L}.&’'-]*)*)/gu)) {
    const naam = m[1]
    if (namenIn(naam, storyNames).length || BUITEN.some((b) => naamRe(b).test(naam))) continue
    if (!norm(refRuw).includes(norm(naam))) fouten.push(`"volgens ${naam}": geen bron en niet in de aangehaalde regels`)
  }

  // 3 en 4. Getallen (ook in woorden) en citaten (elke soort aanhalingstekens) staan bij de bron die de zin
  // ervoor noemt, en bij elk lid van die groep; zonder genoemde bron in de aangehaalde regels samen.
  const groepen = groepenIn(tekst, storyNames)
  const rijenVan = (g) => (g ? g.namen.map((naam) => ({ naam, rijen: refs.filter((r) => r.sourceName === naam) })).filter((x) => x.rijen.length) : [{ naam: null, rijen: refs }])
  const telSpans = [...tekst.matchAll(TEL_RE)].map((m) => [m.index, m.index + m[0].length])
  const beweringen = [] // { soort: 'getal'|'citaat', v, groep }
  for (const g of getallenIn(tekst)) {
    if (telSpans.some(([a, b]) => g.start >= a && g.end <= b)) continue // "negen bronnen" is een telwoord, geen feit
    const groep = groepBij(groepen, g.start)
    beweringen.push({ soort: 'getal', v: g.v, groep })
    for (const { naam, rijen } of rijenVan(groep)) if (!rijen.some((r) => heeftGetal(r, g.v))) fouten.push(naam ? `getal ${toonGetal(g.v)} niet bij ${naam}` : `getal ${toonGetal(g.v)} niet in de bronnen`)
  }
  for (const c of citatenIn(tekst)) {
    const q = c.q
    if (woorden(q) > 5) fouten.push(`citaat te lang: ‘${q}’`)
    const groep = groepBij(groepen, c.start)
    beweringen.push({ soort: 'citaat', v: q, groep })
    const in_ = refs.filter((r) => heeftCitaat(r, q))
    if (!in_.length) { fouten.push(`citaat niet letterlijk: ‘${q}’`); continue }
    for (const { naam, rijen } of rijenVan(groep)) {
      const hier = rijen.filter((r) => heeftCitaat(r, q))
      if (!hier.length) fouten.push(naam ? `citaat ‘${q}’ niet bij ${naam}` : `citaat niet letterlijk: ‘${q}’`)
      else if (!hier.some((r) => r.lang === 'nl')) fouten.push(`citaat uit een anderstalige bron: ‘${q}’`)
    }
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

  // 8. Verboden woorden (beschrijft, oordeelt niet), buiten de nagezochte citaten.
  const eigen = zonderCitaten(tekst)
  for (const re of VERBODEN) if (re.test(eigen)) fouten.push(`verboden woord: ${eigen.match(re)[0]}`)
  for (const { re, stam } of OORDEEL_TENZIJ_BRON) if (re.test(eigen) && !stam.test(refRuw)) fouten.push(`oordeel: ${eigen.match(re)[0]}`)
  // Algemene groepen anderstalige of buitenlandse media, en weekdagen: alleen als de aangehaalde regels ze noemen.
  for (const m of eigen.matchAll(ALGEMENE_GROEP)) if (!norm(refRuw).includes(norm(m[0]))) fouten.push(`algemene groep media zonder bron: ${m[0]} (taal volgt bronkeuze)`)
  for (const m of eigen.matchAll(WEEKDAG)) if (!new RegExp(`(?<![\\p{L}])${m[1]}dag`, 'iu').test(refRuw)) fouten.push(`${m[0]} staat niet in de aangehaalde regels`)
  // 8b. Elke zin staat los: geen "ook", "daarnaast" of "die …" naar een andere zin.
  const verwijst = eigen.match(VERWIJST) || eigen.trim().match(VERWIJST_BEGIN)
  if (verwijst) fouten.push(`verwijst naar een andere zin ("${verwijst[0]}"): elke zin staat los`)
  // 8c. Taal volgt bronkeuze: alleen bronnen in de taal van het blok.
  for (const r of refs) if (r.lang && r.lang !== BLOK_TAAL) fouten.push(`anderstalige bron in het blok: ${r.sourceName} (taal volgt bronkeuze)`)

  // 9. Per soort: gedeeld door minstens de helft; een verschil heeft twee kanten (of een nagetelde "alleen").
  // "Gedeeld" telt tegen de bronnen in de taal van het blok (de anderstalige kan het blok niet noemen).
  const totaalTaal = new Set([...rows.map((r) => r.sourceName), ...alle.filter((i) => (i.lang || BLOK_TAAL) === BLOK_TAAL).map((i) => i.sourceName)]).size || totaal
  if (zin.soort === 'gedeeld' && telBronnen * 2 < totaalTaal) fouten.push(`gedeeld maar ${telBronnen} van ${totaalTaal} bronnen`)
  if (zin.soort === 'verschil') {
    const kanten = new Set(frags.filter((f) => byN.has(f.bron)).map((f) => `${byN.get(f.bron).sourceName}|${norm(f.tekst)}`))
    const verschillend = new Set([...kanten].map((k) => k.split('|')[1])).size >= 2 && refNames.size >= 2
    const alleenOk = ALLEEN_RE.test(tekst) && uniek.length > 0
    if (!verschillend && !alleenOk) fouten.push('verschil zonder twee kanten (vals contrast)')
    // Beide kanten eerlijk (keuring 2): precies twee kanten, elk genoemd in de zin, geen bron aan beide kanten, en
    // wie hetzelfde zegt als een kant (het letterlijke kenmerk), staat ook aan die kant.
    if (!alleenOk) for (const f of toetsKanten(zin, { tekst, bronnen, byN, rows, alle, storyNames })) fouten.push(f)
    if (ZWIJG_RE.test(tekst)) fouten.push('noemen tegenover zwijgen is geen verschil (vals contrast)')
    // Geen bron aan beide kanten: wat de ene groep zegt (getal of citaat), mag niet ook bij een bron van de andere
    // groep staan. En wat één groep tussen aanhalingstekens zegt, staat bij geen enkele andere bron van het verhaal.
    for (const b of beweringen.filter((x) => x.groep)) {
      const heeft = (r) => (b.soort === 'getal' ? heeftGetal(r, b.v) : heeftCitaat(r, b.v))
      const toon = b.soort === 'getal' ? toonGetal(b.v) : `‘${b.v}’`
      for (const g of groepen) {
        if (g === b.groep) continue
        for (const naam of g.namen) if (!b.groep.namen.includes(naam) && refs.some((r) => r.sourceName === naam && heeft(r))) fouten.push(`${naam} zegt ook ${toon} (vals contrast)`)
      }
      if (b.soort === 'citaat') {
        const ook = [...new Set([...rows, ...alle].filter((r) => !b.groep.namen.includes(r.sourceName) && heeft(r)).map((r) => r.sourceName))]
        const elders = ook.filter((n) => !groepen.some((g) => g !== b.groep && g.namen.includes(n)))
        if (elders.length) fouten.push(`${toon} staat ook bij ${elders.join(', ')}, die niet bij die kant staat (vals contrast)`)
      }
    }
  }
  if (!['gedeeld', 'verschil', 'onbekend'].includes(zin.soort)) fouten.push(`onbekende soort ${zin.soort}`)
  return [...new Set(fouten)]
}

// Bijna-gelijke vorm van een kenmerk: dezelfde inhoudswoorden (stam, meervoud of samenstelling: "spanning",
// "spanningen", "hoogspanning", "coalitiecrisis"), hooguit een paar woorden uit elkaar, met dezelfde ontkenning.
// Kleine woorden (lidwoorden, voorzetsels) tellen niet: "in coalitie" = "in de coalitie". Bij drie of meer
// woorden volstaat tweederde ("geen crisis in coalitie" ≈ "ziet geen crisis"). Een ontkenning hoort bij het woord
// erna ("geen crisis" is niet "geen reactie … coalitie"); getallen moeten precies terugkomen.
const KLEIN = new Set(['de', 'het', 'een', 'in', 'op', 'van', 'met', 'na', 'over', 'voor', 'bij', 'aan', 'te', 'en', 'of', 'om', 'tot', 'uit', 'door', 'naar', 'als', 'is', 'zijn', 'wordt', 'worden', 'er', 'zich', 'nog', 'al', 'dat', 'die', 'dit', 'deze', 'ook', 'maar'])
const ONTKENNING = new Set(['geen', 'niet', 'nooit', 'niets', 'niemand'])
const stamVan = (w) => (w.length > 5 ? w.replace(/(en|s|e|n)$/, '') : w)
const lijkt = (a, b) => a === b || (Math.min(a.length, b.length) >= 5 && (a.startsWith(b) || b.startsWith(a) || a.endsWith(b) || b.endsWith(a)))
const woordenIn = (t) => norm(t).match(/\p{L}+|\d+(?:[.,]\d+)*/gu) || []
export function bijnaIn(kenmerk, tekst) {
  const kw = woordenIn(kenmerk).filter((w) => !KLEIN.has(w))
  // Ontkenningen en getallen moeten precies terugkomen: "6.000 scholen" is niet "6.300 scholen".
  const vast = kw.filter((w) => ONTKENNING.has(w) || /^\d/.test(w))
  const inhoud = [...new Set(kw.filter((w) => !vast.includes(w)).map(stamVan))]
  if (!inhoud.length) return false
  // Per ontkenning het inhoudswoord erna: dat moet in de tekst ook vlak na de ontkenning staan.
  const gebonden = kw.flatMap((w, k) => (ONTKENNING.has(w) && kw[k + 1] && !vast.includes(kw[k + 1]) ? [[w, stamVan(kw[k + 1])]] : []))
  const totaal = vast.length + inhoud.length
  const nodig = totaal >= 3 ? Math.ceil((totaal * 2) / 3) - vast.length : inhoud.length
  const tw = woordenIn(tekst)
  const ontkend = !kw.some((w) => ONTKENNING.has(w))
    ? (p) => ONTKENNING.has(tw[p - 1]) || ONTKENNING.has(tw[p - 2]) // "crisis" is niet "geen crisis"
    : () => false
  const breed = kw.length + 4
  for (let s = 0; s < tw.length; s++) {
    const venster = tw.slice(s, s + breed)
    const stammen = venster.map(stamVan)
    if (!vast.every((n) => venster.includes(n))) continue
    if (!gebonden.every(([neg, w]) => venster.some((x, p) => x === neg && stammen.slice(p + 1, p + 3).some((y) => lijkt(w, y))))) continue
    if (inhoud.filter((w) => stammen.some((y, p) => lijkt(w, y) && !ontkend(s + p))).length >= Math.max(1, nodig)) return true
  }
  return false
}

function toetsKanten(zin, { tekst, bronnen, byN, rows, alle, storyNames }) {
  const fouten = []
  const kanten = (zin.kanten || [])
    .map((k) => ({ rijen: [...new Set((k?.bronnen || []).filter((n) => byN.has(n)))].map((n) => byN.get(n)), kenmerk: norm(k?.kenmerk) }))
    .filter((k) => k.rijen.length)
  if (kanten.length !== 2) return [kanten.length < 2 ? 'verschil met één kant: niet beide kanten genoemd (eenzijdig)' : 'verschil met meer dan twee kanten']
  const genoemd = new Set(namenIn(tekst, storyNames))
  const namen = kanten.map((k) => new Set(k.rijen.map((r) => r.sourceName)))
  for (const naam of namen[0]) if (namen[1].has(naam)) fouten.push(`${naam} staat aan beide kanten (vals contrast)`)
  for (const r of kanten.flatMap((k) => k.rijen)) if (!bronnen.includes(r.n)) fouten.push(`kant met [${r.n}] die de zin niet aanhaalt`)
  for (const n of bronnen) if (!kanten.some((k) => k.rijen.some((r) => r.n === n))) fouten.push(`[${n}] staat aan geen van beide kanten`)
  const stukken = [...rows, ...alle]
  kanten.forEach((k, i) => {
    for (const naam of namen[i]) if (!genoemd.has(naam)) fouten.push(`kant noemt ${naam} niet (eenzijdig)`)
    if (k.kenmerk.length < 3) return fouten.push('kant zonder kenmerk')
    for (const naam of namen[i]) if (!k.rijen.some((r) => r.sourceName === naam && textOf(r).includes(k.kenmerk))) fouten.push(`kenmerk ‘${k.kenmerk}’ staat niet bij ${naam}`)
    // Wie hetzelfde zegt, ook in een bijna-gelijke vorm ("hoogspanning in de coalitie", "geen crisis"), staat
    // aan die kant: een te smal kenmerk is geen uitweg (keuring 3 en 4).
    const ook = [...new Set(stukken.filter((r) => !namen[i].has(r.sourceName) && (textOf(r).includes(k.kenmerk) || bijnaIn(k.kenmerk, textOf(r)))).map((r) => r.sourceName))]
    for (const naam of ook.filter((n) => namen[1 - i].has(n))) fouten.push(`${naam} zegt ook ‘${k.kenmerk}’ (vals contrast)`)
    const elders = ook.filter((n) => !namen[1 - i].has(n))
    if (elders.length) fouten.push(`‘${k.kenmerk}’ staat ook bij ${elders.join(', ')}, die niet bij die kant staat (eenzijdig)`)
  })
  if (kanten[0].kenmerk && kanten[0].kenmerk === kanten[1].kenmerk) fouten.push('twee kanten met hetzelfde kenmerk')
  return fouten
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
// `geschreven`: een eerder bewaard antwoord van de schrijver (dan alleen nog de controles); `naSchrijven(out)`
// wordt aangeroepen zodra de schrijver klaar is, zodat een afgebroken controle de schrijver niet opnieuw kost.
export async function maakVerschillen(client, { rows, alle, storyNames = [] }, { signal, now = Date.now(), timeout = 25000, geschreven = null, naSchrijven = null } = {}) {
  const verslag = { rijen: rows.length, oordeel: null, zinnen: [], weg: [], waarom: null }
  const uitgevers = new Set(rows.map((r) => r.sourceName)).size
  if (uitgevers < MIN_UITGEVERS) return { resultaat: null, verslag: { ...verslag, waarom: 'minder dan drie bronnen' } }
  const opts = { signal, timeout }
  let out = geschreven
  let model = geschreven?.model || VERSCHILLEN_SCHRIJVER
  if (!out) {
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
  out = JSON.parse(textBlocks(res))
  model = res.model || VERSCHILLEN_SCHRIJVER
  await naSchrijven?.({ ...out, model })
  }
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
  const kantTekst = (z) => (z.soort === 'verschil' && z.kanten?.length ? `; ${z.kanten.map((k, i) => `kant ${'AB'[i] || i + 1}: regels ${(k.bronnen || []).join(', ')}`).join('; ')}` : '')
  const lijst = over.map((z, k) => `${k + 1}. (${z.soort}; regels ${z.bronnen.join(', ')}${kantTekst(z)}) ${z.tekst}`).join('\n')
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
    const reden = !v
      ? 'controle gaf geen oordeel'
      : !v.gedragen
        ? `niet gedragen: ${v.reden}`
        : z.soort === 'verschil' && !v.echt_verschil
          ? `vals contrast: ${v.reden}`
          : v.beschrijft === false
            ? `oordeelt: ${v.reden}`
            : v.los === false
              ? `staat niet los: ${v.reden}`
              : null
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
    resultaat: { versie: VERSCHILLEN_VERSIE, delen: s.delen, refs, woorden: s.woorden, model, at: new Date(now).toISOString() },
    verslag,
  }
}

// ---------- Per Editie: cache, plafond en tijdsbudget ----------
export const verschillenKey = (story, rows) => `verschillen-v${VERSCHILLEN_VERSIE}:${hash(`${story.id}|${[...new Set(rows.map((r) => r.sourceName))].sort().join(',')}`)}`
const dagKey = (now) => `verschillen-v${VERSCHILLEN_VERSIE}-dag:${new Date(now).toISOString().slice(0, 10)}`

// Welke verhalen in de Editie een blok kunnen krijgen: verhalen (geen losse stukken), niet vastgehouden
// (`held`), met drie of meer Nederlandstalige uitgevers (zusterkranten tellen als één).
export function kandidaten(entries = [], storyById = new Map(), itemsById = new Map()) {
  const out = []
  for (const e of entries) {
    if (e?.kind !== 'story' || e.held) continue
    const st = storyById.get(e.id)
    if (!st || out.some((s) => s.id === st.id)) continue
    // Taal volgt bronkeuze: drie of meer uitgevers in de taal van het blok.
    const items = st.itemIds.map((id) => itemsById.get(id)).filter((i) => i && langOf(i) === BLOK_TAAL)
    if (coverageOf(items).publisherCount >= MIN_UITGEVERS) out.push(st)
  }
  return out
}

// In de feed-build (kritieke route): alleen lezen wat al gekeurd in KV staat. Geen model, geen schrijven, nooit
// een fout naar buiten, en na `budget` ms (KV traag) gewoon wat er dan is. Met de vlag uit: meteen een lege Map.
export async function verschillenUitKV({ aan = verschillenAan(), entries, storyById, itemsById, get = kvGet, budget = 1500 } = {}) {
  const uit = new Map()
  if (!aan) return uit
  try {
    const lijst = kandidaten(entries, storyById, itemsById)
    let timer
    await Promise.race([
      Promise.allSettled(
        lijst.map(async (st) => {
          const entry = await get(verschillenKey(st, verschillenRows(st, itemsById).rows)).catch(() => null)
          if (entry?.status === 'klaar' && entry.resultaat) uit.set(st.id, entry.resultaat)
        }),
      ),
      new Promise((r) => (timer = setTimeout(r, budget))),
    ])
    clearTimeout(timer)
    return new Map(uit)
  } catch (e) {
    console.error('verschillen', String(e?.message || e))
    return new Map()
  }
}

// Los van de feed (functions/verschillen-refresh.mjs): schrijven en keuren voor de verhalen van de Editie.
// Geeft een Map verhaal-id → blok (ook wat al klaar was). Met de vlag uit: meteen een lege Map, zonder KV of
// model aan te raken. Nooit een fout naar buiten; na `budget` ms stopt het (wat niet af is, wordt afgebroken en
// komt een volgende ronde).
export async function schrijfVerschillen({ aan = verschillenAan(), client, entries, storyById, itemsById, now = Date.now(), get = kvGet, set = kvSet, budget = 15000, maxNieuw = 6, dagPlafond = DAG_PLAFOND, timeout = 25000 } = {}) {
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
      // Geen oude versie tonen: de telwoorden en groepen daarin horen bij een andere bronnenset. Tot de nieuwe
      // versie klaar is, is er geen blok (liever niets).
      if (entry?.status === 'geen') continue
      const pogingen = entry?.dag === vandaag ? entry.pogingen || 0 : 0
      if (!client || pogingen >= POGINGEN || werk.length >= maxNieuw) continue
      dagDoc ??= (await get(dagKey(now)).catch(() => null)) || { n: 0 }
      if (dagDoc.n >= dagPlafond && !entry?.schrijver) continue
      // Al geschreven maar de controle niet af: die kost geen nieuwe schrijfronde en telt niet voor het plafond.
      if (!entry?.schrijver) dagDoc.n++
      werk.push({ st, rows, alle, key, pogingen, geschreven: entry?.schrijver || null })
    }
    if (!werk.length) return uit
    await set(dagKey(now), dagDoc).catch(() => {})

    const stop = new AbortController()
    const een = async (w) => {
      const storyNames = w.st.sourceNames || []
      let schrijver = w.geschreven
      // De poging telt vóór de modelaanroep (Sonnet én Haiku), en staat al in KV voordat het model iets kost.
      // Een functie die na het budget bevriest of wordt afgebroken, raakt de poging dus niet kwijt: hooguit
      // POGINGEN per verhaal-versie per dag, ook voor een controle die steeds blijft hangen. Lukt dat
      // wegschrijven niet, dan geen aanroep (liever niets dan ongeteld).
      const pogingen = w.pogingen + 1
      try {
        await set(w.key, { status: 'bezig', dag: vandaag, pogingen, schrijver: schrijver || undefined, at: new Date(now).toISOString() })
      } catch (e) {
        console.error('verschillen', w.st.id, 'poging niet geteld', String(e?.message || e))
        return
      }
      if (stop.signal.aborted) return
      const naSchrijven = async (out) => {
        schrijver = out
        await set(w.key, { status: 'geschreven', dag: vandaag, pogingen, schrijver, at: new Date(now).toISOString() }).catch(() => {})
      }
      try {
        const { resultaat, verslag } = await maakVerschillen(client, { rows: w.rows, alle: w.alle, storyNames }, { signal: stop.signal, now, timeout, geschreven: w.geschreven, naSchrijven })
        await set(w.key, { status: resultaat ? 'klaar' : 'geen', dag: vandaag, pogingen, resultaat, verslag, at: new Date(now).toISOString() })
        if (resultaat) uit.set(w.st.id, resultaat)
      } catch (e) {
        // Netwerk, time-out of afgebroken: later nog eens (hooguit POGINGEN per dag; de poging is al geteld).
        // Wat de schrijver al gaf, blijft bewaard: de volgende ronde doet alleen de controle.
        console.error('verschillen', w.st.id, String(e?.message || e))
        await set(w.key, { status: 'fout', dag: vandaag, pogingen, schrijver: schrijver || undefined, fout: String(e?.message || e).slice(0, 200), at: new Date(now).toISOString() }).catch(() => {})
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

// Eén ronde van de geplande functie: de Editie uit de laatst weggeschreven feed (KEYS.core), en daarvoor
// schrijven wat nog ontbreekt. Raakt de feed zelf niet aan: de volgende feed-build leest het gekeurde blok uit KV.
export async function verschillenRonde({ aan = verschillenAan(), client, readCore, now = Date.now(), budget = 20000, ...rest } = {}) {
  if (!aan || !client) return new Map()
  try {
    const doc = await readCore()
    const kern = JSON.parse(doc?.body || '{}')
    if (!kern.edition?.entries) return new Map()
    const itemsById = new Map((kern.related || []).map((i) => [i.id, i]))
    const storyById = new Map((kern.stories || []).map((s) => [s.id, s]))
    return await schrijfVerschillen({ aan, client, entries: kern.edition.entries, storyById, itemsById, now, budget, ...rest })
  } catch (e) {
    console.error('verschillen-ronde', String(e?.message || e))
    return new Map()
  }
}

// De verhalen met hun blok erbij (`story.verschillen`); verhalen zonder blok blijven dezelfde objecten.
export function metVerschillen(stories, blokken) {
  if (!blokken?.size) return stories
  return stories.map((st) => (blokken.has(st.id) ? { ...st, verschillen: blokken.get(st.id) } : st))
}
