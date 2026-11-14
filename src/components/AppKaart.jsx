// De weg naar de app na de Editie (onboarding blok 2, 14 november): één kaart onder de rode eindkaart, alleen
// op iPhone en iPad in de browser (src/lib/install.js, shouldShowAppCard). Zelfde plek en rust als de
// seintje-vraag in de app (AlertOffer in ios/Hoot/Views/EditionView.swift): een kaart in de lijst, nooit
// eroverheen. Een gewone link naar de App Store (shared/appstore.mjs), zonder target: zo opent hij ook in de
// browser van Instagram en Facebook. Na een tik of "Niet nu" komt hij niet terug.
import { APP_URL } from '../../shared/appstore.mjs'

export const APP_KAART_TEKST = 'Hoot staat ook in de App Store. Daar krijg je een seintje als je volgende Editie klaarligt.'

export default function AppKaart({ onOpen, onLater }) {
  return (
    <aside className="appkaart" aria-label="Hoot in de App Store">
      <p className="appkaart__tekst">{APP_KAART_TEKST}</p>
      <div className="appkaart__acts">
        <a className="btn" href={APP_URL} onClick={onOpen}>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
          </svg>
          Open in de App Store
        </a>
        <button type="button" className="linkbtn linkbtn--plain appkaart__later" onClick={onLater}>
          Niet nu
        </button>
      </div>
    </aside>
  )
}
