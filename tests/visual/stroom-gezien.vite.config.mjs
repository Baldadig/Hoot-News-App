// Voor tests/visual/stroom-gezien-check.mjs: de gewone vite-config (zoals vouw.vite.config.mjs), maar de feed van
// de echte site (HOOT_API, standaard https://gethoot.app) in plaats van de lokale functies. Die halen alle bronnen
// zelf op en kunnen minutenlang hangen; voor deze proef telt alleen wat de Stroom ermee doet.
import { mergeConfig } from 'vite'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import base from '../../vite.config.js'
const root = fileURLToPath(new URL('../../', import.meta.url))
const b = typeof base === 'function' ? await base({ command: 'serve', mode: 'development' }) : base
const plugins = (b.plugins || []).flat().filter((p) => p?.name !== 'hoot-dev-api')
const api = process.env.HOOT_API || 'https://gethoot.app'
export default mergeConfig({ ...b, plugins }, {
  server: {
    fs: { allow: [root, realpathSync(root + 'node_modules')] },
    proxy: { '/api': { target: api, changeOrigin: true } },
  },
})
