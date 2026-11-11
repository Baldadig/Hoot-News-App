// "Waar media verschillen" in Vergelijken: wat web en app tonen van `story.verschillen` (de server
// schrijft en keurt het, netlify/lib/verschillen.mjs). Alleen een gekeurd blok met een verschil; anders
// niets, en dan ziet Vergelijken eruit als altijd. De app (ios/Hoot/Models.swift, StoryVerschillen) volgt
// dezelfde regels.

export const VERSCHILLEN_LABEL = 'Waar media verschillen'
export const VERSCHILLEN_VOET = 'Door AI samengevat uit de koppen en intro’s hieronder.'

const SOORTEN = ['gedeeld', 'verschil', 'onbekend']

// Typografie zoals in de rest van Hoot: ’ in plaats van een rechte apostrof, en een vaste spatie na een
// getal, zodat "1" en "miljard euro" niet over twee regels breken.
export const zetTekst = (t) =>
  String(t || '')
    .trim()
    .replace(/(\p{L})'(\p{L})/gu, '$1’$2')
    .replace(/(\d[\d.,]*) (?=\p{L})/gu, '$1 ')

// De alinea's om te tonen, in vaste volgorde (wat iedereen zegt, waar ze verschillen, wat open is), of null.
export function verschillenDelen(story) {
  const v = story?.verschillen
  if (!v || !Array.isArray(v.delen)) return null
  const delen = SOORTEN.map((soort) => v.delen.find((d) => d?.soort === soort && typeof d.tekst === 'string' && d.tekst.trim()))
    .filter(Boolean)
    .map((d) => ({ soort: d.soort, tekst: zetTekst(d.tekst) }))
  if (!delen.some((d) => d.soort === 'verschil') || delen.length < 2) return null
  return delen
}
