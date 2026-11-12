// Kortingscode-pagina's (Redacteur · kortingscodes, 12 november 2026). Besluit van Alex: een pagina die alleen
// kortingscodes van één winkel of dienst verzamelt ("Nike Promo Codes and Discounts: 30% for November 2026",
// wired.com/story/nike-promo-code/) hoort niet in de Stroom en dus ook nooit in de Editie. Wired deelt zulke pagina's vaak
// alleen als "Gear" in, zodat de bronregel op "Gear / Deals" (rss.mjs, sourceDeal) ze niet vangt.
//
// Generiek, voor elke bron. Een stuk is een kortingscode-pagina als ALLE DRIE gelden (kortingscodes · 2):
//   1. De kop opent met "<kort onderwerp> <kortingscodewoord>": promo code(s), coupon(s), coupon code(s), discount
//      code(s), voucher code(s) of kortingscode(s). Het openingsdeel is de kop tot de eerste dubbele punt, pijp of losse
//      streep. Vóór het woord hooguit 4 woorden (de naam: "Design Within Reach", "Sam's Club"). Erna niets, of "and/en"
//      met een aanbodwoord ("and Deals", "and Coupons"; nooit "and SNAP"), en/of een periode ("for November 2026").
//   2. Het laatste padsegment van de link (de slug) is "<hooguit 4 woorden>-<kortingscodewoord>": nike-promo-code,
//      nordvpn-coupon, airdoctor-coupon-code, zalando-kortingscode. Een extensie (.html) en een id-staart (~a1) tellen niet.
//   3. Er staat een AANBOD, geen zin: na de dubbele punt/pijp/streep alleen een kortingsbedrag of -percentage ("30% Off",
//      "$25 Off", "Up to 80% Off", "Save Up to $150", "20 procent korting"), "Free Shipping"/"gratis verzending", "3 Months
//      Free" of een periode (maand, jaar), los of samen ("30% Off | November 2026", "$25 Off + Free Shipping"). Zonder
//      staart telt alleen een openingsdeel dat zelf op een periode eindigt ("Visible Promo Codes and Coupons for November
//      2026"). Een kop die alleen uit het woord bestaat ("Coupons", "Influencer promo codes") telt dus nooit.
// En nooit als het over obligaties gaat (zero coupon, coupon rate, bond, obligatie): "coupon" is ook een obligatieterm.
//
// Waarom zo streng: nieuws over kortingscodes heeft het woord vaak in kop én slug, en opent vaak met een kort
// onderwerplabel ("Temu coupons: EU opens formal investigation", …/temu-coupons; "Kortingscodes: ACM tikt webwinkels op
// de vingers", nos.nl/artikel/2641111-acm-kortingscodes). Wat zo'n stuk van een verzamelpagina onderscheidt, is wat er
// na de dubbele punt staat: bij nieuws een zin, bij een verzamelpagina een korting. Bij twijfel blijft het staan: een
// gemiste kortingscode-pagina mag, een weggevallen nieuwsstuk niet.
const PREFIX = String.raw`(?:\S+\s+){0,4}`
const HEAD_TERM = String.raw`(?:promo[- ]?codes?|coupon[- ]codes?|coupons?|discount[- ]codes?|voucher[- ]codes?|kortingscodes?)`
const MONTH = String.raw`(?:january|february|march|april|may|june|july|august|september|october|november|december|januari|februari|maart|mei|juni|juli|augustus|oktober)`
// Een periode: "November 2026", "for November 2026", "in November", "This November 2026", "voor december", "2026".
const PERIOD = String.raw`(?:(?:for|in|this|voor|in|deze|van)\s+)?(?:(?:the|de|het)\s+)?(?:${MONTH}(?:\s+\d{4})?|\d{4})`
// Na "and/en" in het openingsdeel alleen een aanbodwoord, eventueel met één woord ervoor ("and Membership Deals").
const OFFER_WORD = String.raw`(?:deals?|discounts?|coupons?|coupon[- ]codes?|promo[- ]?codes?|sales?|offers?|aanbiedingen|kortingen|acties)`
const HEAD = new RegExp(`^${PREFIX}${HEAD_TERM}(?:\\s+(?:and|en|&|\\+|plus)\\s+(?:[\\w'-]+\\s+)?${OFFER_WORD})?(\\s+${PERIOD})?$`, 'i')

// De staart: één of meer aanbod-delen, gescheiden door komma, pijp, plus, "and/en/plus" of een losse streep.
const AMOUNT = String.raw`(?:[$€£]\s?\d[\d.,]*|\d[\d.,]*\s?(?:%|procent|percent|euro|dollars?))`
// "Up to 80% Off", "Save Up to $150", "Get 25% Off", "20 procent korting bij Zalando", "50% Off Off Meal Prep".
// Na het aanbod mag alleen een voorzetsel met hooguit 2 woorden volgen ("bij Zalando", "on Mattresses"), nooit een zin.
const OFFER = String.raw`(?:(?:up\s+to|save|save\s+up\s+to|get|take|extra|an\s+extra|tot|bespaar|bespaar\s+tot|nu)\s+)?${AMOUNT}(?:\s+(?:off|korting|discount))?(?:\s+(?:on|op|bij|at|off|with|met)(?:\s+[^\s,|+]+){1,2})?`
const FREE = String.raw`(?:(?:\d+\s+(?:months?|maanden|weeks?|weken)\s+(?:free|gratis))|free\s+(?:shipping|delivery|trial|returns?)|gratis\s+(?:verzending|bezorging|levering|proefperiode)|korting|kortingen|deals?|discounts?|sale)`
const UNIT = String.raw`(?:${OFFER}|${FREE}|${PERIOD})`
const PART = String.raw`(?:(?:plus|and|en|\+|&)\s+)?${UNIT}(?:\s+${UNIT})*`
const SEP = String.raw`\s*(?:[,|+&]|\s[–—-]\s|\s(?:and|en|plus)\s)\s*`
const TAIL = new RegExp(`^${PART}(?:${SEP}${PART})*$`, 'i')
// Obligaties: "coupon" als rente op een obligatie. Dan nooit.
const BOND = /\b(?:zero[- ]?coupons?|coupon[- ]?rates?|coupon[- ]?payments?|bonds?|obligaties?|obligatie|treasur(?:y|ies)|gilts?|yields?)\b/i
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

// De staart: alles na het openingsdeel (na de eerste dubbele punt, pijp of losse streep), of '' als die er niet is.
export function tailOf(title = '') {
  const t = String(title || '').replace(/\s+/g, ' ').trim()
  const m = /\s*[:|]\s*|\s[–—-]\s/.exec(t)
  return m ? t.slice(m.index + m[0].length).trim() : ''
}

// De kop: openingsdeel in de vorm, en een aanbod (staart) of een periode aan het eind van het openingsdeel.
export function couponHead(title) {
  const t = String(title || '')
  if (BOND.test(t)) return false
  const m = HEAD.exec(openingOf(t))
  if (!m) return false
  const tail = tailOf(t)
  if (tail) return TAIL.test(tail)
  return Boolean(m[1]) // geen staart: alleen met een periode in het openingsdeel
}
export const couponSlug = (url) => {
  const s = slugOf(url)
  return SLUG.test(s) && !BOND.test(s.replace(/-/g, ' '))
}
// Alle drie moeten gelden. `it` is een feeditem ({ title, link | guid }) of een Hoot-bericht ({ title, url }).
export const couponPage = (it = {}) => couponHead(it?.title) && couponSlug(it?.url || it?.link || it?.guid || '')
