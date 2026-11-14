// Zet Hoot op het beginscherm, en de weg naar de app — pure functies (getest in tests/install.test.mjs).
const isIOS = ({ ua = '', maxTouchPoints = 0, platform = '' }) => /iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1) // iPadOS meldt zich als Mac

// De browser in Instagram en Facebook op iPhone (ze zetten Instagram, FBAN of FBAV in de user agent).
export const inAppBrowser = (ua = '') => /Instagram|FBAN|FBAV|FB_IAB/.test(ua)

// Een tip alleen in Safari op iPhone/iPad, als Hoot nog niet vanaf het beginscherm draait.
export function shouldShowInstallTip({ ua = '', standalone = false, displayStandalone = false, dismissed = false, maxTouchPoints = 0, platform = '' }) {
  if (dismissed || standalone || displayStandalone) return false
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) && !inAppBrowser(ua)
  return isIOS({ ua, maxTouchPoints, platform }) && safari
}

// De kaart "Hoot staat ook in de App Store" onder de eindkaart (onboarding blok 2, 14 november): op iPhone en iPad
// in elke browser (Safari, Chrome, Instagram, Facebook), niet als Hoot vanaf het beginscherm draait, en niet meer
// na "Niet nu" of een tik.
export function shouldShowAppCard({ ua = '', standalone = false, displayStandalone = false, dismissed = false, maxTouchPoints = 0, platform = '' }) {
  if (dismissed || standalone || displayStandalone) return false
  return isIOS({ ua, maxTouchPoints, platform })
}
