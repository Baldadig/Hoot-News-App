import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isNoise } from '../netlify/lib/rss.mjs'
import { matchCard } from '../netlify/lib/build.mjs'

const it = (title, link = 'https://example.org/a') => ({ title, link })

test('kleine updates en aanbiedingen horen niet in de Stroom', () => {
  assert.equal(isNoise(it('Software-update - Camtasia 2026.2.3', 'https://tweakers.net/downloads/78736/camtasia-202623.html')), true)
  assert.equal(isNoise(it('Driver-update - AMD Ryzen Chipset Driver 8.09.28.1124')), true)
  assert.equal(isNoise(it('Firmware-update - QNAP QTS 5.2.10.3568')), true)
  assert.equal(isNoise(it('.Actie - Thuisladen kan geld opleveren', 'https://tweakers.net/plan/4860/thuisladen.html')), true)
  assert.equal(isNoise(it('De beste aanbiedingen van deze week')), true)
  assert.equal(isNoise(it('Black Friday-deals bij Coolblue en Bol')), true)
  assert.equal(isNoise(it('Kortingscode voor Zalando')), true)
  assert.equal(isNoise(it('Iets'), ['Software']), true) // Tweakers-categorie
  // Nieuws blijft: ook een deal of update die nieuws is.
  assert.equal(isNoise(it('Trump en China sluiten deal over chips')), false)
  assert.equal(isNoise(it('Brexit-deal na lang onderhandelen rond')), false)
  assert.equal(isNoise(it('Nvidia brengt hotfix uit voor bug die gpu-temperatuur verkeerd weergeeft', 'https://tweakers.net/nieuws/1/x.html')), false)
  assert.equal(isNoise(it('Review - Philips OLED951-tv – Luxe en veelzijdig', 'https://tweakers.net/reviews/15432/x.html')), false)
})

test('Tweakers-beeld via Bluesky: op de kop gekoppeld, ook met "Review - " ervoor of een kleine wijziging', () => {
  const cards = [
    { title: 'Philips OLED951-tv – Luxe en veelzijdig, maar minder smart', thumb: 'https://cdn.bsky.app/a' },
    { title: 'Veel websites bij hosters van Yourhosting zijn nog steeds offline om PHP-bug', thumb: 'https://cdn.bsky.app/b' },
  ]
  assert.equal(matchCard('Review - Philips OLED951-tv – Luxe en veelzijdig, maar minder smart', cards)?.thumb, 'https://cdn.bsky.app/a')
  assert.equal(matchCard('Veel websites bij hosters van Yourhosting zijn nog steeds offline door PHP-bug', cards)?.thumb, 'https://cdn.bsky.app/b')
  assert.equal(matchCard('Spotify heeft 306 miljoen betalende Premium-abonnees', cards), null)
})
