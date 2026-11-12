// Kortingscode-pagina's (Redacteur · kortingscodes, 12 november 2026). Besluit van Alex: een pagina die alleen
// kortingscodes van één winkel of dienst verzamelt ("Nike Promo Codes and Discounts: 30% for November 2026",
// wired.com/story/nike-promo-code/) hoort niet in de Stroom en dus ook nooit in de Editie. Wired deelt zulke pagina's vaak
// alleen als "Gear" in, zodat de bronregel op "Gear / Deals" (rss.mjs, sourceDeal) ze niet vangt.
//
// Generiek, voor elke bron, en dubbel: een stuk is een kortingscode-pagina als BEIDE gelden.
//   1. De kop opent met "<naam> <kortingscodewoord>": promo code(s), coupon(s), coupon code(s), discount code(s),
//      voucher code(s) of kortingscode(s). Het openingsdeel is de kop tot de eerste dubbele punt, streep of pijp. Daarin
//      staan vóór het woord hooguit 4 woorden (de naam: "Design Within Reach", "Sam's Club"), en erna niets, of een
//      voortzetting als "and Deals" of een periode ("for November 2026").
//   2. Het laatste padsegment van de link (de slug) is "<hooguit 4 woorden>-<kortingscodewoord>": nike-promo-code,
//      nordvpn-coupon, airdoctor-coupon-code, zalando-kortingscode. Een extensie (.html) en een id-staart (~a1) tellen niet.
//
// Waarom zo streng, en niet "het woord staat ergens in de kop en ergens in de slug": dan vallen gelabelde nieuwsstukken
// weg die over kortingscodes gáán en het woord in kop en slug hebben ("Honey sued over coupon codes by YouTube creators",
// …/honey-sued-coupon-codes-creators; "Promo codes scam: Dutch police warn of fake WhatsApp discount codes",
// …/promo-codes-scam-…-discount-codes; "Kortingscode-fraude: politie pakt bende op", …/kortingscode-fraude.html). Een
// nieuwskop heeft het woord midden in een zin, na de dubbele punt of in een samenstelling ("Kortingscode-fraude"); een
// nieuwsslug loopt na het woord door. Bij twijfel blijft het staan: een gemiste kortingscode-pagina mag.
const PREFIX = String.raw`(?:\S+\s+){0,4}`
const HEAD_TERM = String.raw`(?:promo[- ]?codes?|coupon[- ]codes?|coupons?|discount[- ]codes?|voucher[- ]codes?|kortingscodes?)`
// Na het woord: niets, of een voortzetting die bij een verzamelpagina hoort: een opsomming ("and Deals", "and Coupons",
// "en aanbiedingen") of een periode ("for November 2026", "in November 2026", "This November 2026", "voor december").
// Nooit een samenstelling met een streepje ("Kortingscode-fraude") en nooit een gewoon zinsvervolg ("Promo codes scam",
// "coupon codes by YouTube creators", "coupon codes for Black Friday 2026 flood TikTok", "Kortingscodes op TikTok …").
const PERIOD = String.raw`(?:(?:the|de|het)\s+)?(?:\d{4}|week|month|maand|year|jaar|january|february|march|april|may|june|july|august|september|october|november|december|januari|februari|maart|mei|juni|juli|augustus|oktober)\b`
const HEAD_REST = String.raw`(?![\w-])(?:\s+(?:(?:and|en|&|\+|plus)\s.*|(?:for|voor|in|this|deze|van)\s+${PERIOD}.*))?`
const HEAD = new RegExp(`^${PREFIX}${HEAD_TERM}${HEAD_REST}$`, 'i')
const SLUG = /^(?:[a-z0-9]+-){0,4}(?:promo-codes?|coupon-codes?|coupons?|discount-codes?|voucher-codes?|vouchers?|kortingscodes?)$/

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

export const couponHead = (title) => HEAD.test(openingOf(title))
export const couponSlug = (url) => SLUG.test(slugOf(url))
// Beide moeten gelden. `it` is een feeditem ({ title, link | guid }) of een Hoot-bericht ({ title, url }).
export const couponPage = (it = {}) => couponHead(it?.title) && couponSlug(it?.url || it?.link || it?.guid || '')
