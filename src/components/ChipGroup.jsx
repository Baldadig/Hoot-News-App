// Een groep pillen met een label erboven (zie "Bediening" in styles.css): label → pillen --s3,
// pil ↔ pil --s2, groep ↔ groep --s6. Het label noemt de groep ook voor een schermlezer.
export function ChipGroup({ label, className = '', listClassName = '', children }) {
  return (
    <div className={`chipgroup${className ? ` ${className}` : ''}`} role="group" aria-label={label}>
      <h3 className="label label--meta chipgroup__label">{label}</h3>
      <div className={`chips${listClassName ? ` ${listClassName}` : ''}`}>{children}</div>
    </div>
  )
}
