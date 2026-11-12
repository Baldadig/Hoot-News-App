// De App Store-plekken van de landing: de pil in de held (op mobiel een regel), de lead en de regel in het slot, de vraag
// en de smart app banner in Safari. Aan of uit met één regel in landing/build.mjs (APP_STORE).
// Uit tot de App Store-pagina bereikbaar is; dan zet Claude APP_STORE op true en bouwt opnieuw.
export const APP_ID = '6828037269'
export const APP_URL = `https://apps.apple.com/nl/app/id${APP_ID}`

const MARK = '<svg class="wacht-i" viewBox="0 0 82.15 72" aria-hidden="true"><use href="#mark"/></svg>'
// Belofte onder de knop (audit punt 2). Klopt met het privacybeleid (src/views/Privacy.jsx: geen advertenties,
// geen trackers, "Hoot volgt je niet."); de eigen dagteller telt alleen totalen, zonder id of cookie.
const ACCOUNT = 'Gratis, met of zonder account.<br>Geen advertenties. Hoot volgt je niet.'

export function appStore(aan) {
  if (aan) return {
    APPSTORE_META: `\n<meta name="apple-itunes-app" content="app-id=${APP_ID}">`,
    APPSTORE_HELD: `<a class="wacht" href="${APP_URL}">${MARK}<span><small>Download in de</small> <b>App Store</b><em class="wacht-gratis">${ACCOUNT}<br><u>Download Hoot in de App Store</u></em></span></a>`,
    APPSTORE_EINDE: `${ACCOUNT}<br>Ook in de <a href="${APP_URL}">App Store</a>.`,
    APPSTORE_LEAD: 'Lees mee in je browser, of in de app.',
    APPSTORE_VRAAG: '<details>\n        <summary>Staat Hoot in de App Store?</summary>\n        <p>Ja, in Nederland en België. Op het web lees je Hoot ook gewoon.</p>\n      </details>',
  }
  // Nog niet (keuze r5-landing, 5 november): geen pil, geen vraag en geen "binnenkort". Alleen wat nu waar is:
  // lees Hoot op het web. Op de dag van vrijgave zet APP_STORE = true alles hierboven in één keer aan.
  return {
    APPSTORE_META: '',
    APPSTORE_HELD: '',
    APPSTORE_EINDE: ACCOUNT,
    APPSTORE_LEAD: 'Lees mee in je browser.',
    APPSTORE_VRAAG: '',
  }
}
