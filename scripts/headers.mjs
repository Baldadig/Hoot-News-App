// Security-headers voor Netlify (dist/_headers), bij elke build opnieuw gemaakt door de
// Vite-plugin in vite.config.js. De twee inline scripts in index.html (beeld vooraf laden,
// thema) mogen draaien via hun sha256-hash; die rekenen we uit het gebouwde index.html, zodat
// een wijziging in die scripts nooit stilletjes de app breekt.
import { createHash } from 'node:crypto'

// Eerst alleen melden (Report-Only); na een dag zonder meldingen omzetten naar handhaven.
export const CSP_ENFORCE = false

export const inlineScripts = (html) => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
export const sha256 = (text) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`

export function csp(hashes) {
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`,
    "style-src 'self'",
    "font-src 'self'",
    "img-src 'self' https: data: blob:", // beeld komt van honderd uitgevers
    "media-src 'self' https://video.cdn.bsky.app blob:",
    "connect-src 'self' https://vlimcejjkeltooplsijx.supabase.co https://public.api.bsky.app https://api.open-meteo.com",
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')
}

export function headersFile(html, { enforce = CSP_ENFORCE } = {}) {
  const policy = csp(inlineScripts(html).map(sha256))
  const name = enforce ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only'
  // De CSP alleen op de pagina zelf; afbeeldingen, de service worker en de API hebben hem niet nodig.
  const page = (path) => `${path}\n  ${name}: ${policy}\n`
  return [
    page('/'),
    page('/index.html'),
    `/*
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
`,
  ].join('\n')
}
