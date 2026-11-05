// De App Store-plekken van de landing: de pil in de held (op mobiel een regel), de lead en de regel in het slot, de vraag
// en de smart app banner in Safari. Aan of uit met één regel in landing/build.mjs (APP_STORE).
// Uit tot de App Store-pagina bereikbaar is; dan zet Claude APP_STORE op true en bouwt opnieuw.
export const APP_ID = '6828037269'
export const APP_URL = `https://apps.apple.com/nl/app/id${APP_ID}`

const MARK = '<svg class="wacht-i" viewBox="0 0 82.15 72" aria-hidden="true"><use href="#mark"/></svg>'
const ACCOUNT = 'Gratis, met of zonder account.'

export function appStore(aan) {
  if (aan) return {
    APPSTORE_META: `\n<meta name="apple-itunes-app" content="app-id=${APP_ID}">`,
    APPSTORE_HELD: `<a class="wacht" href="${APP_URL}">${MARK}<span><small>Download in de</small> <b>App Store</b><em class="wacht-gratis">${ACCOUNT}<br><u>Download Hoot in de App Store</u></em></span></a>`,
    APPSTORE_EINDE: `${ACCOUNT}<br>Ook in de <a href="${APP_URL}">App Store</a>.`,
    APPSTORE_LEAD: 'Lees mee in je browser, of in de app.',
    APPSTORE_VRAAG: '<summary>Staat Hoot in de App Store?</summary>\n        <p>Ja, in Nederland en België. Op het web lees je Hoot ook gewoon.</p>',
  }
  // Nog niet: geen link, en de pil is gewone tekst (geen knop, dus ook geen hover-ring).
  return {
    APPSTORE_META: '',
    APPSTORE_HELD: `<p class="wacht">${MARK}<span><small>Binnenkort</small> <b>in de App Store</b><em class="wacht-gratis">${ACCOUNT}<br>Binnenkort ook in de App Store.</em></span></p>`,
    APPSTORE_EINDE: `${ACCOUNT}<br>Binnenkort ook in de App Store.`,
    APPSTORE_LEAD: 'Lees mee in je browser.',
    APPSTORE_VRAAG: '<summary>Wanneer staat Hoot in de App Store?</summary>\n        <p>Binnenkort, in Nederland en België. Tot die tijd lees je Hoot gewoon op het web.</p>',
  }
}
