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
const APP_STORE = true;
const { appStore } = await import('./appstore.mjs');
const AS = appStore(APP_STORE);

// het kleine inline script: oude #/-links doorsturen, en de js-klasse
const { INLINE } = await import('./inline.mjs');
const HASH = 'sha256-' + crypto.createHash('sha256').update(INLINE).digest('base64');

// De Stroom-lijsten, als kaart A+ van 1.1.0: kop, een korte intro, beeld 2:1, de bronregel. Twee kaarten per rubriek, de eerste met beeld.
// De rubrieken in de vaste volgorde van de app (Alles, Binnenland, Wereld, Cultuur). Fictieve bronnen; nooit "Omdat je X volgt".
const BR = { LD: ['c1', 'Landelijk Dagblad'], SK: ['c2', 'Stadskrant'], WW: ['c4', 'Weekblad Wereld'], CK: ['c3', 'Cultuurkrant'], ON: ['c5', 'Omroep Nieuws'] };
const BM = '<svg class="sc-bm" viewBox="0 0 14 18"><use href="#i-bm"/></svg><svg class="k-meer" viewBox="0 0 24 24"><use href="#i-meer"/></svg>';
const item = ([kop, intro, beeld, b, tijd]) => `<div class="k"><div class="k-kop">${kop}</div>${intro ? `<p class="k-intro">${intro}</p>` : ''}${beeld ? `<svg class="k-beeld2" viewBox="0 0 320 160"><use href="#${beeld}"/></svg>` : ''}<div class="k-bron"><i class="${BR[b][0]}">${b}</i><span>${BR[b][1]}<small>${tijd}</small></span>${BM}</div></div>`;
const L = {
  alles: [
    ['Netbeheerders mogen eerder beginnen met bouwen', 'Ook als de inspraak nog loopt, mag de schop de grond in.', 'il-c', 'ON', '4 min geleden'],
    'HIER',
    ['Oude bioscoop in de binnenstad wordt weer filmhuis', '', '', 'SK', '11 min geleden'],
  ],
  binnenland: [
    ['Treinreizigers vinden sneller een zitplaats', 'De nieuwe dienstregeling spreidt de drukte over de ochtend.', 'il-a', 'LD', '2 uur geleden'],
    ['Fietsbrug verbindt twee wijken die jarenlang gescheiden waren', '', '', 'SK', '3 uur geleden'],
  ],
  wereld: [
    ['Zuid-Europese steden zoeken verkoeling met stadsbossen', 'Nieuwe bomen moeten de straten in de zomer koeler maken.', 'il-c', 'WW', '1 uur geleden'],
    ['Noorse haven laadt schepen voortaan op stroom van land', '', '', 'WW', '4 uur geleden'],
  ],
  cultuur: [
    ['Debuutroman over een dorp aan de rivier verovert de boekenlijsten', 'Lezers en boekhandels noemen het de verrassing van het najaar.', 'il-iris', 'CK', '1 uur geleden'],
    ['Museum zet de zaalteksten voortaan ook in eenvoudige taal', '', '', 'SK', '5 uur geleden'],
  ],
};
const PANELEN = Object.entries(L).map(([k, arr]) =>
  `<div class="sc-lijst" data-pan="${k}"${k === 'alles' ? '' : ' hidden'}>${arr.map(i => i === 'HIER' ? '<div class="sc-hier">Hier was je gebleven</div>' : item(i)).join('')}</div>`).join('');

const fill = (t) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => ({ CSSFILE, JSFILE, INLINE, WM_D, MARK_D, PANELEN, ...AS })[k]).replace(/<!--[\s\S]*?-->\n?/g, '');
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
