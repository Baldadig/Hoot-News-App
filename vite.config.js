import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const version = process.env.HOOT_VERSION || pkg.version // HOOT_VERSION: alleen om lokaal twee builds te vergelijken

// Serveert /api/feed lokaal door de Netlify-functie te draaien,
// zodat `npm run dev` en de preview echte data tonen zonder Netlify CLI.
function devApi() {
  return {
    name: 'hoot-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/feed', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/netlify/functions/feed.mjs')
          const result = await mod.handler({ queryStringParameters: {} })
          res.statusCode = result.statusCode || 200
          for (const [k, v] of Object.entries(result.headers || {})) res.setHeader(k, v)
          res.end(result.body)
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: String((e && e.message) || e) }))
        }
      })

      server.middlewares.use('/api/tts', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/netlify/functions/tts.mjs')
          const q = Object.fromEntries(new URL(req.url, 'http://x').searchParams)
          const result = await mod.handler({ queryStringParameters: q })
          res.statusCode = result.statusCode || 200
          for (const [k, v] of Object.entries(result.headers || {})) res.setHeader(k, v)
          res.end(result.isBase64Encoded ? Buffer.from(result.body, 'base64') : result.body)
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String((e && e.message) || e) }))
        }
      })

      server.middlewares.use('/api/save', async (req, res) => {
        try {
          let body = ''
          req.on('data', (c) => (body += c))
          await new Promise((resolve) => req.on('end', resolve))
          const mod = await server.ssrLoadModule('/netlify/functions/save.mjs')
          const result = await mod.handler({ httpMethod: req.method, body })
          res.statusCode = result.statusCode || 200
          for (const [k, v] of Object.entries(result.headers || {})) res.setHeader(k, v)
          res.end(result.body)
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: String((e && e.message) || e) }))
        }
      })
    },
  }
}

export default defineConfig({
  // Versienummer zichtbaar in het menu, zodat je ziet welke versie er draait.
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    devApi(),
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
        theme_color: '#263c67',
        background_color: '#f3f0e7',
        display: 'standalone',
        orientation: 'portrait',
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
