// Meten zonder volgen op de landing. Wordt door landing/build.mjs gebundeld en achter hoot.js gezet, zodat het
// vocabulaire op één plek blijft (shared/tel.mjs) en dezelfde regels gelden als in /lees (src/lib/tel.js):
// niets bij Do Not Track of GPC, geen cookie, geen id, alleen totalen per dag.
//   herkomst: ?via=<label> telt één keer per dagdeel als 'via:<label>' en gaat uit de adresbalk;
//   landing-open: de pagina geopend, één keer per dagdeel (de noemer);
//   een tik op een link met data-tel ('web:held', 'as:slot') telt als web-tik:<plek> of appstore-tik:<plek>;
//   een App Store-link zonder data-tel telt als 'appstore-tik';
//   vraag-open: een vraag opengeklapt, één keer per dagdeel.
import { tel, telVia } from '../src/lib/tel.js'
import { NIEUWE_TELLERS, APPSTORE_TIK, LANDING_OPEN, VRAAG_OPEN, tikEvent, slotIdNow } from '../shared/tel.mjs'

export function startTel({ doc = typeof document === 'undefined' ? null : document, nieuw = NIEUWE_TELLERS, ...opts } = {}) {
  if (!nieuw || !doc) return false
  telVia({ ...opts, nieuw })
  const nu = () => opts.dagdeel || slotIdNow(opts.now)
  tel(LANDING_OPEN, nu(), { ...opts, nieuw })
  doc.addEventListener(
    'click',
    (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a[href]') : null
      if (!a) return
      const code = a.getAttribute && a.getAttribute('data-tel')
      const ev = tikEvent(code) || (/^https:\/\/apps\.apple\.com\//.test(a.getAttribute('href') || '') ? APPSTORE_TIK : null)
      if (ev) tel(ev, nu(), { ...opts, nieuw })
    },
    true,
  )
  // 'toggle' bubbelt niet: luisteren in de vangfase. Alleen het openen telt.
  doc.addEventListener(
    'toggle',
    (e) => {
      const d = e.target
      if (d && d.tagName === 'DETAILS' && d.open) tel(VRAAG_OPEN, nu(), { ...opts, nieuw })
    },
    true,
  )
  return true
}

startTel()
