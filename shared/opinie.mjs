// Opinie in de Stroom (besluit Alex 10 november 2026): de server zet `opinion: true` op elk stuk dat de
// uitgever zelf als mening brengt: een column, commentaar, opiniestuk, ingezonden brief of hoofdredactioneel
// commentaar. De Stroom toont daarmee de tab Opinie; het stuk blijft ook in zijn rubriek en in Alles.
//
// Alleen wat de uitgever zelf zegt, nooit een oordeel over de toon van een kop:
//  - het soort uit de rss (`type: 'opinie'`, netlify/lib/rss.mjs) of de rubriek (`section`);
//  - een map in de link: /opinie/, /opinies/, /opinion/, /meningen/, /columns/, /column/, /commentaar/,
//    /commentisfree/, /political-commentary/, /china-opinion/, /opinie-column/, /columns-van-de-dag/ …;
//  - een link die met "column-" begint (DPG: /voetbal/column-sjoerd-mossou-…);
//  - een label voor in de kop: "Opinie:", "Column |", "Column Sjoerd Mossou | …", "COLUMN. …";
//  - een kop die opent met de naam van de schrijver zelf ("Valentijn Driessen: ’…’", auteur Valentijn
//    Driessen): zo tekent een columnist, een verslaggever zet zijn eigen naam niet boven het nieuws;
//  - een paar rubrieken die alleen bij één uitgever mening zijn (The Atlantic /ideas/, The Economist
//    /leaders/ en /by-invitation/, The Independent /voices/).
//  - de naam van de schrijver áchter de laatste "|" van de kop ("Het kabinet moet kiezen | Jan de Vries",
//    de Guardian-vorm; keuring opinie-tab, aanbeveling 1), weer precies de auteur;
//  - ingezonden brieven van De Telegraaf in de map /wat-u-zegt/ (keuring opinie-tab, aanbeveling 2).
// Geen opinie: analyse, achtergrond, uitleg, recensie, review, nieuwsbrief, liveblog. Ook Al Jazeera's
// /news-analysis/ niet. En een woord in de slug ("…-keeps-opinion-…", "…-comments", "The Durutti Column")
// is geen map en dus geen signaal.
//
// Sinds 11 november (besluit Alex) rekent ook de Editie hiermee: isOpinion in shared/article-signals.mjs
// ("nooit opinie op 01") gebruikt deze herkenning, op de server, het web en de iPhone (edition-core.js).

const DIR = /^(opinie[a-z-]*|opinies|opinion|opinions|[a-z]+-opinion|meningen|mening|columns?|columns-[a-z-]+|columnisten|commentaar|commentisfree|[a-z]+-commentary|opinion-and-essays|wat-u-zegt)$/i
const HOST_DIR = [
  [/(^|\.)theatlantic\.com$/i, /^ideas$/i],
  [/(^|\.)economist\.com$/i, /^(leaders|by-invitation)$/i],
  [/(^|\.)independent\.co\.uk$/i, /^voices$/i],
]
const SLUG = /^columns?-[a-z]/i
const LABEL = /^(opinie|opinies|opinion|column|columns|columnisten|commentaar|commentary|ingezonden|ingezonden brief|meningen|hoofdredactioneel)$/i
// "Opinie: …", "Column | …", "Ingezonden brief: …", "Column Sjoerd Mossou | …" (naam tussen label en streep).
const TITLE = /^\W*(?:(?:opinie|opinion|column|commentaar|ingezonden(?: brief)?|hoofdredactioneel(?: commentaar)?)\s*[:|]|column\s+[^:|.!?]{2,40}\s\|)/i
// Belgische kranten: "COLUMN. …", "OPINIE. …" (in hoofdletters, zoals "RECENSIE." en "LIVE.").
const TITLE_CAPS = /^\W*(OPINIE|COLUMN|COMMENTAAR)\.\s/

const plain = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

function urlSignal(raw) {
  let u
  try {
    u = new URL(String(raw || ''))
  } catch {
    return false
  }
  const parts = u.pathname.split('/').filter(Boolean)
  if (!parts.length) return false
  const dirs = parts.slice(0, -1)
  if (dirs.some((d) => DIR.test(d))) return true
  const host = u.hostname
  if (HOST_DIR.some(([h, d]) => h.test(host) && dirs.some((x) => d.test(x)))) return true
  return SLUG.test(parts[parts.length - 1])
}

// De kop opent met de naam van de schrijver, gevolgd door een dubbele punt: "Rob Hoogland: wat jammer …".
// Minstens twee woorden, en precies de auteur (geen "Trump:" boven een stuk van een verslaggever).
function signedBySelf(item) {
  const author = plain(item.author)
  if (!author || !author.includes(' ')) return false
  const m = /^([^:|]{3,60}):\s/.exec(String(item.title || ''))
  return !!m && plain(m[1]) === author
}

// Het spiegelbeeld: de naam van de schrijver áchter de laatste "|" van de kop ("… | Jan de Vries").
function signedAtEnd(item) {
  const author = plain(item.author)
  if (!author || !author.includes(' ')) return false
  const title = String(item.title || '')
  const at = title.lastIndexOf('|')
  return at > 0 && plain(title.slice(at + 1)) === author
}

export function isOpinie(item = {}) {
  if (!item || item.kind === 'post') return false
  if (item.type === 'opinie') return true
  if (urlSignal(item.url)) return true
  if (LABEL.test(String(item.section || '').trim())) return true
  const title = String(item.title || '')
  return TITLE.test(title) || TITLE_CAPS.test(title) || signedBySelf(item) || signedAtEnd(item)
}

// Voor de website: een bericht uit een feed van vóór dit veld draagt alleen `type`.
export const opinieInStroom = (item) => item?.opinion === true || item?.type === 'opinie'
