import { cleanIntro } from './edition-display.mjs'
// Intro's in hele zinnen (T2, D2). Huisregel: Hoot eindigt nooit met een beletselteken. Een intro
// is een of meer hele zinnen die in de gekozen regels passen; is de eerste zin net te lang, dan
// mag die één regel doorlopen (de regel die de clamp vrijhoudt). Anders een stuk tot een komma dat
// zelf iets zegt (minstens twee derde van de maat, geen bijzin), of niets. Nooit "Politkovska…" of "wereldni…".
// iOS spiegelt dit in Text+Sentences.swift en draait dezelfde gevallen uit
// tests/fixtures/zinnen.json; verander je hier iets, dan daar ook.

// Einde van een zin: . ! of ?, eventueel met een sluitende aanhaling of haakje, en dan witruimte of
// het eind. Niet na een losse hoofdletter (een initiaal: "Jan G. uit") en niet na een afkorting;
// wel na een letterwoord ("tegen NEC.", "aan de NOS."). Ook de server (netlify/lib/text.mjs,
// preview) knipt hiermee.
export const SENTENCE_END = /(?<!\b[A-Z])(?<!\b(?:Mr|Mrs|Ms|Dr|St|vs|dr|mr|drs|prof|bijv|ca|nr|o\.a|d\.w\.z))[.!?]["'’”)]?(?=\s|$)/g

// Een beletselteken aan het eind van de bron (ook "..." en "[…]"): daar is de feed afgekapt.
const TRAILING_ELLIPSIS = /\s*[[(]?(?:…|\.{3,})[\])]?$/

// Waar de zinnen eindigen (index ná het teken). "..." telt niet als zinseinde: de laatste punt
// van drie is een beletselteken.
function sentenceEnds(s) {
  const ends = []
  for (const m of s.matchAll(SENTENCE_END)) {
    if (m[0][0] === '.' && s[m.index - 1] === '.') continue
    ends.push(m.index + m[0].length)
  }
  return ends
}

// Een stuk tot een komma is alleen een intro als het zelf iets zegt. Dus niet te kort (minstens
// twee derde van max en 30 tekens: "In Armenia" en "De Europese ministers van Financiën" zeggen
// niets), niet midden in een getal ("5,5 miljoen"), geen open aanhaling, en geen bijzin die op
// zijn hoofdzin wacht ("Nu alle stemmen zijn geteld", "With all the votes counted").
const MIN_PIECE = 30
const BIJZIN = /^(?:als|nu|toen|terwijl|omdat|doordat|hoewel|nadat|voordat|sinds|zodra|wanneer|indien|zodat|tenzij|ook al|with|after|before|from|whether|when|while|although|though|as|since|if|because|once|despite|amid|ahead|even|unlike|like|to)\b/i
function commaPiece(s, max) {
  for (let i = s.slice(0, max).lastIndexOf(','); i > 0; i = s.lastIndexOf(',', i - 1)) {
    if (/\d/.test(s[i - 1]) && /\d/.test(s[i + 1] ?? '')) continue // komma in een getal
    const piece = s.slice(0, i).trim()
    if (piece.length < (Number.isFinite(max) ? Math.max((2 * max) / 3, MIN_PIECE) : MIN_PIECE)) return ''
    const open = (piece.match(/[„“‘"]/g) || []).length - (piece.match(/[”’"]/g) || []).length
    if (BIJZIN.test(piece) || open > 0) return ''
    return piece
  }
  return ''
}

// Hele zinnen tot max tekens. Past er geen, dan de eerste zin als die binnen `rek` blijft (een
// regel meer). Anders een stuk tot een komma dat zelf iets zegt (commaPiece), anders ''. Een
// afgekapt slot ("…") gaat eraf met het halve stuk ervoor.
export function wholeSentences(text, max = Infinity, rek = max) {
  let s = cleanIntro(text)
  if (!s) return ''
  let cut = false
  if (TRAILING_ELLIPSIS.test(s)) {
    s = s.replace(TRAILING_ELLIPSIS, '').trim()
    cut = true
  }
  const ends = sentenceEnds(s)
  // Het halve stuk na de laatste hele zin is weg; zonder hele zin blijft het over voor de komma.
  const whole = cut ? (ends.length ? s.slice(0, ends[ends.length - 1]) : '') : s
  if (whole && whole.length <= max) return whole
  const fit = ends.filter((e) => e <= max).pop()
  if (fit) return s.slice(0, fit)
  if (ends.length && ends[0] <= rek) return s.slice(0, ends[0])
  return commaPiece(s, max)
}

// Hoeveel tekens er op `lines` regels passen, in een kolom van `width` px met een intro van
// `font` px. Gemeten met de 1679 intro's uit de snapshot op 375 breed (normaal, groot en 130 %):
// een teken is gemiddeld hooguit 0,58 × de lettermaat breed, en de eerste regel verliest ± 6
// tekens aan het afbreken op woorden. Zo past 95 % van de intro's van die lengte echt.
const CHAR = 0.58
const SLACK = 6
export function lineFit(lines, { width, font }) {
  return Math.max(0, Math.floor((width / (font * CHAR)) * lines) - SLACK)
}

// De maat van een intro bij een regelinstelling (1, 2, 3 of 'alles') in een kolom ({ width, font },
// de smalste waarin hij staat): max voor de hele zinnen, rek voor één eerste zin die een regel
// doorloopt. De clamp staat op lines + 1 en vangt dus ook die rek nog op.
export function introMax(lines, kolom) {
  if (lines === 'alles') return { max: Infinity, rek: Infinity }
  const n = [1, 2, 3, 4].includes(lines) ? lines : 2
  return { max: lineFit(n, kolom), rek: lineFit(n + 1, kolom) }
}
