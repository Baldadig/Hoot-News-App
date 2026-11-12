/* gethoot.app · v4. Geen trackers, geen cookies. Opslag alleen voor de eigen dagteller (landing/tel.mjs, als die aan staat). Eén bestand:
   1. het ritueel (kleuren per dagdeel, vóór de eerste weergave)  2. de gang van de zon, de rustige, herhalende demo’s van Editie, Stroom en Selectie, parallax, De Redacteur met de echte Editie, de stuiterende punt. */
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
    /* reduced motion: één variabele, alleen bijgewerkt door de change-listener. Lees RM.matches nergens anders,
       anders ziet Chrome bij de wijziging geen verschil meer en vuurt het change-event niet. */
    var RM = matchMedia('(prefers-reduced-motion: reduce)'), reduce = RM.matches, bijRM = [];
    function opRM(fn) { bijRM.push(fn); }
    function rmWissel(e) { reduce = !!(e && typeof e.matches === 'boolean' ? e.matches : RM.matches); bijRM.forEach(function (fn) { fn(); }); }
    if (RM.addEventListener) RM.addEventListener('change', rmWissel); else if (RM.addListener) RM.addListener(rmWissel);
    var IO = 'IntersectionObserver' in window;
    function $(s, c) { return (c || document).querySelector(s); }
    function $$(s, c) { return [].slice.call((c || document).querySelectorAll(s)); }
    function zichtbaar(el, cb, marge) {
      if (!IO) { cb(true); return; }
      new IntersectionObserver(function (es) { cb(es[es.length - 1].isIntersecting); }, { rootMargin: marge || '0px' }).observe(el);
    }
    function ease(p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }

    /* Rustige herhaling, alleen in beeld en in een zichtbaar tabblad. De preview zelf werkt
       ook op touch; hover/focus pauzeert tijdelijk. Reduced motion houdt de demo stil. */
    function klok(sectie, scene, rust) {
      var k = { pos: 0, duur: 0, teken: null, auto: true, klaar: false, herhaal: true, tempo: 1 };
      var zicht = false, muis = false, focus = false, pauze = false, raf = 0, vorig = 0;
      var naam = scene.getAttribute('data-motion') || 'preview';
      function mag() { return !!k.teken && !k.klaar && !pauze && zicht && !document.hidden && !reduce && (!k.auto || (!muis && !focus)); }
      function tik(nu) {
        raf = 0; if (!mag()) return;
        if (vorig) k.pos = Math.min(k.duur, k.pos + Math.min(100, nu - vorig) * k.tempo);
        vorig = nu; k.teken(k.pos);
        if (k.pos >= k.duur) {
          if (!k.herhaal || k.duur <= 0) { k.klaar = true; return; }
          k.pos = 0; vorig = 0; k.teken(0);
        }
        raf = requestAnimationFrame(tik);
      }
      k.kijk = function () {
        if (mag()) { if (!raf) { vorig = 0; raf = requestAnimationFrame(tik); } }
        else if (raf) { cancelAnimationFrame(raf); raf = 0; }
      };
      k.speel = function (duur, teken) { k.pos = 0; k.duur = duur; k.teken = teken; k.auto = false; k.klaar = false; k.teken(0); k.kijk(); };
      k.bezig = function () { return !!k.teken && k.pos > 0 && !k.klaar; };
      function bediening() {
        scene.setAttribute('data-paused', String(pauze));
        if (reduce) {
          scene.removeAttribute('role'); scene.removeAttribute('tabindex'); scene.removeAttribute('aria-label');
        } else {
          scene.setAttribute('role', 'button'); scene.setAttribute('tabindex', '0');
          scene.setAttribute('aria-label', 'Animatie van de ' + naam + (pauze ? ' hervatten' : ' pauzeren'));
        }
      }
      function wissel() {
        if (reduce) return;
        pauze = !pauze; muis = false; bediening(); k.kijk();
      }
      bediening();
      scene.addEventListener('click', wissel);
      scene.addEventListener('keydown', function (e) {
        if (!reduce && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); wissel(); }
      });
      scene.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { muis = true; k.kijk(); } });
      scene.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { muis = false; k.kijk(); } });
      function inFocus(node) { return !!(node && sectie.contains(node) && !scene.contains(node)); }
      sectie.addEventListener('focusin', function (e) { focus = inFocus(e.target); k.kijk(); });
      sectie.addEventListener('focusout', function (e) { focus = inFocus(e.relatedTarget); k.kijk(); });
      zichtbaar(sectie, function (aan) { zicht = aan; k.kijk(); });
      document.addEventListener('visibilitychange', k.kijk);
      opRM(function () {
        bediening();
        if (reduce) { k.pos = 0; k.klaar = false; rust(); }
        k.kijk();
      });
      return k;
    }

    /* ---- 01 Editie: de gang van de zon. De telefoon leest de Editie uit tot "Je bent bij.", dan het volgende dagdeel;
       na een rondje langs ochtend, middag en avond begint de rustige cyclus opnieuw. ---- */
    var TXT = { ochtend: ['Ochtendeditie', 'vanmiddag'], middag: ['Middageditie', 'vanavond'], avond: ['Avondeditie', 'morgenochtend'] };
    var ORDE = ['ochtend', 'middag', 'avond'], T = { ochtend: 0, middag: .5, avond: 1 };
    var dagen = $('.dagen'), zon = dagen && $('.dagzon', dagen);
    var scE = $('.sc-editie'), tst = scE && $('.toestel', scE), rol = scE && $('.sc-rol', scE);
    var huidig = 'ochtend', zt = 0, gekozen = false, zonAnim = 0, kE = null;
    function plaats(t) {
      if (!zon) return;
      var w = dagen.clientWidth, h = dagen.clientHeight, u = 1 - t;
      var x = (u * u * .12 + 2 * u * t * .5 + t * t * .88) * w;
      var y = (u * u * .62 + 2 * u * t * (-24 / 136) + t * t * .62) * h;
      zon.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      zt = t;
    }
    function zonNaar(d) {
      var a = zt, b = T[d], id = ++zonAnim;
      if (!zon) return;
      zon.style.opacity = '1';
      if (reduce || a === b) { plaats(b); return; }
      var t0 = performance.now(), dur = ZON;
      (function stap(nu) {
        if (id !== zonAnim) return;
        var p = Math.min(1, (nu - t0) / dur);
        plaats(a + (b - a) * ease(p));
        if (p < 1) requestAnimationFrame(stap);
      })(t0);
    }
    function zetTekst(d) {
      huidig = d;
      $$('.dag').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-dag') === d)); });
      $$('.editie .js-editie').forEach(function (s) { s.textContent = TXT[d][0]; });
      var v = $('.editie .js-volgende'); if (v) v.textContent = TXT[d][1];
    }
    function afstand() {
      var zicht = scE.clientHeight - tst.offsetTop - tst.clientTop;
      return Math.max(0, rol.offsetTop + rol.offsetHeight - zicht);
    }
    /* één dagdeel uitlezen duurt SEG ms: even kijken, in twee halen naar beneden, "Je bent bij." laten staan, dan uitfaden */
    var SEG = 12480, ZON = 1600;
    function lezen(lijst, eind, metZon) {
      return function (pos) {
        var n = lijst.length, i = Math.min(n, Math.floor(pos / SEG)), s = pos - i * SEG;
        var d = i < n ? lijst[i] : eind;
        if (d !== huidig) zetTekst(d);
        var a = i < n ? afstand() : 0, y = 0, op = '1';
        if (i < n) {
          if (s >= 2300 && s < 5200) y = a * .55 * ease((s - 2300) / 2900);
          else if (s >= 5200 && s < 6300) y = a * .55;
          else if (s >= 6300 && s < 9200) y = a * (.55 + .45 * ease((s - 6300) / 2900));
          else if (s >= 9200) { y = a; if (s >= 12000) op = '0'; }
        }
        rol.style.transform = 'translateY(' + (-y).toFixed(1) + 'px)';
        if (rol.style.opacity !== op) rol.style.opacity = op;
        if (!metZon || !zon) return;
        /* de zon loopt mee naar het volgende dagdeel; van de avond naar de ochtend gaat hij onder en komt aan de andere kant weer op */
        var k = Math.floor((pos - 12000) / SEG);
        if (k < 0) { plaats(T[lijst[0]]); zon.style.opacity = '1'; return; }
        k = Math.min(k, n - 1);
        var za = T[lijst[k]], zb = T[k + 1 < n ? lijst[k + 1] : eind], q = (pos - k * SEG - 12000) / ZON;
        if (q >= 1 || za === zb) { plaats(zb); zon.style.opacity = '1'; }
        else if (zb < za) { if (q < .325) { plaats(za); zon.style.opacity = '0'; } else { plaats(zb); zon.style.opacity = '1'; } }
        else { plaats(za + (zb - za) * ease(q)); zon.style.opacity = '1'; }
      };
    }
    function rustE() {
      zonAnim++;
      if (rol) { rol.style.transition = reduce ? 'none' : 'opacity .45s ease'; rol.style.transform = 'translateY(0)'; rol.style.opacity = '1'; }
      if (zon) zon.style.opacity = '1';
      if (!gekozen) zetTekst(R.getAttribute('data-dagdeel') || 'ochtend');
      plaats(T[huidig]);
    }
    function kiesDag(d) {
      gekozen = true;
      zonNaar(d);
      if (!kE || reduce) { zetTekst(d); return; }
      /* de bezoeker kiest zelf: dat dagdeel wordt één keer uitgelezen, daarna staat hij weer bovenaan */
      zetTekst(d); kE.speel(SEG, lezen([d], d, false));
    }
    $$('.dag').forEach(function (b) { b.addEventListener('click', function () { kiesDag(b.getAttribute('data-dag')); }); });
    window.hootDagdeel = function (d) {
      /* de held en De Redacteur tonen een echte Editie (live of bewaard, data-vast): die naam blijft staan */
      $$('.held .js-editie').forEach(function (s) { if (!s.hasAttribute('data-live') && !s.hasAttribute('data-vast')) s.textContent = TXT[d][0]; });
      $$('.js-rd-editie').forEach(function (s) { if (!s.hasAttribute('data-live') && !s.hasAttribute('data-vast')) s.textContent = TXT[d][0]; });
      if (!gekozen && !(kE && kE.bezig())) { zetTekst(d); plaats(T[d]); }
    };
    window.hootDagdeel(R.getAttribute('data-dagdeel') || 'ochtend');
    if (dagen) addEventListener('resize', function () { plaats(zt); });
    if (scE && rol && tst) {
      rol.style.transition = 'opacity .45s ease';
      kE = klok(scE.closest('.band'), scE, rustE);
      kE.tempo = .6;
      opRM(function () { rol.style.transition = reduce ? 'none' : 'opacity .45s ease'; });
      /* de automatische ronde begint bij het dagdeel van nu en eindigt daar ook weer */
      var autoE = null;
      kE.teken = function (pos) {
        if (!autoE) { var j = ORDE.indexOf(huidig); autoE = lezen([ORDE[j], ORDE[(j + 1) % 3], ORDE[(j + 2) % 3]], ORDE[j], true); }
        autoE(pos);
      };
      /* de ronde loopt door tot de zon zijn laatste stap naar het dagdeel van nu heeft afgemaakt: een nette eindstand */
      kE.duur = 2 * SEG + 12000 + ZON;
      kE.kijk();
    }

    /* ---- 02 Stroom: de voorbeeldrubrieken wisselen rustig en herhalen vanaf Alles. ---- */
    var scS = $('.sc-stroom'), rij = scS && $('.sc-tabrij', scS), ind = rij && $('.sc-ind', rij);
    if (scS) {
      var RUB = ['alles', 'binnenland', 'wereld', 'cultuur'], ri = 0, STAP = 6500;
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
      var kS = klok(scS.closest('.band'), scS, function () { ri = 0; toon('alles', false); $$('.water', scS).forEach(function (w) { w.style.backgroundPosition = ''; }); });
      kS.duur = RUB.length * STAP;
      var water = $$('.water', scS);
      kS.teken = function (pos) {
        var i = Math.floor(pos / STAP) % RUB.length;
        if (i !== ri) { ri = i; toon(RUB[ri], true); }
        water.forEach(function (w, j) { w.style.backgroundPosition = (Math.sin(2 * Math.PI * pos / kS.duur) * (j ? -5 : 8)).toFixed(2) + 'px 0'; });
      };
      kS.kijk();
    }

    /* ---- 03 Selectie: de herkenbare ringen bewegen hooguit 2,5%, in een cyclus van 24 s. ---- */
    var scV = $('.sc-selectie');
    if (scV) {
      var ringen = $$('.rg', scV);
      var kV = klok(scV.closest('.band'), scV, function () { ringen.forEach(function (r) { r.style.transform = ''; }); });
      kV.duur = 24000;
      kV.teken = function (pos) {
        var golf = Math.sin(2 * Math.PI * pos / kV.duur);
        ringen.forEach(function (r, i) { r.style.transform = 'scale(' + (1 + golf * (.015 + i * .005)).toFixed(4) + ')'; });
      };
      kV.kijk();
    }

    /* parallax: de zon komt op terwijl de band in beeld schuift, het scherm schuift een tikje mee */
    var scenes = $$('[data-scene]');
    if (!reduce && IO && scenes.length) {
      var zicht = new Set(), tik = false;
      var update = function () {
        tik = false; var vh = innerHeight;
        zicht.forEach(function (el) {
          var r = el.getBoundingClientRect();
          var p = reduce ? 1 : Math.max(0, Math.min(1, (vh - r.top) / (r.height * .6)));
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
      opRM(vraag);
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
      if (innerWidth < 720) {
        $$('.uitleg li', pod).forEach(function (li) { li.classList.remove('weg'); li.style.removeProperty('top'); li.style.removeProperty('--lijnw'); });
        pod.style.minHeight = ''; pod.classList.add('klaar'); /* mobiel: alle drie de regels onder de telefoon, als gewone tekst */
        return;
      }
      var mob = false, desk = innerWidth >= 900, pr = pod.getBoundingClientRect(), gap = desk ? 10 : 6;
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
    /* Eén beslisregel voor de markering op de kaart én de uitleg ernaast, uit het aantal bronnen per verhaal.
       Bovenaan: vijf of meer bronnen is groot nieuws, twee of meer is meerdere bronnen. Tweede kaart: meerdere bronnen als dat nog vrij is,
       anders ook het lezen waard (één bron). Derde kaart: buiten je bubbel. De pagina kent de bronnen van de bezoeker niet, dus geen 'jouw kranten'. */
    var REDEN = {
      groot: ['Groot nieuws', 'Veel bronnen schrijven erover. Dit wil je weten.'],
      meer: ['Meerdere bronnen', 'Niet één krant, maar meerdere vinden het belangrijk.'],
      eigen: ['Ook het lezen waard', 'Eén bron schrijft erover, en het is de moeite waard.'],
      bubbel: ['Buiten je bubbel', 'Iets wat je anders niet had gelezen.']
    };
    /* Zelfde regel als redenen() in landing/bewaard.mjs. Plek 3 heet alleen 'Buiten je bubbel' als er echt een bubbel is;
       anders 'Ook het lezen waard'. Geeft null als twee plekken dezelfde reden krijgen. */
    function redenen(ns, bubbel) {
      var s0 = ns[0] >= 5 ? 'groot' : (ns[0] >= 2 ? 'meer' : 'eigen');
      var s1 = ns[1] >= 2 && s0 !== 'meer' ? 'meer' : 'eigen';
      var s2 = bubbel ? 'bubbel' : 'eigen';
      return s0 === s1 || s0 === s2 || s1 === s2 ? null : [s0, s1, s2];
    }
    function markering(soort, n) { return soort === 'groot' ? 'Groot nieuws · ' + n + ' bronnen' : (soort === 'meer' ? n + ' bronnen schrijven erover' : REDEN[soort][0]); }
    function zetRedenen(ns, r) {
      ['w1', 'w2', 'w3'].forEach(function (w, i) {
        $$('mark[data-w="' + w + '"]', pod).forEach(function (m) { m.textContent = markering(r[i], ns[i]); });
        var li = $('.uitleg li[data-bij="' + w + '"]', pod); if (!li) return;
        var b = document.createElement('b'); b.textContent = REDEN[r[i]][0];
        li.textContent = ''; li.appendChild(b); li.appendChild(document.createTextNode(REDEN[r[i]][1]));
      });
    }
    if (pod) {
      var ns0 = String(pod.getAttribute('data-n') || '').split(/\s+/).map(Number), r0 = ns0.length === 3 && redenen(ns0, pod.getAttribute('data-bubbel') === 'ja');
      if (r0) zetRedenen(ns0, r0); /* het voorbeeld uit dezelfde regel */
      lijn(); addEventListener('resize', lijn);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(lijn);
    }

    /* Live: de echte Editie van vandaag in dezelfde vorm (held en De Redacteur). Alleen kop, bron, rubriek en
       aantal bronnen wisselen; geen beeld van uitgevers, geen intro, geen tijdstip. Weet de server de rubriek
       niet zeker (deskLabel null), dan staat er alleen het nummer. Faalt het ophalen, of zijn er geen drie
       verschillende redenen, dan blijft de bewaarde Editie staan (echte koppen, met haar eigen datum). */
    var LIVE = true;
    var SLOT = { ochtend: 'Ochtendeditie', middag: 'Middageditie', avond: 'Avondeditie' };
    function ini(b) { return b.replace(/^(de|het|the)\s+/i, '').charAt(0).toUpperCase(); }
    function weg(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }
    /* Zelfde woorden als de app; Buitenland heet op de landing Wereld (zoals de Stroom-tab). Zie landing/bewaard.mjs. */
    var LABEL = { binnenland: 'Binnenland', buitenland: 'Wereld', cultuur: 'Cultuur', tech: 'Tech', wetenschap: 'Wetenschap', sport: 'Sport', vs: 'VS', middenoosten: 'Midden-Oosten', oekraine: 'Oekraïne' };
    var MND = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
    function vandaagIso() {
      try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); } catch (e) { return ''; }
    }
    /* 'Vandaag' alleen als de Editie van vandaag is; anders de dag zelf ("11 november"). Nooit een tijdstip. */
    function wanneer(iso) {
      if (iso && iso === vandaagIso()) return 'Vandaag';
      var p = String(iso || '').split('-'); return p.length === 3 ? Number(p[2]) + ' ' + MND[Number(p[1]) - 1] : '';
    }
    /* metRubriek: false in de held (besluit Alex: de grote kop zonder rubriek). Rubriek alleen als de server hem zeker weet. */
    function vul(it, x, why, metRubriek, dag) {
      var kick = $('.k-kick', it), nr = kick && $('.k-nr', kick), rub = metRubriek && x.desk ? LABEL[x.desk] || '' : '';
      if (!kick) { kick = document.createElement('div'); kick.className = 'k-kick'; it.insertBefore(kick, $('.k-why', it) || $('.k-kop', it)); }
      kick.textContent = ''; if (nr) kick.appendChild(nr);
      if (rub) { kick.classList.remove('k-kick--los'); kick.appendChild(document.createTextNode(rub)); } else kick.classList.add('k-kick--los');
      kick.hidden = !nr && !rub;
      $('.k-kop', it).textContent = x.title;
      weg($('.k-intro', it));
      if (why != null) { var w = $('.k-why', it); if (w) w.textContent = why; }
      var b = $('.k-bron', it), bron = String(x.source || '').trim(), n = Number(x.sourceCount) || 0;
      if (!b) return;
      if (!bron) { weg(b); return; }
      $('i', b).textContent = ini(bron);
      var sp = $('span', b); sp.textContent = bron;
      var sm = document.createElement('small'); sm.textContent = dag; sp.appendChild(sm);
      var kn = $('.k-n', b);
      if (n >= 2 && !$('mark', it)) { if (!kn) { kn = document.createElement('b'); kn.className = 'k-n'; sp.parentNode.insertBefore(kn, sp.nextSibling); } kn.textContent = n + ' bronnen'; } else weg(kn); /* in Hoot kiest staat het aantal al in de markering */
    }
    function zetNaam(sel, slot) { $$(sel).forEach(function (s) { s.textContent = slot; s.removeAttribute('data-vast'); s.setAttribute('data-live', ''); }); }
    if (LIVE && window.fetch) {
      var haal = function () {
        var ac = window.AbortController ? new AbortController() : null;
        var to = setTimeout(function () { if (ac) ac.abort(); }, 5000);
        fetch('/api/voorpagina', { headers: { accept: 'application/json' }, signal: ac ? ac.signal : undefined })
          .then(function (r) {
            if (!r.ok || !/json/i.test(r.headers.get('content-type') || '')) throw 0;
            return r.json();
          })
          .then(function (d) {
            var ed = d && d.edition, en = ed && ed.entries, slot = ed && SLOT[ed.slot];
            if (!slot || !en) throw 0;
            en = en.filter(function (x) { return x && typeof x.title === 'string' && x.title; });
            if (en.length < 3) throw 0;
            /* plek 1 en 2 uit de Editie; plek 3 is de echte 'Buiten je bubbel' als die er is */
            var lijst = en.slice(0, 2).concat([ed.bubble && ed.bubble.title ? ed.bubble : en[2]]);
            var ns = lijst.map(function (x) { return Number(x.sourceCount) || 0; }), rd = redenen(ns, !!(ed.bubble && ed.bubble.title));
            if (!rd) throw 0; /* geen drie verschillende redenen (ook zonder bubbel): de bewaarde Editie blijft staan */
            var dag = '', wn = wanneer(ed.date);
            try { dag = new Date(ed.date + 'T12:00:00').toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) {}
            /* held: het hoofdverhaal */
            var lead = $('.js-held-lead');
            if (lead) {
              vul(lead, lijst[0], ns[0] >= 5 ? 'Groot nieuws' : (ns[0] >= 2 ? ns[0] + ' bronnen schrijven erover' : 'Ook het lezen waard'), false, wn);
              zetNaam('.held .js-editie', slot);
              $$('.held .js-datum').forEach(function (s) { if (dag) s.textContent = dag; s.removeAttribute('data-vast'); s.setAttribute('data-live', ''); });
              var fig = $('.js-held-toestel'); if (fig) fig.setAttribute('aria-label', 'De ' + slot + ' van ' + (wn === 'Vandaag' ? 'vandaag' : dag) + ' op iPhone, met het hoofdverhaal: ' + lijst[0].title);
            }
            /* De Redacteur: iPad en telefoon krijgen dezelfde drie verhalen */
            if (pod) {
              $$('.toestel', pod).forEach(function (fig) {
                var items = $$('.rd-item', fig).filter(function (it) { return $('mark', it); });
                lijst.forEach(function (x, i) { if (items[i]) vul(items[i], x, null, true, wn); });
              });
              zetNaam('.js-rd-editie', slot);
              $$('.sc-sub[data-vast]', pod).forEach(function (s) { if (dag) s.textContent = dag; s.removeAttribute('data-vast'); });
              zetRedenen(ns, rd);
              pod.setAttribute('data-bron', 'live');
              lijn();
            }
          })
          .catch(function () { if (pod) pod.setAttribute('data-bron', 'bewaard'); })
          .then(function () { clearTimeout(to); });
      };
      haal(); /* de held staat bovenaan: meteen ophalen, de API is klein en wordt gecachet */
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
