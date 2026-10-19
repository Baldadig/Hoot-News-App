// Het weer van de dag voor de kop van de Editie — Open-Meteo (gratis, geen sleutel).
// describe() is puur (getest in tests/weather.test.mjs).

export const HAARLEM = { name: 'Haarlem', lat: 52.38, lon: 4.64 }

// WMO-weercode → soort (voor het icoon) en een Nederlandse omschrijving.
export function describe(code) {
  const c = Number(code)
  if (c === 0) return { kind: 'zon', label: 'zonnig' }
  if (c === 1 || c === 2) return { kind: 'halfbewolkt', label: 'half bewolkt' }
  if (c === 3) return { kind: 'bewolkt', label: 'bewolkt' }
  if (c === 45 || c === 48) return { kind: 'mist', label: 'mist' }
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return { kind: 'regen', label: c <= 57 ? 'motregen' : 'regen' }
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return { kind: 'sneeuw', label: 'sneeuw' }
  if (c >= 95) return { kind: 'onweer', label: 'onweer' }
  return { kind: 'bewolkt', label: 'bewolkt' }
}

const KEY = 'hoot:weather'
const MAX_AGE = 30 * 60 * 1000

// { max, min, now, code, at } — uit de cache als die jonger is dan een half uur.
export async function fetchWeather(place = HAARLEM, { now = Date.now() } = {}) {
  try {
    const cached = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (cached && now - cached.at < MAX_AGE && cached.place === place.name) return cached
  } catch {
    /* geen cache */
  }
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FAmsterdam&forecast_days=1`
  const r = await fetch(url)
  if (!r.ok) throw new Error('weer ' + r.status)
  const d = await r.json()
  const out = { place: place.name, code: d.daily?.weather_code?.[0], max: Math.round(d.daily?.temperature_2m_max?.[0]), min: Math.round(d.daily?.temperature_2m_min?.[0]), now: Math.round(d.current?.temperature_2m), at: now }
  try {
    localStorage.setItem(KEY, JSON.stringify(out))
  } catch {
    /* niet erg */
  }
  return out
}
