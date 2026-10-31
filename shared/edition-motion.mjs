export const PRINT_TIMING = { rule: 400, leadDelay: 480, lead: 200, fade: 200 }
export function shouldPrintEdition(id, lastSeen, { ready = true, afterIris = true } = {}) {
  return typeof id === 'string' && id.length > 0 && id !== lastSeen && ready && afterIris
}
