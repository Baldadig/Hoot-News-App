// De klik bij het sluiten hoort bij het menu, niet bij de kaart eronder.
export function swallowDismissClick(pointer, doc = document, win = window) {
  const clear = () => { doc.removeEventListener('click', click, { capture: true }); doc.removeEventListener('pointerdown', clear, { capture: true }); doc.removeEventListener('pointercancel', clear, { capture: true }); win.clearTimeout(timer) }
  const click = (e) => {
    if (e.detail === 0) return // een latere toetsenbordactie blijft werken
    if (e.pointerId != null && pointer.pointerId != null && e.pointerId !== pointer.pointerId) return
    e.preventDefault()
    e.stopImmediatePropagation()
    clear()
  }
  doc.addEventListener('click', click, { capture: true })
  doc.addEventListener('pointerdown', clear, { capture: true })
  doc.addEventListener('pointercancel', clear, { capture: true })
  const timer = win.setTimeout(clear, 1000) // vangnet wanneer een sleep geen klik oplevert
}

export function focusMenuNotice(doc = document) {
  const notice = doc.querySelector('.toasts .toast')
  if (!notice) return false
  notice.tabIndex = -1
  notice.focus({ preventScroll: true })
  return true
}
