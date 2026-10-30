// Security-headers voor Netlify (dist/_headers), bij elke build opnieuw gemaakt door de
// Vite-plugin in vite.config.js. De drie inline scripts in index.html (beeld vooraf laden,
// thema, opstartscherm) mogen draaien via hun sha256-hash, en de inline <style> van het
// opstartscherm net zo; die rekenen we uit het gebouwde index.html, zodat een wijziging daarin
// nooit stilletjes de app breekt.
import { createHash } from 'node:crypto'

// Handhaven. (Van 1.25 tot 1.26 alleen melden; lokaal afdwingend getest op alle schermen.)
export const CSP_ENFORCE = true

export const inlineScripts = (html) => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
export const inlineStyles = (html) => [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1])
export const sha256 = (text) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`

export function csp(hashes, styleHashes = []) {
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`,
    `style-src 'self'${styleHashes.map((h) => ` ${h}`).join('')}`,
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
    'upgrade-insecure-requests', // een http-beeld van een uitgever wordt https in plaats van geblokkeerd
  ].join('; ')
}

export function headersFile(html, { enforce = CSP_ENFORCE } = {}) {
  const policy = csp(inlineScripts(html).map(sha256), inlineStyles(html).map(sha256))
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
