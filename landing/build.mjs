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

// fonts (alleen wat gebruikt wordt, alleen latin)
const FD = APP + '/node_modules/@fontsource';
const fonts = { 'newsreader-800.woff2': FD + '/newsreader/files/newsreader-latin-800-normal.woff2' };
for (const w of [400, 600, 700]) fonts[`source-sans-3-${w}.woff2`] = FD + `/source-sans-3/files/source-sans-3-latin-${w}-normal.woff2`;
for (const [n, p] of Object.entries(fonts)) fs.copyFileSync(p, path.join(OUT, 'fonts', n));

// merk
const dOf = f => fs.readFileSync(APP + '/public/brand/' + f, 'utf8').match(/<path[^>]* d="([^"]+)"/)[1];
const WM_D = dOf('hoot-logo-ink.svg'), MARK_D = dOf('hoot-mark-ink.svg');

// het kleine inline script: oude #/-links doorsturen, en de js-klasse
const { INLINE } = await import('./inline.mjs');
const HASH = 'sha256-' + crypto.createHash('sha256').update(INLINE).digest('base64');

// de Stroom-lijsten
const BR = { LD: ['c1', 'Landelijk Dagblad'], SK: ['c2', 'Stadskrant'], WW: ['c4', 'Weekblad Wereld'], CK: ['c3', 'Cultuurkrant'], ON: ['c5', 'Omroep Nieuws'] };
const item = ([rub, waarom, kop, b, tijd]) => `<div class="sc-item"><div class="sc-rub">${rub}</div><div class="sc-waarom">${waarom}</div><div class="sc-k">${kop}</div><div class="sc-bron"><i class="${BR[b][0]}">${b}</i><span>${BR[b][1]}<small>${tijd}</small></span><svg class="sc-bm" viewBox="0 0 14 18"><use href="#i-bm"/></svg></div></div>`;
const L = {
  alles: [
    ['Binnenland', 'Omdat je Binnenland volgt', 'Netbeheerders mogen eerder beginnen met bouwen, ook als de inspraak nog loopt', 'ON', '4 min geleden'],
    ['Cultuur', 'Uit je eigen bronnen', 'Oude bioscoop in de binnenstad wordt weer filmhuis', 'SK', '11 min geleden'],
    'HIER',
    ['Buitenland', 'Buiten je bubbel', 'Zuid-Europese steden zoeken verkoeling met nieuwe stadsbossen', 'WW', '1 uur geleden'],
    ['Binnenland', 'Uit je eigen bronnen', 'Treinreizigers vinden sneller een zitplaats dankzij de nieuwe dienstregeling', 'LD', '2 uur geleden'],
  ],
  binnenland: [
    ['Binnenland', 'Omdat je Binnenland volgt', 'Netbeheerders mogen eerder beginnen met bouwen, ook als de inspraak nog loopt', 'ON', '4 min geleden'],
    ['Binnenland', 'Uit je eigen bronnen', 'Treinreizigers vinden sneller een zitplaats dankzij de nieuwe dienstregeling', 'LD', '2 uur geleden'],
    ['Binnenland', 'Vervolg op wat je las', 'Fietsbrug verbindt twee wijken die jarenlang gescheiden waren', 'SK', '3 uur geleden'],
    ['Binnenland', 'Uit je eigen bronnen', 'Bibliotheken openen in de avond extra uren voor wie rust zoekt', 'LD', '5 uur geleden'],
  ],
  buitenland: [
    ['Buitenland', 'Buiten je bubbel', 'Zuid-Europese steden zoeken verkoeling met nieuwe stadsbossen', 'WW', '1 uur geleden'],
    ['Buitenland', 'Groot nieuws · 9 bronnen', 'Wereldleiders zoeken op de top naar een akkoord over scheepvaartroutes', 'ON', '2 uur geleden'],
    ['Buitenland', 'Uit je eigen bronnen', 'Noorse haven laadt schepen voortaan op stroom van land', 'WW', '4 uur geleden'],
    ['Buitenland', 'Buiten je bubbel', 'Een dorp in de Alpen deelt zijn elektrische bus met de buren', 'LD', '6 uur geleden'],
  ],
  cultuur: [
    ['Cultuur', 'Uit je eigen bronnen', 'Oude bioscoop in de binnenstad wordt weer filmhuis', 'SK', '11 min geleden'],
    ['Cultuur', 'Buiten je bubbel', 'Debuutroman over een dorp aan de rivier verovert de boekenlijsten', 'CK', '1 uur geleden'],
    ['Cultuur', 'Omdat je Cultuur volgt', 'Orkest speelt een gratis concert in een leegstaande hal', 'CK', '3 uur geleden'],
    ['Cultuur', 'Uit je eigen bronnen', 'Museum zet de zaalteksten voortaan ook in eenvoudige taal', 'SK', '5 uur geleden'],
  ],
};
const PANELEN = Object.entries(L).map(([k, arr]) =>
  `<div class="sc-lijst" data-pan="${k}"${k === 'alles' ? '' : ' hidden'}>${arr.map(i => i === 'HIER' ? '<div class="sc-hier">Hier was je gebleven</div>' : item(i)).join('')}</div>`).join('');

const fill = (t) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => ({ CSSFILE, JSFILE, INLINE, WM_D, MARK_D, PANELEN })[k]).replace(/<!--[\s\S]*?-->\n?/g, '');
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
