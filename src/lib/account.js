// Inloggen (Google) en uitnodigingen. De Supabase-code laadt pas als je inlogt of al ingelogd
// bent: wie geen account gebruikt, downloadt er niets extra voor.
import { SUPABASE_URL, SUPABASE_KEY, GOOGLE_CLIENT_ID } from './config.js'

let clientP = null
export const supabase = () =>
  (clientP ||= import('@supabase/supabase-js').then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { detectSessionInUrl: false, persistSession: true } })))

const safe = (fn, fallback) => {
  try {
    return fn()
  } catch {
    return fallback
  }
}

// Al eens ingelogd op dit toestel, of net terug van Google?
export const hasSession = () => safe(() => Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token')), false)
export const isAuthReturn = () => Boolean(safe(() => localStorage.getItem(TOKEN), null))

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

// ---- Inloggen met Google, rechtstreeks ----
// Google stuurt je terug naar Hoot zelf (niet via het adres van Supabase), met een id-token in de
// adresbalk. Dat token geven we aan Supabase. De nonce koppelt het token aan dit inlogverzoek:
// Google krijgt de hash, Supabase het origineel en vergelijkt die twee.
const PENDING = 'hoot:google-login' // { state, nonce, back } tijdens het inloggen
const TOKEN = 'hoot:google-token' // { token, nonce } tussen terugkomst en Supabase

const random = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('')
const sha256 = async (text) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map((b) => b.toString(16).padStart(2, '0')).join('')

export async function signInWithGoogle() {
  const state = random()
  const nonce = random()
  safe(() => localStorage.setItem(PENDING, JSON.stringify({ state, nonce, back: location.hash })))
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: location.origin + '/',
    response_type: 'id_token',
    scope: 'openid email profile',
    nonce: await sha256(nonce),
    state,
    prompt: 'select_account',
  })
  location.assign('https://accounts.google.com/o/oauth2/v2/auth?' + params)
}

// Bij het opstarten, vóór de app de adresbalk leest: het antwoord van Google (#id_token=…) uit de
// adresbalk halen, controleren of het bij ons verzoek hoort, en terug naar waar je was.
export function captureGoogleReturn() {
  const answer = new URLSearchParams(location.hash.slice(1))
  if (!answer.has('id_token') && !answer.has('error')) return
  const pending = safe(() => JSON.parse(localStorage.getItem(PENDING)), null)
  safe(() => localStorage.removeItem(PENDING))
  if (pending && answer.get('state') === pending.state && answer.get('id_token')) {
    safe(() => localStorage.setItem(TOKEN, JSON.stringify({ token: answer.get('id_token'), nonce: pending.nonce })))
  }
  history.replaceState(history.state, '', location.pathname + location.search + (pending?.back || '#/editie'))
}

// Het token van Google inwisselen voor een Supabase-sessie.
export async function finishGoogleLogin(client) {
  const pending = safe(() => JSON.parse(localStorage.getItem(TOKEN)), null)
  safe(() => localStorage.removeItem(TOKEN))
  if (!pending) return null
  const { data, error } = await client.auth.signInWithIdToken({ provider: 'google', token: pending.token, nonce: pending.nonce })
  return error ? null : data.session
}

export const inviteLink = (code) => `${location.origin}/?uitnodiging=${code}`
