import { UpDownIcon } from './icons.jsx'

// Een rij met een keus, voor Instellingen (src/views/Settings.jsx). Het tussenblad achter de accountknop is weg
// (besluit Alex 17 november: alles in één keer): de knop opent meteen Instellingen, zoals in de app.
// Instellingen A (concepten-2/6-instellingen.html, I4/I5): geen rode segmenten meer, maar een rij
// met de keuze rechts en een menu, zoals op iOS. Het menu is de keuzelijst van het systeem (op iOS
// en macOS met een vinkje): bereikbaar met toetsenbord en schermlezer, en het groeit mee met de tekst.
export function MenuRow({ label, value, options, onChange, icon = null }) {
  const current = options.find((o) => o.value === value) || options[0]
  return (
    <label className="setrow setrow--menu">
      {icon}
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
