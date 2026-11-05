import { useHoot } from './Items.jsx'
import { Dialog, DialogHeader } from './Dialog.jsx'
import { AccountSettings } from './Account.jsx'
import { UpDownIcon } from './icons.jsx'
import { TEXT_SIZES, textSizePref } from '../lib/tekstgrootte.js'

// Weergave: wat je al lezend wisselt. Dezelfde rijen in het blad Jij en op Instellingen.
// Instellingen A (concepten-2/6-instellingen.html, I4/I5): geen rode segmenten meer, maar een rij
// met de keuze rechts en een menu, zoals op iOS. Het menu is de keuzelijst van het systeem (op iOS
// en macOS met een vinkje): bereikbaar met toetsenbord en schermlezer, en het groeit mee met de tekst.
export function MenuRow({ label, value, options, onChange }) {
  const current = options.find((o) => o.value === value) || options[0]
  return (
    <label className="setrow setrow--menu">
      <span className="setrow__label">{label}</span>
      <span className="setrow__value" aria-hidden="true">
        {current.label}
        <UpDownIcon />
      </span>
      <select className="setrow__select" value={String(current.value)} aria-label={label} onChange={(e) => onChange(options.find((o) => String(o.value) === e.target.value).value)}>
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.aria || o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

// Weergave · Thema: dezelfde labels en volgorde als iOS. "Als het donker is" alleen bij Zoals je toestel.
export const THEME_OPTIONS = [
  { value: 'system', label: 'Zoals je toestel' },
  { value: 'light', label: 'Licht' },
  { value: 'dark', label: 'Donker' },
  { value: 'night', label: 'Nacht', aria: 'Nacht, echt zwart' },
]

export function DisplayControls({ stream = true }) {
  const { prefs, setPref, theme, setTheme, themeDark, setThemeDark } = useHoot()
  return (
    <div className="rows">
      <MenuRow label="Weergave" value={theme} onChange={setTheme} options={THEME_OPTIONS} />
      {theme === 'system' ? <MenuRow label="Als het donker is" value={themeDark} onChange={setThemeDark} options={[{ value: 'dark', label: 'Donker' }, { value: 'night', label: 'Nacht', aria: 'Nacht, echt zwart' }]} /> : null}
      <MenuRow
        label="Kleur"
        value={prefs.palette}
        onChange={(v) => setPref('palette', v)}
        options={[
          { value: 'papier', label: 'Papier' },
          { value: 'blad', label: 'Blad' },
          { value: 'inkt', label: 'Inkt' },
        ]}
      />
      {/* Tekstgrootte: vijf standen bovenop het systeem, zoals in Instellingen (lib/tekstgrootte.js). */}
      <MenuRow label="Tekstgrootte" value={textSizePref(prefs.textSize)} onChange={(v) => setPref('textSize', v)} options={TEXT_SIZES.map(({ value, label }) => ({ value, label }))} />
      <MenuRow
        label="Beeld"
        value={prefs.images}
        onChange={(v) => setPref('images', v)}
        options={[
          { value: 'aan', label: 'Aan' },
          { value: 'hoofd', label: 'Alleen hoofdverhaal' },
          { value: 'uit', label: 'Uit' },
        ]}
      />
      <MenuRow
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
      {/* Zelfde naam en twee vormen als in de app (SettingsView); de pref blijft 'layout'. */}
      {stream ? <StreamLayoutRow /> : null}
    </div>
  )
}

export function StreamLayoutRow() {
  const { prefs, setPref } = useHoot()
  return (
    <MenuRow
      label="Lees de Stroom als"
      value={prefs.layout}
      onChange={(v) => setPref('layout', v)}
      options={[
        { value: 'tijdlijn', label: 'Tijdlijn', aria: 'Tijdlijn: groot beeld' },
        { value: 'krant', label: 'Krant', aria: 'Krant: klein beeld ernaast' },
      ]}
    />
  )
}

// Het blad achter de account-knop rechtsboven: wie je bent (inloggen) en hoe Hoot eruitziet.
// Een Dialog: focus blijft binnen, Esc sluit.
export function DisplaySheet({ open, onClose, account, syncStatus }) {
  return (
    <Dialog open={open} onClose={onClose} className="sheet--display" labelledBy="display-title">
      <DialogHeader id="display-title" title="Jij" onClose={onClose} />
      {account ? <AccountSettings account={account} syncStatus={syncStatus} /> : null}
      <h3 className="sect sect--plain sheet__label">Lezen</h3>
      <DisplayControls />
      <p className="sheet__note">
        <a className="linkbtn" href="#/instellingen" onClick={onClose}>
          Alle instellingen
        </a>
      </p>
    </Dialog>
  )
}
