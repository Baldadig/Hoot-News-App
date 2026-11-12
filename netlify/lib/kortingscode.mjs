// Kortingscode-pagina's (Redacteur · kortingscodes, 12 november 2026). Besluit van Alex: een pagina die alleen
// kortingscodes van één winkel of dienst verzamelt ("Nike Promo Codes and Discounts: 30% for November 2026",
// wired.com/story/nike-promo-code/) hoort niet in de Stroom en dus ook nooit in de Editie. Wired deelt zulke pagina's vaak
// alleen als "Gear" in, zodat de bronregel op "Gear / Deals" (rss.mjs, sourceDeal) ze niet vangt.
//
// Per bron (kortingscodes · 3), net als `dealsCategory`: alleen een bron die in sources.mjs `couponPages: true` zet doet
// mee (nu alleen Wired). Twee keuringen lieten zien dat een generieke regel over alle bronnen nieuws blijft raken: een
// nieuwskop opent vaak met precies dezelfde woorden ("Temu coupons: …", "Valse kortingscodes: 70 procent korting bij
// nepwinkels"). Wired zet zijn eigen codepagina's altijd onder een vaste link: …/story/<naam>-promo-code/. Daarop leunt de
// regel. Een stuk van zo'n bron valt weg als BEIDE gelden:
//   1. het laatste padsegment van de link is "<1 tot 4 woorden>-<codewoord>", eventueel met een id-achtervoegsel
//      (-2, -2026): nike-promo-code, nordvpn-coupon, airdoctor-coupon-code, hydrow-discount-code;
//   2. de kop heeft het codewoord in het openingsdeel (tot de eerste dubbele punt, pijp of losse streep).
// Codewoord: promo code(s), coupon(s), coupon code(s), discount code(s). Nooit als het over obligaties gaat (zero coupon,
// coupon rate, bond, obligatie): "coupon" is ook een obligatieterm. Bij twijfel blijft het staan.
const HEAD = /\b(?:promo[- ]?codes?|coupon[- ]codes?|coupons?|discount[- ]codes?)\b/i
const SLUG = /^(?:[a-z0-9]+-){1,4}(?:promo-codes?|coupon-codes?|coupons?|discount-codes?)(?:-\d+)?$/
const BOND = /\b(?:zero[- ]?coupons?|coupon[- ]?rates?|coupon[- ]?payments?|bonds?|treasur(?:y|ies)|gilts?|yields?)\b|obligatie/i

// Het openingsdeel van de kop: tot de eerste dubbele punt, pijp of losse streep ("Factor Promo Code: 50% Off …",
// "Hydrow Discount Code: Save Up to $150 | November 2026").
export function openingOf(title = '') {
  return String(title || '').replace(/\s+/g, ' ').trim().split(/\s*[:|]\s*|\s[–—-]\s/)[0].trim()
}

// De slug: het laatste niet-lege padsegment, zonder query, extensie of id-staart, in kleine letters.
export function slugOf(url = '') {
  const m = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*([^?#]*)/i.exec(String(url || '').trim())
  if (!m) return ''
  let last = m[1].split('/').filter(Boolean).pop() || ''
  try {
    last = decodeURIComponent(last)
  } catch {}
  return last.toLowerCase().replace(/~.*$/, '').replace(/\.(?:html?|php|aspx?)$/, '')
}

export const couponHead = (title) => {
  const t = String(title || '')
  return HEAD.test(openingOf(t)) && !BOND.test(t)
}
export const couponSlug = (url) => {
  const s = slugOf(url)
  return SLUG.test(s) && !BOND.test(s.replace(/-/g, ' '))
}
// `it` is een feeditem ({ title, link | guid }) of een Hoot-bericht ({ title, url }); `src` de bron uit sources.mjs.
export const couponPage = (it = {}, src = null) =>
  src?.couponPages === true && couponHead(it?.title) && couponSlug(it?.url || it?.link || it?.guid || '')
