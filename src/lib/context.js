// Route en leescontext — pure functies (getest in tests/context.test.mjs).

export const MAIN = ['editie', 'stroom', 'bewaard', 'bronnen']
const FILTER_KEYS = ['bron', 'onderwerp', 'soort']

// Alleen "#/pad?…" is een route. Een gewoon anker (#inhoud) laat de route ongemoeid.
export function parseHash(hash, previous = { path: 'editie', params: {} }) {
  if (!hash || hash === '#' || hash === '#/') return { path: 'editie', params: {} }
  if (!hash.startsWith('#/')) return previous
  const [path, query = ''] = hash.slice(2).split('?')
  return { path: path || 'editie', params: Object.fromEntries(new URLSearchParams(query)) }
}

export function toHash(path, params = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString()
  return '#/' + path + (q ? '?' + q : '')
}

// Per hoofdbestemming onthouden waar je was (filters), zodat de ondernavigatie je daar
// terugbrengt — en de leespositie dus bij dezelfde lijst hoort. Een geopend verhaal
// hoort daar niet bij.
export function rememberLocation(memory, route) {
  if (!MAIN.includes(route.path)) return memory
  const { verhaal, ...params } = route.params || {}
  const prev = memory[route.path] || {}
  const same = Object.keys({ ...prev, ...params }).every((k) => (prev[k] || '') === (params[k] || ''))
  return same ? memory : { ...memory, [route.path]: params }
}

export function hrefFor(memory, dest) {
  return toHash(dest, memory[dest] || {})
}

// Eén sleutel per combinatie van filters: elke lijst heeft zijn eigen leespositie.
export function filterSig(params = {}) {
  return FILTER_KEYS.map((k) => params[k] || '').join('|')
}
export function positionKey(dest, params = {}) {
  const sig = filterSig(params)
  return 'hoot:pos-' + dest + (sig === '||' ? '' : ':' + sig)
}
