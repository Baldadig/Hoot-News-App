import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, verify } from 'node:crypto'
import { handle, appleConfig, clientSecret, userOf, subOf } from '../netlify/functions/apple-revoke.mjs'

// Een eigen P-256-sleutel, zoals de .p8 van Apple (PKCS#8, PEM).
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' })
const env = { APPLE_TEAM_ID: 'TEAM123456', APPLE_KEY_ID: 'KEY1234567', APPLE_PRIVATE_KEY: pem, APPLE_CLIENT_ID: 'nl.hootnews.Hoot' }
const NOW = Date.parse('2026-10-29T12:00:00Z')
const part = (jwt, i) => JSON.parse(Buffer.from(jwt.split('.')[i], 'base64url').toString())
const idToken = (sub) => `x.${Buffer.from(JSON.stringify({ sub })).toString('base64url')}.y`

const req = (body, { token = 'tok', method = 'POST' } = {}) => new Request('http://x/api/apple-revoke', { method, headers: { 'content-type': 'application/json', authorization: token ? `Bearer ${token}` : '' }, body: method === 'POST' ? JSON.stringify(body) : undefined })
const appleUser = async () => ({ id: 'u1', apple: ['001234.abc'] })

// Nep-Apple: houdt bij wat er binnenkwam, antwoordt zoals opgegeven.
function fakeApple({ token = { status: 200, body: { refresh_token: 'rt-geheim', access_token: 'at', id_token: idToken('001234.abc') } }, revoke = { status: 200 } } = {}) {
  const calls = []
  const fetchImpl = async (url, init) => {
    const fields = Object.fromEntries(new URLSearchParams(init.body))
    calls.push({ url, fields })
    const r = url.endsWith('/auth/token') ? token : revoke
    return new Response(r.body ? JSON.stringify(r.body) : '', { status: r.status })
  }
  return { calls, fetchImpl }
}

test('client secret: ES256-JWT met de juiste velden en een geldige handtekening', () => {
  const jwt = clientSecret(appleConfig(env), NOW)
  const [h, p, s] = jwt.split('.')
  assert.deepEqual(part(jwt, 0), { alg: 'ES256', kid: 'KEY1234567' })
  const payload = part(jwt, 1)
  assert.equal(payload.iss, 'TEAM123456')
  assert.equal(payload.sub, 'nl.hootnews.Hoot')
  assert.equal(payload.aud, 'https://appleid.apple.com')
  assert.equal(payload.iat, NOW / 1000)
  assert.ok(payload.exp > payload.iat && payload.exp - payload.iat <= 15777000) // Apple: hooguit zes maanden
  const sig = Buffer.from(s, 'base64url')
  assert.equal(sig.length, 64) // r‖s, geen DER
  assert.ok(verify('sha256', Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, sig))
})

test('sleutel uit Netlify: met \\n erin of zonder BEGIN/END-regels werkt ook', () => {
  const escaped = appleConfig({ ...env, APPLE_PRIVATE_KEY: pem.replace(/\n/g, '\\n') })
  assert.ok(clientSecret(escaped, NOW))
  const bare = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '')
  assert.ok(clientSecret(appleConfig({ ...env, APPLE_PRIVATE_KEY: bare }), NOW))
  for (const k of Object.keys(env)) assert.equal(appleConfig({ ...env, [k]: '' }), null)
})

test('alleen POST, alleen ingelogd, en een code is nodig', async () => {
  const { fetchImpl, calls } = fakeApple()
  assert.equal((await handle(req(null, { method: 'GET' }), { env, user: appleUser, fetchImpl })).status, 405)
  assert.equal((await handle(req({ code: 'c' }, { token: '' }), { env, user: userOf, fetchImpl })).status, 401)
  assert.equal((await handle(req({ code: 'c' }), { env, user: async () => null, fetchImpl })).status, 401)
  assert.equal((await handle(req({}), { env, user: appleUser, fetchImpl })).status, 400)
  assert.equal((await handle(req({ code: 'c' }), { env, user: async () => ({ id: 'u1', apple: [] }), fetchImpl })).status, 403)
  assert.equal(calls.length, 0)
})

test('ontbrekende of kapotte instellingen: 503 met uitleg, geen crash en geen Apple-aanroep', async () => {
  const { fetchImpl, calls } = fakeApple()
  const missing = await handle(req({ code: 'c' }), { env: { ...env, APPLE_PRIVATE_KEY: '' }, user: appleUser, fetchImpl })
  assert.equal(missing.status, 503)
  assert.match((await missing.json()).error, /APPLE_PRIVATE_KEY/)
  const orig = console.error
  console.error = () => {}
  const broken = await handle(req({ code: 'c' }), { env: { ...env, APPLE_PRIVATE_KEY: 'geen-sleutel' }, user: appleUser, fetchImpl }).finally(() => (console.error = orig))
  assert.equal(broken.status, 503)
  assert.equal(calls.length, 0)
})

test('code inwisselen, daarna het refresh-token intrekken', async () => {
  const { fetchImpl, calls } = fakeApple()
  const r = await handle(req({ code: 'de-code' }), { env, user: appleUser, fetchImpl, now: NOW })
  assert.equal(r.status, 200)
  assert.deepEqual(await r.json(), { ok: true })
  assert.equal(calls.length, 2)
  assert.equal(calls[0].url, 'https://appleid.apple.com/auth/token')
  assert.equal(calls[0].fields.grant_type, 'authorization_code')
  assert.equal(calls[0].fields.code, 'de-code')
  assert.equal(calls[0].fields.client_id, 'nl.hootnews.Hoot')
  assert.equal(part(calls[0].fields.client_secret, 1).sub, 'nl.hootnews.Hoot')
  assert.equal(calls[1].url, 'https://appleid.apple.com/auth/revoke')
  assert.equal(calls[1].fields.token, 'rt-geheim')
  assert.equal(calls[1].fields.token_type_hint, 'refresh_token')
})

test('foutpaden bij Apple: 502, en tokens of codes nooit in het log', async () => {
  const logged = []
  const orig = console.error
  console.error = (...a) => logged.push(a.join(' '))
  try {
    const bad = fakeApple({ token: { status: 400, body: { error: 'invalid_grant' } } })
    assert.equal((await handle(req({ code: 'geheime-code' }), { env, user: appleUser, fetchImpl: bad.fetchImpl })).status, 502)
    assert.equal(bad.calls.length, 1) // niet verder na een geweigerde code
    const down = fakeApple({ revoke: { status: 500 } })
    assert.equal((await handle(req({ code: 'geheime-code' }), { env, user: appleUser, fetchImpl: down.fetchImpl })).status, 502)
    const offline = async () => { throw new TypeError('fetch failed') }
    assert.equal((await handle(req({ code: 'geheime-code' }), { env, user: appleUser, fetchImpl: offline })).status, 502)
  } finally {
    console.error = orig
  }
  assert.ok(logged.length >= 3)
  for (const line of logged) {
    assert.ok(!line.includes('geheime-code'), line)
    assert.ok(!line.includes('rt-geheim'), line)
    assert.ok(!line.includes('BEGIN'), line)
  }
})

test('een Apple-account dat niet bij deze gebruiker hoort, wordt niet ingetrokken', async () => {
  const other = fakeApple({ token: { status: 200, body: { refresh_token: 'rt', id_token: idToken('iemand.anders') } } })
  assert.equal((await handle(req({ code: 'c' }), { env, user: appleUser, fetchImpl: other.fetchImpl })).status, 403)
  assert.equal(other.calls.length, 1)
  assert.equal(subOf('kapot'), null)
})

test('gebruiker: token bij Supabase, Apple-id uit de identiteiten', async () => {
  const fake = (user, ok = true) => async () => ({ ok, json: async () => user })
  const u = await userOf('t', fake({ id: 'u1', identities: [{ provider: 'google', id: 'g1' }, { provider: 'apple', id: '001234.abc', identity_data: { sub: '001234.abc' } }] }))
  assert.deepEqual(u, { id: 'u1', apple: ['001234.abc'] })
  assert.deepEqual((await userOf('t', fake({ id: 'u2', identities: [] }))).apple, [])
  assert.equal(await userOf('t', fake({}, false)), null)
  assert.equal(await userOf('', fake({ id: 'u1' })), null)
})
