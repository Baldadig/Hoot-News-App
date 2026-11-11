// De klik bij het sluiten hoort bij het menu, niet bij de kaart eronder.
export function swallowDismissClick(pointer, doc = document, win = window) {
  let timer
  const clear = () => { doc.removeEventListener('pointerup', up, { capture: true }); doc.removeEventListener('click', click, { capture: true }); doc.removeEventListener('pointerdown', clear, { capture: true }); doc.removeEventListener('pointercancel', clear, { capture: true }); win.clearTimeout(timer) }
  const click = (e) => {
    if (e.detail === 0) return // een latere toetsenbordactie blijft werken
    if (e.pointerId != null && pointer.pointerId != null && e.pointerId !== pointer.pointerId) return
    e.preventDefault()
    e.stopImmediatePropagation()
    clear()
  }
  const up = (e) => {
    if (e.pointerId != null && pointer.pointerId != null && e.pointerId !== pointer.pointerId) return
    // Ook lang vasthouden blijft dezelfde sluitklik. Pas na loslaten kan een sleep geen klik meer geven.
    timer = win.setTimeout(clear, 1000)
  }
  doc.addEventListener('pointerup', up, { capture: true })
  doc.addEventListener('click', click, { capture: true })
  doc.addEventListener('pointerdown', clear, { capture: true })
  doc.addEventListener('pointercancel', clear, { capture: true })
}

export function focusMenuNotice(doc = document) {
  const notice = doc.querySelector('.toasts .toast')
  if (!notice) return false
  notice.tabIndex = -1
  notice.focus({ preventScroll: true })
  return true
}
