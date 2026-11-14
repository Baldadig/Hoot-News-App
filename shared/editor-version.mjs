// Verhoog alleen wanneer de samenstelling van de Editie inhoudelijk verandert. Web, server en JavaScriptCore delen dit.
// Ronde 9 (7 november 2026): de taalregel verandert de kop van plekken van buiten je bronnen.
// Een nieuwe revisie geldt vanaf het volgende dagdeel: een Editie die al vaststaat, blijft staan (netlify/lib/edition-history.mjs).
// 11 november 2026: opinie in de Editie met de herkenning van de tab Opinie (shared/opinie.mjs); analyse is geen opinie.
// 11 november 2026, frisse ogen · 1: Buiten je bubbel met harde eisen (gratis, vers, geen liveblog of sport, nieuw
// onderwerp, niet eerder getoond: vandaag of in de vorige Editie), anders blijft de plek leeg.
// 11 november 2026, frisse ogen · ronde 2: één gebeurtenis één plek ook over de taalgrens; bovenaan nieuws (geen
// portretkop, geen bekend persoon in de top 3); de taalregel voor de top 3 en een vers Nederlands verhaal op 01; dun is
// aanvullen met gratis Nederlands nieuws, hooguit één eenbronsplek en drie plekken per bron.
// 11 november 2026, frisse ogen · ronde 2, poging 2: een bekend persoon op 02 of 03 zakt zelf onder de top 3 (geen kleiner
// verhaal erboven); de gratis aanvulling gebruikt de kenmerken van de selectie (rekentijd).
// 11 november 2026, frisse ogen · ronde 3: bij hetzelfde feit de gratis kop (NOS, NU.nl, RTL); Haagse dossiers op
// gedeelde namen als één plek; de Ochtendeditie een uur later en licht aangevuld; een rustige laatste noot; geen plek
// zonder rubriek, en de rubriek volgt het land van het onderwerp.
// 11 november 2026, filters-ai: aanbiedingen en kijk-/luisteraanbod uit de Editie, alleen bij een harde aanwijzing (A)
// of een zeker oordeel van de AI op de server (B); bij twijfel blijft een stuk staan.
// 13 november 2026, nieuw feit: één toets voor "nieuw feit" (newFact in netlify/lib/stories.mjs) voor wat in je vorige
// Editie stond én wat je las; een verhaal dat alleen groeit, komt niet terug en krijgt geen +10 meer. Wat alleen in je
// vorige Editie stond (niet gelezen), zakt één keer in plaats van te verdwijnen.
// 13 november 2026, één plek per cluster: verhalen van dezelfde dag over hetzelfde (een gedeelde naam in de koppen, met
// een tweede naam of dezelfde gebeurtenis) krijgen samen één plek, langs elke route (sameCluster in netlify/lib/stories.mjs).
// 13 november 2026, nl-opening: wie minstens drie Nederlandse nieuwsbronnen volgt en geen Binnenland koos, opent met het
// Nederlandse voorpaginaverhaal, als het een interesse raakt (nlOpener in netlify/lib/stories.mjs). Alleen de persoonlijke Editie.
// 13 november 2026, leeftijd: kopgrens en verhaalvenster 12 uur (was 24); een lopend verhaal (eerste stuk ouder dan 24 uur)
// alleen met een nieuw feit binnen het venster, hooguit twee per Editie; blijvers alleen als het verhaal nog geen 24 uur
// loopt; een leeftijdsstraf in het gewicht; ook in de persoonlijke Editie een kop van ná de vorige Editie; losse stukken
// minstens 10 uur (was 14).
// 13 november 2026, column: opinie is nooit de kop van een plek als er nieuws is (elke plek, niet alleen 01, en ook bij
// herkenning aan link of kop); een plek waarvan de meetellende stukken allemaal opinie zijn, valt weg (alleen-opinie);
// opinie ook herkend aan de rubriek uit de feed ("Opinie & columns", NRC "Ondertussen").
// 13 november 2026, bronnen: opiniebladen (`opinie` in de catalogus) zijn helemaal opinie, bundelen niet mee, komen pas
// achteraf als lid bij een verhaal en tellen niet in het aantal bronnen of de uitgevers (drempels voor groot nieuws);
// een uitgever met meer bronnen (`publisher`, de regionale omroepen) telt als één. Keuring: ook "Waar iedereen over
// schrijft" neemt nooit een opiniestuk als kop of als bewijs dat je bron erover schrijft (personal.js, widelyCovered).
// 14 november 2026, internationaal: tien Engelstalige bronnen erbij in de catalogus (Europa, de wereld van binnenuit en
// drie opiniebladen; geen Amerikaanse nieuwsbronnen, die zouden de drempels voor groot nieuws verschuiven); ze doen mee in de verhalen en het plafond voor buitenland (FOREIGN_NEWS), France 24 en
// RFI zijn één uitgever.
// 14 november 2026, amerika: de landenregel (COUNTRY_MAX in shared/edition-policy.mjs): per land buiten Nederland en
// Vlaanderen tellen hooguit FRONT_MIN uitgevers mee voor de telling van een verhaal (publisherCount, groot nieuws, het
// plafond voor buitenland, de familie van een verhaal). Axios en ProPublica erbij in de catalogus.
// 14 november 2026, wapo: The Washington Post erbij (World en Politics, één uitgever), Amerikaans en algemeen buitenlands
// nieuws (COUNTRIES, FOREIGN_NEWS), onder de landenregel.
// 14 november 2026, persona: gekozen interesses krijgen echt ruimte. Het plafond voor sport en cultuur (EXTRA_MAX) groeit
// mee met het aandeel daarvan in je keuze (extraMaxOf in src/lib/personal.js): alleen Cultuur en Sport geeft de helft van de
// Editie; de groei ruilt alleen lichte nieuwsplekken, nooit groot nieuws of de voorpagina. Valt een plek weg, dan eerst de
// volgende kandidaat uit je sport of cultuur, pas daarna de vulling.
// Persona · 2: één onderwerp hooguit TOPIC_MAX (2) plekken per persoonlijke Editie (sameTopic in netlify/lib/stories.mjs),
// één gebeurtenis in twee verhalen wordt één plek met de stukken van beide (samenvoegen in composePersonal), en geen
// snijvlak met een plaats (PLACE_HIT in shared/editor.mjs: Binnenland als plaats, een werelddeel of land).
// Persona · 3: de opening (keuze Alex: groot nieuws gaat voor). Plek 01 is groot nieuws of het sterkste stuk uit een gekozen
// interesse, niet vanzelf Binnenland (composePersonal, stap 7); zonder Wereld opent buitenlands nieuws niet.
// Persona · 4: geen plek voor een column in de ik-vorm, een dagoverzicht of een kop zonder informatie (shared/vorm.mjs, via
// excludedFromEdition, ook in de algemene Editie); Foreign Policy "Argument" is opinie (opinieRubriek).
// Persona · 5: Buiten je bubbel per lezer: niet van een bron die je volgt, niet uit een gekozen rubriek of je regio
// (shared/lezer.mjs), gratis en leesbaar; uit wat overblijft kiest je eigen zaad (jitter), niet voor iedereen hetzelfde.
// Persona · 6: de rubriek boven een plek kent de lezer (`rubriek` naast `desk`): sport en cultuur vóór de geografie, de
// geografie vanaf je thuisland (readerHome, belgianSubject); het label toont een subonderwerp alleen als het zeker is.
// Persona · 7: lokaal nieuws van elders (Amerikaans binnenland, een deelstaat; localAbroad) zakt in de persoonlijke Editie:
// pas na al het andere, nooit op 01 of als Waar iedereen over schrijft, tenzij groot nieuws.
// Persona · 8 (keuze Alex): wie geen Nederlandstalige bron volgt, krijgt buiten zijn bronnen geen Nederlands (languageRule).
// Persona · 10: wie niets kiest, krijgt de algemene Editie als basis met hooguit NO_CHOICE_FILL_MAX (2) vulplekken per rubriek.
// Persona · herstel na de keuring (14 november): samenvoegen alleen bij dezelfde gebeurtenis (sameEventToMerge: een gedeelde
// verkiezing is geen gebeurtenis; het leidende stuk van een los verhaal, niet een ander stuk of het cluster). De vorige
// revisie vooraan in EARLIER_REVISIONS is die van main (recensies): persona zelf is nooit uitgerold.
// Persona · herstel, punt 4: "Naam: citaat" is geen ik-vorm; alleen "/" of "|" als rubriekscheiding maakt van Ik/Mijn een
// column, achter een dubbele punt alleen het Engelse rubriekpatroon (shared/vorm.mjs).
export const EDITOR_REVISION = 'redacteur-2026-11-14-persona-2'
// De afdruk van je bronnen en interesses (editionBasis in src/lib/personal.js) rekent met een vaste waarde, niet meer
// met de revisie (Redacteur op de server, 11 november 2026). De server legt de Editie vast; app 1.2 rekent de afdruk
// met de rekenkern die erin zit. Veranderde de afdruk bij elke revisie, dan paste de Editie van de server nooit bij
// die van de iPhone, en toonden web en app elk een andere Editie. Een nieuwe revisie geldt nu vanaf het volgende
// dagdeel, ook voor de persoonlijke Editie. Nooit veranderen: dit is de waarde die app 1.2 meerekent.
export const BASIS_REVISION = 'redacteur-2026-11-07-taalregel'
// Eerdere revisies, nieuwste eerst. Zet bij elke verhoging de vorige revisie vooraan: daaruit komt de vorige Editie
// ("wat stond er al") en de Editie die tot het volgende dagdeel blijft staan.
export const EARLIER_REVISIONS = ['redacteur-2026-11-14-recensies', 'redacteur-2026-11-14-deals', 'redacteur-2026-11-14-dubbelcheck2', 'redacteur-2026-11-14-luister-2', 'redacteur-2026-11-14-wapo', 'redacteur-2026-11-14-amerika', 'redacteur-2026-11-14-internationaal', 'redacteur-2026-11-14-raakt-volgorde', 'redacteur-2026-11-14-derde-taal', 'redacteur-2026-11-14-achterklap', 'redacteur-2026-11-14-sport-bubbel', 'redacteur-2026-11-14-zonder-url', 'redacteur-2026-11-13-bronnen', 'redacteur-2026-11-13-column', 'redacteur-2026-11-13-leeftijd', 'redacteur-2026-11-13-nl-opening', 'redacteur-2026-11-13-een-plek-per-cluster', 'redacteur-2026-11-13-nieuw-feit', 'redacteur-2026-11-11-filters-ai', 'redacteur-2026-11-11-frisse-ogen-5', 'redacteur-2026-11-11-frisse-ogen-4', 'redacteur-2026-11-11-frisse-ogen-3', 'redacteur-2026-11-11-frisse-ogen-2', 'redacteur-2026-11-11-bubbel', 'redacteur-2026-11-11-opinie', 'redacteur-2026-11-07-taalregel', 'redacteur-2026-11-02-beta2', 'redacteur-2026-11-02-beta1', 'redacteur-2026-11-01-r2']
// Bewuste herbouw: noem hier een dagdeel (bijv. '2026-11-07-middag') om de Editie van dat dagdeel onder deze revisie
// opnieuw samen te stellen, ook als hij onder een eerdere revisie al vaststaat. Anders null.
export const EDITION_REBUILD_SLOT = null
export const editionCacheKey = (id, revision = EDITOR_REVISION) => `edition-${revision}-${id}`
// Onder welke revisie de Editie van een dagdeel is vastgelegd (een korte notitie, los van de revisie in de sleutel).
export const editionRevisionKey = id => `edition-revision-${id}`
