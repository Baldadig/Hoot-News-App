import { PrecacheController, PrecacheRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { canCleanShell } from './lib/sw-policy.js'

const shell = new PrecacheController()
shell.addToCacheList(self.__WB_MANIFEST)
const root = new URL(self.registration.scope)

// Installeren vóór activeren. Een downloadfout laat de bestaande worker intact.
self.addEventListener('install', event => {
  event.waitUntil(shell.install(event).then(() => self.skipWaiting()))
})
self.addEventListener('activate', event => {
  // Geen precache-cleanup hier: geopende oude pagina's gebruiken hun oude lazy chunks nog.
  // Claim verandert de worker, maar navigeert of herlaadt geen enkel venster.
  event.waitUntil(self.clients.claim())
})
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting())
  if (event.data?.type !== 'HOOT_CURRENT_BUNDLE' || !event.source?.id) return
  event.waitUntil((async () => {
    const client = await self.clients.get(event.source.id)
    const current = shell.getCachedURLs().includes(event.data.url)
    client?.postMessage({ type: 'HOOT_BUNDLE_STATUS', current })
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    if (canCleanShell({ scope: root.href, senderId: event.source.id, clientUrl: client?.url,
      bundleUrl: event.data.url, currentAssets: shell.getCachedURLs(), clients })) await shell.activate(event)
  })())
})

// Vóór de precacheroute: ook /lees/index.html moet online de nieuwe HTML krijgen.
// Offline of bij een netwerkfout blijft de volledig vooraf opgehaalde shell beschikbaar.
const pages = new NetworkFirst({
  cacheName: 'hoot-pages', networkTimeoutSeconds: 4,
  fetchOptions: { cache: 'no-cache' },
  plugins: [
    new ExpirationPlugin({ maxEntries: 8, maxAgeSeconds: 24 * 3600 }),
    { handlerDidError: () => shell.matchPrecache(new URL('index.html', root).href) },
  ],
})
registerRoute(({request, url}) => request.mode === 'navigate' && url.origin === root.origin
  && url.pathname.startsWith(root.pathname), pages)
registerRoute(new PrecacheRoute(shell))
// Na activering blijven oude gehashte chunks beschikbaar. InjectManifest bewaart die met
// een __WB_REVISION__-query; negeer die cachekey-query voor onveranderlijke assetpaden.
registerRoute(({request, url}) => url.origin === root.origin && url.pathname.startsWith(root.pathname + 'assets/')
  && ['script', 'style', 'font'].includes(request.destination), new CacheFirst({ cacheName: shell.strategy.cacheName, matchOptions: { ignoreSearch: true } }))
registerRoute(({url}) => url.origin === root.origin && url.pathname.startsWith('/api/feed'), new NetworkFirst({
  cacheName: 'hoot-feed', networkTimeoutSeconds: 8,
  plugins: [new ExpirationPlugin({ maxEntries: 8, maxAgeSeconds: 24 * 3600 })],
}))
registerRoute(({request}) => request.destination === 'image', new CacheFirst({
  cacheName: 'hoot-images',
  plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 3600 })],
}))
