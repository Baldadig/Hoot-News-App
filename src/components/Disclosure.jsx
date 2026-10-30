import { CaretIcon, ICON_SM } from './icons.jsx'

// Uitklapper: een gewone <details>, met de caret uit de iconenfamilie aan het eind van de kop in
// plaats van een tekstteken. Open draait de caret een kwartslag (zie "Uitklapper" in styles.css).
// Openen en sluiten blijft van de browser; `open` en de overige attributen gaan ongewijzigd door.
export function Disclosure({ summary, className = '', summaryClassName, children, ...rest }) {
  return (
    <details className={`disclosure ${className}`.trim()} {...rest}>
      <summary className={summaryClassName}>
        {summary}
        <span className="caret" aria-hidden="true">
          <CaretIcon size={ICON_SM} />
        </span>
      </summary>
      {children}
    </details>
  )
}
