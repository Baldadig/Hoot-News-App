// Meten zonder volgen op de landing (Meten · 6). Wordt door landing/build.mjs gebundeld en achter hoot.js gezet,
// zodat het vocabulaire op één plek blijft (shared/tel.mjs) en dezelfde regels gelden als in /lees (src/lib/tel.js):
// niets bij Do Not Track of GPC, geen cookie, geen id, alleen totalen per dag.
// Staat NIEUWE_TELLERS uit (standaard, tot het privacybeleid is aangepast), dan doet dit niets.
//   herkomst: ?via=<label> telt één keer per dagdeel als 'via:<label>' en gaat uit de adresbalk;
//   App Store: een tik op een App Store-link van de landing telt als 'appstore-tik'.
import { tel, telVia } from '../src/lib/tel.js'
import { NIEUWE_TELLERS, APPSTORE_TIK, slotIdNow } from '../shared/tel.mjs'

export function startTel({ doc = typeof document === 'undefined' ? null : document, nieuw = NIEUWE_TELLERS, ...opts } = {}) {
  if (!nieuw || !doc) return false
  telVia({ ...opts, nieuw })
  doc.addEventListener(
    'click',
    (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a[href^="https://apps.apple.com/"]') : null
      if (a) tel(APPSTORE_TIK, slotIdNow(), { ...opts, nieuw })
    },
    true,
  )
  return true
}

startTel()
