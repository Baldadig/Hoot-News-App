// Eén typografische hand (T6 stap 2, D3). De server zet koppen en intro's van een bron één keer
// vóór opslag zoals een krant ze zet: gekrulde apostrof, aanhalen met enkele gekrulde ‘ ’ (ook in
// Engelse koppen), kastlijntje in een jaartalbereik en als gedachtestreepje, beletselteken, geen
// dubbele spaties, een vaste spatie tussen getal en eenheid. Alleen voor nl en en; elke andere taal
// blijft letterlijk. Nooit binnen een URL. Twee keer zetten geeft hetzelfde als één keer.
// iOS zet de lezer-kop (Readability-titel op het toestel) met dezelfde regels en draait dezelfde
// gevallen uit tests/fixtures/typeset.json (I5); verander je hier iets, dan daar ook.

const LANGS = new Set(['nl', 'en'])

// Een woord met :// of www. erin is een adres; dat gaat er eerst uit en komt ongewijzigd terug.
const URL_TOKEN = /\S*(?::\/\/|www\.)\S*/gi
// Plaatshouder zonder cijfers of letters, zodat geen regel erop aanslaat.
const HOLD = ''
const holder = (i) => HOLD + String.fromCharCode(0xe100 + i)
const HELD = /([-])/g

// Een jaartal: 1000 tot en met 2099.
const YEAR = '(?:1\\d{3}|20\\d{2})'
const YEAR_RANGE = new RegExp(`(?<![\\d-])(${YEAR})-(${YEAR})(?![\\d-])`, 'g')

// Eenheden die bij hun getal blijven. Een eenheid is een heel woord: "5 minuten" niet, "5 min." wel.
const UNIT_AFTER = /(\d) (%|km|kg|°C|°|euro|€|uur|min)(?![\p{L}\p{N}])/gu
const EURO_BEFORE = /€ (?=\d)/g

// Weglatingen aan het begin van een woord: 's avonds, 't is, zo'n staat al binnen een woord,
// de jaren '90. Die zijn geen opening van een aanhaling.
const ELISION = /(^|[\s(])'(?=(?:s|t|n|k|m|r|em|er)(?![\p{L}\p{N}])|\d{2}(?!\d))/gu

// Een paar aanhalingstekens: open aan het begin of na wit, een haakje of een streepje, direct
// gevolgd door tekst; dicht direct na tekst, gevolgd door het eind, wit, een leesteken of een
// koppelteken (‘Halloween’-protesten). Een aanhaling binnen een aanhaling mag direct tegen de
// buitenste aan staan.
const pairOf = (q) => new RegExp(`(^|[\\s(\\[—–"“‘])${q}(?=[^\\s${q}])([^${q}]*?[^\\s${q}])${q}(?=$|[\\s.,;:!?)\\]—–"”’-])`, 'g')
const SINGLE_PAIR = pairOf("'")
const DOUBLE_PAIR = pairOf('"')

export function typeset(s, lang) {
  if (typeof s !== 'string' || !s || !LANGS.has(lang)) return s
  const urls = []
  let t = s.replace(URL_TOKEN, (u) => (urls.length < 0xeff ? (urls.push(u), holder(urls.length - 1)) : u))

  t = t.replace(/[ \t]{2,}/g, ' ')
  t = t.replace(/\.\.\./g, '…')
  // Apostrof binnen een woord (d'r, intro's, it's) en aan het begin van een weglating.
  t = t.replace(/(\p{L})'(?=\p{L})/gu, '$1’')
  t = t.replace(ELISION, '$1’')
  // Aanhalen: Hoot citeert met enkele gekrulde. Staat er binnen "…" al een ‘…’, dan blijft de
  // buitenste dubbel (“…”), anders zijn ze niet meer uit elkaar te houden. Van binnen naar buiten,
  // tot er niets meer te paren valt (een binnenste paar maakt het buitenste pas zichtbaar).
  for (let pass = 0; pass < 4; pass++) {
    const before = t
    t = t.replace(SINGLE_PAIR, '$1‘$2’')
    t = t.replace(DOUBLE_PAIR, (_, pre, body) => (body.includes('‘') ? `${pre}“${body}”` : `${pre}‘${body}’`))
    if (t === before) break
  }
  // Wat overblijft na een meervouds-s is een bezitsapostrof (the players' union).
  t = t.replace(/(\p{L}[sS])'(?=[\s,.;:!?]|$)/gu, '$1’')
  t = t.replace(YEAR_RANGE, '$1–$2')
  t = t.replace(/(?<= )-(?= )/g, '–')
  t = t.replace(UNIT_AFTER, '$1 $2')
  t = t.replace(EURO_BEFORE, '€ ')

  return urls.length ? t.replace(HELD, (_, c) => urls[c.charCodeAt(0) - 0xe100]) : t
}
