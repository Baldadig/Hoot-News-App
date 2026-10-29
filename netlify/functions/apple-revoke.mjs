// POST /api/apple-revoke — Sign in with Apple intrekken als je je account verwijdert (Apple eist
// dit, richtlijn 5.1.1(v)). De app vraagt vlak voor het verwijderen een verse code bij Apple en
// stuurt die hierheen, met het Supabase-token van de gebruiker. Wij wisselen de code in voor een
// refresh-token en trekken dat in; daarna staat Hoot niet meer in je Apple ID.
//
// Het geheim (de .p8-sleutel uit Apple Developer › Keys) staat alleen in de omgevingsvariabelen
// van Netlify. Tokens en codes komen nooit in een log.
import { createPrivateKey, sign } from 'node:crypto'
import { SUPABASE_URL, SUPABASE_KEY } from '../../src/lib/config.js'

const APPLE = 'https://appleid.apple.com'
const fail = (status, error) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })
const b64url = (buf) => Buffer.from(buf).toString('base64url')

// De vier waarden uit Netlify, of null als er één ontbreekt. De sleutel mag met echte regels of
// met \n erin geplakt zijn, en met of zonder de BEGIN/END-regels.
export function appleConfig(env = process.env) {
  const teamId = env.APPLE_TEAM_ID?.trim()
  const keyId = env.APPLE_KEY_ID?.trim()
  const clientId = env.APPLE_CLIENT_ID?.trim()
  let privateKey = env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim()
  if (!teamId || !keyId || !clientId || !privateKey) return null
  if (!privateKey.includes('BEGIN')) privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey.replace(/\s+/g, '')}\n-----END PRIVATE KEY-----`
  return { teamId, keyId, clientId, privateKey }
}

// Het "client secret" voor Apple: een JWT, ondertekend met ES256 (P-256, SHA-256). Apple wil de
// handtekening als r‖s (64 bytes), niet als DER; vijf minuten geldig is genoeg.
export function clientSecret({ teamId, keyId, clientId, privateKey }, now = Date.now()) {
  const iat = Math.floor(now / 1000)
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId }))
  const payload = b64url(JSON.stringify({ iss: teamId, iat, exp: iat + 300, aud: APPLE, sub: clientId }))
  const key = createPrivateKey(privateKey)
  const signature = sign('sha256', Buffer.from(`${header}.${payload}`), { key, dsaEncoding: 'ieee-p1363' })
  return `${header}.${payload}.${b64url(signature)}`
}

// Wie is dit? Met het token van de gebruiker zelf; ook wie (nog) geen lid is, mag zijn account
// verwijderen. Geeft het id en de Apple-id's (sub) die aan dit account hangen.
export async function userOf(token, fetchImpl = fetch) {
  if (!token) return null
  const res = await fetchImpl(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) })
  if (!res.ok) return null
  const user = await res.json()
  if (!user?.id) return null
  const apple = (user.identities || [])
    .filter((i) => i?.provider === 'apple')
    .flatMap((i) => [i.id, i.provider_id, i.identity_data?.sub])
    .filter((v) => typeof v === 'string' && v)
  return { id: user.id, apple: [...new Set(apple)] }
}

// De sub uit het id-token dat Apple ons net zelf gaf (rechtstreeks, over https: geen
// handtekening nodig om te weten van wie het is).
export function subOf(idToken) {
  try {
    return JSON.parse(Buffer.from(String(idToken).split('.')[1], 'base64url').toString()).sub || null
  } catch {
    return null
  }
}

const form = (fields) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(fields).toString(),
  signal: AbortSignal.timeout(10000),
})

// Code inwisselen en het token intrekken. Geeft { ok } of { status, error } terug.
export async function revoke(code, apple, { clientId, secret }, fetchImpl = fetch) {
  const base = { client_id: clientId, client_secret: secret }
  const t = await fetchImpl(`${APPLE}/auth/token`, form({ ...base, code, grant_type: 'authorization_code' }))
  const tokens = await t.json().catch(() => null)
  if (!t.ok || !tokens) {
    console.error('apple-revoke: inwisselen mislukt', t.status, typeof tokens?.error === 'string' ? tokens.error : '')
    return { status: 502, error: 'Apple nam de code niet aan.' }
  }
  // Alleen intrekken voor het Apple-account dat bij deze gebruiker hoort.
  if (!apple.includes(subOf(tokens.id_token))) return { status: 403, error: 'Dit Apple-account hoort niet bij je Hoot-account.' }
  const token = tokens.refresh_token || tokens.access_token
  if (!token) return { status: 502, error: 'Apple gaf geen token terug.' }
  const hint = tokens.refresh_token ? 'refresh_token' : 'access_token'
  const r = await fetchImpl(`${APPLE}/auth/revoke`, form({ ...base, token, token_type_hint: hint }))
  if (!r.ok) {
    console.error('apple-revoke: intrekken mislukt', r.status)
    return { status: 502, error: 'Intrekken bij Apple lukte niet.' }
  }
  return { ok: true }
}

export async function handle(req, { env = process.env, user = userOf, fetchImpl = fetch, now = Date.now() } = {}) {
  if (req.method !== 'POST') return fail(405, 'Alleen POST.')
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const me = await user(token).catch(() => null)
  if (!me) return fail(401, 'Log eerst in.')
  let body
  try {
    body = await req.json()
  } catch {
    return fail(400, 'Geen geldige invoer.')
  }
  const code = body?.code
  if (typeof code !== 'string' || !code.trim() || code.length > 2000) return fail(400, 'Geen geldige invoer.')
  if (!me.apple.length) return fail(403, 'Dit account gebruikt geen Inloggen met Apple.')
  const cfg = appleConfig(env)
  if (!cfg) return fail(503, 'Intrekken bij Apple is nog niet ingesteld (APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, APPLE_CLIENT_ID).')
  let secret
  try {
    secret = clientSecret(cfg, now)
  } catch (e) {
    console.error('apple-revoke: sleutel onbruikbaar', e?.code || e?.name || '') // nooit de sleutel zelf
    return fail(503, 'De Apple-sleutel (APPLE_PRIVATE_KEY) klopt niet.')
  }
  try {
    const out = await revoke(code.trim(), me.apple, { clientId: cfg.clientId, secret }, fetchImpl)
    return out.ok ? Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } }) : fail(out.status, out.error)
  } catch (e) {
    // Apple antwoordt niet (op tijd). Alleen het soort fout loggen.
    console.error('apple-revoke', e?.name || 'Error')
    return fail(502, 'Intrekken bij Apple lukte niet.')
  }
}

export default (req) => handle(req)

export const config = { path: '/api/apple-revoke' }
