// Vite genereert geen edge-middleware. Alleen oude HTML-routes gaan langs deze verhuizing;
// bestaande iOS-clients houden hun /api/* zonder redirects en zonder gewijzigde methode.
export default function legacyDomain(request) {
  const url = new URL(request.url)
  if (!['hootnews.nl', 'www.hootnews.nl'].includes(url.hostname)) return
  if (!['GET', 'HEAD'].includes(request.method) || url.pathname.startsWith('/api/')) return
  const target = new URL(url.pathname.startsWith('/deel/') ? url.pathname : '/lees/', 'https://gethoot.app')
  if (url.pathname.startsWith('/deel/') || /bot|crawler|spider|slurp/i.test(request.headers.get('user-agent') || '')) return Response.redirect(target, 301)
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Hoot verhuist mee</title></head><body><main><p>Je Hoot verhuist mee.</p><p id="move-error" hidden>Overzetten lukt nu niet. Je gegevens blijven hier bewaard. <a href="">Probeer opnieuw</a></p><noscript><a href="https://gethoot.app/lees/">Open Hoot</a></noscript></main><script src="/lees/move-out.js" defer></script></body></html>`
  return new Response(request.method === 'HEAD' ? null : html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'origin', 'Content-Security-Policy': "default-src 'none'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" } })
}
export const config = { path: ['/', '/index.html', '/lees', '/lees/*', '/privacy', '/over', '/deel/*'], excludedPath: ['/lees/assets/*', '/lees/icons/*', '/lees/brand/*', '/lees/sw.js', '/lees/move-out.js'], onError: 'bypass' }
