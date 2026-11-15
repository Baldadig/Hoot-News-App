// Bouwt tests/visual/knipsel.html als losse proefpagina naar dist/knipsel-proef (met de gewone instellingen voor
// assets, dus dezelfde WebP's en image-set als de site). tests/visual/knipsel-check.mjs previewt hem.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import base from '../../vite.config.js'
const root = fileURLToPath(new URL('../../', import.meta.url))
export default defineConfig({
  root,
  base: '/',
  define: base.define,
  plugins: [react()],
  build: { ...base.build, outDir: 'dist/knipsel-proef', emptyOutDir: true, target: 'esnext', rollupOptions: { input: fileURLToPath(new URL('./knipsel.html', import.meta.url)) } },
  preview: { port: 5198, strictPort: true },
})
