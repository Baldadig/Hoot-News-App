// "Goed om te weten.": de zeven vragen van de landing (review 13 november, deel 5). Eén bron voor de uitklaplijst
// in de pagina én het FAQPage-blok (JSON-LD) in de head, zodat ze nooit uit elkaar lopen. build.mjs vult {{VRAGEN}}
// en {{JSONLD}}. Geen aantal bronnen op de landing (besluit Alex 13 november): "Al jouw bronnen, jij kiest."
//
// Twee antwoorden zijn een voorzet van Claude (13 november) en wachten op Alex: "Waar leeft Hoot van?" en "Hoe kiest
// Hoot?". De AI-stap (HOOT_EDITIE_AI) staat uit; zet AI_STAP op true zodra hij aan staat, dan komt de zin erbij.
export const AI_STAP = false

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const kaal = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

// html mag een link bevatten (de App Store); het JSON-LD krijgt de kale tekst.
export function vragen({ appUrl }) {
  return [
    ['Is Hoot gratis?', 'Ja. Je leest meteen, zonder account. Met een gratis account staan je bronnen en je bewaarde artikelen op al je toestellen.'],
    ['Waar leeft Hoot van?', 'Hoot is gemaakt door Baldadig, in Nederland, en Baldadig betaalt de kosten zelf. Er zijn geen advertenties en Hoot verkoopt geen gegevens.'],
    ['Welke bronnen kan ik volgen?', 'Van NOS, NRC, de Volkskrant, NU.nl en RTL Nieuws tot regionale kranten, Vlaamse titels zoals De Standaard en internationale bronnen zoals The Guardian. Jij kiest welke je volgt.'],
    ['Kan ik ook betaalde artikelen lezen?', 'Voor betaalde artikelen gebruik je je eigen abonnement bij de uitgever. Hoot geeft geen extra toegang tot artikelen achter een betaalmuur.'],
    ['Hoe kiest Hoot?', 'Hoot kijkt waar jouw bronnen over schrijven: hoe meer bronnen een verhaal brengen, hoe hoger het staat, en wat je vaak leest telt mee. Een Editie heeft tien verhalen, vaak met één van buiten je bubbel. Waar het iets toevoegt, zie je waarom een verhaal erin staat.' +
      (AI_STAP ? ' Een taalmodel houdt aanbiedingen en aankondigingen eruit.' : '')],
    ['Wat is Vergelijken?', 'Hoot brengt artikelen over dezelfde gebeurtenis bij elkaar. Met Vergelijken zie je hoe elke bron erover schrijft en kies je welk bericht je leest.'],
    ['Is er een app?', appUrl
      ? `Ja, voor iPhone en iPad, in de <a href="${esc(appUrl)}" data-tel="as:vraag">App Store</a> in Nederland en België. Op Android en op je computer lees je Hoot in je browser.`
      : 'Nog niet. Op je telefoon en je computer lees je Hoot in je browser.'],
  ]
}

export const vragenHtml = (lijst) => lijst.map(([v, a]) => `<details>\n        <summary>${esc(v)}</summary>\n        <p>${a}</p>\n      </details>`).join('\n      ')

// Gestructureerde gegevens: de app en de vragen. Geen beoordelingen: er is er nog maar één.
export function jsonld({ lijst, appUrl, beschrijving }) {
  const app = {
    '@type': 'SoftwareApplication',
    name: 'Hoot',
    applicationCategory: 'NewsApplication',
    operatingSystem: 'iOS, iPadOS, web',
    inLanguage: 'nl',
    description: beschrijving,
    url: 'https://gethoot.app/',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    publisher: { '@type': 'Organization', name: 'Baldadig', url: 'https://baldadig.nl' },
  }
  if (appUrl) app.downloadUrl = appUrl
  const faq = { '@type': 'FAQPage', mainEntity: lijst.map(([v, a]) => ({ '@type': 'Question', name: v, acceptedAnswer: { '@type': 'Answer', text: kaal(a) } })) }
  // '<' als <: het blok kan nooit een </script> sluiten.
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': [app, faq] }).replace(/</g, '\\u003c')
}
