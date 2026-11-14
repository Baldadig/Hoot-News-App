import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shouldShowInstallTip } from '../src/lib/install.js'

const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1'
const ipad = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15'

test('tip in Safari op iPhone en iPad, niet als web-app, niet na wegklikken, niet elders', () => {
  assert.equal(shouldShowInstallTip({ ua: iphone }), true)
  assert.equal(shouldShowInstallTip({ ua: ipad, platform: 'MacIntel', maxTouchPoints: 5 }), true)
  assert.equal(shouldShowInstallTip({ ua: iphone, standalone: true }), false)
  assert.equal(shouldShowInstallTip({ ua: iphone, displayStandalone: true }), false)
  assert.equal(shouldShowInstallTip({ ua: iphone, dismissed: true }), false)
  assert.equal(shouldShowInstallTip({ ua: iphone.replace('Version/18.2', 'CriOS/130') }), false)
  assert.equal(shouldShowInstallTip({ ua: ipad, platform: 'MacIntel', maxTouchPoints: 0 }), false) // echte Mac
})

// Onboarding blok 2 (14 november): de weg naar de app onder de eindkaart.
import { readFileSync } from 'node:fs'
import { shouldShowAppCard, inAppBrowser } from '../src/lib/install.js'
import { APP_URL } from '../shared/appstore.mjs'
import * as landing from '../landing/appstore.mjs'

const instagram = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 360.0.0.30.109 (iPhone15,3; iOS 18_2; nl_NL; nl; scale=3.00; 1290x2796; 672535182)'
const facebook = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/490.0.0.40.107;FBBV/663226128;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/18.2;FBSS/3;FBCR/;FBID/phone;FBLC/nl_NL;FBOP/80]'
const chromeIos = iphone.replace('Version/18.2', 'CriOS/130')
const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
const android = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'

test('de App Store-kaart: op iPhone en iPad in elke browser, ook Instagram en Facebook; niet als web-app, niet na Niet nu of een tik, niet elders', () => {
  for (const ua of [iphone, chromeIos, instagram, facebook]) assert.equal(shouldShowAppCard({ ua }), true, ua)
  assert.equal(shouldShowAppCard({ ua: ipad, platform: 'MacIntel', maxTouchPoints: 5 }), true)
  assert.equal(shouldShowAppCard({ ua: iphone, standalone: true }), false)
  assert.equal(shouldShowAppCard({ ua: iphone, displayStandalone: true }), false)
  assert.equal(shouldShowAppCard({ ua: instagram, dismissed: true }), false)
  assert.equal(shouldShowAppCard({ ua: mac, platform: 'MacIntel', maxTouchPoints: 0 }), false)
  assert.equal(shouldShowAppCard({ ua: android }), false)
})

test('Instagram en Facebook herkend; daar geen tip voor het beginscherm (dat kan alleen in Safari)', () => {
  assert.equal(inAppBrowser(instagram), true)
  assert.equal(inAppBrowser(facebook), true)
  assert.equal(inAppBrowser(iphone), false)
  assert.equal(shouldShowInstallTip({ ua: instagram + ' Safari/604.1' }), false)
  assert.equal(shouldShowInstallTip({ ua: facebook }), false)
})

test('de kaart opent de App Store met een gewone link uit shared/appstore.mjs, dezelfde als de landing', () => {
  assert.equal(APP_URL, 'https://apps.apple.com/nl/app/id6828037269')
  assert.equal(landing.APP_URL, APP_URL)
  const src = readFileSync(new URL('../src/components/AppKaart.jsx', import.meta.url), 'utf8')
  assert.match(src, /from '\.\.\/\.\.\/shared\/appstore\.mjs'/)
  // een gewone <a href>: geen target, geen window.open en geen itms-apps:, dan opent hij ook in Instagram en Facebook
  assert.match(src, /<a className="btn" href=\{APP_URL\} onClick=\{onOpen\}>/)
  assert.doesNotMatch(src, /target=|window\.open|itms-apps/)
  assert.match(src, /Hoot staat ook in de App Store\. Daar krijg je een seintje als je volgende Editie klaarligt\./)
  assert.match(src, />\s*Open in de App Store\s*</)
  assert.match(src, />\s*Niet nu\s*</)
})

test('de kaart staat onder de eindkaart, telt appstore-tik:einde, en houdt de tip en de accountvraag tegen', () => {
  const ed = readFileSync(new URL('../src/views/Edition.jsx', import.meta.url), 'utf8')
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.ok(ed.indexOf('<AppKaart') > ed.indexOf('className="endcap"'), 'de kaart staat na de eindkaart')
  assert.ok(ed.indexOf('<AppKaart') < ed.indexOf('<MaakVanJou'), 'de zwevende Maak Hoot van jou blijft de laatste')
  assert.match(ed, /appKaart && !\(nudge && browsing\) \? <AppKaart/, 'zolang Maak Hoot van jou zweeft, wacht de kaart')
  assert.match(app, /tel\('appstore-tik:einde'/)
  assert.match(app, /const mayAsk = [^\n]*&& !appKaart/)
  assert.match(app, /installTip && prefs\.onboarded && !appKaart \?/)
  assert.match(app, /const appKaart = appCardFits && endSeenOnce/)
})
