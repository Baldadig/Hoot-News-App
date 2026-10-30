// Een groep pillen met een label erboven (zie "Bediening" in styles.css): label → pillen --s3,
// pil ↔ pil --s2, groep ↔ groep --s6. Het label noemt de groep ook voor een schermlezer.
// Optioneel een icoon vóór het label (Welkom: de interesse) en een ander kopniveau, zodat de kop
// past onder de kop van het scherm.
export function ChipGroup({ label, icon = null, level = 3, className = '', labelClassName = '', listClassName = '', children }) {
  const Head = `h${level}`
  return (
    <div className={`chipgroup${className ? ` ${className}` : ''}`} role="group" aria-label={label}>
      <Head className={`label label--meta chipgroup__label${labelClassName ? ` ${labelClassName}` : ''}`}>
        {icon}
        {label}
      </Head>
      <div className={`chips${listClassName ? ` ${listClassName}` : ''}`}>{children}</div>
    </div>
  )
}
