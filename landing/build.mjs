// Bouwt de landing (gethoot.app/) in dist/. Gebruik: node landing/build.mjs
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

// fonts (alleen wat gebruikt wordt; latin en latin-ext, de tweede laadt alleen bij zulke tekens).
// Koppen: de statische Newsreader 800. Lopende tekst en bediening: de variabele letters uit src/fonts.
const FD = APP + '/node_modules/@fontsource', SF = APP + '/src/fonts';
const fonts = {
  'newsreader-800.woff2': FD + '/newsreader/files/newsreader-latin-800-normal.woff2',
  'newsreader-800-ext.woff2': FD + '/newsreader/files/newsreader-latin-ext-800-normal.woff2',
  'schibsted.woff2': SF + '/schibsted-latin-wght-normal.woff2',
  'schibsted-ext.woff2': SF + '/schibsted-latin-ext-wght-normal.woff2',
};
for (const [n, p] of Object.entries(fonts)) fs.copyFileSync(p, path.join(OUT, 'fonts', n));
// De lopende Newsreader staat op de landing alleen in de tabrij van het Stroom-toestel. Dus geen variabele letter van
// 132 kB meer, maar een deelbestand met alleen die tekens (review 13 november, deel 6): uit de app-stand (opsz 12, 450).
const { tabLetter } = await import('./letter.mjs');
const TAB = await tabLetter(APP + '/ios/Hoot/Resources/Fonts/NewsreaderTekst-450.ttf');
const TABFILE = `newsreader-tab.${sha(TAB.toString('base64'), 8)}.woff`;
fs.writeFileSync(path.join(OUT, 'fonts', TABFILE), TAB);
fs.copyFileSync(SF + '/schibsted-OFL.txt', path.join(OUT, 'fonts', 'OFL-Schibsted-Grotesk.txt')); // de licentie gaat mee met de letter
fs.copyFileSync(SF + '/newsreader-OFL.txt', path.join(OUT, 'fonts', 'OFL-Newsreader.txt'));

// css en js, geminimaliseerd, met hash in de naam. De css krijgt de naam van het deelbestand van de tabletter.
const css = esbuild.transformSync(rd('hoot.css').replace('{{TABFILE}}', TABFILE), { loader: 'css', minify: true }).code;
// Meten zonder volgen (landing/tel.mjs): gebundeld met het gedeelde vocabulaire en achter hoot.js gezet. De landing wordt
// alleen voor productie gebouwd, dus PROD is hier true (dezelfde regel als import.meta.env.PROD in /lees).
const tel = esbuild.buildSync({ entryPoints: [path.join(SRC, 'tel.mjs')], bundle: true, write: false, minify: true, format: 'iife', target: 'es2019', define: { 'import.meta.env': '{"PROD":true}' }, logLevel: 'error' }).outputFiles[0].text;
const js = esbuild.transformSync(rd('hoot.js'), { loader: 'js', minify: true, target: 'es2019' }).code + tel;
const CSSFILE = `hoot.${sha(css, 8)}.css`, JSFILE = `hoot.${sha(js, 8)}.js`;
fs.writeFileSync(path.join(OUT, 'assets', CSSFILE), css); fs.writeFileSync(path.join(OUT, 'assets', JSFILE), js);

// merk
const dOf = f => fs.readFileSync(APP + '/public/brand/' + f, 'utf8').match(/<path[^>]* d="([^"]+)"/)[1];
const WM_D = dOf('hoot-logo-ink.svg'), MARK_D = dOf('hoot-mark-ink.svg');

// App Store: op true zodra https://apps.apple.com/nl/app/id6828037269 bereikbaar is (na Apples akkoord op de handelaarsstatus).
const APP_STORE = true;
const { appStore } = await import('./appstore.mjs');
const AS = appStore(APP_STORE);

// het kleine inline script: oude #/-links doorsturen, en de js-klasse
const { INLINE, PALET } = await import('./inline.mjs');
const h256 = (s) => 'sha256-' + crypto.createHash('sha256').update(s).digest('base64');
const HASH = h256(INLINE), HASH_PALET = h256(PALET);

// Het getal bronnen komt uit de catalogus, de vragen uit landing/vragen.mjs (ook voor het JSON-LD).
const { SOURCES } = await import('../netlify/lib/sources.mjs');
const { ruim, vragen, vragenHtml, jsonld } = await import('./vragen.mjs');
const BRONNEN_RUIM = ruim(SOURCES.length).replace(/^./, (c) => c.toUpperCase());
// De rij bronnen boven de vragen: elk merk één keer (geen NOS Sport naast NOS), de bekendste eerst en verder de
// volgorde van de catalogus. Twee keer achter elkaar voor een naadloze lus; de tweede helft is verborgen voor schermlezers.
const DUBBEL = /^(nos-|guardian-|bbc-sport|npr-music|politico-eu)/;
const EERST = ['nos', 'nrc', 'volkskrant', 'nu', 'standaard', 'guardian', 'rtl', 'trouw', 'bbc', 'ad', 'parool', 'nyt', 'fd', 'telegraaf', 'vrt', 'economist'];
const rijBronnen = [...EERST.map((id) => SOURCES.find((x) => x.id === id)).filter(Boolean), ...SOURCES.filter((x) => !EERST.includes(x.id) && !DUBBEL.test(x.id))].filter((x) => fs.existsSync(path.join(SRC, 'bronnen', x.id + '.webp')));
const escR = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const pilR = (x, verborgen) => `<li${verborgen ? ' aria-hidden="true"' : ''}><img src="/img/bronnen/${x.id}.webp" alt="" width="36" height="36" loading="lazy">${escR(x.name)}</li>`;
const BRONRIJ = rijBronnen.map((x) => pilR(x, false)).join('') + rijBronnen.map((x) => pilR(x, true)).join('');
const BESCHRIJVING = 'Hoot is een rustige nieuwslezer. Drie keer per dag tien verhalen uit jouw bronnen, dan ben je bij. Gratis, zonder advertenties. Hoot volgt je niet.';
const VRAAGLIJST = vragen({ aantal: SOURCES.length, appUrl: AS.APP_URL_VRAAG });

// De voorbeelden (held, Editie, Stroom, Selectie, Hoot kiest) komen uit een echte, bewaarde Editie: landing/bewaard.json,
// ververst met `node landing/bewaar.mjs` (alleen GET). Geen verzonnen kranten; de live voorpagina vervangt held en Hoot kiest.
const { vulBewaard } = await import('./bewaard.mjs');
const BEWAARD = JSON.parse(rd('bewaard.json'));

const VARS = { CSSFILE, JSFILE, INLINE, PALET, WM_D, MARK_D, BRONNEN_RUIM, BRONRIJ, BESCHRIJVING, VRAGEN: vragenHtml(VRAAGLIJST), JSONLD: jsonld({ lijst: VRAAGLIJST, appUrl: AS.APP_URL_VRAAG, beschrijving: BESCHRIJVING }), ...AS };
const fill = (t) => vulBewaard(t, BEWAARD).replace(/\{\{(\w+)\}\}/g, (_, k) => { if (!(k in VARS)) throw new Error('landing: onbekend veld {{' + k + '}}'); return VARS[k]; }).replace(/<!--[\s\S]*?-->\n?/g, '');
fs.writeFileSync(path.join(OUT, 'index.html'), fill(rd('index.src.html')));
fs.writeFileSync(path.join(OUT, '404.html'), fill(rd('404.src.html')));

// iconen
const pub = APP + '/public';
fs.copyFileSync(pub + '/favicon.svg', path.join(OUT, 'favicon.svg'));
fs.copyFileSync(pub + '/apple-touch-icon.png', path.join(OUT, 'apple-touch-icon.png'));
fs.copyFileSync(pub + '/icons/favicon-32.png', path.join(OUT, 'icons/favicon-32.png'));
// De logo's van de bronnen (landing/bronnen, ververst met node landing/bronlogos.mjs): eigen bestanden, want de CSP
// laat alleen beelden van de eigen site toe. Alleen wat het bronnenblok toont wordt opgehaald (hooguit acht per verhaal).
fs.mkdirSync(path.join(OUT, 'img', 'bronnen'), { recursive: true });
for (const f of fs.readdirSync(path.join(SRC, 'bronnen'))) if (f.endsWith('.webp')) fs.copyFileSync(path.join(SRC, 'bronnen', f), path.join(OUT, 'img', 'bronnen', f));
if (fs.existsSync(path.join(SRC, 'og.png'))) fs.copyFileSync(path.join(SRC, 'og.png'), path.join(OUT, 'img/og.png'));

// headers en redirects
const csp = `default-src 'none'; script-src 'self' '${HASH}' '${HASH_PALET}'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests`;
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
console.log('gebouwd', { CSSFILE, JSFILE, TABFILE, HASH, HASH_PALET });
