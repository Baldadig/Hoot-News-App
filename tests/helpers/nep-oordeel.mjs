// Een nep-oordeel voor Luister verder (netlify/lib/luister.mjs, het oordeel van De Redacteur): geen echte AI in npm test.
// De nep-client leest de vraag zoals het model hem krijgt (per verhaal de kop, per aflevering nr, code, show, titel en
// beschrijving) en antwoordt in het schema. `beslis({ kop, show, titel, beschrijving, nr })` geeft { voorHetNieuws, zaak, eenOnderwerp,
// zeker, reden } of null (dan geen oordeel voor dat nummer).
import { koppel, leesVraag } from '../../netlify/lib/luister.mjs'

export { leesVraag }

export function nepClient(beslis, { wacht = 0, fout = null, hangt = false } = {}) {
  const calls = []
  return {
    calls,
    messages: {
      create: async (req) => {
        calls.push(req)
        if (hangt) return new Promise(() => {})
        if (wacht) await new Promise((r) => setTimeout(r, wacht))
        if (fout) throw fout
        const vragen = leesVraag(req.messages[0].content)
        const oordelen = vragen.map((v) => {
          const o = beslis(v)
          return o ? { nr: v.nr, code: v.code, reden: 'nep', ...o } : null
        }).filter(Boolean)
        return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ oordelen }) }], usage: { input_tokens: Math.round(req.messages[0].content.length / 4), output_tokens: 40 * vragen.length } }
      },
    },
  }
}

export const JA = { voorHetNieuws: 'nee', zaak: 'zelfde', eenOnderwerp: 'ja', zeker: 'ja' }
export const NEE = { voorHetNieuws: 'nee', zaak: 'anders', eenOnderwerp: 'ja', zeker: 'ja' }

// Een nep-oordeel dat ja zegt precies bij de paren die de woordregels koppelen (koppel zonder oordeel), en anders nee.
export function zoalsWoordregels(opts) {
  const ja = new Set(koppel(opts).rows.koppelingen.map((k) => `${k.kop}|${k.aflevering}`))
  return nepClient((v) => (ja.has(`${v.kop}|${v.titel}`) ? JA : NEE))
}
