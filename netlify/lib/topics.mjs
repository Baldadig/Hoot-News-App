// Onderwerpen op trefwoord. De id's komen overeen met src/lib/topics.js.
const KW = [
  ['trump', /\btrump\b/i],
  ['vs-politiek', /\b(verkiezing|election|senate|senaat|congress|congres|white house|witte huis|republikein|republican|democraat|democrat|\bgop\b|biden|kamala|harris|supreme court|hooggerechtshof|pentagon|capitol|vance|united states politics|house of representatives|justice department)\b/i],
  ['oekraine', /\b(oekra|ukrain|zelensk|poetin|putin|kyiv|kiev|kremlin|donetsk|donbas|moskou|moscow)\b/i],
  ['geopolitiek', /\b(geopolit|china|taiwan|\beu\b|navo|nato|midden-oosten|israel|israël|gaza|iran|noord-korea|north korea|xi jinping|sancties|sanctions|handelsoorlog|tariff|tarieven|brussel|brussels|zuid-china)\b/i],
  ['ai', /\b(kunstmatige intelligentie|artificial intelligence|\ba\.?i\.?\b|openai|chatgpt|anthropic|\bclaude\b|gemini|\bllm\b|machine learning|deepmind|nvidia|copilot)\b/i],
  ['tech', /\b(apple|iphone|ipad|macbook|google|alphabet|android|chrome|\bmeta\b|facebook|instagram|whatsapp|microsoft|windows|\bamazon\b|tesla|spacex|twitter|tiktok|bytedance|intel|\bamd\b|tsmc|samsung|huawei|chips?|halfgeleider|semiconductor|big tech|techbedrijf|techgigant|technolog|smartphone|gadget|app store|netflix|spotify)\b/i],
  ['wetenschap', /\b(wetenschap|wetenschapp|onderzoekers|scientist|researchers|science|nobelprijs|nobel prize|klimaatverandering|climate change|\bnasa\b|\besa\b|astronom|ruimtevaart|natuurkunde|fysica|biolog|geneeskund|gezondheid|vaccin|\bdna\b|genetica|kanker|quantum|kwantum|telescoop|deeltjes|archeolog|evolutie|neurolog)\b/i],
  ['economie', /\b(econom|beurs|aandel|inflatie|\brente\b|\becb\b|\bfed\b|federal reserve|recessie|begroting|\bbbp\b|werkloosheid|dow jones|nasdaq|wall street|kwartaalcijfers|bedrijfswinst|fusie|overname|faillis|olieprijs|gasprijs|energieprijs|valuta|wisselkoers|belasting|subsidie|koopkracht|\bbtw\b|lonen|omzet|woningmarkt|hypotheek|handelsverdrag|handelsregels|megafusie|werkgevers|vakbond|inflation|interest rates|stock market|stocks and bonds|unemployment|layoffs|merger|acquisition|bankrupt)\b/i],
  ['muziek', /\b(album|single|concert|festival|popmuziek|band|zanger|zangeres|rapper|songwriter|tournee|tour dates|setlist|grammy|edison|spotify-hitlijst|hitlijst|top 40|lowlands|pinkpop|paradiso|melkweg|eurovisie|eurovision|songfestival)\b/i],
  ['nederland', /\b(kabinet|tweede kamer|eerste kamer|den haag|binnenhof|catshuis|prinsjesdag|miljoenennota|rijksoverheid|gemeenteraad|provinciale staten|waterschap|coalitie|formatie|stikstof|toeslag|asielzoeker|asielbeleid|minister van|staatssecretaris|\bpvv\b|\bvvd\b|\bd66\b|groenlinks|\bpvda\b|\bcda\b|\bsgp\b|\bbbb\b|wilders|schoof|timmermans|yesilgoz|omtzigt)\b/i],
]
export function keywordTopics(text) {
  const out = []
  for (const [id, re] of KW) if (re.test(text)) out.push(id)
  if (out.includes('trump') && !out.includes('vs-politiek')) out.push('vs-politiek')
  return out
}
