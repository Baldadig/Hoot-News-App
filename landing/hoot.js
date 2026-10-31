/* gethoot.app · v4. Geen trackers, geen cookies, geen opslag. Eén bestand:
   1. het ritueel (kleuren per dagdeel, vóór de eerste weergave)  2. de gang van de zon, de Editie die zichzelf één rondje uitleest, de Stroom die één rondje van rubriek wisselt, parallax, De Redacteur met de echte Editie, de stuiterende punt. */
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

    /* De klok achter de bewegende demo's (WCAG 2.2.2): de tijd loopt alleen als de demo in beeld is en het tabblad zichtbaar.
       Een automatische ronde pauzeert ook zolang de muis boven de demo hangt of iets in de sectie focus heeft, speelt hooguit één keer
       en eindigt in een nette eindstand. Met reduced motion (ook als dat later wordt aangezet) staat alles stil. */
    function klok(sectie, scene, rust) {
      var k = { pos: 0, duur: 0, teken: null, auto: true, klaar: false };
      var zicht = false, muis = false, focus = false, raf = 0, vorig = 0;
      function mag() { return !!k.teken && !k.klaar && zicht && !document.hidden && !reduce && (!k.auto || (!muis && !focus)); }
      function tik(nu) {
        raf = 0; if (!mag()) return;
        if (vorig) k.pos = Math.min(k.duur, k.pos + Math.min(100, nu - vorig));
        vorig = nu; k.teken(k.pos);
        if (k.pos >= k.duur) { k.klaar = true; return; }
        raf = requestAnimationFrame(tik);
      }
      k.kijk = function () {
        if (mag()) { if (!raf) { vorig = 0; raf = requestAnimationFrame(tik); } }
        else if (raf) { cancelAnimationFrame(raf); raf = 0; }
      };
      /* een ronde die de bezoeker zelf start (een dagdeel kiezen): loopt ook door met de muis erboven of de focus op de knop */
      k.speel = function (duur, teken) { k.pos = 0; k.duur = duur; k.teken = teken; k.auto = false; k.klaar = false; k.kijk(); };
      k.bezig = function () { return !!k.teken && k.pos > 0 && !k.klaar; };
      scene.addEventListener('mouseenter', function () { muis = true; k.kijk(); });
      scene.addEventListener('mouseleave', function () { muis = false; k.kijk(); });
      sectie.addEventListener('focusin', function () { focus = true; k.kijk(); });
      sectie.addEventListener('focusout', function (e) { focus = !!(e.relatedTarget && sectie.contains(e.relatedTarget)); k.kijk(); });
      zichtbaar(sectie, function (aan) { zicht = aan; k.kijk(); });
      document.addEventListener('visibilitychange', k.kijk);
      /* gaat reduced motion aan, dan terug naar de rustige stand; een begonnen ronde telt als gespeeld en hervat later niet halverwege */
      opRM(function () { if (reduce) { if (k.pos > 0) k.klaar = true; rust(); } k.kijk(); });
      return k;
    }

    /* ---- 01 Editie: de gang van de zon. De telefoon leest de Editie uit tot "Je bent bij.", dan het volgende dagdeel;
       na één rondje langs ochtend, middag en avond staat hij weer bovenaan bij het dagdeel van nu, en blijft staan. ---- */
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
      if (rol) { rol.style.transform = 'translateY(0)'; rol.style.opacity = '1'; }
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
      $$('.held .js-editie').forEach(function (s) { s.textContent = TXT[d][0]; });
      $$('.js-rd-editie').forEach(function (s) { if (!s.hasAttribute('data-live')) s.textContent = TXT[d][0]; });
      if (!gekozen && !(kE && kE.bezig())) { zetTekst(d); plaats(T[d]); }
    };
    window.hootDagdeel(R.getAttribute('data-dagdeel') || 'ochtend');
    if (dagen) addEventListener('resize', function () { plaats(zt); });
    if (scE && rol && tst) {
      rol.style.transition = 'opacity .45s ease';
      kE = klok(scE.closest('.band'), scE, rustE);
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

    /* ---- 02 Stroom: in de app wisselen de rubrieken vanzelf; één rondje, dan terug op Alles ---- */
    var scS = $('.sc-stroom'), rij = scS && $('.sc-tabrij', scS), ind = rij && $('.sc-ind', rij);
    if (scS) {
      var RUB = ['alles', 'binnenland', 'buitenland', 'cultuur'], ri = 0, STAP = 3400;
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
      var kS = klok(scS.closest('.band'), scS, function () { ri = 0; toon('alles', false); });
      kS.duur = RUB.length * STAP;
      kS.teken = function (pos) { var i = Math.floor(pos / STAP) % RUB.length; if (i !== ri) { ri = i; toon(RUB[ri], true); } };
      kS.kijk();
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
    /* Eén beslisregel voor de markering op de kaart én de uitleg ernaast, uit het aantal bronnen per verhaal.
       Bovenaan: vijf of meer bronnen is groot nieuws, twee of meer is meerdere bronnen. Tweede kaart: meerdere bronnen als dat nog vrij is,
       anders uit je eigen bronnen. Derde kaart: buiten je bubbel. De pagina kent de bronnen van de bezoeker niet, dus geen 'jouw kranten'. */
    var REDEN = {
      groot: ['Groot nieuws', 'Veel bronnen schrijven erover. Dit wil je weten.'],
      meer: ['Meerdere bronnen', 'Niet één krant, maar meerdere vinden het belangrijk.'],
      eigen: ['Uit je eigen bronnen', 'Uit een bron die je zelf hebt gekozen.'],
      bubbel: ['Buiten je bubbel', 'Iets wat je anders niet had gelezen.']
    };
    function redenen(ns) {
      var s0 = ns[0] >= 5 ? 'groot' : (ns[0] >= 2 ? 'meer' : 'eigen');
      var s1 = ns[1] >= 2 && s0 !== 'meer' ? 'meer' : 'eigen';
      return s0 === s1 ? null : [s0, s1, 'bubbel'];
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
      var ns0 = String(pod.getAttribute('data-n') || '').split(/\s+/).map(Number), r0 = ns0.length === 3 && redenen(ns0);
      if (r0) zetRedenen(ns0, r0); /* het voorbeeld uit dezelfde regel */
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
            /* het verhaal met de meeste bronnen bovenaan */
            var top = en.slice().sort(function (a, b) { return (Number(b.sourceCount) || 0) - (Number(a.sourceCount) || 0); })[0];
            /* Ook drie rustige koppen met minder bronnen zijn een geldige live voorpagina. */
            var rest = en.filter(function (x) { return x !== top; }).slice(0, 2), lijst = [top].concat(rest);
            var ns = lijst.map(function (x) { return Number(x.sourceCount) || 0; }), rd = redenen(ns);
            if (!rd) throw 0; /* geen drie verschillende redenen te geven: dan blijft het voorbeeld staan */
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
            zetRedenen(ns, rd);
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
