// Eenmalige tips die na wegklikken wegblijven: "Meer kanten van één verhaal" (kanten-tip.js) en
// "Zet Hoot op je beginscherm" (install.js). "Stel Hoot opnieuw in" (Instellingen › Op dit toestel)
// zet ze terug, zodat ze weer één keer kunnen verschijnen. Je keuzes blijven zoals ze zijn.
export const EENMALIGE_TIPS = ['kantenTip', 'installTipDone']

export function tipsTerug(prefs = {}) {
  if (!EENMALIGE_TIPS.some((k) => k in prefs)) return prefs
  const out = { ...prefs }
  for (const k of EENMALIGE_TIPS) delete out[k]
  return out
}
