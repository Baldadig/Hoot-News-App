import { useEffect, useState } from 'react'
import { describe, fetchWeather, placeFor } from '../lib/weather.js'
import { useHoot } from './Items.jsx'

const s = { viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
const Cloud = ({ y = 0 }) => <path d={`M7 ${18 + y}h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.6A3.2 3.2 0 0 0 7 ${18 + y}Z`} />
const ICONS = {
  zon: (
    <svg {...s}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </svg>
  ),
  halfbewolkt: (
    <svg {...s}>
      <path d="M8.5 4.5v1.2M3.8 9.5H5M5.2 6l.9.9M12 6.8l-.9.9" />
      <path d="M10.6 9.4A3.5 3.5 0 0 0 5.4 12" />
      <path d="M8 20h9a3.6 3.6 0 0 0 .3-7.2 5 5 0 0 0-9.6 1.4A2.9 2.9 0 0 0 8 20Z" />
    </svg>
  ),
  bewolkt: (
    <svg {...s}>
      <Cloud />
    </svg>
  ),
  regen: (
    <svg {...s}>
      <Cloud y={-3} />
      <path d="M8.5 18.5 7.5 21M12.5 18.5l-1 2.5M16.5 18.5l-1 2.5" />
    </svg>
  ),
  sneeuw: (
    <svg {...s}>
      <Cloud y={-3} />
      <path d="M8 19.5h.01M12 21h.01M16 19.5h.01" strokeWidth="2.6" />
    </svg>
  ),
  onweer: (
    <svg {...s}>
      <Cloud y={-3} />
      <path d="m12.5 16-2 3h3l-2 3" />
    </svg>
  ),
  mist: (
    <svg {...s}>
      <path d="M4 9h16M6 13h12M4 17h16" />
    </svg>
  ),
}

// Het weer van vandaag op de plaats uit je instellingen (standaard Haarlem), klein in de
// metaregel: icoon + hoogste temperatuur. "Geen weer", of lukt het ophalen niet, dan staat er
// niets (geen lege plek, geen foutmelding).
export default function Weather() {
  const { prefs } = useHoot()
  const place = placeFor(prefs?.weatherPlace)
  const [w, setW] = useState(null)
  useEffect(() => {
    setW(null)
    if (!place) return
    let alive = true
    fetchWeather(place)
      .then((x) => alive && setW(x))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [place?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!place || !w || !Number.isFinite(w.max)) return null
  const d = describe(w.code)
  return (
    <span className="weather" title={`${place.name}: ${d.label}, ${w.min}° tot ${w.max}°`}>
      {ICONS[d.kind]}
      <span aria-hidden="true">{w.max}°</span>
      <span className="visually-hidden">
        {place.name}: {d.label}, {w.min} tot {w.max} graden
      </span>
    </span>
  )
}
