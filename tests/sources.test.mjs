import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SOURCES } from '../netlify/lib/sources.mjs'

// De app opent `login` in de lezer en zoekt daar de inlog van de uitgever: dus een echte https-pagina.
test('elke inlogpagina is een geldige https-URL', () => {
  const withLogin = SOURCES.filter((s) => s.login !== undefined)
  assert.ok(withLogin.length > 0)
  for (const s of withLogin) {
    const url = new URL(s.login) // gooit bij een ongeldige URL
    assert.equal(url.protocol, 'https:', s.id)
    assert.ok(url.hostname.includes('.'), s.id)
  }
})

test('The Verge heeft een inlog (abonnement sinds 2025), de NOS niet', () => {
  const byId = Object.fromEntries(SOURCES.map((s) => [s.id, s]))
  assert.ok(byId.theverge.login)
  assert.equal(byId.nos.login, undefined)
})
