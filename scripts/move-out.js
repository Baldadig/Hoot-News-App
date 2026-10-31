import { movePayload, encodeMove } from '../src/lib/domain-migration.js'
async function move() {
  const route = location.pathname === '/privacy' ? '#/privacy' : location.pathname === '/over' ? '#/over' : location.hash
  const payload = movePayload(localStorage, route)
  const target = new URL('/lees/', 'https://gethoot.app')
  target.search = location.search
  target.hash = Object.keys(payload.values).length ? 'verhuis=' + await encodeMove(payload) : payload.route
  location.replace(target.href)
}
move().catch(() => { document.getElementById('move-error').hidden = false })
