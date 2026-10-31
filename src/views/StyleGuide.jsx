import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import { ViewHeader, StatusLine, Skeleton, Empty, LoadError, BackButton } from '../components/Shell.jsx'
import { LeadStory, CompactItem, SocialItem, useHoot } from '../components/Items.jsx'
import { Dialog, DialogHeader } from '../components/Dialog.jsx'
import { Switch, SourceRow } from './Sources.jsx'
import { BookmarkIcon, RefreshIcon, CaretIcon, CloseIcon, ICON_SM, SavedArt } from '../components/icons.jsx'

// Het designsysteem draait in de app zelf, met echte onderdelen en echte berichten: wat hier staat
// ís wat er gebouwd is. Ook de staten: hover, focus en ingedrukt zijn de regels uit styles.css
// zelf, hier vastgezet op een klasse (zie stateCss), en elke maat onder een onderdeel is gemeten
// (getComputedStyle), niet overgetypt. Verandert de code, dan verandert dit scherm mee.

// ---------- Kleur: elke rol in licht en donker naast elkaar ----------
const COLORS = [
  ['--paper', 'Papier: de achtergrond'],
  ['--surface', 'Vlak: veld, segment, kaart'],
  ['--ink', 'Inkt: koppen en leestekst'],
  ['--ink-2', 'Inkt 2: samenvatting en uitleg'],
  ['--ink-3', 'Inkt 3: meta en stille bediening'],
  ['--rule', 'Lijn: tussen rijen, alleen scheiding'],
  ['--edge', 'Rand: een lijn die iets betekent, 3:1'],
  ['--accent', 'Krantenrood: rubriek, actief, gekozen, link, merk'],
  ['--warn', 'Waarschuwing: storing, offline'],
  ['--brand-red', 'Merkrood: een vol vlak, in beide thema’s gelijk'],
  ['--action', 'Actie: tekstknoppen, terug, tweede knop'],
  ['--focus', 'Focus: de ring, altijd inkt'],
  ['--sel-bg', 'Gekozen: vlak'],
  ['--sel-fg', 'Gekozen: tekst en rand'],
  ['--tint', 'Decoratief vlak: badge, icoonschijf'],
  ['--hairline', 'Haarlijn: rand om een logo of duim'],
  ['--elev-1', 'Zwevend vlak: dialoog, blad, Lezer'],
  ['--thumb', 'Duim van de schakelaar'],
  ['--mark-bg', 'Achter een uitgeverslogo'],
]

// ---------- Bediening: zeven staten per onderdeel ----------
const STATES = [
  ['rust', 'Rust'],
  ['hover', 'Hover'],
  ['focus', 'Focus'],
  ['druk', 'Ingedrukt'],
  ['gekozen', 'Gekozen'],
  ['uit', 'Uitgeschakeld'],
  ['bezig', 'Bezig'],
]
const PSEUDO = { hover: 'sg-hover', focus: 'sg-focus', druk: 'sg-press' }
const cls = (base, s) => (PSEUDO[s] ? `${base} ${PSEUDO[s]}` : base)
const off = (s) => s === 'uit'
const ALL = STATES.map(([s]) => s)
const NOT = (...skip) => ALL.filter((s) => !skip.includes(s))

// Elk onderdeel: de staten die de code kent (de rest krijgt een streep), wat er gemeten wordt
// (`spec` en `sel`), en het onderdeel zelf in staat `s`.
const CONTROLS = [
  {
    name: 'Hoofdknop',
    code: '.btn',
    states: NOT('gekozen'),
    sel: '.btn',
    spec: 'box',
    render: (s) => (
      <button type="button" className={cls('btn', s)} disabled={off(s)} aria-busy={s === 'bezig' || undefined}>
        Lees
      </button>
    ),
  },
  {
    name: 'Hoofdknop groot',
    code: '.btn--lg',
    states: NOT('gekozen'),
    sel: '.btn',
    spec: 'box',
    render: (s) => (
      <button type="button" className={cls('btn btn--lg', s)} disabled={off(s)} aria-busy={s === 'bezig' || undefined}>
        Begin
      </button>
    ),
  },
  {
    name: 'Accentknop',
    code: '.btn--accent',
    note: 'alleen de nieuwe-berichtenpil',
    states: NOT('gekozen'),
    sel: '.btn',
    spec: 'box',
    render: (s) => (
      <button type="button" className={cls('btn btn--accent', s)} disabled={off(s)} aria-busy={s === 'bezig' || undefined}>
        3 nieuw
      </button>
    ),
  },
  {
    name: 'Tweede knop',
    code: '.btn--quiet',
    states: NOT('gekozen'),
    sel: '.btn',
    spec: 'box',
    render: (s) => (
      <button type="button" className={cls('btn btn--quiet', s)} disabled={off(s)} aria-busy={s === 'bezig' || undefined}>
        Later
      </button>
    ),
  },
  {
    name: 'Pil',
    code: '.pill',
    states: NOT('bezig'),
    sel: '.pill',
    spec: 'box',
    render: (s) => (
      <button type="button" className={cls('pill', s)} disabled={off(s)} aria-pressed={s === 'gekozen'}>
        Wereld
      </button>
    ),
  },
  {
    name: 'Pil klein',
    code: '.pill--sm .hit',
    note: 'raakvlak 44',
    states: NOT('bezig'),
    sel: '.pill',
    spec: 'box',
    render: (s) => (
      <button type="button" className={cls('pill pill--sm hit', s)} disabled={off(s)} aria-pressed={s === 'gekozen'}>
        Sport
      </button>
    ),
  },
  {
    name: 'Pil gestippeld',
    code: '.pill--dashed',
    note: 'gekozen = uitgeklapt',
    states: NOT('bezig'),
    sel: '.pill',
    spec: 'box',
    render: (s) => (
      <button type="button" className={cls('pill pill--sm pill--dashed hit', s)} disabled={off(s)} aria-expanded={s === 'gekozen'}>
        Uitleg: AI
      </button>
    ),
  },
  {
    name: 'Icoonknop',
    code: '.iconbtn',
    note: 'gekozen: alleen het icoon',
    states: ALL,
    sel: '.iconbtn',
    spec: 'icon',
    render: (s) =>
      s === 'bezig' ? (
        <button type="button" className="iconbtn is-spinning" aria-label="Verversen">
          <RefreshIcon />
        </button>
      ) : (
        <button type="button" className={cls(`iconbtn save${s === 'gekozen' ? ' is-on' : ''}`, s)} disabled={off(s)} aria-label="Bewaren">
          <BookmarkIcon filled={s === 'gekozen'} />
        </button>
      ),
  },
  {
    name: 'Tekstknop',
    code: '.linkbtn',
    states: NOT('gekozen', 'bezig'),
    sel: '.linkbtn',
    spec: 'box',
    render: (s) => (
      <button type="button" className={cls('linkbtn', s)} disabled={off(s)}>
        Opnieuw
      </button>
    ),
  },
  {
    name: 'Tekstknop zonder streep',
    code: '.linkbtn--plain',
    states: NOT('gekozen', 'bezig'),
    sel: '.linkbtn',
    spec: 'box',
    render: (s) => (
      <button type="button" className={cls('linkbtn linkbtn--plain', s)} disabled={off(s)}>
        Meer
      </button>
    ),
  },
  {
    name: 'Link in tekst',
    code: '.linkbtn--inline',
    note: 'erft maat en regel',
    states: NOT('gekozen', 'bezig'),
    sel: '.linkbtn',
    spec: 'type',
    render: (s) => (
      <button type="button" className={cls('linkbtn linkbtn--inline', s)} disabled={off(s)}>
        de bron
      </button>
    ),
  },
  {
    name: 'Terug',
    code: 'BackButton',
    states: ['rust', 'hover', 'focus', 'druk'],
    sel: '.backbtn',
    spec: 'back',
    render: (s) => <BackButton label="Terug" className={PSEUDO[s] || ''} />,
  },
  {
    name: 'Segment',
    code: '.seg',
    note: 'de staat zit op Uit',
    states: NOT('bezig'),
    sel: '.seg',
    spec: 'seg',
    render: (s) => (
      <div className="seg" role="group" aria-label="Voorbeeld">
        <button type="button" className="seg__btn" aria-pressed={s !== 'gekozen'} disabled={off(s)}>
          Aan
        </button>
        <button type="button" className={cls('seg__btn', s)} aria-pressed={s === 'gekozen'} disabled={off(s)}>
          Uit
        </button>
      </div>
    ),
  },
  {
    name: 'Schakelaar',
    code: 'Switch',
    note: 'gekozen = aan',
    states: ['rust', 'focus', 'gekozen', 'uit'],
    sel: '.switch',
    spec: 'switch',
    render: (s) => <Switch checked={s === 'gekozen'} onChange={() => {}} label="Voorbeeld" className={PSEUDO[s] || ''} disabled={off(s)} />,
  },
  {
    name: 'Veld',
    code: '.input',
    states: ['rust', 'focus', 'uit'],
    sel: '.input',
    spec: 'box',
    render: (s) => <input className={cls('input', s)} type="text" placeholder="Zoek" aria-label="Voorbeeld" disabled={off(s)} />,
  },
  {
    name: 'Keuzelijst',
    code: 'select.input',
    states: ['rust', 'focus', 'uit'],
    sel: '.input',
    spec: 'box',
    render: (s) => (
      <select className={cls('input', s)} aria-label="Voorbeeld" disabled={off(s)} defaultValue="licht">
        <option value="licht">Licht</option>
        <option value="donker">Donker</option>
      </select>
    ),
  },
]

// Type: elke rol met een voorbeeld; de maat eronder is gemeten.
const TYPE = [
  ['head-6', 'Hoofdverhaal', '.head-6', 'Kabinet zoekt steun bij de oppositie'],
  ['head-5', 'Schermtitel en verhaaltitel', '.head-5', 'Editie'],
  ['head-lg', 'Itemkop groot: brede lijst, blad, lege staat', '.head-lg', 'Wat de nieuwe regels betekenen'],
  ['head-4', 'Itemkop klein: bericht, keuze, tussenkop', '.head-4', 'Rente blijft voorlopig gelijk'],
  ['sg__read', 'Leestekst: de Lezer en lopende tekst', 'body · --lh-3-read', 'Het kabinet wil de belasting op arbeid verlagen en zoekt daarvoor steun in de Eerste Kamer.'],
  ['compact__sum', 'Samenvatting', '.compact__sum', 'Premier en ministers praten deze week met alle fracties over het plan.'],
  ['drow__label', 'Bediening en bronnaam', '.drow__label', 'Tekstgrootte'],
  ['hint', 'Uitleg', '.hint', 'Wat bij je interesses past, gaat voor in je Editie.'],
  ['status', 'Meta: tijd, aantallen, status', '.status', 'Bijgewerkt om 13:50'],
  ['label label--section', 'Sectiekop', '.label--section', 'Je volgt'],
  ['label label--kicker', 'Kicker: de rubriek', '.label--kicker', 'Binnenland'],
  ['label label--meta', 'Meta-label', '.label--meta', 'Kon niet laden'],
]

// Zet een regel met :hover, :active of :focus-visible om naar een klasse (.sg-hover, .sg-press,
// .sg-focus), met dezelfde specificiteit. Groepen (@media, @container, @supports) gaan mee; een
// @media (hover: hover) valt weg, zodat de hover ook op een aanraakscherm te zien is.
const SWAP = [
  [/:hover\b/g, '.sg-hover'],
  [/:active\b/g, '.sg-press'],
  [/:focus-visible\b/g, '.sg-focus'],
]
function stateCss(rules, out) {
  for (const r of rules) {
    if (r.selectorText !== undefined) {
      if (!/:hover|:active|:focus-visible/.test(r.selectorText)) continue
      const sel = SWAP.reduce((t, [re, c]) => t.replace(re, c), r.selectorText)
      out.push(`${sel} { ${r.style.cssText} }`)
    } else if (r.cssRules) {
      const inner = []
      stateCss(r.cssRules, inner)
      if (!inner.length) continue
      if (r.media && /\bhover\b/.test(r.conditionText)) out.push(...inner)
      else out.push(`${r.cssText.slice(0, r.cssText.indexOf('{'))} { ${inner.join('\n')} }`)
    }
  }
}
// De kleuren van licht en donker als twee klassen (.sg-licht, .sg-donker): alle tokens van :root,
// voor donker met die van :root[data-theme='dark'] erover. Omdat de rollen (--action, --sel-bg …)
// opnieuw meekomen, lossen ze binnen zo'n klasse op met de kleuren van dat thema.
function themeCss(sheets) {
  const light = []
  const dark = []
  for (const sheet of sheets) {
    let rules
    try {
      rules = sheet.cssRules
    } catch {
      continue // een stylesheet van een ander domein (lettertypen)
    }
    for (const r of rules) {
      const into = r.selectorText === ':root' ? light : /^:root\[data-theme=["']dark["']\]$/.test(r.selectorText || '') ? dark : null
      if (!into) continue
      for (let i = 0; i < r.style.length; i++) {
        const p = r.style[i]
        if (p.startsWith('--')) into.push(`${p}: ${r.style.getPropertyValue(p)};`)
      }
    }
  }
  return `.sg-licht { ${light.join(' ')} }\n.sg-donker { ${light.join(' ')} ${dark.join(' ')} }`
}
function buildCss() {
  const out = []
  for (const sheet of document.styleSheets) {
    try {
      stateCss(sheet.cssRules, out)
    } catch {
      /* ander domein */
    }
  }
  return `${out.join('\n')}\n${themeCss(document.styleSheets)}`
}

// ---------- Meten ----------
const n = (v) => {
  const x = parseFloat(v)
  return Number.isFinite(x) ? String(Math.round(x * 10) / 10).replace('.', ',') : v
}
const family = (cs) => (/newsreader/i.test(cs.fontFamily) ? 'serif' : 'schreefloos')
const ls = (cs) => {
  const em = parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize)
  return Number.isFinite(em) && Math.abs(em) >= 0.001 ? ` · ${String(Math.round(em * 1000) / 1000).replace('.', ',').replace('-', '−')}em` : ''
}
const typeOf = (cs) => `${family(cs)} ${n(cs.fontSize)}/${n(cs.lineHeight)} · ${cs.fontWeight}${ls(cs)}`
const corner = (cs, h) => {
  const r = parseFloat(cs.borderTopLeftRadius)
  return r >= h / 2 - 0.5 ? 'pil' : r ? `hoek ${n(r)}` : 'recht'
}
const MEASURE = {
  type: (el, cs) => typeOf(cs),
  box: (el, cs, b) => `${n(b.height)} hoog · ${corner(cs, b.height)} · opzij ${n(cs.paddingLeft)} · ${n(cs.fontSize)}/${n(cs.lineHeight)} ${cs.fontWeight}`,
  icon: (el, cs, b) => `${n(b.width)} × ${n(b.height)} · ${corner(cs, b.height)} · icoon ${n(el.querySelector('svg')?.getBoundingClientRect().width)}`,
  back: (el, cs, b) => `${n(b.height)} hoog · icoon ${n(el.querySelector('svg')?.getBoundingClientRect().width)} · ${n(cs.fontSize)}/${n(cs.lineHeight)} ${cs.fontWeight}`,
  seg: (el, cs, b) => `${n(b.height)} hoog · ${corner(cs, b.height)} · knop ${n(el.querySelector('.seg__btn')?.getBoundingClientRect().height)}`,
  switch: (el, cs, b) => {
    const t = el.querySelector('.switch__track')?.getBoundingClientRect()
    const d = el.querySelector('.switch__thumb')?.getBoundingClientRect()
    return `baan ${n(t?.width)} × ${n(t?.height)} · duim ${n(d?.width)} · raakvlak ${n(b.width)} × ${n(b.height)}`
  },
  row: (el, cs, b) => `minstens ${n(cs.minHeight)} · nu ${n(b.height)} hoog`,
  toast: (el, cs, b) => `${n(b.height)} hoog · ${corner(cs, b.height)} · ${n(cs.fontSize)}/${n(cs.lineHeight)} · binnen ${n(cs.paddingTop)} ${n(cs.paddingRight)} ${n(cs.paddingBottom)} ${n(cs.paddingLeft)}`,
  sheet: (el, cs) => {
    const pad = getComputedStyle(el.querySelector('.sheet__in')).paddingTop
    return `${corner(cs, Infinity)} · binnen ${n(pad)} · hoogstens ${n(cs.maxInlineSize)} breed`
  },
}
// Alles met data-spec wordt gemeten: het element zelf, of wat data-sel erin aanwijst.
function measureAll(root) {
  const specs = {}
  for (const host of root.querySelectorAll('[data-spec]')) {
    const el = host.dataset.sel ? host.querySelector(host.dataset.sel) : host
    if (!el) continue
    specs[host.dataset.spec] = MEASURE[host.dataset.kind || 'type'](el, getComputedStyle(el), el.getBoundingClientRect())
  }
  const disabled = getComputedStyle(document.documentElement).getPropertyValue('--opacity-disabled').trim()
  specs.disabled = `${Math.round(parseFloat(disabled) * 100)} %`
  return specs
}

const swatchHex = (el) => {
  const c = getComputedStyle(el).backgroundColor
  const m = c.match(/^rgba?\(([^)]+)\)$/) || c.match(/^color\(srgb ([^)]+)\)$/)
  if (!m) return c
  const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number)
  const scale = c.startsWith('color(') ? 255 : 1
  const hex = '#' + parts.slice(0, 3).map((v) => Math.round(v * scale).toString(16).padStart(2, '0')).join('')
  const a = parts[3]
  return a !== undefined && a < 1 ? `${hex} · ${Math.round(a * 100)} %` : hex
}

export default function StyleGuide({ stream }) {
  const { storiesById, sourcesById } = useHoot()
  const root = useRef(null)
  const [specs, setSpecs] = useState({})
  const [hex, setHex] = useState({})
  const [sheet, setSheet] = useState(false)

  // De staten en de twee thema's als stylesheet, zolang dit scherm open is.
  useLayoutEffect(() => {
    const style = document.createElement('style')
    style.dataset.sg = ''
    style.textContent = buildCss()
    document.head.append(style)
    return () => style.remove()
  }, [])

  // Meten: bij openen en telkens als de maat verandert (Tekstgrootte, breedte).
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    let last = ''
    const run = () => {
      const next = measureAll(el)
      const key = JSON.stringify(next)
      if (key !== last) {
        last = key
        setSpecs(next)
      }
      const h = {}
      for (const sw of el.querySelectorAll('[data-hex]')) h[sw.dataset.hex] = swatchHex(sw)
      setHex((old) => (JSON.stringify(old) === JSON.stringify(h) ? old : h))
    }
    run()
    const ro = new ResizeObserver(run)
    ro.observe(el)
    // Tekstgrootte zet een attribuut op <html>; de kolom kan dan even breed blijven.
    const mo = new MutationObserver(run)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-text', 'data-theme', 'data-palette'] })
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [])

  const withStory = stream.find((i) => i.kind === 'article' && i.storyId && i.image)
  const article = stream.find((i) => i.kind === 'article' && i.image && i.summary) || stream.find((i) => i.kind === 'article')
  // Een artikel zonder kop (oude feed, cartoon) mag de sortering niet laten struikelen.
  const longest = [...stream].filter((i) => i.kind === 'article' && i.title).sort((a, b) => (b.title || '').length - (a.title || '').length)[0]
  const bare = stream.find((i) => i.kind === 'article' && !i.image) || (article ? { ...article, id: article.id + '-x', image: null, summary: '' } : null)
  const post = stream.find((i) => i.kind === 'post')
  const source = article ? { ...(sourcesById?.get(article.source) || {}), id: article.source, name: article.sourceName, avatar: article.avatar, avatarContain: article.avatarContain, brandColor: article.brandColor, ok: true, count: 24 } : null
  const online = { online: true, meta: { updatedAt: new Date().toISOString() } }
  // Een maat breekt tussen de delen, niet midden in een deel ("opzij 16", "15/20 700").
  const parts = (text = '') =>
    text.split(' · ').map((t, i) => (
      <Fragment key={i}>
        {i ? ' · ' : ''}
        <span className="sg__part">{t}</span>
      </Fragment>
    ))
  const spec = (key) => <p className="sg__spec">{specs[key] ? parts(specs[key]) : ' '}</p>
  const sheetBody = (
    <>
      <p className="hint">Een blad: van onder op de telefoon, vanaf 720 een kaart in het midden. De kop is een label en een titel, met de X op de kolomlijn.</p>
      <div className="sheet__foot">
        <button type="button" className="btn" onClick={() => setSheet(false)}>
          Klaar
        </button>
      </div>
    </>
  )

  return (
    <section className="view view--page" aria-label="Designsysteem">
      <div className="col col--read sg" ref={root}>
        <ViewHeader title="Designsysteem" sub="Hoot: vormen, kleur en type, met echte onderdelen. Elke maat hier is gemeten." showSearch={false} />

        <h2 className="label label--section sect">Principes</h2>
        <ul className="sg__list">
          <li>Het verhaal is de eenheid; de bron blijft altijd zichtbaar en aanklikbaar.</li>
          <li>Lijnen tussen rijen en witruimte, geen omlijnde blokken. Er is één tweede vlak: de kaart, voor wat echt los staat.</li>
          <li>Serif is voor koppen en de Lezer; schreefloos voor al het andere.</li>
          <li>Een kop is minstens één stap groter dan wat eronder staat, of hij heeft een andere rol: een label tegenover een kop.</li>
          <li>Rood is voor de rubriek, wat actief is, wat gekozen is, een link in lopende tekst en het merk; en bewust voor ‘Vergelijk N bronnen’. Acties zijn inkt.</li>
          <li>Focus is altijd inkt: een ring van 2 px, 2 px buiten de vorm van het element zelf.</li>
          <li>Elk aanraakdoel is minimaal 44 × 44 px; openen, bron bekijken en bewaren zijn aparte doelen.</li>
          <li>Niets beweegt terwijl je leest. Nieuwe berichten wachten achter een knop.</li>
        </ul>

        <h2 className="label label--section sect">Kleur</h2>
        <p className="hint sg__intro">Dezelfde namen in licht en donker; een rol verwijst naar een basiskleur. De stalen tonen Kleur: Papier, de standaard.</p>
        <div className="sg__colors">
          <span />
          <span className="sg__tone sg__tone--top sg-licht">
            <span className="label label--meta">Licht</span>
          </span>
          <span className="sg__tone sg__tone--top sg-donker">
            <span className="label label--meta">Donker</span>
          </span>
          {COLORS.map(([v, label], i) => {
            const end = i === COLORS.length - 1 ? ' sg__tone--end' : ''
            return (
              <Fragment key={v}>
                <span className="sg__cname">
                  <code>{v}</code>
                  <span>{label}</span>
                </span>
                {['licht', 'donker'].map((t) => (
                  <span key={t} className={`sg__tone sg__tone--row${end} sg-${t}`}>
                    <span className="sg__chip" style={{ background: `var(${v})` }} data-hex={`${t}${v}`} />
                    <code>{hex[`${t}${v}`] || ''}</code>
                  </span>
                ))}
              </Fragment>
            )
          })}
        </div>

        <h2 className="label label--section sect">Type</h2>
        <p className="hint sg__intro">
          Maat en regelhoogte als paar in rem: alles schaalt mee met Tekstgrootte en ligt bij 100 % op de 4-schaal. Stiller maken kan op drie manieren: <code>--ink-2</code> (uitleg), <code>--ink-3</code> (meta) en <code>--on-brand-red-2</code> (op merkrood).
        </p>
        <div className="rows sg__type">
          {TYPE.map(([c, role, code, sample]) => (
            <div key={c} className="sg__typerow">
              <p className={c} data-spec={`type-${c}`}>
                {sample}
              </p>
              <p className="sg__spec">
                {role} · <code>{code}</code> · {parts(specs[`type-${c}`] || '')}
              </p>
            </div>
          ))}
        </div>

        <h2 className="label label--section sect">Maat en vorm</h2>
        <ul className="sg__list">
          <li>
            <strong>Afstand</strong>: 4 · 8 · 12 · 16 · 24 · 32 · 48 px (<code>--s1</code> t/m <code>--s7</code>). Elke marge, padding en gap komt hiervandaan; niets daartussen.
          </li>
          <li>
            <strong>Vorm</strong>, op rol: bediening 8 (icoonknop, veld, de hoverlaag van een tekstknop) · kaart 12 (kaart, beeld, einde van de Editie) · blad 16 (dialogen en bladen) · pil (knoppen, pillen, segmenten, schakelaar, melding) · rond (avatars, logo’s, stippen).
          </li>
          <li>
            <strong>Bediening</strong>: 36 (altijd met een raakvlak van 44) · 44 · 52 hoog. Iconen 22; in een pil, rij of uitklapper 16.
          </li>
          <li>
            <strong>Rijen</strong>: minstens 44, 56 of 64 hoog, nooit vast, zodat ze meegroeien met grote tekst. De lijn staat tússen de rijen; het omhulsel bepaalt de buitenlijnen.
          </li>
          <li>
            <strong>Beweging</strong>: 140 · 200 · 400 ms (<code>--dur-1</code> t/m <code>--dur-3</code>). Directe reactie · iets dat in beeld komt · iets dat van plek wisselt (de bronnenstapel en de rode streep in de Stroom, met <code>--ease-glide</code>). Bij Minder beweging staat alles direct goed. Merkbeweging (de iris in Welkom, 700 ms) loopt via <code>lib/motion.js</code> en wordt dan een fade van 350 ms.
          </li>
          <li>
            <strong>Uitlijning</strong>: één linkerlijn per scherm; de kop van een scherm is één rij van 44 px (titel, gereedschap, knoppen) met daaronder hooguit één metaregel.
          </li>
        </ul>

        <h2 className="label label--section sect">Vorm 1: hoofdverhaal</h2>
        <div className="list rows">{article ? <LeadStory item={withStory || article} story={withStory ? storiesById.get(withStory.storyId) : null} note="1 van 10" /> : null}</div>

        <h2 className="label label--section sect">Vorm 2: compact bericht</h2>
        <div className="list rows">
          {article ? <CompactItem item={article} /> : null}
          {longest ? <CompactItem item={longest} note="Langste kop in de feed" /> : null}
          {bare ? <CompactItem item={bare} note="Zonder beeld" /> : null}
        </div>

        <h2 className="label label--section sect">Vorm 3: sociale bijdrage</h2>
        <div className="list rows">{post ? <SocialItem item={post} /> : <p className="hint">Geen sociale bijdrage geladen.</p>}</div>

        <h2 className="label label--section sect">Bediening</h2>
        <p className="hint sg__intro">
          Elk onderdeel in zeven staten. Hover, focus en ingedrukt zijn de regels uit de code, hier vastgezet; een streep betekent dat het onderdeel die staat niet kent. Hover is een laag van 8 % in de tekstkleur, ingedrukt 14 %, uitgeschakeld {specs.disabled || ''} dekking. Op een smal scherm schuift de tabel opzij.
        </p>
        <div className="sg__scroll">
          <table className="sg__matrix">
            <thead>
              <tr>
                <th scope="col">
                  <span className="visually-hidden">Onderdeel</span>
                </th>
                {STATES.map(([s, label]) => (
                  <th key={s} scope="col" className="label label--meta">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CONTROLS.map((c) => (
                <tr key={c.name}>
                  <th scope="row">
                    <span className="sg__name">{c.name}</span>
                    <code>{c.code}</code>
                    {c.note ? <span className="sg__note"> · {c.note}</span> : null}
                    {spec(c.name)}
                  </th>
                  {STATES.map(([s]) => (
                    <td key={s} className="sg__cell">
                      {c.states.includes(s) ? (
                        <div className="sg__specimen" inert="" {...(s === 'rust' ? { 'data-spec': c.name, 'data-kind': c.spec, 'data-sel': c.sel } : {})}>
                          {c.render(s)}
                        </div>
                      ) : (
                        <span className="sg__none" aria-label="Kent deze staat niet">
                          –
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="label label--section sect">Rijen</h2>
        <div className="sg__block" data-spec="row-44" data-kind="row" data-sel=".following__row">
          <button type="button" className="following__row">
            <span className="head-4 following__title">Formatie: de eerste gesprekken</span>
            <span className="following__new is-new">2 nieuw</span>
          </button>
          <p className="sg__spec">
            <code>.following__row</code> · {parts(specs['row-44'] || '')}
          </p>
        </div>
        <div className="sg__block" data-spec="row-56" data-kind="row" data-sel=".setrow">
          <div className="rows">
            <div className="setrow">
              <span className="setrow__text">
                <span className="setrow__label">Buiten je bubbel</span>
                <span className="setrow__hint">Af en toe een stuk van buiten je eigen bronnen.</span>
              </span>
              <Switch checked onChange={() => {}} label="Buiten je bubbel" />
            </div>
            <div className="setrow setrow--link" inert="">
              <span className="setrow__text">
                <span className="setrow__label">Bronnen</span>
                <span className="setrow__hint">Aan- en uitzetten.</span>
              </span>
              <span className="caret" aria-hidden="true">
                <CaretIcon size={ICON_SM} />
              </span>
            </div>
          </div>
          <p className="sg__spec">
            <code>.setrow</code> · {parts(specs['row-56'] || '')}
          </p>
        </div>
        {source ? (
          <div className="sg__block" data-spec="row-64" data-kind="row" data-sel=".srow">
            <ul className="srows rows">
              <SourceRow s={source} muted={false} onToggle={() => {}} />
            </ul>
            <p className="sg__spec">
              <code>.srow</code> · {parts(specs['row-64'] || '')}
            </p>
          </div>
        ) : null}
        <p className="hint sg__intro">Een klikbare rij krijgt dezelfde laag als de bediening; de rij vult hem tussen de lijnen.</p>
        <div className="rows sg__block">
          {['rust', 'hover', 'focus', 'druk'].map((s) => (
            <div key={s} className={cls('setrow setrow--link', s)} inert="">
              <span className="setrow__text">
                <span className="setrow__label">{STATES.find(([k]) => k === s)[1]}</span>
                <span className="setrow__hint">
                  <code>.setrow--link</code>
                </span>
              </span>
              <span className="caret" aria-hidden="true">
                <CaretIcon size={ICON_SM} />
              </span>
            </div>
          ))}
        </div>

        <h2 className="label label--section sect">Dialoog</h2>
        <div className="sg__block" data-spec="sheet" data-kind="sheet" data-sel=".dialog">
          <div className="dialog sheet sg__dialog" inert="">
            <div className="sheet__in">
              <DialogHeader label="Weergave" tone="meta" title="Tekst en kleur" onClose={() => {}} />
              {sheetBody}
            </div>
          </div>
          <p className="sg__spec">
            <code>Dialog</code> + <code>DialogHeader</code> · {parts(specs.sheet || '')}
          </p>
        </div>
        <button type="button" className="btn btn--quiet sg__open" onClick={() => setSheet(true)} aria-haspopup="dialog">
          Open als dialoog
        </button>
        <Dialog open={sheet} onClose={() => setSheet(false)} labelledBy="sg-sheet-title">
          <DialogHeader id="sg-sheet-title" label="Weergave" tone="meta" title="Tekst en kleur" onClose={() => setSheet(false)} />
          {sheetBody}
        </Dialog>

        <h2 className="label label--section sect">Lege staat</h2>
        <div className="sg__block" data-spec="empty" data-sel=".empty__title">
          <Empty
            art={SavedArt}
            title="Nog niets bewaard"
            action={
              <button type="button" className="btn">
                Naar de Editie
              </button>
            }
          >
            Tik op de bladwijzer bij een verhaal. Het staat hier tot je het hebt gelezen, ook zonder verbinding.
          </Empty>
          <p className="sg__spec">
            <code>Empty art</code> · de lege bladzijde · titel {parts(specs.empty || '')}
          </p>
        </div>
        <div className="sg__block">
          <LoadError onRetry={() => {}} />
          <p className="sg__spec">
            <code>Empty tone="error"</code> · het label in <code>--warn</code>
          </p>
        </div>

        <h2 className="label label--section sect">Melding</h2>
        <div className="sg__toasts" data-spec="toast" data-kind="toast" data-sel=".toast">
          <div className="toast">
            <span>Verwijderd uit Bewaard</span>
            <button type="button" className="linkbtn">
              Ongedaan maken
            </button>
          </div>
          <div className="toast">
            <span>Nieuwe versie beschikbaar</span>
            <button type="button" className="linkbtn">
              Vernieuwen
            </button>
            <button type="button" className="iconbtn toast__x" aria-label="Melding sluiten">
              <CloseIcon />
            </button>
          </div>
          <div className="toast toast--tip">
            <span>
              Zet Hoot op je beginscherm: kies <strong>Zet op beginscherm</strong>.
            </span>
            <button type="button" className="iconbtn toast__x" aria-label="Tip sluiten">
              <CloseIcon />
            </button>
          </div>
        </div>
        <p className="sg__spec">
          <code>.toast</code> · {parts(specs.toast || '')}
        </p>

        <h2 className="label label--section sect">Status</h2>
        <StatusLine {...online} />
        <StatusLine {...online} allDown onRetry={() => {}} />
        <StatusLine {...online} refreshError onRetry={() => {}} />
        <StatusLine {...online} online={false} />
        <Skeleton rows={2} />
        <div className="listempty">
          <p>Nog niets van NOS in Wereld.</p>
          <button type="button" className="linkbtn linkbtn--plain listempty__btn">
            Toon alle bronnen
          </button>
        </div>
      </div>
    </section>
  )
}
