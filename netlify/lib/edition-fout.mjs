// Een 5xx van POST /api/edition zichtbaar maken in de Netlify-logs (editiefix S4, 16 november 2026): alleen de stap en
// de naam van de fout (TypeError, Error), nooit de melding, het profiel, het account, het token, het IP of de body.
// Zo valt een crash als die van 11 tot 16 november (Node 20 zonder WebSocket) meteen op, zonder iets van een lezer.
const STAP = /^[a-z-]{1,20}$/
export function logFault(stap, e, log = console.error) {
  const naam = typeof e?.name === 'string' && /^[A-Za-z]{1,40}$/.test(e.name) ? e.name : 'Fout'
  log(`[edition] 5xx ${STAP.test(stap) ? stap : 'onbekend'} ${naam}`)
}
