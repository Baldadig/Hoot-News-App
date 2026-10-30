import { useEffect, useRef } from 'react'
import { useHoot } from './Items.jsx'
import { CloseIcon } from './icons.jsx'
import { AccountSettings } from './Account.jsx'

// Weergave: wat je al lezend wisselt. Dezelfde rijen in het paneel (Aa) en op Instellingen.
// `size` geeft een knop een eigen lettermaat: de A's van Tekstgrootte tonen zo zelf de stap.
function Seg({ label, value, options, onChange }) {
  return (
    <div className="drow">
      <span className="drow__label">{label}</span>
      <div className="seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" className={o.size ? `seg__btn seg__btn--${o.size}` : 'seg__btn'} aria-pressed={value === o.value} onClick={() => onChange(o.value)} aria-label={o.aria || undefined}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function DisplayControls() {
  const { prefs, setPref, theme, setTheme } = useHoot()
  return (
    <div className="drows">
      <Seg
        label="Thema"
        value={theme}
        onChange={setTheme}
        options={[
          { value: 'system', label: 'Systeem' },
          { value: 'light', label: 'Licht' },
          { value: 'dark', label: 'Donker' },
        ]}
      />
      <Seg
        label="Kleur"
        value={prefs.palette}
        onChange={(v) => setPref('palette', v)}
        options={[
          { value: 'papier', label: 'Papier', aria: 'Papier: alles op warm papier' },
          { value: 'blad', label: 'Blad', aria: 'Blad: menu op papier, de inhoud op een wit blad' },
          { value: 'inkt', label: 'Inkt', aria: 'Inkt: wit blad met een donkere kop boven de Editie' },
        ]}
      />
      <Seg
        label="Indeling van lijsten"
        value={prefs.layout}
        onChange={(v) => setPref('layout', v)}
        options={[
          { value: 'tijdlijn', label: 'Tijdlijn' },
          { value: 'krant', label: 'Krant' },
        ]}
      />
      <Seg
        label="Tekstgrootte"
        value={prefs.textSize}
        onChange={(v) => setPref('textSize', v)}
        options={[
          { value: 'klein', label: 'A', aria: 'Klein', size: 'klein' },
          { value: 'normaal', label: 'A', aria: 'Normaal' },
          { value: 'groot', label: 'A', aria: 'Groot', size: 'groot' },
        ]}
      />
      <Seg
        label="Voorvertoning in de Stroom"
        value={prefs.preview}
        onChange={(v) => setPref('preview', v)}
        options={[
          { value: 1, label: '1', aria: 'Eén regel' },
          { value: 2, label: '2', aria: 'Twee regels' },
          { value: 3, label: '3', aria: 'Drie regels' },
          { value: 'alles', label: 'Alles' },
        ]}
      />
      <Seg
        label="Beeld"
        value={prefs.images}
        onChange={(v) => setPref('images', v)}
        options={[
          { value: 'aan', label: 'Aan' },
          { value: 'hoofd', label: 'Alleen hoofdverhaal' },
          { value: 'uit', label: 'Uit' },
        ]}
      />
    </div>
  )
}

// Het blad achter de account-knop rechtsboven: wie je bent (inloggen) en hoe Hoot eruitziet.
// Native dialog: focus blijft binnen, Esc sluit.
export function DisplaySheet({ open, onClose, account, syncStatus }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} className="sheet sheet--display" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="display-title">
      <div className="sheet__in">
        <div className="sheet__head">
          <h2 id="display-title" className="sheet__title">
            Jij
          </h2>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Sluiten">
            <CloseIcon />
          </button>
        </div>
        {account ? <AccountSettings account={account} syncStatus={syncStatus} /> : null}
        <h3 className="label label--section sheet__label">Weergave</h3>
        <DisplayControls />
        <p className="sheet__note">
          <a className="linkbtn" href="#/instellingen" onClick={onClose}>
            Alle instellingen
          </a>
        </p>
      </div>
    </dialog>
  )
}
