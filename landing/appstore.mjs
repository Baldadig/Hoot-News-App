// De App Store-plekken van de landing: de pil in de held en in het slot, de regel in de belofte van het slot, de vraag
// "Is er een app?" en de smart app banner in Safari. Aan of uit met één regel in landing/build.mjs (APP_STORE).
export const APP_ID = '6828037269'
export const APP_URL = `https://apps.apple.com/nl/app/id${APP_ID}`

// Campagnelink uit App Store Connect (App Analytics, Campagnes). Alleen ct= meet niets: Apple telt een campagne
// pas met de provider-token pt= erbij. Zolang PT leeg is, blijven de links kaal. Alex vult PT in (inloggen in
// App Store Connect doet hij zelf); ct is per plek, zodat Apple de held en het slot apart laat zien.
export const PT = ''
export const appUrl = (plek) => (PT ? `${APP_URL}?pt=${encodeURIComponent(PT)}&ct=${encodeURIComponent('landing-' + plek)}&mt=8` : APP_URL)

// De pil: eigen vorm in huisstijl, 52 hoog, rond als de webknop, met het Apple-logo (symbool #i-apple in index.src.html).
// Bewuste keuze van Alex (13 november), wetend dat Apple's richtlijnen het losse logo buiten het officiële embleem niet
// toestaan ("Don't use the standalone Apple logo", App Store Marketing Guidelines).
const pil = (plek) => `<a class="wacht" href="${appUrl(plek)}" data-tel="as:${plek}"><svg class="wacht-i" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-apple"/></svg><span><small>Download in de</small> <b>App Store</b></span></a>`

// Belofte onder de knop. Klopt met het privacybeleid (src/views/Privacy.jsx: geen advertenties, geen trackers,
// "Hoot volgt je niet."); de eigen dagteller telt alleen totalen, zonder id of cookie.
export const ACCOUNT = 'Gratis, met of zonder account.<br>Geen advertenties. Hoot volgt je niet.'
// Buiten iPhone en iPad op een smalle telefoon: geen App Store-link (die opent daar niets), wel wat waar is.
const OOK = '<span class="ook-tel">Ook voor iPhone en iPad.</span>'

export function appStore(aan) {
  if (aan) return {
    APPSTORE_META: `\n<meta name="apple-itunes-app" content="app-id=${APP_ID}">`,
    APPSTORE_HELD: pil('held'),
    APPSTORE_SLOT: pil('slot'),
    APPSTORE_KIEST: pil('kiest'),
    APPSTORE_OOK: `<p class="ook">${OOK}</p>`,
    APPSTORE_EINDE: `${ACCOUNT}<br><span class="ook-as">Ook in de <a href="${appUrl('slot')}" data-tel="as:slot">App Store</a>.</span>${OOK}`,
    APP_URL_VRAAG: appUrl('vraag'),
  }
  // Nog niet (keuze r5-landing, 5 november): geen pil, geen vraag en geen "binnenkort". Alleen wat nu waar is.
  return { APPSTORE_META: '', APPSTORE_HELD: '', APPSTORE_SLOT: '', APPSTORE_KIEST: '', APPSTORE_OOK: '', APPSTORE_EINDE: ACCOUNT, APP_URL_VRAAG: '' }
}
