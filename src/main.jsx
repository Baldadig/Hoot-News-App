import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { registerUpdates } from './lib/swUpdate.js'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// De service worker en het bijhouden van nieuwe versies: zie src/lib/swUpdate.js.
registerUpdates()
