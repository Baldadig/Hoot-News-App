// Inloggen (Google, via Supabase) en uitnodigingen. De Supabase-code laadt pas als je inlogt
// of al ingelogd bent: wie geen account gebruikt, downloadt er niets extra voor.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js'

let clientP = null
export const supabase = () =>
  (clientP ||= import('@supabase/supabase-js').then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } })))

const safe = (fn, fallback) => {
  try {
    return fn()
  } catch {
    return fallback
  }
}

// Al eens ingelogd op dit toestel, of net terug van Google?
export const hasSession = () => safe(() => Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token')), false)
export const isAuthReturn = () => new URLSearchParams(location.search).has('code')

// ---- Uitnodiging: ?uitnodiging=CODE in de link onthouden tot je inlogt ----
const INVITE = 'hoot:invite'
export function captureInvite() {
  const url = new URL(location.href)
  const code = url.searchParams.get('uitnodiging')
  if (!code) return
  safe(() => localStorage.setItem(INVITE, code.trim()))
  url.searchParams.delete('uitnodiging')
  history.replaceState(history.state, '', url.pathname + url.search + url.hash)
}
export const pendingInvite = () => safe(() => localStorage.getItem(INVITE), null)
export const clearInvite = () => safe(() => localStorage.removeItem(INVITE))

// Na terugkomst van Google: de ?code uit de adresbalk, en terug naar waar je was.
const AFTER = 'hoot:after-login'
export function finishAuthReturn() {
  const url = new URL(location.href)
  if (!url.searchParams.has('code')) return
  url.searchParams.delete('code')
  const back = safe(() => sessionStorage.getItem(AFTER), null)
  safe(() => sessionStorage.removeItem(AFTER))
  history.replaceState(history.state, '', url.pathname + url.search + (back || url.hash))
}

export async function signInWithGoogle() {
  safe(() => sessionStorage.setItem(AFTER, location.hash))
  const c = await supabase()
  await c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/' } })
}

export const inviteLink = (code) => `${location.origin}/?uitnodiging=${code}`
