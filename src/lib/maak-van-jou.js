// Wanneer "Maak Hoot van jou" komt (components/MaakVanJou.jsx): voorbij ongeveer een derde van de
// Editie, zoals de app (EditionView.swift, onScrollGeometryChange > 0.35).
export const NUDGE_AT = 0.35 // zoals de app: voorbij ongeveer een derde van de Editie

export const pastThird = ({ scrollTop, scrollHeight, clientHeight }) => {
  const room = scrollHeight - clientHeight
  return room > 0 && scrollTop / room > NUDGE_AT
}
