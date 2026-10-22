// POST /api/brief — "De editie in één minuut" voor een persoonlijke editie.
// Alleen voor leden (ingelogd én met een profiel in Supabase), hooguit een paar keer per dag per
// persoon. Zelfde schrijver en dezelfde controle per zin als de algemene editie (lib/brief.mjs).
// Identieke edities delen hun overzicht (cache op de inhoud).
import Anthropic from '@anthropic-ai/sdk'
import { createBrief } from '../lib/brief.mjs'
import { kvGet, kvSet } from '../lib/kv.mjs'
import { hash } from '../../shared/util.mjs'
import { SUPABASE_URL, SUPABASE_KEY } from '../../src/lib/config.js'

export const PER_DAY = 8 // drie edities per dag, met ruimte voor een nieuwe poging
const fail = (status, error) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })
const str = (v, max) => typeof v === 'string' && v.length <= max

// Rijen zoals de app ze stuurt (src/lib/personal.js → personalRows), streng gecontroleerd.
export function validRows(rows) {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 12) return null
  const out = []
  for (const r of rows) {
    if (!r || !Number.isInteger(r.entry) || r.entry < 0 || r.entry > 20) return null
    if (!str(r.sourceName, 80) || !str(r.title, 300) || !(r.summary == null || str(r.summary, 700))) return null
    if (!r.title.trim()) return null
    out.push({ entry: r.entry, sourceName: r.sourceName, title: r.title, summary: r.summary || '' })
  }
  return out
}

// Wie is dit, en is het een lid? Met het token van de gebruiker zelf: Supabase controleert het
// token, en de regels in de database laten alleen je eigen profiel zien.
export async function memberOf(token, fetchImpl = fetch) {
  if (!token) return null
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` }
  const u = await fetchImpl(`${SUPABASE_URL}/auth/v1/user`, { headers })
  if (!u.ok) return null
  const user = await u.json()
  if (!user?.id) return null
  const p = await fetchImpl(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id`, { headers })
  if (!p.ok) return null
  const rows = await p.json()
  return Array.isArray(rows) && rows.length === 1 ? user.id : null
}

export async function handle(req, { anthropic, member = memberOf, now = Date.now() } = {}) {
  if (req.method !== 'POST') return fail(405, 'Alleen POST.')
  if (!anthropic) return fail(503, 'Nog niet beschikbaar.')
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  const uid = await member(token).catch(() => null)
  if (!uid) return fail(401, 'Alleen voor leden.')
  let body
  try {
    body = await req.json()
  } catch {
    return fail(400, 'Geen geldige invoer.')
  }
  const rows = validRows(body?.rows)
  if (!rows) return fail(400, 'Geen geldige invoer.')

  const cacheKey = 'brief-mine-' + hash(JSON.stringify(rows))
  const cached = await kvGet(cacheKey)
  if (cached) return Response.json({ brief: cached }, { headers: { 'Cache-Control': 'no-store' } })

  const day = new Date(now).toISOString().slice(0, 10)
  const quotaKey = `brief-quota-${uid}-${day}`
  const used = (await kvGet(quotaKey)) || 0
  if (used >= PER_DAY) return fail(429, 'Vandaag geen nieuwe samenvattingen meer.')
  await kvSet(quotaKey, used + 1)

  const brief = await createBrief(anthropic, rows, { now }).catch(() => null)
  if (!brief) return fail(502, 'De samenvatting lukte niet.')
  await kvSet(cacheKey, brief)
  return Response.json({ brief }, { headers: { 'Cache-Control': 'no-store' } })
}

export default async (req) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const anthropic = apiKey ? new Anthropic({ apiKey, timeout: 25000, maxRetries: 1 }) : null
  return handle(req, { anthropic })
}

export const config = { path: '/api/brief' }
