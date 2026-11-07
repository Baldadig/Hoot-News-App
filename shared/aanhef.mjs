// Aanhef van een (live)blog en de reclame voor een liveblog (kaartkwaliteit, 7 november). Zo'n zin zegt niets
// over het nieuws: "Welkom in het blog over de midtermverkiezingen.", "Volg alle ontwikkelingen … in onze
// liveblog.", "In de liveblog economie brengen we …", "Op deze pagina blijft u op de hoogte …". Generiek, op
// patronen; nooit op een bepaalde kop of bron.
// - Een eigen intro verliest zulke zinnen (server: PROMO_OWN in netlify/lib/text.mjs; web en app nog eens in
//   cardIntro). Was de intro alleen aanhef, dan is er geen intro.
// - Een stuk waarvan de samenvatting zo'n zin heeft, leent nooit een intro uit (netlify/lib/build.mjs:
//   lendableIntro): het is een blog over de hele dag, niet over dit ene feit.
// De app gebruikt dezelfde tekst (Aanhef.pattern in ios/Hoot/Models.swift); tests/kaart-kwaliteit.test.mjs
// houdt ze gelijk. Alleen syntaxis die JavaScript en NSRegularExpression allebei kennen.
export const AANHEF_SOURCE = String.raw`\blive(?:\s|-)?blog|^\s*(?:welkom|welcome)\b|\bin\s+(?:het|dit|ons|deze|onze|this|our|the)\s+blog\b|^\s*(?:volg|lees|luister|bekijk|follow|read)\s+(?:alle|al|alles|hier|live|ons|onze|meer|ook|het\s+laatste|de\s+ontwikkelingen|our|the\s+latest|along|more)\b|\bop\s+deze\s+pagina\b|\bon\s+this\s+page\b|\b(?:u|je|jou)\s+(?:\w+\s+)?op\s+de\s+hoogte\b|\bkeep\s+you\s+(?:up\s+to\s+date|updated|posted)\b|\blive\s+(?:updates?|coverage)\b`
export const AANHEF = new RegExp(AANHEF_SOURCE, 'i')

// Zinnen zoals withoutPromo (netlify/lib/text.mjs) ze telt; de app knipt met hetzelfde patroon (Aanhef.sentences).
export const SENTENCES_SOURCE = String.raw`[^.!?]+(?:[.!?]+["'’”)]?|$)\s*`
const SENTENCES = new RegExp(SENTENCES_SOURCE, 'g')
export const sentencesOf = (text) => String(text || '').match(SENTENCES) || []
export const hasAanhef = (text) => sentencesOf(text).some((z) => AANHEF.test(z))
export const withoutAanhef = (text) => {
  const s = String(text || '')
  return hasAanhef(s) ? sentencesOf(s).filter((z) => !AANHEF.test(z)).join('').trim() : s
}
