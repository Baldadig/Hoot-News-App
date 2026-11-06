// Voor tests/visual/vouw-check.mjs: de gewone vite-config, plus toegang tot node_modules als dat een symlink naar
// een andere map is (een git-worktree deelt node_modules met de hoofdmap). Anders weigert vite de letters (403).
import { mergeConfig } from 'vite'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import base from '../../vite.config.js'
const root = fileURLToPath(new URL('../../', import.meta.url))
const b = typeof base === 'function' ? await base({ command: 'serve', mode: 'development' }) : base
export default mergeConfig(b, { server: { fs: { allow: [root, realpathSync(root + 'node_modules')] } } })
