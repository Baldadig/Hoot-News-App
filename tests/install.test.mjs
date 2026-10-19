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
