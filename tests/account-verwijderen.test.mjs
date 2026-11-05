// Pakket 3 van WEB-GELIJK-AAN-APP: Account verwijderen, Nu synchroniseren, de status Ingelogd →
// Gesynchroniseerd en de pagina "Op dit toestel" op het web, gelijk aan de app. Er wordt nergens een
// echt account verwijderd: alles gaat via een nep-Supabase en een nep-Apple.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { deleteAccount, usesApple, revokeApple, DELETE_TEXT, appleCode } from '../src/lib/accountDelete.js'
import { handle as revokeHandle } from '../netlify/functions/apple-revoke.mjs'
import { generateKeyPairSync } from 'node:crypto'

const src = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8')

// ---- nep-Supabase ----
function fakeClient({ providers = ['google'], getUserError = null, rpcError = null } = {}) {
  const calls = []
  return {
    calls,
    auth: {
      getUser: async () => (getUserError ? { data: null, error: getUserError } : { data: { user: { id: 'u1', app_metadata: { providers }, identities: providers.map((provider) => ({ provider })) } }, error: null }),
      getSession: async () => ({ data: { session: { access_token: 'tok' } } }),
    },
    rpc: async (name) => {
      calls.push(['rpc', name])
      return { error: rpcError }
    },
  }
}
const fetchOk = (calls = []) => async (url, init) => (calls.push([url, JSON.parse(init.body)]), new Response('{}', { status: 200 }))

test('verwijderen zonder Apple: alleen rpc/delete_my_account, geen aanroep naar apple-revoke', async () => {
  const client = fakeClient()
  const fetched = []
  const res = await deleteAccount({ client, fetchImpl: fetchOk(fetched) })
  assert.deepEqual(res, { ok: true })
  assert.deepEqual(client.calls, [['rpc', 'delete_my_account']])
  assert.equal(fetched.length, 0)
})

test('verwijderen met Apple: eerst apple-revoke met de verse code en het token, dan pas het wissen', async () => {
  const client = fakeClient({ providers: ['google', 'apple'] })
  const fetched = []
  const order = []
  const fetchImpl = async (...a) => (order.push('revoke'), fetchOk(fetched)(...a))
  const origRpc = client.rpc
  client.rpc = async (...a) => (order.push('rpc'), origRpc(...a))
  const res = await deleteAccount({ client, reauth: async () => 'code-van-apple', fetchImpl })
  assert.deepEqual(res, { ok: true })
  assert.deepEqual(order, ['revoke', 'rpc'])
  assert.deepEqual(fetched, [['/api/apple-revoke', { code: 'code-van-apple' }]])
})

test('verwijderen met Apple: lukt het intrekken niet, dan wordt er niets gewist (appleFailed)', async () => {
  for (const reauth of [async () => null, async () => 'c']) {
    const client = fakeClient({ providers: ['apple'] })
    const fetchImpl = async () => new Response('{}', { status: 503 }) // niet ingesteld
    const res = await deleteAccount({ client, reauth, fetchImpl })
    assert.deepEqual(res, { ok: false, appleFailed: true })
    assert.deepEqual(client.calls, [], 'niets verwijderd')
  }
  // Zonder Sign in with Apple op het web (de standaard) is er geen code: ook dan eerlijk mislukt.
  assert.equal(await appleCode(), null)
  const client = fakeClient({ providers: ['apple'] })
  assert.equal((await deleteAccount({ client, fetchImpl: fetchOk() })).appleFailed, true)
  assert.deepEqual(client.calls, [])
  // Het netwerk valt weg tijdens het intrekken: ook mislukt, ook niets gewist.
  assert.equal(await revokeApple('c', 't', async () => Promise.reject(new Error('offline'))), false)
})

test('verwijderen met Apple: zelf geannuleerd laat het account bestaan', async () => {
  const client = fakeClient({ providers: ['apple'] })
  const res = await deleteAccount({ client, reauth: async () => Promise.reject({ canceled: true }), fetchImpl: fetchOk() })
  assert.deepEqual(res, { ok: false, message: 'Je account blijft bestaan.' })
  assert.deepEqual(client.calls, [])
})

test('Toch verwijderen: wissen zonder intrekken, en zeggen wat je zelf nog doet', async () => {
  const client = fakeClient({ providers: ['apple'] })
  const fetched = []
  const res = await deleteAccount({ client, skipApple: true, fetchImpl: fetchOk(fetched) })
  assert.equal(res.ok, true)
  assert.match(res.note, /^Je account is verwijderd\. Haal Hoot nog weg in Instellingen › je naam › Inloggen en beveiliging › Inloggen met Apple\.$/)
  assert.equal(fetched.length, 0)
  assert.deepEqual(client.calls, [['rpc', 'delete_my_account']])
})

test('verwijderen: een fout van de server of bij het opvragen geeft de gewone melding en wist niets lokaal', async () => {
  const a = await deleteAccount({ client: fakeClient({ rpcError: { message: 'nee' } }), fetchImpl: fetchOk() })
  assert.deepEqual(a, { ok: false, message: 'Verwijderen is niet gelukt. Probeer het opnieuw.' })
  const b = await deleteAccount({ client: fakeClient({ getUserError: new Error('x') }), fetchImpl: fetchOk() })
  assert.deepEqual(b, { ok: false, message: 'Verwijderen is niet gelukt. Probeer het opnieuw.' })
})

test('usesApple: ook als Apple later aan het account is gekoppeld', () => {
  assert.equal(usesApple({ app_metadata: { providers: ['google'] }, identities: [{ provider: 'google' }, { provider: 'apple' }] }), true)
  assert.equal(usesApple({ app_metadata: { providers: ['google'] }, identities: [{ provider: 'google' }] }), false)
  assert.equal(usesApple(null), false)
})

test('de aanroep naar apple-revoke past op de functie: een nep-Apple trekt het token in', async () => {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
  const env = { APPLE_TEAM_ID: 'T', APPLE_KEY_ID: 'K', APPLE_CLIENT_ID: 'nl.hootnews.Hoot', APPLE_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }) }
  const idToken = `x.${Buffer.from(JSON.stringify({ sub: 'apple-sub' })).toString('base64url')}.y`
  const apple = []
  const appleFetch = async (url, init) => (apple.push(url.split('appleid.apple.com')[1]), new Response(JSON.stringify({ refresh_token: 'rt', id_token: idToken }), { status: 200 }))
  const client = fakeClient({ providers: ['apple'] })
  // Het web belt de eigen functie; hier ligt daar de handler van netlify/functions/apple-revoke.mjs.
  const fetchImpl = async (url, init) => revokeHandle(new Request('http://x' + url, init), { env, user: async (t) => (t === 'tok' ? { id: 'u1', apple: ['apple-sub'] } : null), fetchImpl: appleFetch })
  const res = await deleteAccount({ client, reauth: async () => 'verse-code', fetchImpl })
  assert.deepEqual(res, { ok: true })
  assert.deepEqual(apple, ['/auth/token', '/auth/revoke'])
  assert.deepEqual(client.calls, [['rpc', 'delete_my_account']])
})

// ---- teksten letterlijk gelijk aan de app ----
test('teksten: gelijk aan de app (AccountView.swift, SettingsView.swift)', () => {
  const view = src('ios/Hoot/Views/AccountView.swift')
  const settings = src('ios/Hoot/Views/SettingsView.swift')
  const swift = view + settings
  for (const t of [DELETE_TEXT.title, DELETE_TEXT.appleTitle, DELETE_TEXT.appleMessage, DELETE_TEXT.appleRetry, DELETE_TEXT.appleSkip, DELETE_TEXT.cancel, DELETE_TEXT.confirm, 'Nu synchroniseren', 'Weergave en lezen blijven per toestel.', 'Account verwijderen']) assert.ok(swift.includes(`"${t}"`), t)
  assert.ok(src('ios/Hoot/Account.swift').includes(`"${DELETE_TEXT.stays}"`))
  assert.ok(src('ios/Hoot/Account.swift').includes(`"${DELETE_TEXT.failed}"`))
  assert.ok(src('ios/Hoot/Account.swift').includes(DELETE_TEXT.skippedNote))
  const web = src('src/components/Account.jsx') + src('src/views/Device.jsx')
  for (const t of ['Nu synchroniseren', 'Weergave en lezen blijven per toestel.', 'Account verwijderen', 'Uitloggen']) assert.ok(web.includes(t), t)
})

test('Op dit toestel: dezelfde drie acties, voetnoten en bevestigingen als de app', () => {
  const settings = src('ios/Hoot/Views/SettingsView.swift')
  const web = src('src/views/Device.jsx')
  for (const t of ['Alles als ongelezen markeren', 'Bewaarde artikelen verwijderen', 'Stel Hoot opnieuw in', 'Bewaard gaat mee met je account.', 'Bewaard en gelezen blijven.', 'Alle bewaarde artikelen verwijderen?', 'Bewaard blijft staan.', 'Markeer als ongelezen', 'Annuleer', 'Verwijder']) {
    assert.ok(settings.includes(`"${t}"`), 'app: ' + t)
    assert.ok(web.includes(`'${t}'`), 'web: ' + t)
  }
  assert.ok(settings.includes('artikel verdwijnt') && settings.includes('artikelen verdwijnen') && settings.includes(', ook op je andere toestellen') && settings.includes('Dit kun je niet ongedaan maken.'))
})

test('Over Hoot: Designsysteem en de debugzin zijn weg, Op dit toestel staat er (zoals in de app)', () => {
  const s = src('src/views/Settings.jsx')
  assert.doesNotMatch(s, /Designsysteem|De Editie kan nu nog wisselen/)
  assert.match(s, /href="#\/toestel" label="Op dit toestel"/)
  assert.match(src('src/App.jsx'), /PAGES = \[[^\]]*'toestel'/)
})

test('de Privacy-belofte klopt: Instellingen › Account › Account verwijderen bestaat op het web', () => {
  assert.match(src('src/views/Privacy.jsx'), /Instellingen › Account › Account verwijderen/)
  assert.match(src('src/views/Settings.jsx'), /<AccountSettings[^>]*\bmanage\b/)
  assert.match(src('src/components/Account.jsx'), /Account verwijderen/)
})

// ---- de pagina's zelf ----
const load = async (entry) => {
  const out = await build({ entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', packages: 'external', loader: { '.css': 'empty' }, define: { __APP_VERSION__: '"1.1.0"' } })
  const m = { exports: {} }
  new Function('require', 'module', 'exports', out.outputFiles[0].text)(createRequire(import.meta.url), m, m.exports)
  return m.exports
}
const { AccountSettings } = await load('src/components/Account.jsx')
const html = (el) => renderToStaticMarkup(el)
const member = (extra = {}) => ({ status: 'in', user: { id: 'u1', email: 'a@b.nl' }, profile: {}, signOut() {}, ...extra })

test('status: Ingelogd tot de eerste geslaagde synchronisatie, daarna Gesynchroniseerd', () => {
  const r = (account, syncStatus = 'idle') => html(React.createElement(AccountSettings, { account, syncStatus }))
  assert.match(r(member()), /Ingelogd</)
  assert.doesNotMatch(r(member()), /Gesynchroniseerd/)
  assert.match(r(member({ pulled: true })), /Gesynchroniseerd</)
  assert.match(r(member({ pulled: true }), 'ok'), /Gesynchroniseerd</)
  assert.match(r(member(), 'syncing'), /Synchroniseren…/)
  assert.match(r(member(), 'error'), /Synchroniseren lukte niet; straks opnieuw/)
})

test('Instellingen (manage): Nu synchroniseren, de zin over het toestel en Account verwijderen; het Jij-blad houdt het kort', () => {
  const full = html(React.createElement(AccountSettings, { account: member({ pulled: true }), syncStatus: 'ok', manage: true }))
  assert.match(full, /Nu synchroniseren/)
  assert.match(full, /Weergave en lezen blijven per toestel\./)
  assert.match(full, /Account verwijderen/)
  const short = html(React.createElement(AccountSettings, { account: member({ pulled: true }), syncStatus: 'ok' }))
  assert.doesNotMatch(short, /Nu synchroniseren|Account verwijderen/)
  // Nu synchroniseren wacht tijdens het synchroniseren.
  assert.match(html(React.createElement(AccountSettings, { account: member(), syncStatus: 'syncing', manage: true })), /disabled=""[^>]*>Nu synchroniseren/)
  // Uitgelogd: niets te verwijderen.
  assert.doesNotMatch(html(React.createElement(AccountSettings, { account: { status: 'out', signIn() {} }, manage: true })), /Account verwijderen/)
})

test('Op dit toestel: Bewaard wissen staat uit zonder Bewaard; de voetnoot hoort bij een account', async () => {
  const { default: Device } = await load('src/views/Device.jsx')
  const base = { onBack() {}, backLabel: 'Instellingen' }
  const empty = html(React.createElement(Device, { ...base, account: { status: 'out' }, saved: {} }))
  assert.match(empty, /<button[^>]*disabled=""[^>]*>[^<]*<span[^>]*>Bewaarde artikelen verwijderen/)
  assert.doesNotMatch(empty, /Bewaard gaat mee met je account/)
  const withAcc = html(React.createElement(Device, { ...base, account: member(), saved: { a: {}, b: {} } }))
  assert.match(withAcc, /Bewaard gaat mee met je account\./)
  assert.match(withAcc, /Bewaard en gelezen blijven\./)
})
