// Een bron-deel (/api/feed?bron=…) draagt twee lijsten in één: de Stroom (per bron alles van de
// afgelopen 36 uur, hooguit 60) en de voeding van de Editie (het oude venster: de eerste 30 berichten
// van de feed, per rubriek minder). Meestal valt dat samen; waar niet, zegt het bericht het zelf
// (netlify/lib/build.mjs):
//   editionOnly: ouder dan 36 uur (of voorbij de 60), alleen voor De Redacteur; niet in de Stroom.
//   streamOnly:  alleen in de Stroom (een drukke bron reikt daar verder); niet voor De Redacteur.
// Zo stelt de Editie samen uit precies dezelfde berichten als vóór de 36-uursgrens. Een oudere app
// kent de vlaggen niet: die toont alles en rekent met alles, zoals voorheen.
// Gedeeld door de website (Stroom, De Redacteur) en de server; iOS doet hetzelfde in HootStore.swift.
export const inStroom = (it) => !it?.editionOnly
export const forEdition = (it) => !it?.streamOnly
