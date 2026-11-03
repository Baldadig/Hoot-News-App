// Alleen de oude rootregistratie stoppen; geen tab of lokale gebruikersgegevens wissen.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.registration.unregister()))
// Een al geopende oude app mag zijn eerder gecachte publieke chunks nog uitlezen.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.origin === self.location.origin && ['script', 'style', 'font'].includes(event.request.destination)) {
    event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request)))
  }
})
