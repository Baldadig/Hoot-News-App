import { useSyncExternalStore } from 'react'

// Telefoon: een raam smaller dan 640 (kaart A+, keuze van Alex, 4 november). iPad en desktop houden
// hun bredere vormen. Zonder raam (tests, server) is het nooit een telefoon.
export const PHONE_QUERY = '(max-width: 639px)'
const query = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(PHONE_QUERY) : null)
const subscribe = (cb) => {
  const mq = query()
  if (!mq) return () => {}
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
export function usePhone() {
  return useSyncExternalStore(subscribe, () => !!query()?.matches, () => false)
}
