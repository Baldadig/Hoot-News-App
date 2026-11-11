// Alleen de proefopstelling: een vroege kaart kan niet omlaag door negatief te scrollen.
// Verklein dan het testvenster, met dezelfde breedte, zodat de onderrand werkelijk wordt beproefd.
export function bottomPosition({ top, height, scrollTop, scrollMax, viewportHeight, lowerEdge = viewportHeight, gutter }) {
  const targetBottom = lowerEdge - gutter
  const requested = scrollTop + top + height - targetBottom
  return {
    viewportHeight: requested < 0 ? Math.max(1, Math.floor(viewportHeight + requested)) : viewportHeight,
    scrollTop: Math.max(0, Math.min(scrollMax, requested)),
    resize: requested < 0,
    targetBottom,
    requested,
  }
}
