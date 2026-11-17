import { useMemo } from 'react'
import { ViewHeader } from '../components/Shell.jsx'
import { MenuRow } from '../components/Display.jsx'
import { KEUZES } from '../../shared/luister-weergave.mjs'
import { useHoot } from '../components/Items.jsx'
import { Switch } from './Sources.jsx'
import { AccountSettings, Avatar, accountName } from '../components/Account.jsx'
import { PLACES, NO_WEATHER } from '../lib/weather.js'
import { vakByDomain } from '../../shared/vak.mjs'
import { telGekozen } from '../lib/tel.js'
import { offeredFields, pickDomains, canChoose, VAK_MAX_TEKST, ENGELS, englishOn, followsEnglish } from '../lib/selection-index.js'
import { topicById } from '../lib/topics.js'
import { CaretIcon, ICON_SM } from '../components/icons.jsx'
import { supplyOf, profileOf, profileSummary } from '../../shared/editor.mjs'
import { hootSummary } from '../lib/settings-summary.js'
import { TEXT_SIZES, textSizeIndex, textSizeOf } from '../lib/tekstgrootte.js'
import { pendingShown, PENDING_TEXT } from '../lib/membership.js'
import { useOnline } from '../hooks/useOnline.js'
import { SETTINGS_ICONEN, WEB_ICONEN, SYMBOLEN, WEERGAVE_TEGELS } from '../lib/settings-tegels.js'

// Instellingen, indeling van 17 november (Hoot-design/ontwerp/instellingen-2026-11-17/concept.html), op de basis
// van Instellingen D (Hoot-design/woensdag-2026-11-04/instellingen-concept/D-richtlijnen.html), gelijk aan de app
// (SettingsView.swift, SettingsPages.swift):
// - de accountkaart, Jouw Hoot (Interesses, Editie, Stroom, Selectie), Bronnen (Bronnen, Podcasts), Weergave (vier
//   tegels, Als het donker is bij Systeem, Kleur) en Lezen (Tekst en beeld); los daaronder Op dit toestel en Over Hoot.
//   App-icoon, Abonnementen en Artikelen bestaan alleen in de app;
// - elke rij een gekleurd tegeltje met een wit symbool, zoals de app (src/lib/settings-tegels.js);
// - wat je soms aanpast staat op het hoofdblad, in groepen met een korte kop;
// - wat je één keer instelt zit één tik dieper (een blad: #/instellingen?blad=…), nergens dieper;
// - Editie, Stroom en Selectie zijn drie gelijke rijen in Jouw Hoot;
// - een schakelaar voor aan en uit, een menu met de waarde voor een keus, een caret alleen als er
//   een blad achter zit; uitleg alleen als voetregel op een blad dieper;
// - wissen en verwijderen onderaan hun blad, in rood, en eerst een bevestiging.
export const BLADEN = {
  account: 'Account',
  editie: 'Editie',
  stroom: 'Stroom',
  selectie: 'Selectie',
  beeld: 'Tekst en beeld',
  over: 'Over Hoot',
}
// Oude bladen die opgingen in een ander (bladwijzers blijven werken): Tekstgrootte zit in Tekst en beeld.
export const BLAD_ALIAS = { tekstgrootte: 'beeld' }

// Het tegeltje voor een rij: de kleur uit de huisstijl, het symbool wit (aria-hidden: het label zegt het).
export function Tegel({ name }) {
  const [kleur, symbool] = SETTINGS_ICONEN[name] || WEB_ICONEN[name]
  return (
    <span className={`tegel tegel--${kleur}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: SYMBOLEN[symbool] }} />
    </span>
  )
}

function Row({ label, hint, children }) {
  return (
    <div className="setrow">
      <div className="setrow__text">
        <span className="setrow__label">{label}</span>
        {hint ? <span className="setrow__hint">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

// Een rij naar een blad of scherm: het tegeltje, het label, de waarde rechts (past het niet, dan eronder), de caret.
function LinkRow({ href, onClick, label, value, icon }) {
  const inner = (
    <>
      {icon ? <Tegel name={icon} /> : null}
      <span className="setrow__label">{label}</span>
      {value != null && value !== '' ? <span className="setrow__value dset__val">{value}</span> : <span className="dset__val" />}
      <span className="caret" aria-hidden="true">
        <CaretIcon size={ICON_SM} />
      </span>
    </>
  )
  return href ? (
    <a className="setrow setrow--link setrow--menu" href={href}>
      {inner}
    </a>
  ) : (
    <button type="button" className="setrow setrow--link setrow--menu setrow--action" onClick={onClick}>
      {inner}
    </button>
  )
}

const plural = (n, one, many) => (n === 1 ? `1 ${one}` : `${n} ${many}`)

export default function Settings({ meta, account, syncStatus, affinity = null, onForgetTopic, onBack, backLabel, blad = null, onOpen, digest = null }) {
  const { prefs, setPref, theme, setTheme, themeDark, setThemeDark, sourcesById, muted, luisterAan, podcastKeuze, setPodcastKeuze } = useHoot()
  const followed = [...(sourcesById?.values() || [])].filter((s) => s.kind !== 'sociaal' && !muted?.has(s.id)).length
  const summary = hootSummary({ interests: (prefs.interests || []).length, sources: followed })
  const open = (b) => onOpen?.(b)
  const page = BLADEN[BLAD_ALIAS[blad] || blad] ? BLAD_ALIAS[blad] || blad : null
  const title = page ? BLADEN[page] : 'Instellingen'

  return (
    <section className="view view--page" aria-label={title}>
      <div className="col col--form dset">
        <ViewHeader title={title} showSearch={false} account={false} onBack={onBack} backLabel={backLabel} backInNav />
        {page === 'account' ? <AccountSettings account={account} syncStatus={syncStatus} summary={summary} manage /> : null}
        {page === 'editie' ? <EditieBlad meta={meta} account={account} affinity={affinity} onForget={onForgetTopic} /> : null}
        {page === 'stroom' ? <StroomBlad /> : null}
        {page === 'selectie' ? <SelectieBlad digest={digest} /> : null}
        {page === 'beeld' ? <TekstEnBeeldBlad /> : null}
        {page === 'over' ? <OverBlad /> : null}
        {page ? null : (
          <>
            <AccountCard account={account} syncStatus={syncStatus} onOpen={() => open('account')} />

            <h2 className="sect sect--plain">Jouw Hoot</h2>
            <div className="rows dset__rows">
              <LinkRow href="#/welkom" icon="interesses" label="Interesses" value={(prefs.interests || []).length ? String(prefs.interests.length) : 'Alle'} />
              <LinkRow onClick={() => open('editie')} icon="editie" label="Editie" value={prefs.bubble ? 'Met buiten je bubbel' : ''} />
              <LinkRow onClick={() => open('stroom')} icon="stroom" label="Stroom" value={(prefs.layout === 'krant' ? 'Krant' : 'Tijdlijn') + (prefs.bluesky ? ' · Bluesky' : '')} />
              <LinkRow onClick={() => open('selectie')} icon="selectie" label="Selectie" value={plural(offeredFields(prefs.vak, digest).length, 'onderwerp', 'onderwerpen')} />
            </div>

            <h2 className="sect sect--plain">Bronnen</h2>
            <div className="rows dset__rows">
              <LinkRow href="#/bronnen" icon="bronnen" label="Bronnen" value={String(followed)} />
              {/* Luister verder (alleen met de schakelaar, src/lib/luister.js): welke podcastapp, in deze browser. Nog niets
                  gekozen: leeg, en de eerste tik op Luister verder vraagt het. */}
              {luisterAan ? <MenuRow icon={<Tegel name="podcasts" />} label="Podcasts" value={podcastKeuze} onChange={setPodcastKeuze} options={[...(podcastKeuze ? [] : [{ value: '', label: '', aria: 'Nog niet gekozen' }]), ...KEUZES.map((k) => ({ value: k.id, label: k.naam }))]} /> : null}
            </div>

            <h2 className="sect sect--plain">Weergave</h2>
            <div className="rows dset__rows">
              <WeergaveTegels theme={theme} setTheme={setTheme} />
              {theme === 'system' ? <DonkerKeuze value={themeDark} onChange={setThemeDark} /> : null}
              <MenuRow
                icon={<Tegel name="kleur" />}
                label="Kleur"
                value={prefs.palette}
                onChange={(v) => setPref('palette', v)}
                options={[
                  { value: 'papier', label: 'Papier' },
                  { value: 'blad', label: 'Blad' },
                  { value: 'inkt', label: 'Inkt' },
                ]}
              />
            </div>

            <h2 className="sect sect--plain">Lezen</h2>
            <div className="rows dset__rows">
              <LinkRow onClick={() => open('beeld')} icon="tekstEnBeeld" label="Tekst en beeld" value={textSizeOf(prefs.textSize).label} />
            </div>

            <div className="rows dset__rows dset__group dset__los">
              <LinkRow href="#/toestel" icon="toestel" label="Op dit toestel" />
              <LinkRow onClick={() => open('over')} icon="over" label="Over Hoot" value={__APP_VERSION__} />
            </div>
          </>
        )}
      </div>
    </section>
  )
}

// De accountkaart bovenaan: je foto of monogram, wie je bent en hoe het met je account staat.
function AccountCard({ account, syncStatus, onOpen }) {
  const pending = pendingShown(account, useOnline())
  const user = account?.status === 'in' ? account.user : null
  const SYNC = { pending: 'Wacht op verbinding', syncing: 'Synchroniseren…', error: 'Synchroniseren lukte niet; straks opnieuw' }
  const status =
    account?.status === 'loading' ? 'Even geduld…' : !user ? 'Hoot op al je toestellen.' : pending ? PENDING_TEXT : SYNC[syncStatus] || (account.pulled ? 'Gesynchroniseerd' : 'Ingelogd')
  return (
    <div className="rows dset__card">
      <button type="button" className="setrow setrow--link setrow--action" onClick={onOpen}>
        <Avatar user={user} size={48} />
        <span className="setrow__text dset__grow">
          <span className="acard__name">{user ? accountName(user) || user.email : 'Account'}</span>
          <span className="setrow__hint">{status}</span>
        </span>
        <span className="caret" aria-hidden="true">
          <CaretIcon size={ICON_SM} />
        </span>
      </button>
    </div>
  )
}

// Editie: Buiten je bubbel, De Editie in één minuut en Weer (web), en Wat Hoot leerde.
function EditieBlad({ meta, account, affinity, onForget }) {
  const { prefs, setPref } = useHoot()
  const ai = !!meta?.aiEnabled
  const member = account?.status === 'in'
  return (
    <>
      <div className="rows dset__group">
        <Row label="Buiten je bubbel">
          <Switch checked={prefs.bubble} onChange={(v) => setPref('bubble', v)} label="Buiten je bubbel" />
        </Row>
      </div>
      <div className="rows dset__group">
        <Row label="De Editie in één minuut" hint={!ai ? 'Nog niet beschikbaar' : member ? null : 'Met een account'}>
          <Switch checked={prefs.brief} onChange={(v) => setPref('brief', v)} label="De Editie in één minuut" />
        </Row>
        <MenuRow label="Weer" value={prefs.weatherPlace} onChange={(v) => setPref('weatherPlace', v)} options={[...PLACES.map((p) => ({ value: p.id, label: p.name })), { value: NO_WEATHER, label: 'Geen weer' }]} />
      </div>
      <Learned affinity={affinity} onForget={onForget} />
    </>
  )
}

// Stroom: hoe je hem leest, en Bluesky erin. De accounts beheer je bij Bronnen.
function StroomBlad() {
  const { prefs, setPref } = useHoot()
  const n = (prefs.bskyInStream || []).length
  return (
    <>
      <div className="rows dset__group">
        <MenuRow
          label="Lees de Stroom als"
          value={prefs.layout}
          onChange={(v) => setPref('layout', v)}
          options={[
            { value: 'tijdlijn', label: 'Tijdlijn', aria: 'Tijdlijn: groot beeld' },
            { value: 'krant', label: 'Krant', aria: 'Krant: klein beeld ernaast' },
          ]}
        />
      </div>
      <h2 className="sect sect--plain">Bluesky</h2>
      <div className="rows">
        <Row label="Bluesky in de Stroom">
          <Switch checked={prefs.bluesky} onChange={(v) => setPref('bluesky', v)} label="Bluesky in de Stroom" />
        </Row>
        {prefs.bluesky ? <LinkRow href="#/bronnen" label="Bluesky-accounts" value={n ? String(n) : ''} /> : null}
      </div>
    </>
  )
}

// Selectie: de onderwerpen per domein, zoals in de app (DigestFieldsList). Bovenaan de taal: "Ook Engelstalige stukken"
// (besluit 15 november; zonder eigen keuze aan als je een Engelse bron volgt). Alles in één keer kiezen kan niet meer: je kiest er
// hooguit acht (VAK_MAX); wie al meer volgt houdt ze, maar kiest er geen bij. Een onderwerp dat nog niet in de weekbundel
// zit, staat er niet tot de bundel het heeft (offersField, "Tot dan verbergen."); een onderwerp uit de keuze (inKeuze)
// alleen voor wie het al volgt.
function SelectieBlad({ digest = null }) {
  const { prefs, setPref, sourcesById, muted } = useHoot()
  const chosen = prefs.vak
  const order = vakByDomain().flatMap((d) => d.fields.map((f) => f.id))
  const counted = offeredFields(chosen, digest)
  const english = englishOn(prefs.vakEngels, followsEnglish([...(sourcesById?.values?.() || [])], muted))
  // Elk nieuw gekozen onderwerp telt als totaal (telGekozen; uit tot de privacyzin er is).
  const toggle = (id, on) => {
    const next = on ? order.filter((f) => f === id || chosen.includes(f)) : chosen.filter((f) => f !== id)
    telGekozen(chosen, next)
    setPref('vak', next)
  }
  return (
    <>
      <div className="rows dset__group">
        <Row label={ENGELS}>
          <Switch checked={english} onChange={(v) => setPref('vakEngels', v)} label={ENGELS} />
        </Row>
      </div>
      {pickDomains(vakByDomain(), digest, chosen).map((d) => (
        <div key={d.id}>
          <h2 className="sect sect--plain">{d.label}</h2>
          <div className="rows">
            {d.fields.map((f) => (
              <Row key={f.id} label={f.label}>
                <Switch checked={chosen.includes(f.id)} disabled={!canChoose(counted, f.id)} onChange={(v) => toggle(f.id, v)} label={f.label} />
              </Row>
            ))}
          </div>
        </div>
      ))}
      <p className="hint setfoot">Elke maandag drie stukken per onderwerp. {VAK_MAX_TEKST}</p>
    </>
  )
}

// Weergave: vier tegels met een klein scherm en een icoon (Licht, Donker, Nacht, Systeem), zoals de app
// (WeergaveKeuze in SettingsTegels.swift). Een radiogroep: pijltjes kiezen, Tab gaat verder.
function WeergaveTegels({ theme, setTheme }) {
  const kies = (i) => setTheme(WEERGAVE_TEGELS[(i + WEERGAVE_TEGELS.length) % WEERGAVE_TEGELS.length].value)
  const onKey = (e, i) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!d) return
    e.preventDefault()
    kies(i + d)
    e.currentTarget.parentElement?.children[(i + d + WEERGAVE_TEGELS.length) % WEERGAVE_TEGELS.length]?.focus()
  }
  return (
    <div className="looks" role="radiogroup" aria-label="Weergave">
      {WEERGAVE_TEGELS.map((t, i) => {
        const on = theme === t.value
        return (
          <button key={t.value} type="button" className="look" role="radio" aria-checked={on} aria-label={t.aria || t.label} tabIndex={on ? 0 : -1} onClick={() => setTheme(t.value)} onKeyDown={(e) => onKey(e, i)}>
            <span className={`mini mini--${t.value}`} aria-hidden="true">
              <span className="mini__k" />
              <span className="mini__k mini__k--kort" />
              <span className="mini__img" />
              <span className="mini__k mini__k--zacht" />
              <span className="mini__k mini__k--zacht mini__k--kort" />
              <span className="mini__badge">
                <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: SYMBOLEN[t.symbol] }} />
              </span>
            </span>
            <span className="look__label" aria-hidden="true">
              {t.label}
            </span>
            <span className="look__radio" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}

// Als het donker is (alleen bij Systeem): Donker of Nacht, als segment zoals in de app.
function DonkerKeuze({ value, onChange }) {
  const opts = [
    { value: 'dark', label: 'Donker' },
    { value: 'night', label: 'Nacht', aria: 'Nacht, echt zwart' },
  ]
  return (
    <div className="setrow dset__sub">
      <span className="setrow__label" id="als-donker">
        Als het donker is
      </span>
      <span className="dset__seg" role="radiogroup" aria-labelledby="als-donker">
        {opts.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={value === o.value} aria-label={o.aria || o.label} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </span>
    </div>
  )
}

// Een keuze als lijst met een vinkje (zoals een inline-keuze in de app), één rij per optie.
function KeuzeLijst({ label, value, options, onChange }) {
  return (
    <>
      <h2 className="sect sect--plain">{label}</h2>
      <div className="rows" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" className="setrow setrow--action dset__opt" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}>
            <span className="setrow__label">{o.label}</span>
            <span className="dset__ck" aria-hidden="true">
              ✓
            </span>
          </button>
        ))}
      </div>
    </>
  )
}

// Een Stroom-bericht als voorbeeld: groeit mee met de Tekstgrootte (het is gewone tekst op de rem-schaal), met
// het echte placeholderbeeld (knipsel, beeld 4: Iris) in de weergave van nu, zoals in de app (StroomVoorbeeld).
const VOORBEELD = {
  kop: 'Zeegras keert terug in de Waddenzee',
  intro: 'Bij Texel en Ameland zet Rijkswaterstaat dit voorjaar nieuwe velden uit. Zeegras houdt slib vast en geeft jonge vis een plek om te schuilen.',
  beeld: 4,
}
function Voorbeeld() {
  const { prefs } = useHoot()
  const lines = prefs.preview === 'alles' ? null : prefs.preview
  return (
    <>
      <h2 className="sect sect--plain">Voorbeeld</h2>
      <div className="rows dset__card">
        <div className="dset__pv" role="img" aria-label="Voorbeeld van een Stroom-bericht">
          {prefs.images !== 'uit' ? <div className={`dset__img ph ph--${VOORBEELD.beeld}`} data-ph={VOORBEELD.beeld} aria-hidden="true" /> : null}
          <p className="dset__meta">NOS · vanochtend</p>
          <p className="dset__kop" lang="nl">
            {VOORBEELD.kop}
          </p>
          <p className="dset__intro" style={lines ? { WebkitLineClamp: lines } : { display: 'block' }}>
            {VOORBEELD.intro}
          </p>
        </div>
      </div>
    </>
  )
}

// Tekst en beeld (17 november): Tekstgrootte, Beeld en Intro op één blad. Bovenaan het voorbeeld dat meteen
// meeverandert, dan de schuif (vijf standen, klein links en groot rechts), dan de keuzes.
function TekstEnBeeldBlad() {
  const { prefs, setPref } = useHoot()
  const i = textSizeIndex(prefs.textSize)
  return (
    <>
      <Voorbeeld />
      <div className="rows dset__group">
        <div className="dset__slider">
          <div className="setrow">
            <span className="setrow__label" id="tekstgrootte-label">
              Tekstgrootte
            </span>
            <span className="setrow__value">{TEXT_SIZES[i].label}</span>
          </div>
          <div className="dset__track">
            <span className="dset__a dset__a--s" aria-hidden="true">
              A
            </span>
            <input
              type="range"
              min="0"
              max={TEXT_SIZES.length - 1}
              step="1"
              value={i}
              list="tekstgrootte-standen"
              aria-labelledby="tekstgrootte-label"
              aria-valuetext={TEXT_SIZES[i].label}
              onChange={(e) => setPref('textSize', TEXT_SIZES[Number(e.target.value)].value)}
            />
            <datalist id="tekstgrootte-standen">
              {TEXT_SIZES.map((s, n) => (
                <option key={s.value} value={n} label={s.label} />
              ))}
            </datalist>
            <span className="dset__a dset__a--l" aria-hidden="true">
              A
            </span>
          </div>
        </div>
      </div>
      <KeuzeLijst
        label="Beeld"
        value={prefs.images}
        onChange={(v) => setPref('images', v)}
        options={[
          { value: 'aan', label: 'Bij elk verhaal' },
          { value: 'hoofd', label: 'Alleen bij het hoofdverhaal' },
          { value: 'uit', label: 'Geen beeld' },
        ]}
      />
      <KeuzeLijst
        label="Intro"
        value={prefs.preview}
        onChange={(v) => {
          setPref('regels', v) // de keuze (build 46); `preview` voor oudere versies van de app
          setPref('preview', v)
        }}
        options={[
          { value: 1, label: '1 regel' },
          { value: 2, label: '2 regels' },
          { value: 3, label: '3 regels' },
          { value: 'alles', label: 'Hele intro' },
        ]}
      />
    </>
  )
}

function OverBlad() {
  return (
    <>
      <div className="rows dset__group">
        <LinkRow href="#/over" label="Hulp en contact" />
        <LinkRow href="#/privacy" label="Privacy" />
      </div>
      <p className="hint setfoot">
        Hoot {__APP_VERSION__} · gemaakt door <a href="https://baldadig.nl" target="_blank" rel="noopener">Baldadig</a>. Intro’s komen van de bron, niet van AI.
      </p>
    </>
  )
}

// Wat Hoot leerde (bouwspec §8): hetzelfde profiel als De Redacteur gebruikt voor jouw Editie, in vier
// lijsten. Gekozen: je interesses (aan te passen via Interesses). Meer hiervan: waar je 'meer hiervan'
// bij zei, elk met de weg terug. Geleerd: wat je vaker opent of bewaart dan je bronnen erover schrijven
// (blijft op dit toestel); elk onderwerp met 'Vergeet dit'. Minder: waar je 'minder hiervan' bij zei,
// met de weg terug. Gewone taal, geen getallen. Wat je hier
// verandert telt pas bij de volgende Editie: die van dit dagdeel staat al en blijft staan.
function Learned({ affinity, onForget }) {
  const { prefs, setPref, itemsById, sourcesById, muted } = useHoot()
  const summary = useMemo(() => {
    const sources = [...sourcesById.values()]
    const followed = new Set(sources.filter((s) => s.kind !== 'sociaal' && !muted.has(s.id)).map((s) => s.id))
    const pool = [...itemsById.values()].filter((i) => i.kind === 'article' && followed.has(i.source))
    return profileSummary(profileOf({ interests: prefs.interests, topics: prefs.topics, affinity, taste: prefs.taste, favorites: prefs.favorites, followed, sources, supply: supplyOf(pool) }), prefs.taste)
  }, [prefs.interests, prefs.topics, prefs.taste, prefs.favorites, affinity, itemsById, sourcesById, muted])
  const name = (id) => topicById(id)?.label || id
  // 'Meer hiervan' of 'Minder' terugdraaien: het onderwerp weer op nul, zoals de spec zegt.
  const restore = (t) => setPref('taste', { ...prefs.taste, topics: { ...(prefs.taste?.topics || {}), [t]: 0 } })
  const raw = (t) => prefs.taste?.topics?.[t] ?? 0
  const less = [...summary.less].sort((a, b) => raw(a) - raw(b))
  const nothingLearned = !summary.more.length && !summary.learned.length && !summary.less.length
  return (
    <>
      <h2 className="sect sect--plain">Wat Hoot leerde</h2>
      <div className="rows">
        {summary.chosen.length ? <Row label="Gekozen" hint={summary.chosen.map(name).join(', ')} /> : null}
        {nothingLearned ? <Row label="Nog niets geleerd" /> : null}
      </div>
      {summary.more.length ? (
        <>
          <p className="learned__sub">Meer hiervan</p>
          <div className="rows">
            {summary.more.map((t) => (
              <Row key={t} label={name(t)}>
                <button type="button" className="btn btn--quiet" onClick={() => restore(t)}>
                  Ongedaan maken
                </button>
              </Row>
            ))}
          </div>
        </>
      ) : null}
      {summary.learned.length ? (
        <>
          <p className="learned__sub">Vaak gelezen</p>
          <div className="rows">
            {summary.learned.map((t) => (
              <Row key={t} label={name(t)}>
                <button type="button" className="btn btn--quiet" onClick={() => onForget?.(t)}>
                  Vergeet dit
                </button>
              </Row>
            ))}
          </div>
        </>
      ) : null}
      {less.length ? (
        <>
          <p className="learned__sub">Minder</p>
          <div className="rows">
            {less.map((t) => (
              <Row key={t} label={name(t)}>
                <button type="button" className="btn btn--quiet" onClick={() => restore(t)}>
                  Ongedaan maken
                </button>
              </Row>
            ))}
          </div>
        </>
      ) : null}
      <p className="hint setfoot">Meer of minder van iets? Kies ⋯ bij een verhaal.</p>
    </>
  )
}
