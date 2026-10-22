import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync, writeFileSync } from 'node:fs'
import { headersFile } from './scripts/headers.mjs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const version = process.env.HOOT_VERSION || pkg.version // HOOT_VERSION: alleen om lokaal twee builds te vergelijken

// Draait de Netlify-functies lokaal (zelfde vorm als op Netlify: Request erin, Response eruit),
// zodat `npm run dev` echte data toont zonder Netlify CLI.
function devApi() {
  const routes = { '/api/feed': 'feed' }
  return {
    name: 'hoot-dev-api',
    apply: 'serve',
    configureServer(server) {
      for (const [path, name] of Object.entries(routes)) {
        server.middlewares.use(path, async (req, res) => {
          try {
            const chunks = []
            for await (const c of req) chunks.push(c)
            const request = new Request(new URL(req.originalUrl || req.url, 'http://localhost'), { method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined })
            const mod = await server.ssrLoadModule(`/netlify/functions/${name}.mjs`)
            const response = await mod.default(request, { waitUntil: () => {} })
            res.statusCode = response.status
            response.headers.forEach((v, k) => res.setHeader(k, v))
            res.end(Buffer.from(await response.arrayBuffer()))
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: String(e?.message || e) }))
          }
        })
      }
    },
  }
}

// Na de build: dist/_headers met de security-headers en de hashes van de inline scripts.
function securityHeaders() {
  let outDir = 'dist'
  return {
    name: 'hoot-security-headers',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir
    },
    closeBundle() {
      const html = readFileSync(`${outDir}/index.html`, 'utf8')
      writeFileSync(`${outDir}/_headers`, headersFile(html))
    },
  }
}

export default defineConfig({
  // Versienummer zichtbaar in het menu, zodat je ziet welke versie er draait.
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    devApi(),
    securityHeaders(),
    react(),
    VitePWA({
      // Een nieuwe versie wordt klaargezet en wácht: de app toont dan "Nieuwe versie
      // beschikbaar" en activeert hem pas als je op Vernieuwen tikt (of alle tabbladen sluit).
      // Registreren doet de app zelf, na het laden (src/lib/swUpdate.js).
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['icon.svg', 'favicon.svg', 'apple-touch-icon.png', 'icons/favicon-32.png', 'icons/favicon-48.png'],
      manifest: {
        name: 'Hoot',
        short_name: 'Hoot',
        description: 'Een rustige, reclamevrije nieuws-tijdlijn van jouw abonnementen.',
        lang: 'nl',
        theme_color: '#f5f1e8',
        background_color: '#f5f1e8',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,woff2,svg,png}'], // ook de lettertypes, zodat de app offline gelijk blijft
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/feed'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'hoot-feed',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'hoot-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
})
