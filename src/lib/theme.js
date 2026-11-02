// Dezelfde keuze voor eerste paint, instellingen, migratie en profiel.
export const themePref = value => ['system', 'light', 'dark', 'night'].includes(value) ? value : 'system'
export const darkPref = value => value === 'night' ? 'night' : 'dark'
export const resolvedTheme = (pref, evening = 'dark', systemDark = false) => {
  const choice = themePref(pref)
  return choice === 'system' ? (systemDark ? darkPref(evening) : 'light') : choice
}
