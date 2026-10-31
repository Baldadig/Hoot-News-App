// Nep-PostgREST voor `user_state`, achter een echte supabase-js-client met een eigen `fetch`: zo toetsen
// de tests (en de meetlat, tests/helpers/pariteit.mjs) de aanvraag zoals hij echt over de lijn gaat, met
// de filtertaal van PostgREST (eq, neq, is.null, `->>` op jsonb, `or=(...)`) en `Prefer:
// return=representation`. Genoeg voor de Editie (src/lib/editionSync.js); de rest geeft een nette fout.
import { createClient } from '@supabase/supabase-js'

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export function fakePostgrest(rows = []) {
  const table = rows.map((r) => ({ ...r }))
  const log = []
  // `edition->>id`: een sleutel uit de jsonb-kolom als tekst; anders de kolom zelf.
  const value = (row, col) => {
    const m = col.match(/^(\w+)->>(\w+)$/)
    if (m) return row[m[1]] && typeof row[m[1]] === 'object' ? row[m[1]][m[2]] ?? null : null
    return row[col] ?? null
  }
  // SQL-semantiek: een vergelijking met null is nooit waar (ook `null <> x` niet), alleen `is null`.
  const test = (row, col, op, v) => {
    const x = value(row, col)
    if (op === 'is') return v === 'null' ? x == null : v === 'not.null' ? x != null : false
    if (x == null) return false
    if (op === 'eq') return String(x) === v
    if (op === 'neq') return String(x) !== v
    throw new Error(`nep-PostgREST kent de bewerking ${op} niet`)
  }
  const parse = (text) => {
    const m = text.match(/^(.+?)\.(eq|neq|is)\.(.*)$/s)
    if (!m) throw new Error(`nep-PostgREST begrijpt het filter ${text} niet`)
    return [m[1], m[2], m[3]]
  }
  const matches = (row, params) => {
    for (const [k, v] of params) {
      if (k === 'select') continue
      if (k === 'or') {
        if (!/^\(.*\)$/s.test(v)) throw new Error(`nep-PostgREST verwacht or=(...), kreeg ${v}`)
        const parts = v.slice(1, -1).split(',')
        if (!parts.some((p) => test(row, ...parse(p)))) return false
        continue
      }
      const m = v.match(/^(eq|neq|is)\.(.*)$/s)
      if (!m) throw new Error(`nep-PostgREST begrijpt ${k}=${v} niet`)
      if (!test(row, k, m[1], m[2])) return false
    }
    return true
  }
  const pick = (row, select) => (select && select !== '*' ? Object.fromEntries(select.split(',').map((c) => c.trim()).map((c) => [c, row[c] ?? null])) : { ...row })
  const fetch = async (url, init = {}) => {
    const u = new URL(url)
    const method = init.method || 'GET'
    const params = [...u.searchParams]
    const headers = Object.fromEntries(new Headers(init.headers || {}))
    const body = init.body ? JSON.parse(init.body) : null
    const entry = { method, table: u.pathname.split('/').pop(), params: Object.fromEntries(params), prefer: headers.prefer || '', body, rows: 0 }
    log.push(entry)
    if (!u.pathname.endsWith('/user_state')) return json({ message: 'nep-PostgREST kent alleen user_state' }, 404)
    const hit = table.filter((r) => matches(r, params))
    entry.rows = hit.length // bij een PATCH: hoeveel rijen er echt veranderden (0 = de voorwaarde hield het tegen)
    const select = u.searchParams.get('select')
    if (method === 'GET') return json(hit.map((r) => pick(r, select)))
    if (method === 'PATCH') {
      for (const r of hit) Object.assign(r, body)
      return headers.prefer?.includes('return=representation') ? json(hit.map((r) => pick(r, select))) : new Response(null, { status: 204 })
    }
    return json({ message: `nep-PostgREST kent ${method} niet` }, 405)
  }
  const client = createClient('http://nep.local', 'anon', { global: { fetch }, auth: { persistSession: false, autoRefreshToken: false } })
  // `patches`: elke schrijfaanvraag; `writes`: alleen die een rij veranderden.
  return { client, table, log, patches: () => log.filter((l) => l.method !== 'GET'), writes: () => log.filter((l) => l.method !== 'GET' && l.rows > 0) }
}
