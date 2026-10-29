import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { SourceMark } from './Items.jsx'
import { StackIcon, CheckIcon, CaretIcon } from './icons.jsx'
import { LOGO, SMALL, STEP, PEEK, STEP_OPEN, TAP, GAP, EDGE, PAD, STRIP_FADE, plek, stapel, keuzeLabel, inRijVolgorde, stapelTeksten, zeg, bezier } from '../lib/streamline.js'

// De lijn bovenaan de Stroom (voorstel 4, "Krantenrubrieken"): de rubrieken in de krantenletter op
// één lijn met een inktlijn eronder, één rode streep onder wat aan staat. Rechts op dezelfde lijn
// je bronnen als stapel van drie logo's; een tik waaiert ze uit over de lijn (Alle bronnen op de
// plek van de stapel) en de rubrieken wijken. Wat je kiest gaat via de URL (zoals altijd); open
// en dicht is alleen van deze lijn. Maten en logica: zie src/lib/streamline.js.
//
// Het meeste hier is meten en verschuiven, met de hand: React tekent de knoppen en hun staat, de
// plek van de bolletjes en de streep zetten we zelf (transform en opacity, zodat de CSS-overgang
// ze laat glijden). Geen data-id: dat is voor de leespositie (useScrollMemory).

const ALL = '' // Alle bronnen in de rij (een bron heeft nooit een lege id)

// Beweging: dezelfde duur en curve als de CSS (--dur-3, --ease-glide); bij Minder beweging direct.
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const ms = (name, fallback) => (reduced() ? 0 : parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || fallback)
const dur = () => ms('--dur-3', 400)
const cssPx = (el, name) => (el ? parseFloat(getComputedStyle(el).getPropertyValue(name)) || 0 : 0)
const EASE = bezier(0.2, 0.8, 0.2, 1)

// Eén klik inslikken: die van de tik naast de open rij, zodat dezelfde tik niet ook een bericht
// opent of een bronfilter zet. Weg na die klik, bij een afgebroken tik (schuiven), en als er na
// het loslaten geen klik komt.
function swallowClick() {
  let t = 0
  const stop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    done()
  }
  const up = () => {
    clearTimeout(t)
    t = setTimeout(done, 300)
  }
  const done = () => {
    clearTimeout(t)
    document.removeEventListener('click', stop, true)
    document.removeEventListener('pointerup', up, true)
    document.removeEventListener('pointercancel', done, true)
  }
  t = setTimeout(done, 3000)
  document.addEventListener('click', stop, true)
  document.addEventListener('pointerup', up, true)
  document.addEventListener('pointercancel', done, true)
}

// Opzij schuiven met dezelfde curve. Schuift de gebruiker zelf, dan stopt het.
const glides = new WeakMap()
function stopGlide(el) {
  const g = el && glides.get(el)
  if (g) {
    cancelAnimationFrame(g.raf)
    glides.delete(el)
  }
}
function glide(el, to) {
  stopGlide(el)
  const from = el.scrollLeft
  const d = dur()
  if (!d || Math.abs(to - from) < 1) {
    el.scrollLeft = to
    return
  }
  const g = { raf: 0, last: from }
  const t0 = performance.now()
  const step = (now) => {
    if (Math.abs(el.scrollLeft - g.last) > 2) return glides.delete(el) // de gebruiker nam het over
    const p = Math.min(1, (now - t0) / d)
    el.scrollLeft = from + (to - from) * EASE(p)
    g.last = el.scrollLeft
    if (p < 1) g.raf = requestAnimationFrame(step)
    else glides.delete(el)
  }
  g.raf = requestAnimationFrame(step)
  glides.set(el, g)
}

// `rubrieken`: { items, sep } uit rubriekRij; `active`: de sig van wat aan staat.
// `bronnen`: de open rij (rijBronnen); `picks`: wat gekozen is (Set). `sources`: toon de stapel.
export function StreamLine({ rubrieken, active, onRubriek, bronnen = [], picks, onToggle, onAll, sources = true }) {
  const uid = useId()
  const [open, setOpen] = useState(false)
  const [peek, setPeek] = useState(false)
  const [rove, setRove] = useState(0) // de ene tabstop in de open rij

  const lineRef = useRef(null)
  const rubRef = useRef(null)
  const scrollRef = useRef(null)
  const rowRef = useRef(null)
  const barRef = useRef(null)
  const prevRef = useRef(null)
  const nextRef = useRef(null)
  const stripRef = useRef(null)
  const toggleRef = useRef(null)
  const labelRef = useRef(null)
  const liveRef = useRef(null)
  const rubEls = useRef(new Map()) // sig → knop
  const cycle = useRef(0) // elke open/dicht een nieuwe ronde; late klusjes van een oude ronde vervallen
  const focusNext = useRef(null)
  const keepFocus = useRef(false) // de focus stond in de open rij bij de laatste tik
  const fadeT = useRef(0) // de rode naam vervaagt nog op zijn plek (zie chrome)
  const wasHas = useRef(false)
  const instant = useRef(false) // de volgende stand zonder overgang
  const mounted = useRef(false)

  const nameOf = (id) => bronnen.find((s) => s.id === id)?.name || id
  const chosen = bronnen.filter((s) => picks.has(s.id)).map((s) => s.id) // in de volgorde van de rij
  const namen = chosen.map(nameOf)
  const has = chosen.length > 0
  const deck = stapel(chosen, bronnen)
  const keuze = keuzeLabel(namen)
  // Bij wissen blijft de oude naam staan tot hij is vervaagd.
  const shownLabel = useRef('')
  if (keuze) shownLabel.current = keuze
  const t = stapelTeksten(namen)
  const rij = [{ id: ALL }, ...bronnen]
  const roveAt = Math.min(rove, rij.length - 1) // viel het laatste bolletje weg, dan het nieuwe laatste

  // Wat de losse luisteraars (schuiven, meten, ernaast tikken) nodig hebben: altijd de laatste stand.
  const st = useRef({})
  st.current = { open, peek, deck, has, namen, active }

  // ---- Meten en zetten (alleen refs en het DOM: ook veilig vanuit een oude render) ----
  const noAnim = (fn) => {
    const line = lineRef.current
    if (!line) return
    line.classList.add('no-anim')
    fn()
    void line.offsetWidth
    line.classList.remove('no-anim')
  }
  const later = (my, ms, fn) =>
    setTimeout(() => {
      if (my === cycle.current && lineRef.current) fn()
    }, ms)
  const say = (msg) => {
    const live = liveRef.current
    if (!live) return
    live.textContent = ''
    setTimeout(() => {
      if (liveRef.current) liveRef.current.textContent = msg
    }, 40)
  }
  const bubbles = () => [...(stripRef.current?.children || [])]

  // Elk bolletje op zijn plek: open in de rij, dicht in de stapel (zie plek()).
  const place = () => {
    const { open, peek, deck } = st.current
    bubbles().forEach((b, i) => {
      const id = b.dataset.src
      const k = deck.indexOf(id)
      b.style.zIndex = id === ALL ? 50 : k >= 0 ? 40 - k : 1
      if (open) {
        b.style.transform = ''
        b.style.opacity = ''
        return
      }
      const p = plek({ i, k, n: deck.length, peek, all: id === ALL })
      b.style.transform = `translateX(${p.x}px) scale(${p.s})`
      b.style.opacity = p.o
    })
    if (labelRef.current) labelRef.current.style.transform = peek && !open ? `translateX(${-(deck.length - 1) * (PEEK - STEP)}px)` : ''
  }

  // Maten van de dichte stapel: label, knop, en waar de rubrieken ophouden (--rub-r). Vervaagt de
  // rode naam nog, dan blijft alles staan tot hij weg is (zie het effect hieronder).
  const chrome = () => {
    const line = lineRef.current
    const label = labelRef.current
    if (!line || fadeT.current) return
    if (!label) return line.style.setProperty('--rub-r', '0px') // geen stapel: de rubrieken tot de rand
    const { deck, has } = st.current
    const deckW = SMALL + (Math.max(1, deck.length) - 1) * STEP
    label.style.right = EDGE + deckW + PAD + 'px'
    const lw = has ? label.offsetWidth : 0
    line.style.setProperty('--rub-r', EDGE + deckW + PAD + (has ? lw + PAD : 0) + 'px')
  }

  // De rode streep: één element dat naar de rubriek glijdt, gemeten op de tekst.
  const moveBar = () => {
    const row = rowRef.current
    const bar = barRef.current
    const text = (rubEls.current.get(st.current.active) || rubEls.current.get(''))?.firstElementChild
    if (!row || !bar || !text) return
    const rr = row.getBoundingClientRect()
    const tr = text.getBoundingClientRect()
    bar.style.transform = `translateX(${(tr.left - rr.left).toFixed(2)}px) scaleX(${(tr.width / 100).toFixed(4)})`
  }

  // Rubrieken: vervaging (en op breed scherm de eindkap met pijltje) alleen waar er nog iets te schuiven valt.
  const rubEdges = () => {
    const sc = scrollRef.current
    if (!sc) return
    const max = sc.scrollWidth - sc.clientWidth
    const x = sc.scrollLeft
    const l = x > 1
    const r = x < max - 1
    const cap = cssPx(rubRef.current, '--cap')
    const fade = cssPx(rubRef.current, '--fade')
    const set = (n, v) => sc.style.setProperty(n, v + 'px')
    set('--cl', l ? cap : 0)
    set('--fl', l ? fade : 0)
    set('--cr', r ? cap : 0)
    set('--fr', r ? fade : 0)
    prevRef.current?.classList.toggle('is-on', l && cap > 0)
    nextRef.current?.classList.toggle('is-on', r && cap > 0)
  }
  // Open rij (van rechts naar links, scrollLeft ≤ 0): vervaging aan de kant waar nog bronnen liggen.
  const stripEdges = () => {
    const s = stripRef.current
    if (!s || !st.current.open) return
    const max = s.scrollWidth - s.clientWidth
    const x = Math.abs(s.scrollLeft)
    s.style.setProperty('--fr', x > 1 ? STRIP_FADE + 'px' : '0px')
    s.style.setProperty('--fl', x < max - 1 ? STRIP_FADE + 'px' : '0px')
  }
  // Een rubriek helemaal in beeld: buiten de kap en de vervaging.
  const reveal = (b, smooth) => {
    const sc = scrollRef.current
    if (!b || !sc) return
    const pad = cssPx(rubRef.current, '--cap') + cssPx(rubRef.current, '--fade')
    const l = b.offsetLeft
    const r = l + b.offsetWidth
    const x = sc.scrollLeft
    const w = sc.clientWidth
    let to = x
    if (x > 0 && l < x + pad) to = Math.max(0, l - pad)
    else if (r > x + w - pad) to = r - w + pad
    if (Math.abs(to - x) < 0.5) return
    if (smooth) glide(sc, to)
    else {
      stopGlide(sc)
      sc.scrollLeft = to
    }
  }
  // Past wat aan staat ook zonder te schuiven (buiten de kap en de vervaging rechts)? Dan hoort
  // de rij aan het begin te staan: na een breder venster staat hij anders nog opzij.
  const fitsAtStart = () => {
    const sc = scrollRef.current
    const b = rubEls.current.get(st.current.active)
    if (!sc || !b) return false
    const over = sc.scrollWidth - sc.clientWidth > 1
    const pad = over ? cssPx(rubRef.current, '--cap') + cssPx(rubRef.current, '--fade') : 0
    return b.offsetLeft + b.offsetWidth <= sc.clientWidth - pad
  }
  // Een bolletje helemaal in beeld in de open rij.
  const revealBubble = (k) => {
    const s = stripRef.current
    if (!s) return
    const W = s.clientWidth
    const x = s.scrollLeft
    const pad = STRIP_FADE + GAP
    const lo = W - k * STEP_OPEN - TAP - pad // scrollLeft moet hieronder (linkerrand in beeld)
    const hi = pad - k * STEP_OPEN // en hierboven (rechterrand in beeld)
    let to = x
    if (x > lo) to = lo
    else if (x < hi) to = hi
    to = Math.max(-(s.scrollWidth - W), Math.min(0, to))
    if (Math.abs(to - x) > 0.5) glide(s, to)
  }
  const relayout = () => {
    noAnim(() => {
      place()
      chrome()
      moveBar()
    })
    // andere maten: terug naar het begin als wat aan staat daar past, anders blijft het in beeld
    const sc = scrollRef.current
    if (sc && sc.scrollLeft > 0 && fitsAtStart()) {
      stopGlide(sc)
      sc.scrollLeft = 0
    } else reveal(rubEls.current.get(st.current.active), false)
    rubEdges()
    if (st.current.open) stripEdges()
  }

  // ---- Open en dicht ----
  const openLine = () => {
    const strip = stripRef.current
    if (st.current.open || !strip) return
    const my = ++cycle.current
    stopGlide(strip)
    strip.scrollLeft = 0
    // de bolletjes vertrekken kort na elkaar: Alle bronnen eerst, 6 ms per stap, hooguit 90
    if (!reduced()) bubbles().forEach((b, i) => (b.style.transitionDelay = Math.min(i * 6, 90) + 'ms'))
    focusNext.current = 'all'
    setRove(0)
    setPeek(false)
    setOpen(true)
    later(my, dur() + 100, () => bubbles().forEach((b) => (b.style.transitionDelay = '')))
  }
  const closeLine = (focusBack) => {
    if (!st.current.open) return
    st.current.open = false
    keepFocus.current = false
    const my = ++cycle.current
    const strip = stripRef.current
    stopGlide(strip)
    // Was de rij verschoven, zet de schuif dan eerst om in een verschuiving: zo vertrekt elk
    // bolletje van de plek waar je het ziet, en springt er niets.
    const d = strip ? Math.abs(strip.scrollLeft) : 0
    if (d > 0)
      noAnim(() => {
        bubbles().forEach((b) => (b.style.transform = `translateX(${d}px)`))
        strip.scrollLeft = 0
      })
    bubbles().forEach((b) => (b.style.transitionDelay = ''))
    focusNext.current = focusBack ? 'toggle' : null
    setOpen(false)
    if (!focusBack) say(zeg.dicht(st.current.namen))
    later(my, dur() + 120, () => {
      const s = stripRef.current
      if (s && s.scrollLeft !== 0)
        noAnim(() => {
          s.scrollLeft = 0 // vangnet
          place()
        })
      reveal(rubEls.current.get(st.current.active), true)
      rubEdges()
    })
  }

  // ---- De staat in het DOM zetten, vóór het tekenen ----
  // Eerste keer zonder beweging: de klasse gaat er pas af na alle effecten hieronder.
  useLayoutEffect(() => {
    lineRef.current?.classList.add('no-anim')
  }, [])

  const deckKey = deck.join(',')
  const rowKey = bronnen.map((s) => s.id).join(',')
  useLayoutEffect(() => {
    // Dicht zonder beweging (de stapel viel weg): de nieuwe stand in één keer, zonder overgang.
    if (instant.current) {
      instant.current = false
      noAnim(() => place())
    }
    // Keuze gewist terwijl de stapel dicht is (terugknop, Wis alle filters): de rode naam vervaagt op
    // zijn plek, en pas daarna krijgen de rubrieken de ruimte. Anders schuift hij nog zichtbaar
    // over de rubrieken heen.
    const fading = wasHas.current && !has && !open && !reduced()
    wasHas.current = has
    if (fading || (fadeT.current && has)) {
      clearTimeout(fadeT.current)
      fadeT.current = 0
    }
    if (fading)
      fadeT.current = setTimeout(() => {
        fadeT.current = 0
        chrome()
        rubEdges()
      }, ms('--dur-2', 200))
    place()
    chrome()
    rubEdges()
    if (open) stripEdges()
    else if (stripRef.current) {
      stripRef.current.style.setProperty('--fl', '0px')
      stripRef.current.style.setProperty('--fr', '0px')
    }
    const f = focusNext.current
    focusNext.current = null
    if (f === 'all' && open) bubbles()[0]?.focus({ preventScroll: true })
    if (f === 'toggle' && !open) toggleRef.current?.focus({ preventScroll: true })
    if (f === 'rub' && !open) (rubEls.current.get(st.current.active) || rubEls.current.get(''))?.focus({ preventScroll: true })
    // Viel het bolletje met de focus weg (een gekozen bron van buiten je rij, uitgezet), dan gaat
    // de focus naar wat nu op die plek staat: Tab, de pijltjes en Esc blijven werken.
    if (open && keepFocus.current && !lineRef.current?.contains(document.activeElement)) bubbles()[roveAt]?.focus({ preventScroll: true })
  }, [open, peek, deckKey, rowKey, has, keuze, sources]) // eslint-disable-line react-hooks/exhaustive-deps

  // Valt de stapel weg terwijl de rij open staat (de laatste bron van buiten je rij uitgezet, en er
  // blijft maar één bron over), dan gaat de rij dicht, zonder beweging. De focus stond op een
  // bolletje dat er niet meer is: naar de rubriek die aan staat.
  useLayoutEffect(() => {
    if (sources || !st.current.open) return
    st.current.open = false
    keepFocus.current = false
    ++cycle.current
    if (!document.activeElement || document.activeElement === document.body) focusNext.current = 'rub'
    instant.current = true
    setPeek(false)
    setOpen(false)
    say(zeg.dicht([]))
  }, [sources]) // eslint-disable-line react-hooks/exhaustive-deps

  const rubKey = rubrieken.items.map((r) => r.sig).join('|')
  useLayoutEffect(() => {
    moveBar()
    rubEdges()
    if (mounted.current) reveal(rubEls.current.get(active), true)
  }, [active, rubKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    const line = lineRef.current
    void line.offsetWidth
    line.classList.remove('no-anim')
    mounted.current = true
    const raf = requestAnimationFrame(() => {
      reveal(rubEls.current.get(st.current.active), false)
      rubEdges()
    })
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(fadeT.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Opnieuw meten bij een andere breedte, en als het scherm weer in beeld komt (verborgen is
  // alles 0), na het laden van de letters en bij een andere tekstgrootte (de rij wordt breder
  // terwijl de lijn even breed blijft). Alleen bij een echte verandering: anders breekt het een
  // lopende beweging af.
  useEffect(() => {
    const line = lineRef.current
    let w = -1
    let fs = ''
    const ro = new ResizeObserver(() => {
      const nw = line.clientWidth
      const nfs = getComputedStyle(document.documentElement).fontSize
      if (nw === w && nfs === fs) return
      w = nw
      fs = nfs
      relayout()
    })
    ro.observe(line)
    if (rowRef.current) ro.observe(rowRef.current)
    let live = true
    document.fonts?.ready.then(() => live && relayout())
    return () => {
      live = false
      ro.disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Schuiven: randen bijwerken; het scrollwiel (muis) schuift de rijen opzij, en aan het eind
  // gaat de pagina weer gewoon door. Niet passief, dus met de hand (React's onWheel is passief).
  useEffect(() => {
    const offs = []
    const on = (el, ev, fn, opt) => {
      if (!el) return
      el.addEventListener(ev, fn, opt)
      offs.push(() => el.removeEventListener(ev, fn, opt))
    }
    const wheel = (el, reversed, ok) => (e) => {
      if (!ok() || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      const max = el.scrollWidth - el.clientWidth
      const x = Math.abs(el.scrollLeft)
      if (max <= 0 || (e.deltaY < 0 && x <= 0) || (e.deltaY > 0 && x >= max - 1)) return
      e.preventDefault()
      stopGlide(el)
      const nx = Math.max(0, Math.min(max, x + e.deltaY))
      el.scrollLeft = reversed ? -nx : nx
    }
    const sc = scrollRef.current
    const strip = stripRef.current
    on(sc, 'scroll', rubEdges, { passive: true })
    on(strip, 'scroll', stripEdges, { passive: true })
    on(sc, 'wheel', wheel(sc, false, () => !st.current.open), { passive: false })
    on(strip, 'wheel', wheel(strip, true, () => st.current.open), { passive: false })
    return () => offs.forEach((off) => off())
  }, [sources]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ernaast tikken klapt dicht. In de lijst eronder doet die tik verder niets (geen bericht open,
  // geen bronfilter); in de kop wel, zodat de filterknop en Verversen in één tik werken, en
  // daarbuiten (zijbalk, tabbalk) ook. Esc klapt dicht waar de focus ook staat (Safari geeft een
  // aangeklikte knop geen focus).
  useEffect(() => {
    if (!open) return
    const down = (e) => {
      const line = lineRef.current
      if (!line || line.contains(e.target)) return
      closeLine(false)
      if (line.closest('.view')?.contains(e.target) && !e.target.closest?.('.vh')) swallowClick()
    }
    const key = (e) => {
      if (e.key !== 'Escape' || !st.current.open) return
      e.preventDefault()
      closeLine(true)
    }
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Bediening ----
  const pickRub = (r) => {
    if (r.sig === active) return // aan blijft aan; Alles staat altijd vooraan
    onRubriek(r)
    say(zeg.rubriek(r.label))
  }
  const rubKeyDown = (e) => {
    const btns = rubrieken.items.map((r) => rubEls.current.get(r.sig)).filter(Boolean)
    const i = btns.indexOf(document.activeElement)
    if (i < 0) return
    const j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: btns.length - 1 }[e.key]
    if (j === undefined) return
    e.preventDefault()
    btns[Math.max(0, Math.min(btns.length - 1, j))].focus()
  }
  const nudge = (dir) => {
    const sc = scrollRef.current
    const max = sc.scrollWidth - sc.clientWidth
    glide(sc, Math.max(0, Math.min(max, sc.scrollLeft + dir * sc.clientWidth * 0.6)))
  }
  const tap = (id, i) => {
    if (!st.current.open) return
    setRove(i)
    keepFocus.current = !!stripRef.current?.contains(document.activeElement)
    if (id === ALL) {
      // Met een keuze: eerst alles terug; zonder keuze (of de tweede tik): dicht.
      if (has) {
        onAll()
        say(zeg.alles)
      } else closeLine(true)
      return
    }
    const was = picks.has(id)
    const next = inRijVolgorde(was ? chosen.filter((x) => x !== id) : [...chosen, id], bronnen)
    onToggle(id)
    say(zeg.bron(nameOf(id), !was, next.map(nameOf)))
  }
  // Eén tabstop voor de open rij; de rij loopt van rechts naar links, dus ← is verder de rij in.
  const stripKeyDown = (e) => {
    const bs = bubbles()
    const i = bs.indexOf(document.activeElement)
    if (i < 0) return
    const j = { ArrowLeft: i + 1, ArrowRight: i - 1, Home: 0, End: bs.length - 1 }[e.key]
    if (j === undefined) return
    e.preventDefault()
    const k = Math.max(0, Math.min(bs.length - 1, j))
    setRove(k)
    bs[k].focus({ preventScroll: true })
    revealBubble(k)
  }

  return (
    <>
      <div
        ref={lineRef}
        className={`line${open ? ' is-open' : ''}${has ? ' has-choice' : ''}`}
        onBlur={(e) => {
          // Tab de rij uit (of Shift+Tab terug): dichtklappen, de focus gaat gewoon door.
          if (st.current.open && e.relatedTarget && !lineRef.current.contains(e.relatedTarget)) closeLine(false)
        }}
      >
        <div ref={rubRef} className="rub" inert={open ? '' : undefined}>
          <div ref={scrollRef} className="rub__scroll">
            <div ref={rowRef} className="rub__row" role="group" aria-label="Rubriek" onKeyDown={rubKeyDown} onFocus={(e) => e.target.classList.contains('rub__btn') && reveal(e.target, true)}>
              {rubrieken.items.map((r, i) => (
                <Fragment key={r.sig || 'alles'}>
                  {/* kolomlijn tussen wat je leest (Alles, Buiten je bubbel) en de rubrieken */}
                  {i === rubrieken.sep ? <span className="rub__sep" aria-hidden="true" /> : null}
                  <button type="button" className="rub__btn" ref={(el) => (el ? rubEls.current.set(r.sig, el) : rubEls.current.delete(r.sig))} aria-pressed={r.sig === active} onClick={() => pickRub(r)}>
                    <span className="rub__t">{r.label}</span>
                  </button>
                </Fragment>
              ))}
              <span ref={barRef} className="rub__bar" aria-hidden="true" />
            </div>
          </div>
          {/* Pijltjes (alleen breed scherm): in de eindkap, nooit over tekst */}
          <button ref={prevRef} type="button" className="rub__more rub__more--prev" tabIndex={-1} aria-hidden="true" title="Vorige rubrieken" onClick={() => nudge(-1)}>
            <CaretIcon />
          </button>
          <button ref={nextRef} type="button" className="rub__more rub__more--next" tabIndex={-1} aria-hidden="true" title="Meer rubrieken" onClick={() => nudge(1)}>
            <CaretIcon />
          </button>
        </div>
        {sources ? (
          <div className="src">
            <span ref={labelRef} className="src__label" aria-hidden="true">
              <span>{shownLabel.current}</span>
            </span>
            <div ref={stripRef} id={`${uid}-strip`} className="src__scroll" role="toolbar" aria-label="Kies bronnen" inert={open ? undefined : ''} onKeyDown={stripKeyDown}>
              {rij.map((s, i) => {
                const all = s.id === ALL
                return (
                  <button
                    key={all ? '*' : s.id}
                    type="button"
                    className={`sb${all ? ' sb--all' : ''}${deck[0] === s.id ? ' is-front' : ''}`}
                    data-src={s.id}
                    aria-pressed={all ? !has : picks.has(s.id)}
                    aria-label={all ? 'Alle bronnen' : s.name}
                    aria-describedby={all ? `${uid}-hint` : undefined}
                    title={all ? t.allTitle : s.name}
                    tabIndex={i === roveAt ? 0 : -1}
                    onClick={() => tap(s.id, i)}
                  >
                    {all ? (
                      <span className="sb__all">
                        <StackIcon />
                      </span>
                    ) : (
                      <SourceMark source={s} size={LOGO} />
                    )}
                    <span className="sb__ring" aria-hidden="true" />
                    <span className="sb__check" aria-hidden="true">
                      <CheckIcon />
                    </span>
                  </button>
                )
              })}
            </div>
            {/* Dicht is de stapel één knop over naam en logo's */}
            <button
              ref={toggleRef}
              type="button"
              className="src__toggle"
              aria-expanded={open}
              aria-controls={`${uid}-strip`}
              aria-label={t.label}
              title={t.title}
              onClick={openLine}
              onPointerEnter={(e) => {
                // muis erover: de dichte stapel waaiert een paar px open, als hint
                if (e.pointerType === 'mouse' && !open && !reduced()) setPeek(true)
              }}
              onPointerLeave={() => peek && setPeek(false)}
            />
          </div>
        ) : null}
      </div>
      <span className="visually-hidden" id={`${uid}-hint`}>
        {t.hint}
      </span>
      <p ref={liveRef} className="visually-hidden" aria-live="polite" />
    </>
  )
}
