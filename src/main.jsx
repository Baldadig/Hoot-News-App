import { receiveMove, dropMoveFragment } from './lib/domain-migration.js'
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
// Lettertypes (latin en latin-ext): koppen in Newsreader 800 (statisch, zoals altijd), lopende tekst
// in Newsreader op tekstmaat en bediening in Schibsted Grotesk, beide variabel (src/fonts/).
import '@fontsource/newsreader/latin-800.css'
import '@fontsource/newsreader/latin-ext-800.css'
import './fonts/fonts.css'
// Roboto Medium alleen voor de Google-knop (hun richtlijn); wordt pas geladen als die er staat.
import '@fontsource/roboto/latin-500.css'
import './styles.css'
import './placeholder.css'
import './staten.css'
import './styles/kaart.css'
import './styles/vouw.css'
import './styles/rust.css'
import './styles/inklap.css'
import './styles/welkom-bewijs.css'
import './styles/bluesky.css'
import './styles/stroom-einde.css'
import './styles/maak-van-jou.css'
import './styles/selectie-voorproef.css'
import './styles/kanten-tip.css'
import './styles/vergelijken.css'
import './styles/popmenu.css'
import './styles/zon-voortgang.css'
import './styles/dagdeel-wissel.css'
import './styles/minder-beweging.css'
import { registerUpdates } from './lib/swUpdate.js'
import { dropInvite, captureGoogleReturn } from './lib/account.js'
import { loadFeedCache } from './lib/feedCache.js'
import { migrate } from './lib/migrate.js'
import { startKopAfbreken } from './lib/kop-afbreken.js'

async function start() {
  // Verhuizing van hootnews.nl: lukt dat niet (geen verwijzer, oude browser zonder
  // DecompressionStream, te groot), dan start Hoot gewoon zonder de meegebrachte gegevens.
  try {
    await receiveMove()
  } catch (error) {
    console.warn('Verhuizing overgeslagen', error)
    try { dropMoveFragment() } catch { /* geen geschiedenis: niets weg te halen */ }
  }
// Oude uitnodigingslink (?uitnodiging=…): stil uit de adresbalk. Terugkomst van Google
// (#id_token=…): onthouden en uit de adresbalk halen, vóór de app die als route leest.
dropInvite()
captureGoogleReturn()

// Koppen: alleen afbreken (met streepje) als een woord niet op een regel past (lib/kop-afbreken.js).
startKopAfbreken()

// Opslag van oudere versies omzetten (één keer, zie src/lib/migrate.js).
try {
  migrate(localStorage)
} catch {
  /* geen opslag: niets om te migreren */
}

// Gaat er bij het tekenen iets mis (bijv. een bericht in een vorm die we niet verwachtten), dan
// een nette melding met een knop in plaats van een leeg wit scherm.
class Fallback extends React.Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    console.error(error)
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="empty" role="alert">
        <h1 className="empty__title">Er ging iets mis</h1>
        <p className="empty__text">Hoot kon dit scherm niet tonen. Opnieuw laden helpt meestal.</p>
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          Opnieuw laden
        </button>
      </div>
    )
  }
}

// Eerst de feed van de vorige keer (IndexedDB, hooguit een paar honderd ms), dan pas tekenen:
// zo staat er bij een warme start meteen inhoud, zonder flits van een lege of ladende staat.
loadFeedCache().finally(() =>
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <Fallback>
        <App />
      </Fallback>
    </React.StrictMode>
  )
)

// De service worker en het bijhouden van nieuwe versies: zie src/lib/swUpdate.js.
registerUpdates()

}
start().catch((error) => console.error(error))
