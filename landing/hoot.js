/* gethoot.app · v4. Geen trackers, geen cookies, geen opslag. Eén bestand:
   1. het ritueel (kleuren per dagdeel, vóór de eerste weergave)  2. de gang van de zon, de Editie die zichzelf uitleest, de Stroom die van rubriek wisselt, parallax, De Redacteur met de echte Editie, de stuiterende punt. */
(function () {
  'use strict';
  var R = document.documentElement;
  R.classList.add('init');

  /* ---------- 1 · het ritueel ---------- */
  var K = ['papier','wit','rood','op-rood','inkt','inkt2','inkt3','lijn','chip','s-bg','s-ink','s-ink2','s-ink3','s-red','s-line','s-card','s-blok'];
  var P = {
    ochtend: ['#F5F1E8','#FBF8F1','#A3201B','#F5F1E8','#1A1814','#4B453B','#6B6457','#DED5C4','#EFE9DD','#F5F1E8','#1A1814','#4B453B','#6B6457','#A3201B','#DED5C4','#FCFAF5','#A3201B'],
    middag:  ['#F3F1EC','#FFFFFF','#A3201B','#F7F5F0','#15130F','#45403A','#67615A','#E2DDD3','#EFECE6','#F7F5F0','#15130F','#45403A','#67615A','#A3201B','#E2DDD3','#FFFFFF','#A3201B'],
    vroeg:   ['#EEE4D3','#F5ECDD','#9C2419','#F4EBDC','#2A231B','#5A4D3D','#6F6250','#DCCDB5','#E9DDC9','#EFE5D4','#2A231B','#584B3C','#6F6250','#9C2419','#DCCDB5','#F8F0E3','#9C2419'],
    nacht:   ['#151310','#1E1B17','#A3201B','#F5F1E8','#F1ECE2','#CBC3B5','#A39B8D','#34302A','#2A2621','#151310','#F1ECE2','#CBC3B5','#A39B8D','#EC7A70','#34302A','#1E1B17','#93201B']
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
    if (window.hootDagdeel) window.hootDagdeel(dagdeel(u));
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
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var IO = 'IntersectionObserver' in window;
    function $(s, c) { return (c || document).querySelector(s); }
    function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
    function zichtbaar(el, cb, marge) {
      if (!IO) { cb(true); return; }
      new IntersectionObserver(function (es) { cb(es[es.length - 1].isIntersecting); }, { rootMargin: marge || '0px' }).observe(el);
    }

    /* ---- 01 Editie: de gang van de zon. De zon loopt over zijn baan, ochtend, middag, avond;
       de telefoon leest intussen de Editie uit tot "Je bent bij." en begint bij het volgende dagdeel opnieuw. ---- */
    var TXT = { ochtend: ['Ochtendeditie', 'vanmiddag'], middag: ['Middageditie', 'vanavond'], avond: ['Avondeditie', 'morgenochtend'] };
    var ORDE = ['ochtend', 'middag', 'avond'], T = { ochtend: 0, middag: .5, avond: 1 };
    var dagen = $('.dagen'), zon = dagen && $('.dagzon', dagen);
    var scE = $('.sc-editie'), tst = scE && $('.toestel', scE), rol = scE && $('.sc-rol', scE);
    var huidig = 'ochtend', zt = 0, gekozen = false, loopt = false, gen = 0, zonAnim = 0;
    function plaats(t) {
      if (!zon) return;
      var w = dagen.clientWidth, h = dagen.clientHeight, u = 1 - t;
      var x = (u * u * .12 + 2 * u * t * .5 + t * t * .88) * w;
      var y = (u * u * .62 + 2 * u * t * (-24 / 136) + t * t * .62) * h;
      zon.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      zt = t;
    }
    function zonNaar(d, anim) {
      var a = zt, b = T[d], id = ++zonAnim;
      if (!anim || reduce || a === b) { plaats(b); return; }
      if (b < a && !gekozen) {
        /* van de avond naar de ochtend: de zon gaat onder en komt aan de andere kant weer op */
        zon.style.opacity = '0';
        setTimeout(function () { if (id !== zonAnim) return; plaats(b); zon.style.opacity = '1'; }, 520);
        return;
      }
      var t0 = performance.now(), dur = 1600;
      (function stap(nu) {
        if (id !== zonAnim) return;
        var p = Math.min(1, (nu - t0) / dur), e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        plaats(a + (b - a) * e);
        if (p < 1) requestAnimationFrame(stap);
      })(t0);
    }
    function zetTekst(d) {
      huidig = d;
      $$('.dag').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-dag') === d)); });
      $$('.editie .js-editie').forEach(function (s) { s.textContent = TXT[d][0]; });
      var v = $('.editie .js-volgende'); if (v) v.textContent = TXT[d][1];
    }
    /* de telefoon: rustig scrollen binnen het scherm, in twee halen, zoals iemand leest */
    function rolNaar(px, ms) {
      if (!rol) return;
      rol.style.transition = ms ? 'transform ' + ms + 'ms cubic-bezier(.45,0,.3,1),opacity .45s ease' : 'opacity .45s ease';
      rol.style.transform = 'translateY(' + (-px) + 'px)';
    }
    function afstand() {
      var zicht = scE.clientHeight - tst.offsetTop - tst.clientTop;
      return Math.max(0, rol.offsetTop + rol.offsetHeight - zicht);
    }
    function wacht(ms, g, fn) { setTimeout(function () { if (g === gen) fn(); }, ms); }
    function ronde() {
      var g = gen, d = afstand();
      wacht(1400, g, function () {
        rolNaar(d * .55, 2900);
        wacht(2900 + 1100, g, function () {
          rolNaar(d, 2900);
          wacht(2900 + 2800, g, function () {
            var volgende = gekozen ? huidig : ORDE[(ORDE.indexOf(huidig) + 1) % 3];
            if (!gekozen) zonNaar(volgende, true);
            rol.style.opacity = '0';
            wacht(480, g, function () { rolNaar(0, 0); zetTekst(volgende); rol.style.opacity = '1'; wacht(900, g, ronde); });
          });
        });
      });
    }
    function stop() { gen++; loopt = false; if (rol) { rolNaar(0, 0); rol.style.opacity = '1'; } }
    function begin() { if (reduce || !rol) return; stop(); loopt = true; ronde(); }
    function kiesDag(d) {
      gekozen = true;
      zonNaar(d, true);
      if (!loopt) { zetTekst(d); return; }
      gen++; rol.style.opacity = '0';
      var g = gen;
      wacht(480, g, function () { rolNaar(0, 0); zetTekst(d); rol.style.opacity = '1'; wacht(600, g, ronde); });
    }
    $$('.dag').forEach(function (b) { b.addEventListener('click', function () { kiesDag(b.getAttribute('data-dag')); }); });
    window.hootDagdeel = function (d) {
      $$('.held .js-editie').forEach(function (s) { s.textContent = TXT[d][0]; });
      $$('.js-rd-editie').forEach(function (s) { if (!s.hasAttribute('data-live')) s.textContent = TXT[d][0]; });
      if (!gekozen && !loopt) { zetTekst(d); plaats(T[d]); }
    };
    window.hootDagdeel(R.getAttribute('data-dagdeel') || 'ochtend');
    if (dagen) {
      addEventListener('resize', function () { plaats(zt); });
      if (scE) zichtbaar(scE.closest('.band'), function (aan) { if (aan) { if (!loopt) begin(); } else stop(); });
      document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (scE && scE.getBoundingClientRect().top < innerHeight && scE.getBoundingClientRect().bottom > 0) begin(); });
    }

    /* ---- 02 Stroom: in de app wisselen de rubrieken vanzelf ---- */
    var scS = $('.sc-stroom'), rij = scS && $('.sc-tabrij', scS), ind = rij && $('.sc-ind', rij);
    if (scS) {
      var RUB = ['alles', 'binnenland', 'buitenland', 'cultuur'], ri = 0, rt = null;
      var toon = function (k, anim) {
        $$('[data-m]', rij).forEach(function (m) {
          var aan = m.getAttribute('data-m') === k; m.className = aan ? 'on' : '';
          if (aan && ind) { ind.style.width = m.offsetWidth + 'px'; ind.style.transform = 'translateX(' + m.offsetLeft + 'px)'; }
        });
        $$('.sc-lijst', scS).forEach(function (p) {
          var aan = p.getAttribute('data-pan') === k; p.hidden = !aan;
          if (aan && anim) { p.classList.remove('pan-in'); void p.offsetWidth; p.classList.add('pan-in'); }
        });
      };
      toon('alles', false);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { toon(RUB[ri], false); });
      if (!reduce) {
        zichtbaar(scS, function (aan) {
          clearInterval(rt); rt = null;
          if (aan) rt = setInterval(function () { if (document.hidden) return; ri = (ri + 1) % RUB.length; toon(RUB[ri], true); }, 3400);
        });
      }
    }

    /* parallax: de zon komt op terwijl de band in beeld schuift, het scherm schuift een tikje mee */
    var scenes = $$('[data-scene]');
    if (!reduce && IO && scenes.length) {
      var zicht = new Set(), tik = false;
      var update = function () {
        tik = false; var vh = innerHeight;
        zicht.forEach(function (el) {
          var r = el.getBoundingClientRect();
          var p = Math.max(0, Math.min(1, (vh - r.top) / (r.height * .6)));
          el.style.setProperty('--par', p.toFixed(3));
        });
      };
      var vraag = function () { if (!tik) { tik = true; requestAnimationFrame(update); } };
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.target.classList.toggle('aan', e.isIntersecting); if (e.isIntersecting) zicht.add(e.target); else zicht.delete(e.target); });
        vraag();
      }, { rootMargin: '10% 0px 10% 0px' });
      scenes.forEach(function (s) { io.observe(s); });
      addEventListener('scroll', vraag, { passive: true });
      addEventListener('resize', vraag);
    }

    /* held: de zon komt één keer rustig op, zodra de scène voor een derde in beeld is */
    var scH = $('.sc-held');
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

    /* ---- 04 De Redacteur: de waarom-regels op de hoogte van de regel in het scherm (zoals concept v3) ---- */
    var pod = $('.podium');
    function lijn() {
      if (!pod) return;
      var mob = innerWidth < 720, desk = innerWidth >= 900, pr = pod.getBoundingClientRect(), gap = desk ? 10 : 6;
      var scope = mob ? $('.rd-tel', pod) : pod, onder = 0, vol = false; /* mobiel: de regels in de telefoon; anders de iPad (staat eerst) */
      $$('.uitleg li', pod).forEach(function (li) {
        li.classList.remove('weg');
        var m = $('[data-w="' + li.getAttribute('data-bij') + '"]', scope); if (!m) return;
        var r = m.parentElement.getBoundingClientRect();
        var top = r.top + r.height / 2 - pr.top - 8;
        /* mobiel: past een regel niet meer onder de vorige, dan vallen hij en de rest weg (de belangrijkste blijven staan, zoals v3) */
        if (mob && (vol || top < onder)) { vol = true; li.classList.add('weg'); return; }
        li.style.top = top.toFixed(1) + 'px';
        var lr = li.getBoundingClientRect();
        if (mob) onder = lr.bottom - pr.top + 12;
        var links = desk && li.classList.contains('l');
        var w = links ? (r.left - 4 - 9) - (lr.right + gap) : (lr.left - gap) - (r.right + 10 + 9);
        li.style.setProperty('--lijnw', Math.max(16, w).toFixed(1) + 'px');
      });
      pod.style.minHeight = mob && onder ? Math.ceil(onder - 12) + 'px' : '';
      pod.classList.add('klaar');
    }
    if (pod) {
      lijn(); addEventListener('resize', lijn);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(lijn);
    }

    /* de echte Editie van vandaag in dezelfde vorm: alleen de koppen, rubrieken en bronnen wisselen. Faalt het ophalen, dan blijft het voorbeeld staan. */
    /* De voorpagina-API selecteert uitsluitend drie rustige, actuele koppen. */
    var LIVE = true;
    if (LIVE && pod && window.fetch) {
      var haal = function () {
        var ac = window.AbortController ? new AbortController() : null;
        var to = setTimeout(function () { if (ac) ac.abort(); }, 5000);
        fetch('/api/voorpagina', { headers: { accept: 'application/json' }, signal: ac ? ac.signal : undefined })
          .then(function (r) {
            if (!r.ok || !/json/i.test(r.headers.get('content-type') || '')) throw 0;
            return r.json();
          })
          .then(function (d) {
            var ed = d && d.edition, en = ed && ed.entries;
            if (!en || !en.length) throw 0;
            en = en.filter(function (x) { return x && typeof x.title === 'string' && x.title; });
            if (en.length < 3) throw 0;
            /* het verhaal met de meeste bronnen bovenaan, alleen als het echt groot nieuws is */
            var top = en.slice().sort(function (a, b) { return (Number(b.sourceCount) || 0) - (Number(a.sourceCount) || 0); })[0];
            var n0 = Number(top.sourceCount) || 0;
            /* Ook drie rustige koppen met minder bronnen zijn een geldige live voorpagina. */
            var rest = en.filter(function (x) { return x !== top; }).slice(0, 2), lijst = [top].concat(rest);
            $$('.toestel', pod).forEach(function (fig) { /* iPad (vanaf 720) en telefoon (mobiel) krijgen dezelfde verhalen */
            var items = $$('.rd-item', fig);
            lijst.forEach(function (x, i) {
              var it = items[i]; if (!it) return;
              var desk = String(x.deskLabel || x.desk || 'Nieuws'); desk = desk.charAt(0).toUpperCase() + desk.slice(1);
              var n = Number(x.sourceCount) || 0, bron = String(x.source || '').trim();
              $('.sc-rub', it).textContent = desk;
              $('.sc-kg,.sc-k', it).textContent = x.title;
              var dek = $('.sc-dek', it);
              if (dek) { var s = x.summary || x.description || ''; if (typeof s === 'string' && s) dek.textContent = s; else { dek.textContent = ''; dek.style.visibility = 'hidden'; } }
              if (i === 0) $('mark', it).textContent = n >= 5 ? 'Groot nieuws · ' + n + ' bronnen' : 'Uit je eigen bronnen';
              if (i === 1) $('mark', it).textContent = 'Uit je eigen bronnen';
              var b = $('.sc-bron', it);
              if (bron) {
                $('i', b).textContent = bron.replace(/^(de|het|the)\s+/i, '').split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();
                $('span', b).innerHTML = ''; $('span', b).appendChild(document.createTextNode(bron));
                var sm = document.createElement('small'); sm.textContent = 'Vandaag'; $('span', b).appendChild(sm);
              } else b.remove();
              var vgl = b && $('.sc-vgl', b);
              if (vgl) { if (n >= 2) vgl.textContent = 'Vergelijk ' + n + ' bronnen'; else vgl.remove(); }
            });
            });
            var slot = { ochtend: 'Ochtendeditie', middag: 'Middageditie', avond: 'Avondeditie' }[ed.slot];
            if (slot) $$('.js-rd-editie', pod).forEach(function (s) { s.textContent = slot; s.setAttribute('data-live', ''); });
            pod.setAttribute('data-bron', 'live');
            lijn();
          })
          .catch(function () { pod.setAttribute('data-bron', 'voorbeeld'); })
          .then(function () { clearTimeout(to); });
      };
      if (IO) {
        var io3 = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io3.disconnect(); haal(); } }, { rootMargin: '800px 0px' });
        io3.observe(pod);
      } else haal();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
