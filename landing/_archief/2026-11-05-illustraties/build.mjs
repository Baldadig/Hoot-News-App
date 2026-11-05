// Bouwt site/ uit site-src/v4. Gebruik: node build.mjs
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const APP = path.resolve(path.dirname(decodeURIComponent(new URL(import.meta.url).pathname)), '..');
const require = createRequire(APP + '/package.json');
const esbuild = require('esbuild');
const SRC = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const OUT = path.resolve(APP, 'dist');
const rd = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const sha = (s, n = 10) => crypto.createHash('sha256').update(s).digest('hex').slice(0, n);

for (const d of ['assets', 'fonts', 'img', 'icons']) fs.mkdirSync(path.join(OUT, d), { recursive: true });

// css en js, geminimaliseerd, met hash in de naam
const css = esbuild.transformSync(rd('hoot.css'), { loader: 'css', minify: true }).code;
const js = esbuild.transformSync(rd('hoot.js'), { loader: 'js', minify: true, target: 'es2019' }).code;
const CSSFILE = `hoot.${sha(css, 8)}.css`, JSFILE = `hoot.${sha(js, 8)}.js`;
fs.writeFileSync(path.join(OUT, 'assets', CSSFILE), css); fs.writeFileSync(path.join(OUT, 'assets', JSFILE), js);

// fonts (alleen wat gebruikt wordt; latin en latin-ext, de tweede laadt alleen bij zulke tekens).
// Koppen: de statische Newsreader 800. Lopende tekst en bediening: de variabele letters uit src/fonts.
const FD = APP + '/node_modules/@fontsource', SF = APP + '/src/fonts';
const fonts = {
  'newsreader-800.woff2': FD + '/newsreader/files/newsreader-latin-800-normal.woff2',
  'newsreader-800-ext.woff2': FD + '/newsreader/files/newsreader-latin-ext-800-normal.woff2',
  'newsreader-tekst.woff2': SF + '/newsreader-latin-opsz-normal.woff2',
  'newsreader-tekst-ext.woff2': SF + '/newsreader-latin-ext-opsz-normal.woff2',
  'schibsted.woff2': SF + '/schibsted-latin-wght-normal.woff2',
  'schibsted-ext.woff2': SF + '/schibsted-latin-ext-wght-normal.woff2',
};
for (const [n, p] of Object.entries(fonts)) fs.copyFileSync(p, path.join(OUT, 'fonts', n));
fs.copyFileSync(SF + '/schibsted-OFL.txt', path.join(OUT, 'fonts', 'OFL-Schibsted-Grotesk.txt')); // de licentie gaat mee met de letter
fs.copyFileSync(SF + '/newsreader-OFL.txt', path.join(OUT, 'fonts', 'OFL-Newsreader.txt'));

// merk
const dOf = f => fs.readFileSync(APP + '/public/brand/' + f, 'utf8').match(/<path[^>]* d="([^"]+)"/)[1];
const WM_D = dOf('hoot-logo-ink.svg'), MARK_D = dOf('hoot-mark-ink.svg');

// App Store: op true zodra https://apps.apple.com/nl/app/id6828037269 bereikbaar is (na Apples akkoord op de handelaarsstatus).
const APP_STORE = false;
const { appStore } = await import('./appstore.mjs');
const AS = appStore(APP_STORE);

// het kleine inline script: oude #/-links doorsturen, en de js-klasse
const { INLINE } = await import('./inline.mjs');
const HASH = 'sha256-' + crypto.createHash('sha256').update(INLINE).digest('base64');

// De illustraties zonder tekst (Alex 5-11, beeldtaal 04 en 07): alleen vlakken, geen lijnen.
// Selectie: een raster van acht bij vijf inktpunten, één punt is groter en rood.
const RASTER = Array.from({ length: 40 }, (_, i) => {
  const k = i % 8, r = Math.floor(i / 8), x = 86 + k * 44, y = 62 + r * 44;
  return k === 5 && r === 2 ? `<circle class="il-rood" cx="${x}" cy="${y}" r="12"/>` : `<circle class="il-inkt" cx="${x}" cy="${y}" r="5"/>`;
}).join('');
// De Redacteur: tien plekken op een kring; negen punten in inkt, de tiende stapt naar buiten en wordt rood (de bubbel).
const TIEN = Array.from({ length: 10 }, (_, i) => {
  const h = (-90 + i * 36) * Math.PI / 180, uit = i === 3, R = uit ? 156 : 92;
  const x = (220 + R * Math.cos(h)).toFixed(1), y = (150 + R * Math.sin(h)).toFixed(1);
  return `<circle class="${uit ? 'il-rood' : 'il-inkt'}" cx="${x}" cy="${y}" r="${uit ? 16 : 11}"/>`;
}).join('');

const fill = (t) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => ({ CSSFILE, JSFILE, INLINE, WM_D, MARK_D, RASTER, TIEN, ...AS })[k]).replace(/<!--[\s\S]*?-->\n?/g, '');
fs.writeFileSync(path.join(OUT, 'index.html'), fill(rd('index.src.html')));
fs.writeFileSync(path.join(OUT, '404.html'), fill(rd('404.src.html')));

// iconen
const pub = APP + '/public';
fs.copyFileSync(pub + '/favicon.svg', path.join(OUT, 'favicon.svg'));
fs.copyFileSync(pub + '/apple-touch-icon.png', path.join(OUT, 'apple-touch-icon.png'));
fs.copyFileSync(pub + '/icons/favicon-32.png', path.join(OUT, 'icons/favicon-32.png'));
if (fs.existsSync(path.join(SRC, 'og.png'))) fs.copyFileSync(path.join(SRC, 'og.png'), path.join(OUT, 'img/og.png'));

// headers en redirects
const csp = `default-src 'none'; script-src 'self' '${HASH}'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests`;
fs.writeFileSync(path.join(OUT, '_headers'), `/
  Content-Security-Policy: ${csp}

/index.html
  Content-Security-Policy: ${csp}

/404.html
  Content-Security-Policy: ${csp}

/*
  Strict-Transport-Security: max-age=31536000
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin

/
  Cache-Control: public, max-age=0, must-revalidate

/index.html
  Cache-Control: public, max-age=0, must-revalidate

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable
  Access-Control-Allow-Origin: *

/img/*
  Cache-Control: public, max-age=604800

/icons/*
  Cache-Control: public, max-age=604800

/favicon.svg
  Cache-Control: public, max-age=604800

/apple-touch-icon.png
  Cache-Control: public, max-age=604800

/robots.txt
  Cache-Control: public, max-age=86400

/sitemap.xml
  Cache-Control: public, max-age=86400
`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: https://gethoot.app/sitemap.xml\n');
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://gethoot.app/</loc><lastmod>2026-10-31</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>\n</urlset>\n');
console.log('gebouwd', { CSSFILE, JSFILE, HASH });
