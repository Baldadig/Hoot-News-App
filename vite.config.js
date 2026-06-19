import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

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
  plugins: [
    devApi(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'icons/favicon-32.png'],
      manifest: {
        name: 'Hoot',
        short_name: 'Hoot',
        description: 'Een rustige, reclamevrije nieuws-tijdlijn van jouw abonnementen.',
        lang: 'nl',
        theme_color: '#21468b',
        background_color: '#21468b',
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
