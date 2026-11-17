// Instellingen, indeling van 17 november (Hoot-design/ontwerp/instellingen-2026-11-17/concept.html): elke rij
// op het hoofdblad een gekleurd tegeltje met een wit symbool, zoals de Instellingen-app. Gelijk aan de app
// (ios/Hoot/Views/SettingsTegels.swift: SettingsIcoon en TegelKleur); tests/instellingen-tegels.test.mjs houdt
// ze gelijk. Op het web tekenen we de symbolen als inline SVG (24 × 24, lijn), naar het concept.

// De tegelkleuren: warm en gedempt, Hoot-rood als anker. Licht en Donker gelijk; in Nacht 80 % (CSS).
export const TEGEL_KLEUREN = {
  rood: '#9a3324',
  amber: '#b0802f',
  groen: '#4f6b3a',
  teal: '#2f6b68',
  blauw: '#36577a',
  paars: '#6a4a6c',
  inkt: '#4b453b',
  zand: '#8a7a5c',
}

// Rij → [kleur, SF Symbol in de app]. Dezelfde sleutels als SettingsIcoon in de app.
export const SETTINGS_ICONEN = {
  interesses: ['rood', 'sparkles'],
  editie: ['inkt', 'newspaper'],
  stroom: ['teal', 'water.waves'],
  selectie: ['amber', 'star'],
  bronnen: ['blauw', 'antenna.radiowaves.left.and.right'],
  abonnementen: ['groen', 'key'],
  podcasts: ['paars', 'headphones'],
  appicoon: ['teal', 'square.grid.2x2'],
  tekstEnBeeld: ['zand', 'photo'],
  artikelen: ['blauw', 'doc.text'],
  toestel: ['zand', 'iphone'],
  over: ['rood', 'info'],
}

// Alleen op het web: Kleur (het palet) onder Weergave.
export const WEB_ICONEN = { kleur: ['groen', 'paintpalette'] }

// De symbolen als SVG-paden (viewBox 0 0 24 24, stroke), per SF Symbol-naam.
export const SYMBOLEN = {
  sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>',
  newspaper: '<rect x="4" y="5" width="13" height="14" rx="1.5"/><path d="M17 9h3v8.5a1.5 1.5 0 0 1-3 0"/><path d="M7 9h7M7 12.5h7M7 16h4"/>',
  'water.waves': '<path d="M4 7c2.5-2 5.5 2 8 0s5.5 2 8 0"/><path d="M4 12c2.5-2 5.5 2 8 0s5.5 2 8 0"/><path d="M4 17c2.5-2 5.5 2 8 0s5.5 2 8 0"/>',
  star: '<path d="M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 18.9l.9-5.4L4.2 9.7l5.4-.8z"/>',
  'antenna.radiowaves.left.and.right': '<circle cx="12" cy="11" r="1.6"/><path d="M12 12.6V20"/><path d="M8.5 7.5a5 5 0 0 0 0 7M15.5 7.5a5 5 0 0 1 0 7"/><path d="M5.6 4.6a9 9 0 0 0 0 12.8M18.4 4.6a9 9 0 0 1 0 12.8"/>',
  key: '<circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H20M17 12v3M20 12v2"/>',
  headphones: '<path d="M5 15v-3a7 7 0 0 1 14 0v3"/><rect x="4" y="14" width="4" height="6" rx="1.5"/><rect x="16" y="14" width="4" height="6" rx="1.5"/>',
  'square.grid.2x2': '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  photo: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l5-4.5 3.5 3 3-2.5L20 17"/>',
  'doc.text': '<path d="M6 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 6 20z"/><path d="M12 3.5V8h4.5M8 12h6M8 15.5h6"/>',
  iphone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
  info: '<path d="M10 10.5h2V18M9.5 18h5"/><circle cx="12" cy="6.5" r="1.1" fill="currentColor" stroke="none"/>', // zoals SF Symbol info
  paintpalette: '<path d="M12 4a8 8 0 1 0 0 16c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-.9.7-1.5 1.7-1.5H17a3 3 0 0 0 3-3C20 7.3 16.4 4 12 4z"/><circle cx="8" cy="11" r="1.1"/><circle cx="10.5" cy="7.8" r="1.1"/><circle cx="14.5" cy="7.8" r="1.1"/>',
  // Weergave
  'sun.max': '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
  'moon.stars': '<path d="M17 15A6.5 6.5 0 0 1 9 7a6.5 6.5 0 1 0 8 8z"/><path d="M17 4l.6 1.4L19 6l-1.4.6L17 8l-.6-1.4L15 6l1.4-.6zM20.5 10l.4.9.9.4-.9.4-.4.9-.4-.9-.9-.4.9-.4z"/>',
  'circle.lefthalf.filled': '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/>',
}

// De vier tegels van Weergave, in deze volgorde (gelijk aan WeergaveKeuze.volgorde in de app).
export const WEERGAVE_TEGELS = [
  { value: 'light', label: 'Licht', symbol: 'sun.max' },
  { value: 'dark', label: 'Donker', symbol: 'moon' },
  { value: 'night', label: 'Nacht', symbol: 'moon.stars', aria: 'Nacht, echt zwart' },
  { value: 'system', label: 'Systeem', symbol: 'circle.lefthalf.filled', aria: 'Systeem, zoals je toestel' },
]
