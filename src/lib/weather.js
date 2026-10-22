// Het weer van de dag voor de kop van de Editie — Open-Meteo (gratis, geen sleutel).
// describe() is puur (getest in tests/weather.test.mjs).

// Een vaste, korte lijst: geen locatietoestemming nodig. Haarlem is de standaard.
export const PLACES = [
  { id: 'haarlem', name: 'Haarlem', lat: 52.38, lon: 4.64 },
  { id: 'amsterdam', name: 'Amsterdam', lat: 52.37, lon: 4.89 },
  { id: 'rotterdam', name: 'Rotterdam', lat: 51.92, lon: 4.48 },
  { id: 'den-haag', name: 'Den Haag', lat: 52.08, lon: 4.3 },
  { id: 'utrecht', name: 'Utrecht', lat: 52.09, lon: 5.12 },
  { id: 'leiden', name: 'Leiden', lat: 52.16, lon: 4.49 },
  { id: 'almere', name: 'Almere', lat: 52.37, lon: 5.21 },
  { id: 'eindhoven', name: 'Eindhoven', lat: 51.44, lon: 5.48 },
  { id: 'tilburg', name: 'Tilburg', lat: 51.56, lon: 5.09 },
  { id: 'breda', name: 'Breda', lat: 51.59, lon: 4.78 },
  { id: 'nijmegen', name: 'Nijmegen', lat: 51.84, lon: 5.86 },
  { id: 'arnhem', name: 'Arnhem', lat: 51.98, lon: 5.91 },
  { id: 'zwolle', name: 'Zwolle', lat: 52.52, lon: 6.08 },
  { id: 'enschede', name: 'Enschede', lat: 52.22, lon: 6.89 },
  { id: 'groningen', name: 'Groningen', lat: 53.22, lon: 6.57 },
  { id: 'leeuwarden', name: 'Leeuwarden', lat: 53.2, lon: 5.8 },
  { id: 'maastricht', name: 'Maastricht', lat: 50.85, lon: 5.69 },
  { id: 'middelburg', name: 'Middelburg', lat: 51.5, lon: 3.61 },
  { id: 'antwerpen', name: 'Antwerpen', lat: 51.22, lon: 4.4 },
  { id: 'gent', name: 'Gent', lat: 51.05, lon: 3.72 },
  { id: 'brussel', name: 'Brussel', lat: 50.85, lon: 4.35 },
]
export const HAARLEM = PLACES[0]
export const NO_WEATHER = 'geen'

// De plaats bij een voorkeur; null bij "Geen weer". Onbekend wordt Haarlem.
export function placeFor(id) {
  if (id === NO_WEATHER) return null
  return PLACES.find((p) => p.id === id) || HAARLEM
}

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
