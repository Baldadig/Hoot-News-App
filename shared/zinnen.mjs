// Intro's in hele zinnen (T2, D2). Huisregel: Hoot eindigt nooit met een beletselteken. Een intro
// is een of meer hele zinnen; past er geen, dan het stuk tot de laatste komma, of niets. Nooit
// "Politkovska…" of "wereldni…": de line-clamp in de CSS is alleen nog een vangnet.
// iOS spiegelt dit in Text+Sentences.swift en draait dezelfde gevallen uit
// tests/fixtures/zinnen.json; verander je hier iets, dan daar ook.

// Einde van een zin: . ! of ?, eventueel met een sluitende aanhaling of haakje, en dan witruimte of
// het eind. Niet na een hoofdletter (initialen, "VS.") en niet na een afkorting. Ook de server
// (netlify/lib/text.mjs, preview) knipt hiermee.
export const SENTENCE_END = /(?<![A-Z])(?<!\b(?:Mr|Mrs|Ms|Dr|St|vs|dr|mr|drs|prof|bijv|ca|nr|o\.a|d\.w\.z))[.!?]["'’”)]?(?=\s|$)/g

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

// Hele zinnen tot ± max tekens. Past er geen hele zin, dan tot de laatste komma (zonder de komma);
// is er ook geen komma, dan ''. Een afgekapt slot ("…") gaat eraf met het halve stuk ervoor.
export function wholeSentences(text, max = Infinity) {
  let s = String(text ?? '').replace(/\s+/g, ' ').trim()
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
  const comma = s.slice(0, Number.isFinite(max) ? max : undefined).lastIndexOf(',')
  return comma > 0 ? s.slice(0, comma).trim() : ''
}

// Hoeveel tekens een intro mag hebben bij een regelinstelling (1, 2, 3 of 'alles'). Met een
// miniatuur ernaast (of in een kaart) is de kolom smaller: 20 procent minder.
const PER_LINES = { 1: 60, 2: 130, 3: 200 }
export function introMax(lines, thumb = false) {
  if (lines === 'alles') return Infinity
  const base = PER_LINES[lines] ?? PER_LINES[2]
  return thumb ? Math.round(base * 0.8) : base
}
