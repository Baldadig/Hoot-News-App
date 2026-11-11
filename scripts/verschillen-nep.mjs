// Een nep-Anthropic-client voor "Waar media verschillen" (proef en toetsen): geeft voor de schrijver het
// opgenomen of nagebootste antwoord, en voor de controle per zin het oordeel uit `controle` (op een stukje
// tekst; wat er niet in staat is gedragen en echt). Zelfde vorm als messages.create van @anthropic-ai/sdk.
import { VERSCHILLEN_SCHRIJVER, VERSCHILLEN_CONTROLE } from '../netlify/lib/verschillen.mjs'
import { SOURCES } from '../netlify/lib/sources.mjs'

// Het bewaarde feedfragment kent alleen bronnamen; de server werkt met bron-id's (uitgevers tellen).
const ID_BY_NAME = new Map(SOURCES.map((s) => [s.name, s.id]))
export const metBronIds = (items) => items.map((i) => (i.source ? i : { ...i, source: ID_BY_NAME.get(i.sourceName) || i.sourceName }))

export function nepClient({ schrijver, controle = [] }, { vertraging = 0, calls = [] } = {}) {
  const wacht = (signal) =>
    new Promise((resolve, reject) => {
      if (!vertraging) return resolve()
      const t = setTimeout(resolve, vertraging)
      signal?.addEventListener('abort', () => (clearTimeout(t), reject(Object.assign(new Error('Request was aborted.'), { name: 'APIUserAbortError' }))))
    })
  return {
    calls,
    messages: {
      create: async (req, opts = {}) => {
        calls.push(req)
        await wacht(opts.signal)
        if (req.model === VERSCHILLEN_SCHRIJVER) {
          return { model: VERSCHILLEN_SCHRIJVER, stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(schrijver) }] }
        }
        if (req.model === VERSCHILLEN_CONTROLE) {
          const lijst = req.messages[0].content.split('\nZinnen:\n')[1] || ''
          const zinnen = lijst
            .split('\n')
            .map((l) => l.match(/^(\d+)\. \([^)]*\) (.*)$/))
            .filter(Boolean)
            .map(([, n, tekst]) => {
              const o = controle.find((c) => tekst.includes(c.zin))
              return { zin: Number(n), gedragen: o ? o.gedragen : true, echt_verschil: o ? o.echt_verschil : true, reden: o?.reden || 'staat in de aangehaalde regels' }
            })
          return { model: VERSCHILLEN_CONTROLE, stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ zinnen }) }] }
        }
        throw new Error(`onbekend model ${req.model}`)
      },
    },
  }
}
