// Kortingscode-pagina's (Redacteur · kortingscodes, 12 november 2026). Besluit van Alex: een pagina die alleen
// kortingscodes van één winkel of dienst verzamelt ("Nike Promo Codes and Discounts: 30% for November 2026",
// wired.com/story/nike-promo-code/) hoort niet in de Stroom en dus ook nooit in de Editie. Wired deelt zulke pagina's vaak
// alleen als "Gear" in, zodat de bronregel op "Gear / Deals" (rss.mjs, sourceDeal) ze niet vangt.
//
// Per bron (kortingscodes · 3), net als `dealsCategory`: alleen een bron die in sources.mjs `couponPages: true` zet doet
// mee (nu alleen Wired). Drie keuringen lieten zien dat een los kenmerk (een getal, "Off", "May") nieuws blijft raken: een
// nieuwskop opent vaak met precies dezelfde woorden ("Temu coupons: …", "Honey Coupons: The PayPal Extension Accused of …").
// Daarom is het sinds kortingscodes · 5 een gesloten woordenschat: een kop is een codepagina als hij, na normalisatie
// (│ → |, $N → N, apostrofs weg, & → and, percent → %), woord voor woord bestaat uit:
//   a. de merknaam uit de slug (de slugwoorden vóór het codewoord, aaneengeschreven vergeleken: "hr-block" = "H&R Block"),
//      eventueel voorafgegaan door alleen een kortingsvorm ("25% Off Adidas Promo Code"), en geen vrij woord ervoor;
//   b. direct daarna een codewoord (promo, coupon, discount, code, codes, …);
//   c. en verder UITSLUITEND woorden uit de gesloten lijst LIST (codewoorden, opsommings- en aanbodwoorden), getallen,
//      maandnamen en jaartallen, plus hooguit 3 productcategoriewoorden ná een kortingsvorm ("30% Off Rugs");
//   d. en er staat minstens één kortingsvorm in (N%, N off, save up to N, free shipping, free trial, of maand + jaar).
// Elk ander woord (een werkwoord, een zinsdeel) maakt het GEEN codepagina: bij twijfel blijft het stuk staan.
// Daarnaast gelden twee eisen voor elke bron: de link heeft /story/ in het pad (de linkvorm van Wired's codepagina's;
// …/2006/08/<slug>/ is oud nieuws) en de slug is "<1 tot 4 woorden>-<codewoord>", eventueel met id-achtervoegsel
// (nike-promo-code, nordvpn-coupon, airdoctor-coupon-code, hydrow-discount-code). Het codewoord staat ook in het
// openingsdeel van de kop (tot de eerste dubbele punt, pijp of losse streep). Nooit als het over obligaties gaat
// (zero coupon, coupon rate, bond, obligatie): "coupon" is ook een obligatieterm.
const HEAD = /\b(?:promo[- ]?codes?|coupon[- ]codes?|coupons?|discount[- ]codes?)\b/i
const SLUG = /^(?:[a-z0-9]+-){1,4}(?:promo-codes?|coupon-codes?|coupons?|discount-codes?)(?:-\d+)?$/
const BOND = /\b(?:zero[- ]?coupons?|coupon[- ]?rates?|coupon[- ]?payments?|bonds?|treasur(?:y|ies)|gilts?|yields?|debts?|auctions?)\b|obligatie/i

const CODEWORD = new Set(['promo', 'promos', 'coupon', 'coupons', 'discount', 'discounts', 'code', 'codes'])
// Gesloten lijst: opsommings- en aanbodwoorden die na het codewoord mogen staan (naast CODEWORD, getallen, maanden, jaartallen).
const LIST = new Set([...CODEWORD, 'and', 'plus', 'deals', 'deal', 'offers', 'savings', 'sale', 'sales', 'for', 'this', 'in', 'up', 'to', 'get',
  'save', 'off', 'free', 'shipping', 'trial', 'month', 'months', 'sitewide', 'select', 'plans', 'exclusive', 'best', 'referral', 'membership',
  'gift', 'card', 'cards', 'on'])
const MONTH = /^(?:january|february|march|april|may|june|july|august|september|october|november|december)$/
const MONTH_YEAR = /\b(?:january|february|march|april|may|june|july|august|september|october|november|december) (?:20\d\d)\b/
const FORM = /\d+ ?%|\b\d+ off\b|\bsave up to \d|\bfree shipping\b|\bfree trial\b/
const MAX_CAT = 3
// Gesloten lijst productwoorden (kortingscodes · 6, keuring 5: een open vak liet "40% Off Bikes Recalled" door). Alleen de
// woorden die Wired's echte codepagina's na een kortingsvorm gebruiken; elk ander woord maakt de kop een zin.
const PRODUCT = new Set(['meal', 'meals', 'prep', 'healthy', 'rugs', 'appliances', 'hosting', 'headphones', 'headsets', 'more', 'llc',
  'formations', 'stock', 'advisor', 'bathroom', 'kitchen', 'diy', 'tax', 'pro', 'assist', 'plans'])
// Een productcategoriewoord is een zelfstandig naamwoord, nooit een voorzetsel, lidwoord of werkwoord ("at scam shops",
// "with student ID", "Is Coming"): zo'n woord maakt de kop een zin, dus geen codepagina.
const STOP = new Set(['at', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'of', 'the', 'a', 'an', 'it', 'its',
  'their', 'they', 'that', 'which', 'who', 'whom', 'whose', 'when', 'while', 'where', 'why', 'how', 'what', 'not', 'no', 'but', 'or', 'if',
  'than', 'then', 'so', 'we', 'you', 'your', 'our', 'us', 'has', 'have', 'had', 'will', 'would', 'can', 'could', 'might', 'must', 'do', 'does',
  'did', 'into', 'over', 'under', 'about', 'after', 'before', 'during', 'amid', 'per', 'via', 'now', 'just', 'only', 'too', 'out'])
// Normalisatie: │ → |, $N → N, apostrofs weg, & → and (of weg, voor "H&R"), "10 percent" → "10%".
const norm = (s, amp) => String(s || '').toLowerCase().replace(/[│]/g, '|').replace(/['’`]/g, '').replace(/\$(?=\d)/g, '')
  .replace(/(\d)\s*(?:%|percent)/g, '$1%').replace(/\bpercent\b/g, '%').replace(/(\w)\+/g, '$1 plus ').replace(/&/g, amp)
const toks = (s, amp) => norm(s, amp).split(/[^a-z0-9%]+/).filter(Boolean)
const isNum = (w) => /^\d+%?$/.test(w) || w === '%'
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
// Een kortingsvorm vooraan ("25% Off", "Save Up to 20%", "Free Shipping") vóór de merknaam: alleen die woorden.
const LEAD = new Set(['save', 'up', 'to', 'get', 'off', 'free', 'shipping', 'trial', 'exclusive'])
function afterLead(t) {
  let i = 0
  let num = false
  while (i < t.length && (isNum(t[i]) || LEAD.has(t[i]))) {
    if (isNum(t[i])) num = true
    i++
  }
  return num || (t[0] === 'free' && (t[1] === 'shipping' || t[1] === 'trial')) ? i : 0
}
// Past de kop woord voor woord in het gesloten patroon? `amp` bepaalt of & "and" wordt of wegvalt (H&R Block).
function closedForm(title, brands, amp) {
  const t = toks(title, amp)
  const start = afterLead(t)
  let i = start
  while (i < t.length && !CODEWORD.has(t[i])) i++
  if (i === start || i >= t.length || !brands.includes(t.slice(start, i).join(''))) return false
  let cats = 0
  let afterForm = start > 0 // een kortingsvorm vooraan geldt ook als aanloop voor categoriewoorden
  const rest = t.slice(i)
  for (let k = 0; k < rest.length; k++) {
    const w = rest[k]
    if (w === 'up' && rest[k + 1] !== 'to') return false // "up" alleen in "up to N"; "Sales Up 40%" is een bewering
    if (LIST.has(w) || isNum(w) || MONTH.test(w) || /^20\d\d$/.test(w)) {
      if (w === 'off' || /%$/.test(w)) afterForm = true
      continue
    }
    if (!afterForm || STOP.has(w) || !PRODUCT.has(w) || ++cats > MAX_CAT) return false
  }
  const txt = norm(title, 'and')
  return FORM.test(txt) || MONTH_YEAR.test(txt) || start > 0
}
// Het gesloten patroon (a tot en met d), zie het commentaar bovenaan.
export const couponClosed = (title, url) => {
  const w = slugOf(url).replace(/(?:-\d+)?$/, '').split('-').filter((x) => x && !CODEWORD.has(x))
  // De merknaam uit de slug: de slugwoorden vóór het codewoord, of een aaneengesloten stuk ervan ("alo-yoga" → Alo,
  // "the-motley-fool" → Motley Fool). Aaneengeschreven vergeleken, zodat "hr-block" en "H&R Block" matchen.
  const brands = []
  for (let a = 0; a < w.length; a++) for (let b = a + 1; b <= w.length; b++) brands.push(w.slice(a, b).join(''))
  if (!brands.length) return false
  return closedForm(title, brands, ' and ') || closedForm(title, brands, '')
}
export const couponPath = (url) => {
  const m = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*([^?#]*)/i.exec(String(url || '').trim())
  return !!m && /\/story\//i.test(m[1])
}
// `it` is een feeditem ({ title, link | guid }) of een Hoot-bericht ({ title, url }); `src` de bron uit sources.mjs.
export const couponPage = (it = {}, src = null) => {
  if (src?.couponPages !== true) return false
  const url = it?.url || it?.link || it?.guid || ''
  if (!couponHead(it?.title) || !couponSlug(url) || !couponPath(url)) return false
  return couponClosed(it?.title, url)
}
