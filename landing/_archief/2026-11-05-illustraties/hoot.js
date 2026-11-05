/* gethoot.app · v5 (rustig, 5 november). Geen trackers, geen cookies, geen opslag. Eén bestand:
   1. het ritueel (kleuren per dagdeel, vóór de eerste weergave; de zon van het dagdeel in het Editie-beeld volgt data-dagdeel)
   2. de zon in de held komt één keer op, en de punt van "Je weet genoeg." stuitert één keer. Verder beweegt er niets. */
(function () {
  'use strict';
  var R = document.documentElement;
  R.classList.add('init');

  /* ---------- 1 · het ritueel ---------- */
  var K = ['papier','wit','rood','op-rood','inkt','inkt2','inkt3','lijn','chip','s-bg','s-ink','s-ink2','s-ink3','s-red','s-line','s-card','s-blok'];
  var P = {
    ochtend: ['#F5F1E8','#FBF8F1','#9A3324','#F5F1E8','#1A1814','#4B453B','#6B6457','#DED5C4','#EFE9DD','#F5F1E8','#1A1814','#4B453B','#6B6457','#9A3324','#DED5C4','#FCFAF5','#9A3324'],
    middag:  ['#F3F1EC','#FFFFFF','#9A3324','#F7F5F0','#15130F','#45403A','#67615A','#E2DDD3','#EFECE6','#F7F5F0','#15130F','#45403A','#67615A','#9A3324','#E2DDD3','#FFFFFF','#9A3324'],
    vroeg:   ['#EEE4D3','#F5ECDD','#933422','#F4EBDC','#2A231B','#5A4D3D','#6F6250','#DCCDB5','#E9DDC9','#EFE5D4','#2A231B','#584B3C','#6F6250','#933422','#DCCDB5','#F8F0E3','#933422'],
    nacht:   ['#151310','#1E1B17','#9A3324','#F5F1E8','#F1ECE2','#CBC3B5','#A39B8D','#34302A','#2A2621','#151310','#F1ECE2','#CBC3B5','#A39B8D','#EC7A70','#34302A','#1E1B17','#8B3023']
  };
  var A = [[0,'nacht'],[5.5,'nacht'],[7.5,'ochtend'],[11,'ochtend'],[13,'middag'],[16.5,'middag'],[18.5,'vroeg'],[20,'vroeg'],[21.5,'nacht'],[24,'nacht']];
  function hex(h) { return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
  function mix(a, b, t) { var x = hex(a), y = hex(b); return 'rgb(' + [0,1,2].map(function (i) { return Math.round(x[i] + (y[i] - x[i]) * t); }).join(',') + ')'; }
  function palet(u) {
    for (var i = 0; i < A.length - 1; i++) {
      if (u >= A[i][0] && u <= A[i+1][0]) {
        var t = (u - A[i][0]) / ((A[i+1][0] - A[i][0]) || 1); t = t * t * (3 - 2 * t);
        var a = P[A[i][1]], b = P[A[i+1][1]];
        return { k: a.map(function (c, j) { return mix(c, b[j], t); }), donker: (A[i][1] === 'nacht' && t < .5) || (A[i+1][1] === 'nacht' && t >= .5) };
      }
    }
    return { k: P.nacht, donker: true };
  }
  var S = { modus: 'auto', uur: null, demo: false };
  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  function nu() { var d = new Date(); return d.getHours() + d.getMinutes() / 60; }
  function dagdeel(u) { return u >= 5 && u < 12 ? 'ochtend' : (u >= 12 && u < 17.5 ? 'middag' : 'avond'); }
  function pas() {
    var u = S.uur == null ? nu() : S.uur, p;
    if (S.modus === 'light') p = { k: P.middag, donker: false };
    else if (S.modus === 'dark') p = { k: P.nacht, donker: true };
    else if (mq && mq.matches && !S.demo) p = { k: P.nacht, donker: true };
    else p = palet(u);
    K.forEach(function (k, i) { R.style.setProperty('--' + k, p.k[i]); });
    R.classList.toggle('donker', p.donker);
    R.style.colorScheme = p.donker ? 'dark' : 'light';
    if (S.modus === 'auto') R.removeAttribute('data-theme'); else R.setAttribute('data-theme', S.modus);
    R.setAttribute('data-dagdeel', dagdeel(u));
  }
  window.hootSet = function (o) { for (var k in o) S[k] = o[k]; pas(); };
  pas();
  if (mq && mq.addEventListener) mq.addEventListener('change', pas);
  setInterval(function () { if (S.uur == null) pas(); }, 60000);
  /* de demo-schakelaars van het concept (alleen met ?demo in het adres) */
  if (/[?&]demo\b/.test(location.search)) {
    addEventListener('message', function (e) { var d = e.data; if (d && d.hoot && typeof d.hoot === 'object') window.hootSet(d.hoot); });
  }

  /* ---------- 2 · de pagina ---------- */
  function start() {
    requestAnimationFrame(function () { requestAnimationFrame(function () { R.classList.remove('init'); }); });
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, IO = 'IntersectionObserver' in window;
    function $(s, c) { return (c || document).querySelector(s); }

    /* held: de zon komt één keer rustig op, zodra de scène voor een derde in beeld is */
    var scH = $('.beeld-held');
    if (scH && !reduce && IO) {
      scH.classList.add('wacht-op');
      var ioH = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { ioH.disconnect(); setTimeout(function () { scH.classList.add('op'); }, 160); } /* na .init, anders slaat de overgang over */
      }, { threshold: .35 });
      ioH.observe(scH);
    }

    /* "Je weet genoeg.": de punt stuitert één keer als de slotband in beeld komt */
    var einde = $('.einde');
    if (einde) {
      if (IO) {
        var io2 = new IntersectionObserver(function (es) {
          if (es[0].isIntersecting) { einde.classList.add('stuit'); io2.disconnect(); }
        }, { threshold: .55 });
        io2.observe(einde);
      } else einde.classList.add('stuit');
    }

  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
