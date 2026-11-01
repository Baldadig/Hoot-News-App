import { BASE_KEY } from './syncEngine.js'

// Een nieuwe account-id is nog geen bewijs dat zijn onderwerpen al geladen zijn.
export function selectionOwnerReady(account, storage) {
  if (account?.status === 'loading') return false
  if (account?.status !== 'in') return true
  let raw
  try { raw = (storage || localStorage).getItem(BASE_KEY) }
  catch { return true } // opslag geblokkeerd: alleen een toestand in het geheugen
  try { return JSON.parse(raw)?.uid === account.user.id }
  catch { return false }
}
export const selectionKey = owner => 'hoot:selectie:ui:v1:' + (owner || 'anon')
export function cleanClosed(value, chosen) {
  return [...new Set(Array.isArray(value) ? value : [])].filter(id => typeof id === 'string' && chosen.includes(id))
}
