// Waar het zwevende menu van ⋯ staat (src/components/Popmenu.jsx). Los van React, zodat de toets
// (tests/kaartmenu.test.mjs) het zonder browser kan nameten.
const GUTTER = 16
const GAP = 8 // --s2
const NUDGE = 4 // --s1

export function placeMenu(menu, anchor, win = window, doc = document) {
  const b = anchor.getBoundingClientRect()
  const icon = anchor.querySelector('svg')?.getBoundingClientRect() || b
  const row = anchor.closest('.meta, .kmeta')
  const ink = row ? [...row.querySelectorAll(':scope > .iconbtn svg')].map((s) => s.getBoundingClientRect()).filter((r) => r.width).reduce((m, r) => Math.max(m, r.right), 0) : 0
  const right = ink || icon.right
  const w = menu.offsetWidth, h = menu.offsetHeight
  const vw = doc.documentElement.clientWidth, vh = win.innerHeight
  const left = Math.max(GUTTER, Math.min(right - w, vw - GUTTER - w))
  // Onder het icoon, maar nooit over de bronregel zelf (naam, tijd, "N bronnen" blijven leesbaar):
  // dus ook onder de regel. Erboven idem: boven de hele regel.
  const box = row?.getBoundingClientRect()
  const below = Math.max(icon.bottom + GAP, box ? box.bottom + NUDGE : 0)
  const above = Math.min(icon.top - GAP, box ? box.top - NUDGE : Infinity) - h
  let top = below
  if (below + h > vh - GUTTER && above >= GUTTER) top = above
  menu.style.left = `${Math.round(left)}px`
  menu.style.top = `${Math.round(top)}px`
  menu.dataset.side = top === below ? 'onder' : 'boven'
}
