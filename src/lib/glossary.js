// Begrippen uit het nieuws, kort uitgelegd — pure functies (tests/glossary.test.mjs).
// Een vaste, nagelopen lijst (geen AI): neutraal, één of twee zinnen, met Wikipedia als bron om
// verder te lezen. Alleen begrippen die vaak in Nederlandstalig nieuws staan en die niet
// iedereen paraat heeft. Een begrip toevoegen: een regel erbij, met een `match` die het woord
// (en zijn vormen) vindt maar geen gewone woorden die er toevallig op lijken.
const wiki = (q) => `https://nl.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}`

export const TERMS = [
  { term: 'informateur', match: /\binformateurs?\b/i, text: 'Onderzoekt na verkiezingen welke partijen samen een kabinet kunnen vormen, en waarover ze het eens zouden moeten worden.', source: wiki('Informateur') },
  { term: 'formateur', match: /\bformateurs?\b/i, text: 'Stelt bij een kabinetsformatie het nieuwe kabinet samen en zoekt de ministers en staatssecretarissen. Meestal wordt de formateur zelf premier.', source: wiki('Formateur') },
  { term: 'motie van wantrouwen', match: /\bmoties? van wantrouwen\b/i, text: 'Een voorstel in het parlement om een minister of het kabinet het vertrouwen op te zeggen. Krijgt die een meerderheid, dan treedt de bewindspersoon in de regel af.', source: wiki('Motie van wantrouwen') },
  { term: 'Eerste Kamer', match: /\bEerste Kamer\b/, text: 'De senaat van Nederland. Stemt als laatste over wetsvoorstellen en kan ze aannemen of verwerpen, maar niet wijzigen.', source: wiki('Eerste Kamer der Staten-Generaal') },
  { term: 'Raad van State', match: /\bRaad van State\b/, text: 'Adviseert regering en parlement over wetsvoorstellen en is de hoogste algemene bestuursrechter van Nederland.', source: wiki('Raad van State (Nederland)') },
  { term: 'Hoge Raad', match: /\bHoge Raad\b/, text: 'De hoogste Nederlandse rechter in strafzaken, civiele zaken en belastingzaken.', source: wiki('Hoge Raad der Nederlanden') },
  { term: 'cassatie', match: /\bcassatie\b/i, text: 'Beroep bij de Hoge Raad. Die kijkt alleen of het recht goed is toegepast, niet opnieuw naar de feiten.', source: wiki('Cassatie') },
  { term: 'hoger beroep', match: /\bhoger beroep\b/i, text: 'Een zaak opnieuw laten behandelen door een hogere rechter; in Nederland meestal het gerechtshof.', source: wiki('Hoger beroep') },
  { term: 'kort geding', match: /\bkort geding\b/i, text: 'Een snelle procedure bij de rechter voor zaken die haast hebben. De uitspraak is voorlopig.', source: wiki('Kort geding') },
  { term: 'Openbaar Ministerie', match: /\bOpenbaar Ministerie\b|\bhet OM\b/, text: 'De organisatie die strafbare feiten vervolgt en verdachten voor de rechter brengt.', source: wiki('Openbaar Ministerie (Nederland)') },
  { term: 'AIVD', match: /\bAIVD\b/, text: 'De Algemene Inlichtingen- en Veiligheidsdienst: onderzoekt dreigingen voor de nationale veiligheid van Nederland.', source: wiki('Algemene Inlichtingen- en Veiligheidsdienst') },
  { term: 'toeslagenaffaire', match: /\btoeslagen(affaire|schandaal)\b/i, text: 'Schandaal waarin de Belastingdienst duizenden ouders onterecht als fraudeur behandelde en kinderopvangtoeslag terugvorderde.', source: wiki('Toeslagenaffaire') },
  { term: 'box 3', match: /\bbox 3\b/i, text: 'Het deel van de inkomstenbelasting voor sparen en beleggen. De Hoge Raad oordeelde in 2021 dat de oude manier van belasten niet mocht; het stelsel wordt herzien.', source: wiki('Box 3') },
  { term: 'cao', match: /\bcao'?s?\b/i, text: 'Collectieve arbeidsovereenkomst: afspraken over loon en arbeidsvoorwaarden tussen werkgevers en vakbonden.', source: wiki('Collectieve arbeidsovereenkomst') },
  { term: 'stikstof', match: /\bstikstof(crisis|uitstoot|regels)?\b/i, text: 'Stikstofverbindingen uit vooral landbouw, verkeer en industrie schaden de natuur. Daarom gelden in Nederland strenge regels voor bouwen en boeren.', source: wiki('Stikstofcrisis in Nederland') },
  { term: 'inflatie', match: /\binflatie\b/i, text: 'Het stijgen van het algemene prijsniveau: met hetzelfde geld kun je minder kopen.', source: wiki('Inflatie') },
  { term: 'recessie', match: /\brecessie\b/i, text: 'Een periode waarin de economie krimpt; vaak: twee kwartalen op rij krimp.', source: wiki('Recessie') },
  { term: 'bbp', match: /\bbbp\b/i, text: 'Bruto binnenlands product: de waarde van alles wat een land in een jaar produceert. Een maat voor de omvang van de economie.', source: wiki('Bruto binnenlands product') },
  { term: 'ECB', match: /\bECB\b/, text: 'De Europese Centrale Bank: bepaalt de rente voor de landen met de euro en moet de prijzen stabiel houden.', source: wiki('Europese Centrale Bank') },
  { term: 'Europese Commissie', match: /\bEuropese Commissie\b/, text: 'Het dagelijks bestuur van de Europese Unie: stelt nieuwe Europese wetten voor en ziet toe op de naleving.', source: wiki('Europese Commissie') },
  { term: 'importheffing', match: /\b(import|invoer)(heffing|tarie)\w*/i, text: 'Een belasting op goederen uit het buitenland. Die worden daardoor duurder.', source: wiki('Invoerrecht') },
  { term: 'sancties', match: /\bsancties\b/i, text: 'Strafmaatregelen tegen een land, bedrijf of persoon, zoals handelsbeperkingen of het bevriezen van tegoeden.', source: wiki('Sanctie') },
  { term: 'NAVO', match: /\bNAVO\b/, text: 'Militair bondgenootschap van Noord-Amerikaanse en Europese landen. Een aanval op één lid geldt als een aanval op allemaal (artikel 5).', source: wiki('NAVO') },
  { term: 'VN-Veiligheidsraad', match: /\b(VN-)?Veiligheidsraad\b/, text: 'Het orgaan van de Verenigde Naties dat besluit over internationale vrede en veiligheid. De vijf vaste leden hebben een vetorecht.', source: wiki('Veiligheidsraad van de Verenigde Naties') },
  { term: 'Internationaal Strafhof', match: /\bInternationaal Strafhof\b|\bICC\b/, text: 'Het strafhof in Den Haag dat personen vervolgt voor genocide, oorlogsmisdaden en misdaden tegen de menselijkheid.', source: wiki('Internationaal Strafhof') },
  { term: 'staakt-het-vuren', match: /\b(staakt-het-vuren|wapenstilstand)\b/i, text: 'Een afspraak tussen strijdende partijen om, tijdelijk of voorgoed, op te houden met vechten.', source: wiki('Wapenstilstand') },
  { term: 'Hamas', match: /\bHamas\b/, text: 'Palestijnse islamistische beweging die sinds 2007 de Gazastrook bestuurt. De EU en de VS merken haar aan als terroristische organisatie.', source: wiki('Hamas') },
  { term: 'Hezbollah', match: /\bHezbollah\b/, text: 'Libanese sjiitische beweging met een politieke partij en een gewapende tak, gesteund door Iran.', source: wiki('Hezbollah') },
  { term: "Houthi's", match: /\bHouthi'?s?\b/, text: 'Jemenitische opstandelingenbeweging die grote delen van Jemen bestuurt, gesteund door Iran. Bekend van aanvallen op de scheepvaart in de Rode Zee.', source: wiki('Houthi') },
  { term: 'Kremlin', match: /\bKremlin\b/, text: 'Het regeringscentrum in Moskou. In het nieuws staat het vaak voor de Russische president en regering.', source: wiki('Kremlin (Moskou)') },
  { term: 'midterms', match: /\bmidterms?\b|\btussentijdse verkiezingen\b/i, text: 'Amerikaanse verkiezingen halverwege de termijn van de president. Dan worden het hele Huis van Afgevaardigden en een derde van de Senaat gekozen.', source: wiki('Midterm elections') },
  { term: 'impeachment', match: /\bimpeachment\b|\bafzettingsprocedure\b/i, text: 'In de VS de procedure om bijvoorbeeld de president af te zetten: het Huis van Afgevaardigden klaagt aan, de Senaat oordeelt.', source: wiki('Impeachment') },
]

// De begrippen die in een tekst voorkomen, in volgorde van de lijst; hooguit `max`.
export function termsIn(text = '', max = 2) {
  const found = []
  for (const t of TERMS) {
    if (found.length >= max) break
    if (t.match.test(text)) found.push(t)
  }
  return found
}
