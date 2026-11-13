/* gethoot.app · v5. Geen trackers, geen cookies. Opslag alleen voor de eigen dagteller (landing/tel.mjs).
   De kleuren per dagdeel staan inline in de head (landing/inline.mjs, PALET), zodat dit bestand met defer kan laden.
   Hier: de gang van de zon, de demo's van Editie, Stroom en Selectie (elk één keer, dan stil), parallax,
   Hoot kiest met de echte Editie, de held met de Editie van nu, de stuiterende punt. */
(function () {
  'use strict';
  var R = document.documentElement;

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

    /* Eén ronde, dan stil (review 13 november): alleen in beeld en in een zichtbaar tabblad, geen lus en geen
       onzichtbare pauzeknop. Reduced motion: meteen de eindstand. */
    function eenRonde(sectie, duur, teken, rust) {
      var pos = 0, zicht = false, raf = 0, vorig = 0, klaar = false;
      function mag() { return !klaar && zicht && !document.hidden && !reduce; }
      function tik(nu) {
        raf = 0; if (!mag()) return;
        if (vorig) pos = Math.min(duur, pos + Math.min(100, nu - vorig));
        vorig = nu; teken(pos);
        if (pos >= duur) { klaar = true; return; }
        raf = requestAnimationFrame(tik);
      }
      function kijk() {
        if (mag()) { if (!raf) { vorig = 0; raf = requestAnimationFrame(tik); } }
        else if (raf) { cancelAnimationFrame(raf); raf = 0; }
      }
      zichtbaar(sectie, function (aan) { zicht = aan; kijk(); });
      document.addEventListener('visibilitychange', kijk);
      opRM(function () { if (reduce) { klaar = true; rust(); } kijk(); });
      if (reduce) rust();
    }

    /* ---- 01 Editie: de telefoon staat op regel 08 en rolt bij binnenkomst in 1,6 s naar "Je bent bij.". Daar blijft hij.
       De knoppen Ochtend, Middag en Avond lezen hun dagdeel één keer uit, van boven tot de rode kaart. ---- */
    var TXT = { ochtend: ['Ochtendeditie', 'vanmiddag'], middag: ['Middageditie', 'vanavond'], avond: ['Avondeditie', 'morgenochtend'] };
    var T = { ochtend: 0, middag: .5, avond: 1 };
    var dagen = $('.dagen'), zon = dagen && $('.dagzon', dagen);
    var scE = $('.sc-editie'), tst = scE && $('.toestel', scE), rol = scE && $('.sc-rol', scE);
    var huidig = (scE && scE.getAttribute('data-slot')) || 'avond', zt = 0, zonAnim = 0, rolAnim = 0, rolY = 0, aanEind = false;
    function plaats(t) {
      if (!zon) return;
      var w = dagen.clientWidth, h = dagen.clientHeight, u = 1 - t;
      var x = (u * u * .12 + 2 * u * t * .5 + t * t * .88) * w;
      var y = (u * u * .62 + 2 * u * t * (-24 / 136) + t * t * .62) * h;
      zon.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      zt = t;
    }
    var ZON = 1600;
    function zonNaar(d) {
      var a = zt, b = T[d], id = ++zonAnim;
      if (!zon) return;
      if (reduce || a === b) { plaats(b); return; }
      var t0 = performance.now();
      (function stap(nu) {
        if (id !== zonAnim) return;
        var p = Math.min(1, (nu - t0) / ZON);
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
    function zet(y) { rolY = y; rol.style.transform = 'translateY(' + (-y).toFixed(1) + 'px)'; }
    /* waar regel 08 bovenaan het scherm staat (de lijst begint bij 03, dus het zesde item) */
    function bij08() {
      var li = $$('.sc-rest li', rol)[5]; if (!li) return 0;
      return Math.min(afstand(), Math.max(0, li.getBoundingClientRect().top - rol.getBoundingClientRect().top - 24));
    }
    function rolNaar(van, naar, duur, wacht, klaar) {
      var id = ++rolAnim, t0 = 0;
      if (reduce || duur <= 0) { zet(naar); if (klaar) klaar(); return; }
      zet(van);
      (function stap(nu) {
        if (id !== rolAnim) return;
        if (!t0) t0 = nu + (wacht || 0);
        var p = Math.max(0, Math.min(1, (nu - t0) / duur));
        zet(van + (naar - van) * ease(p));
        if (p < 1) requestAnimationFrame(stap); else if (klaar) klaar();
      })(performance.now());
    }
    function eindstand() { rolAnim++; aanEind = true; zet(afstand()); }
    function kiesDag(d) {
      zonNaar(d);
      if (reduce || !rol) { zetTekst(d); if (rol) eindstand(); return; }
      /* even uit, de nieuwe Editie bovenaan, dan één keer uitlezen tot de rode kaart */
      var id = ++rolAnim; aanEind = false;
      rol.style.opacity = '0';
      setTimeout(function () {
        if (id !== rolAnim) return;
        zetTekst(d); zet(0); rol.style.opacity = '1';
        rolNaar(0, afstand(), 3600, 700, function () { aanEind = true; });
      }, 260);
    }
    $$('.dag').forEach(function (b) { b.addEventListener('click', function () { kiesDag(b.getAttribute('data-dag')); }); });
    if (scE && rol && tst) {
      rol.style.transition = 'opacity .25s ease';
      zetTekst(huidig); plaats(T[huidig]);
      var binnen = false;
      var kom = function () {
        if (binnen) return; binnen = true;
        rolNaar(bij08(), afstand(), 1600, 250, function () { aanEind = true; });
      };
      if (reduce || !IO) eindstand(); else {
        zet(bij08());
        var ioE = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { ioE.disconnect(); kom(); } }, { threshold: .4 });
        ioE.observe(scE);
      }
      opRM(function () { if (reduce) { eindstand(); plaats(T[huidig]); } });
      addEventListener('resize', function () { plaats(zt); if (aanEind) zet(afstand()); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (aanEind) zet(afstand()); else if (!binnen) zet(bij08()); });
    }

    /* ---- 02 Stroom: de voorbeeldrubrieken wisselen één ronde en staan dan weer op Alles. ---- */
    var scS = $('.sc-stroom'), rij = scS && $('.sc-tabrij', scS), ind = rij && $('.sc-ind', rij);
    if (scS) {
      var RUB = ['alles', 'binnenland', 'wereld', 'cultuur'], ri = 0, STAP = 6500, DUUR = RUB.length * STAP;
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
      var water = $$('.water', scS);
      eenRonde(scS.closest('.band'), DUUR, function (pos) {
        var i = Math.floor(pos / STAP) % RUB.length;
        if (i !== ri) { ri = i; toon(RUB[ri], true); }
        water.forEach(function (w, j) { w.style.backgroundPosition = (Math.sin(2 * Math.PI * pos / DUUR) * (j ? -5 : 8)).toFixed(2) + 'px 0'; });
      }, function () { ri = 0; toon('alles', false); water.forEach(function (w) { w.style.backgroundPosition = ''; }); });
    }

    /* ---- 03 Selectie: de ringen ademen één keer, hooguit 2,5%. ---- */
    var scV = $('.sc-selectie');
    if (scV) {
      var ringen = $$('.rg', scV);
      eenRonde(scV.closest('.band'), 24000, function (pos) {
        var golf = Math.sin(2 * Math.PI * pos / 24000);
        ringen.forEach(function (r, i) { r.style.transform = 'scale(' + (1 + golf * (.015 + i * .005)).toFixed(4) + ')'; });
      }, function () { ringen.forEach(function (r) { r.style.transform = ''; }); });
    }

    /* ---- bronnen: één verhaal, veel bronnen. De logo's schuiven er één voor één bij en de teller loopt mee; daarna het
       volgende verhaal. Alleen in beeld. Een tik op de kaart of een stip kiest zelf. Verminder beweging: stil, wel te kiezen. ---- */
    var vh = $('.js-verhaal');
    if (vh) {
      var vhKop = $('.js-vh-kop', vh), vhSt = $('.js-vh-stapel', vh), vhTel = $('.js-vh-tel', vh), vhKick = $('.js-vh-kick', vh), vhStip = $('.js-vh-stip', vh);
      var VH = [], vhI = 0, vhT = 0, vhZicht = false, VH_LOGOS = 8;
      try { VH = JSON.parse(vh.getAttribute('data-verhalen') || '[]'); } catch (e) {}
      var vhN = function (x) { return Math.max(Number(x.sourceCount) || 1, (x.sources || []).length); };
      var vhZin = function (x, n) {
        var namen = (x.sources || []).slice(0, Math.min(3, n)).map(function (s) { return s.name; }), rest = n - namen.length;
        vhTel.textContent = ''; var b = document.createElement('b'); b.textContent = n === 1 ? '1 bron' : n + ' bronnen'; vhTel.appendChild(b);
        vhTel.appendChild(document.createTextNode(' ' + (n === 1 ? 'schrijft' : 'schrijven') + ' erover' + (namen.length ? ': ' + namen.join(', ') + (rest > 0 ? ' en ' + rest + ' andere' : '') : '') + '.'));
      };
      var vhLogo = function (s) { var i = new Image(); i.src = '/img/bronnen/' + encodeURIComponent(s.id) + '.webp'; i.alt = ''; i.width = i.height = 40; i.onerror = function () { weg(i); }; return i; };
      var vhStippen = function () {
        vhStip.textContent = '';
        if (VH.length < 2) return;
        VH.forEach(function (x, k) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Verhaal ' + (k + 1) + ': ' + x.title); b.setAttribute('aria-pressed', String(k === vhI));
          b.addEventListener('click', function (e) { e.stopPropagation(); vhToon(k, true); }); vhStip.appendChild(b); });
      };
      var vhToon = function (k, speel) {
        clearTimeout(vhT); vhI = (k + VH.length) % VH.length;
        var x = VH[vhI], bronnen = (x.sources || []).slice(0, VH_LOGOS), n = vhN(x), j = 0;
        vhKop.textContent = x.title; vhSt.textContent = '';
        $$('button', vhStip).forEach(function (b, q) { b.setAttribute('aria-pressed', String(q === vhI)); });
        var af = function () {
          if (n > bronnen.length && bronnen.length) { var m = document.createElement('span'); m.className = 'vh-meer'; m.textContent = '+' + (n - bronnen.length); vhSt.appendChild(m); }
          vhZin(x, n);
          if (VH.length > 1 && !reduce) vhT = setTimeout(function wacht() { if (vhZicht && !document.hidden && !reduce) vhToon(vhI + 1, true); else vhT = setTimeout(wacht, 1500); }, 4200);
        };
        if (reduce || !speel || !bronnen.length) { bronnen.forEach(function (s) { vhSt.appendChild(vhLogo(s)); }); af(); return; }
        (function erbij() {
          if (j >= bronnen.length) { af(); return; }
          var i = vhLogo(bronnen[j]); i.className = 'erbij'; vhSt.appendChild(i); j++; vhZin(x, j);
          vhT = setTimeout(erbij, j < 4 ? 380 : 220);
        })();
      };
      vh.addEventListener('click', function () { if (VH.length > 1) vhToon(vhI + 1, true); });
      vhStippen();
      var vhBegon = false;
      zichtbaar(vh, function (aan) { vhZicht = aan; if (aan && !vhBegon && VH.length) { vhBegon = true; vhToon(0, true); } });
      opRM(function () { if (reduce) { clearTimeout(vhT); if (VH.length) vhToon(vhI, false); } });
      /* live: de verhalen van de Editie van nu nemen het over */
      window.hootVerhalen = function (lijst, vannu) {
        var ok = lijst.filter(function (x) { return x && typeof x.title === 'string' && x.title && Array.isArray(x.sources) && x.sources.length >= 2; });
        if (!ok.length) return;
        VH = ok; vhKick.textContent = vannu ? 'In de Editie van nu' : 'Uit de Editie'; vhStippen(); vhToon(0, vhZicht); vhBegon = vhBegon || vhZicht;
      };
    }

    /* ---- de rij bronnen boven de vragen: drijft langzaam naar links, alleen in beeld. Aanwijzen zet hem stil, slepen
       verschuift hem. Verminder beweging: stil (slepen kan nog). ---- */
    var br = $('.js-bronrij'), brIn = br && $('.bronrij-in', br);
    if (brIn) {
      var brX = 0, brHalf = 0, brZicht = false, brRem = 1, brDoel = 1, brSleep = false, brPx = 0, brVorig = 0;
      var brMeet = function () { brHalf = brIn.scrollWidth / 2; };
      brMeet(); addEventListener('resize', brMeet); addEventListener('load', brMeet);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(brMeet);
      brIn.addEventListener('mouseenter', function () { brDoel = 0; });
      brIn.addEventListener('mouseleave', function () { if (!brSleep) brDoel = 1; });
      brIn.addEventListener('pointerdown', function (e) { brSleep = true; brPx = e.clientX; brIn.classList.add('sleep'); try { brIn.setPointerCapture(e.pointerId); } catch (x) {} });
      brIn.addEventListener('pointermove', function (e) { if (brSleep) { brX += e.clientX - brPx; brPx = e.clientX; } });
      var brLos = function (e) { brSleep = false; brIn.classList.remove('sleep'); if (e.pointerType !== 'mouse') brDoel = 1; };
      brIn.addEventListener('pointerup', brLos); brIn.addEventListener('pointercancel', brLos);
      zichtbaar(br, function (aan) { brZicht = aan; if (aan) { brVorig = 0; requestAnimationFrame(brTik); } });
      var brLoopt = false;
      var brTik = function (nu) {
        if (brLoopt && nu === undefined) return;
        var dt = Math.min(50, nu - (brVorig || nu)) / 1000; brVorig = nu; brRem += (brDoel - brRem) * Math.min(1, dt * 6);
        if (!reduce && !brSleep && !document.hidden) brX -= 30 * dt * brRem;
        if (brHalf) { while (brX <= -brHalf) brX += brHalf; while (brX > 0) brX -= brHalf; }
        brIn.style.transform = 'translateX(' + brX.toFixed(1) + 'px)';
        if (brZicht) { brLoopt = true; requestAnimationFrame(brTik); } else brLoopt = false;
      };
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

    /* held vanaf 1100: de horizon ligt op de basislijn van "einde." (review 13 november). De tekst staat verticaal in het
       midden en het toestel heeft een vaste hoogte, dus het verschil hangt af van de breedte: meten en de zon met
       horizon zoveel verschuiven. Daaronder staat de held anders en blijft alles op zijn plek. */
    var zpH = $('.zp-held'), h1L = $('.held h1 .rgl:last-child');
    function horizon() {
      if (!zpH || !h1L) return;
      zpH.style.translate = '';
      if (innerWidth < 1100) return;
      var m = document.createElement('i'); m.style.cssText = 'display:inline-block;width:0;height:0';
      h1L.appendChild(m);
      var d = zpH.getBoundingClientRect().bottom - m.getBoundingClientRect().bottom;
      h1L.removeChild(m);
      zpH.style.translate = '0 ' + (-d).toFixed(1) + 'px';
    }
    horizon(); addEventListener('resize', horizon);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(horizon);

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

    /* ---- 04 Hoot kiest: vanaf 900 breed de waarom-regels op de hoogte van hun markering in het scherm, met een lijntje
       dat 4 px naast de markering zelf eindigt. Daaronder (tablet en telefoon) een gewone lijst, zonder wijzers. ---- */
    var pod = $('.podium');
    function lijn() {
      if (!pod) return;
      if (innerWidth < 900) {
        $$('.uitleg li', pod).forEach(function (li) { li.style.removeProperty('top'); li.style.removeProperty('--lijnw'); });
        pod.classList.add('klaar');
        return;
      }
      var pr = pod.getBoundingClientRect(), gap = 10, DOT = 9, LUCHT = 4;
      $$('.uitleg li', pod).forEach(function (li) {
        var m = $('.ipad [data-w="' + li.getAttribute('data-bij') + '"]', pod); if (!m) return;
        var r = m.getBoundingClientRect();
        li.style.top = (r.top + r.height / 2 - pr.top - 7.5).toFixed(1) + 'px';
        var lr = li.getBoundingClientRect(), links = li.classList.contains('l');
        var w = links ? (r.left - LUCHT - DOT) - (lr.right + gap) : (lr.left - gap) - (r.right + LUCHT + DOT);
        li.style.setProperty('--lijnw', Math.max(16, w).toFixed(1) + 'px');
      });
      pod.classList.add('klaar');
    }
    /* Eén beslisregel voor de markering op de kaart én de uitleg ernaast, uit het aantal bronnen per verhaal.
       Bovenaan: vijf of meer bronnen is groot nieuws, twee of meer is meerdere bronnen. Tweede kaart: meerdere bronnen als dat nog vrij is,
       anders ook het lezen waard (één bron). Derde kaart: buiten je bubbel. De pagina kent de bronnen van de bezoeker niet, dus geen 'jouw kranten'. */
    var REDEN = {
      groot: ['Groot nieuws', 'Veel bronnen schrijven erover.'],
      meer: ['Meerdere bronnen', 'Meer dan één bron schrijft erover.'],
      eigen: ['Ook het lezen waard', 'Eén bron schrijft erover, en het is de moeite waard.'],
      bubbel: ['Buiten je bubbel', 'Iets wat je anders niet had gelezen.']
    };
    /* Zelfde regel als redenen() in landing/bewaard.mjs. Plek 3 heet alleen 'Buiten je bubbel' als er echt een bubbel is;
       anders 'Ook het lezen waard'. Geeft null als twee plekken dezelfde reden krijgen. */
    function redenen(ns, bubbel) {
      var s0 = ns[0] >= 5 ? 'groot' : (ns[0] >= 2 ? 'meer' : 'eigen');
      var s1 = ns[1] >= 2 ? (s0 !== 'meer' ? 'meer' : null) : 'eigen'; /* 'eigen' ("Eén bron") alleen bij echt één bron */
      var s2 = bubbel ? 'bubbel' : (ns[2] >= 2 ? null : 'eigen');
      return !s1 || !s2 || s0 === s1 || s0 === s2 || s1 === s2 ? null : [s0, s1, s2];
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

    /* Zelfde onderwerp? Twee koppen delen een woorddeel van minstens zeven letters ("Belastingplan" en
       "vermogenswinstbelasting"). Dan is de bubbel geen bubbel naast plek 01: de bewaarde Editie blijft staan. */
    function woorden(s) { return String(s || '').toLowerCase().split(/[^a-zà-ÿ0-9]+/).filter(function (w) { return w.length >= 7; }); }
    function overlap(a, b) {
      var A = woorden(a), B = woorden(b);
      return A.some(function (x) {
        for (var i = 0; i + 7 <= x.length; i++) { var g = x.substr(i, 7); if (B.some(function (y) { return y.indexOf(g) >= 0; })) return true; }
        return false;
      });
    }
    window.hootOverlap = overlap; /* voor de toetsen en de nameting */

    /* Live: de echte Editie van vandaag in dezelfde vorm (held en Hoot kiest). Alleen kop, bron, rubriek en
       aantal bronnen wisselen; geen beeld van uitgevers, geen intro, geen tijdstip. Weet de server de rubriek
       niet zeker (deskLabel null), dan staat er alleen het nummer. Faalt het ophalen binnen 1,5 s, of zijn er geen
       drie verschillende redenen, dan blijft de bewaarde Editie staan (echte koppen, met haar eigen datum). */
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
    function dagnr(iso) { var t = Date.parse(iso + 'T00:00:00Z'); return isFinite(t) ? Math.round(t / 864e5) : NaN; }
    /* De terugval: is de bewaarde Editie ouder dan een dag, dan geen datum (hij is echt, maar niet van gisteren of vandaag). */
    var vd = dagnr(vandaagIso());
    $$('.js-datum[data-vast]').forEach(function (s) { if (vd - dagnr(s.getAttribute('data-iso')) > 1) s.textContent = ''; });
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
      /* het echte logo van de bron als de server het id meegeeft (eigen bestand); anders, of als het ontbreekt, de beginletter */
      var oud = $('i', b) || $('img', b), mono = document.createElement('i'); mono.textContent = ini(bron);
      var sid = x.sourceId || (x.sources && x.sources[0] && x.sources[0].name === bron ? x.sources[0].id : '');
      if (sid && /^[a-z0-9-]+$/.test(sid)) { var lg = new Image(); lg.alt = ''; lg.onerror = function () { if (lg.parentNode) lg.parentNode.replaceChild(mono, lg); }; lg.src = '/img/bronnen/' + sid + '.webp'; b.replaceChild(lg, oud); }
      else b.replaceChild(mono, oud);
      var sp = $('span', b); sp.textContent = bron;
      var sm = document.createElement('small'); sm.textContent = dag; sp.appendChild(sm);
      var kn = $('.k-n', b);
      if (n >= 2 && !$('mark', it)) { if (!kn) { kn = document.createElement('b'); kn.className = 'k-n'; sp.parentNode.insertBefore(kn, sp.nextSibling); } kn.textContent = n + ' bronnen'; } else weg(kn); /* in Hoot kiest staat het aantal al in de markering */
    }
    function zetNaam(sel, slot) { $$(sel).forEach(function (s) { s.textContent = slot; s.removeAttribute('data-vast'); s.setAttribute('data-live', ''); }); }
    /* de wissel van bewaard naar live: 0,2 s uit, invullen, 0,2 s aan (zonder beweging meteen) */
    function wissel(el, fn) {
      if (!el || reduce) { fn(); return; }
      el.classList.add('wissel');
      setTimeout(function () { fn(); el.classList.remove('wissel'); }, 200);
    }
    if (LIVE && window.fetch) {
      var ac = window.AbortController ? new AbortController() : null;
      /* 4 s: de server antwoordt meestal binnen een seconde, maar na stilte soms pas na drie. Bij 1,5 s bleef dan de bewaarde
         Editie van een eerdere dag staan (Alex zag 12 november op de 13e). De wissel zelf blijft een vervaging van 0,2 s. */
      var to = setTimeout(function () { if (ac) ac.abort(); }, 4000);
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
          var bub = ed.bubble && ed.bubble.title ? ed.bubble : null;
          /* De opening is het grootste nieuws: het verhaal waar de meeste bronnen over schrijven (ed.breed, de breedste
             eerst), niet zomaar de eerste rustige plek. Alex, 13 november: een bril van Tweakers met vijf bronnen is geen
             nummer 1 naast een verhaal met dertig. Alleen als er niets breders is, opent de eerste plek. */
          var top = Array.isArray(ed.breed) && ed.breed[0] && typeof ed.breed[0].title === 'string' && ed.breed[0].title ? ed.breed[0] : null;
          if (top && (Number(top.sourceCount) || 0) > (Number(en[0].sourceCount) || 0)) en = [top].concat(en.filter(function (x) { return x.title !== top.title; }));
          /* plek 1 en 2; plek 3 is de echte 'Buiten je bubbel' als die er is */
          var lijst = en.slice(0, 2).concat([bub || en[2]]);
          var ns = lijst.map(function (x) { return Number(x.sourceCount) || 0; }), rd = redenen(ns, !!bub);
          /* Hoot kiest blijft bewaard als er geen drie verschillende redenen zijn, of als de bubbel over hetzelfde gaat
             als plek 01 (dan klopt "Iets wat je anders niet had gelezen" niet). De held toont hoe dan ook de Editie van nu. */
          var kiesLive = !!rd && !(bub && overlap(bub.title, en[0].title));
          var dag = '', wn = wanneer(ed.date), vannu = wn === 'Vandaag';
          try { dag = new Date(ed.date + 'T12:00:00').toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) {}
          /* held: het hoofdverhaal, de regel bij het toestel en het label van de link */
          var lead = $('.js-held-lead');
          if (lead) wissel(lead, function () {
            vul(lead, lijst[0], ns[0] >= 5 ? 'Groot nieuws' : (ns[0] >= 2 ? ns[0] + ' bronnen schrijven erover' : 'Ook het lezen waard'), false, wn);
            zetNaam('.held .js-editie', slot);
            $$('.held .js-datum').forEach(function (s) { s.textContent = dag; s.removeAttribute('data-vast'); s.setAttribute('data-live', ''); });
            var a = $('.js-held-link'); if (a) a.setAttribute('aria-label', 'De ' + slot + (vannu ? ' van nu' : ' van ' + dag) + ', met het hoofdverhaal: ' + lijst[0].title + '. Lees verder in Hoot');
          });
          /* Hoot kiest: iPad en telefoon krijgen dezelfde drie verhalen */
          /* het bronnenblok: de breedste verhalen van de Editie van nu */
          if (Array.isArray(ed.breed) && ed.breed.length && window.hootVerhalen) window.hootVerhalen(ed.breed, vannu);
          if (pod && !kiesLive) pod.setAttribute('data-bron', 'bewaard');
          if (pod && kiesLive) wissel(pod, function () {
            $$('.toestel', pod).forEach(function (fig) {
              var items = $$('.rd-item', fig).filter(function (it) { return $('mark', it); });
              lijst.forEach(function (x, i) { if (items[i]) vul(items[i], x, null, true, wn); });
            });
            zetNaam('.js-rd-editie', slot);
            $$('.sc-sub[data-vast]', pod).forEach(function (s) { s.textContent = dag; s.removeAttribute('data-vast'); });
            zetRedenen(ns, rd);
            pod.setAttribute('data-bron', 'live');
            lijn();
          });
        })
        .catch(function () { if (pod) pod.setAttribute('data-bron', 'bewaard'); })
        .then(function () { clearTimeout(to); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
