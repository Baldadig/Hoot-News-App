// Zet Hoot op het beginscherm — pure functie (getest in tests/install.test.mjs).
// Een tip alleen in Safari op iPhone/iPad, als Hoot nog niet vanaf het beginscherm draait.
export function shouldShowInstallTip({ ua = '', standalone = false, displayStandalone = false, dismissed = false, maxTouchPoints = 0, platform = '' }) {
  if (dismissed || standalone || displayStandalone) return false
  const iOS = /iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1) // iPadOS meldt zich als Mac
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  return iOS && safari
}
