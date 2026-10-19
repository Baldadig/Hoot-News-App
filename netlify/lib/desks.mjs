// Rubrieken voor de editie — pure functies (getest in tests/desks.test.mjs).
// Elke editie probeert per rubriek het belangrijkste verhaal van het moment te hebben:
// binnenland, buitenland, VS, Midden-Oosten, Oekraïne en wetenschap (plus, in feed.mjs,
// één verhaal van buiten je bubbel).

export const DESKS = ['binnenland', 'buitenland', 'vs', 'middenoosten', 'oekraine', 'wetenschap']
export const DESK_LABEL = { binnenland: 'Binnenland', buitenland: 'Buitenland', vs: 'VS', middenoosten: 'Midden-Oosten', oekraine: 'Oekraïne', wetenschap: 'Wetenschap', bubbel: 'Buiten je bubbel' }

const NL_NEWS = new Set(['nos', 'nrc', 'volkskrant'])

const RE = {
  oekraine: /\b(oekra\w*|ukrain\w*|zelensk\w*|kyiv|kiev|kyjiv|kharkiv|charkiv|odesa|donetsk|donbas|krim|crimea|dnipro|kramatorsk)\b/i,
  middenoosten: /\b(israël|israel\w*|gaza|hamas|hezbollah|libanon|lebanon|iran\w*|teheran|tehran|khamenei|netanyahu|syri\w*|jemen|yemen|houthi\w*|irak|iraq|saudi\w*|westelijke jordaanoever|west bank|jordani\w*|qatar|golfstaten|midden-oosten|middle east|palestijn\w*|palestin\w*)\b/i,
  vs: /\b(trump|biden|vance|witte huis|white house|washington|congres\w*|congress|senaat|senate|republikein\w*|republican\w*|democra(at|ten|tic|ts)|pentagon|hegseth|midterms?|tussentijdse verkiezingen|amerikaan\w*|american|verenigde staten|united states|u\.s\.|new york|california|californi\w*|texas|florida|chicago|supreme court|hooggerechtshof|fbi|ice)\b/i,
  wetenschap: /\b(wetenschap\w*|onderzoekers|onderzoek toont|studie|scientist\w*|researchers|science|study finds|nobelprijs|nobel prize|klimaat\w*|climate|nasa|esa|astronom\w*|ruimtevaart|telescoop|telescope|natuurkunde|physics|biolog\w*|evolutie|evolution|dna|genetic\w*|genetica|vaccin\w*|medicijn|geneesmiddel|quantum|kwantum|archeolog\w*|fossiel|fossil|aardbeving|earthquake|vulkaan|volcano|neurolog\w*|hersenonderzoek)\b/i,
  buitenland: /\b(frankrijk|france|french|frans\w*|parijs|paris|duitsland|germany|german|duits\w*|berlijn|berlin|brit\w*|engeland|england|london|londen|verenigd koninkrijk|united kingdom|spanje|spain|itali\w*|polen|poland|belgi\w*|brussel|brussels|europese unie|european union|\beu\b|navo|nato|china|chinees|chinese|peking|beijing|taiwan|japan\w*|korea\w*|india\w*|pakistan|afghanistan|rusland|russia\w*|russisch\w*|poetin|putin|kremlin|moskou|moscow|turkije|turkey|erdogan|afrika|africa|nigeria|soedan|sudan|egypte|egypt|brazili\w*|mexico|venezuela\w*|maduro|argentini\w*|canada\w*|australi\w*|albani\w*|albane\w*|spaans\w*|pools\w*|turks\w*|griek\w*|zweed\w*|deens\w*|oostenrijk\w*|zwitser\w*|portug\w*|hongaar\w*|indiase|mexica\w*|canad\w*|egypt\w*|japans\w*|koreaan\w*|afrikaan\w*|europe\w*|europa|servi\w*|hongarije|hungary|orbán|griekenland|greece|zweden|noorwegen|denemarken|oostenrijk|zwitserland|ierland|portugal|tsjechi\w*|roemeni\w*|bulgarije|georgi\w*|armeni\w*|azerbeidzjan|wit-rusland|belarus|filipijnen|indonesi\w*|vietnam|thailand|myanmar|bangladesh|sri lanka|nepal|kenia|ethiopi\w*|somali\w*|congo|zuid-afrika|south africa|haïti|haiti|cuba|colombia|chili|peru)\b/i,
}

// Rubrieken van één bericht. `section` is de rubriek die de bron zelf meegeeft (de Volkskrant).
export function desksOf({ title = '', summary = '', text = '', source = '', url = '', section = '', cats = '' }) {
  const t = `${title} ${summary || text} ${cats}`
  const out = new Set()
  const sec = `${section} ${url}`.toLowerCase()
  if (RE.oekraine.test(t)) out.add('oekraine')
  if (RE.middenoosten.test(t)) out.add('middenoosten')
  if (RE.vs.test(t)) out.add('vs')
  if (RE.wetenschap.test(t) || /wetenschap|\/science\/|\/health\//.test(sec)) out.add('wetenschap')
  const foreign = out.has('oekraine') || out.has('middenoosten') || out.has('vs') || RE.buitenland.test(t) || /buitenland|\/world\//.test(sec)
  if (foreign && !out.has('oekraine') && !out.has('middenoosten') && !out.has('vs')) out.add('buitenland')
  // Binnenland: een Nederlandse nieuwsbron zonder buitenlands onderwerp (of rubriek Binnenland/Politiek).
  if ((NL_NEWS.has(source) && !foreign) || /binnenland|\/politiek\//.test(sec)) out.add('binnenland')
  return out
}

// Waar gaat een verhaal vooral over? De rubriek die bij de meeste publicaties terugkomt;
// bij gelijkspel wint de specifiekere (Oekraïne en Midden-Oosten vóór VS, VS vóór buitenland).
const PRIORITY = ['oekraine', 'middenoosten', 'wetenschap', 'vs', 'buitenland', 'binnenland']
export function primaryDesk(itemDesks = []) {
  const count = {}
  for (const set of itemDesks) for (const d of set) count[d] = (count[d] || 0) + 1
  let best = null
  for (const d of PRIORITY) if (count[d] && (!best || count[d] > count[best])) best = d
  // Alleen als minstens de helft van de publicaties erover gaat (één losse vermelding telt niet).
  return best && count[best] * 2 >= itemDesks.length ? best : null
}

// Hoe belangrijk "van het moment": dekking telt het zwaarst, versheid geeft een duw.
export function weight({ sourceCount = 1, ownCount = 1, latestAt }, now = Date.now()) {
  const h = latestAt ? (now - Date.parse(latestAt)) / 36e5 : 99
  return (ownCount > 0 ? 100 : 0) + sourceCount * 4 + (h <= 3 ? 4 : h <= 6 ? 3 : h <= 12 ? 1 : 0)
}
