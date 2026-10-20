// /api/tts?editie=2026-10-19-middag&stem=fenna → MP3 van de editie, voorgelezen door een
// neurale Nederlandse stem van Azure. Eén keer per editie en stem gemaakt en bewaard.
// Sleutels staan alleen als omgevingsvariabelen op Netlify:
//   AZURE_SPEECH_KEY    = sleutel van je Azure AI Speech-resource
//   AZURE_SPEECH_REGION = regio van die resource, bv. westeurope
import { getStore } from '@netlify/blobs'
import { ssml, editionParts, VOICES, DEFAULT_VOICE } from '../lib/tts.mjs'

const json = (status, obj) => Response.json(obj, { status })
const mp3 = (buf) => new Response(buf, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400, immutable' } })

export default async (req) => {
  const key = process.env.AZURE_SPEECH_KEY
  const region = process.env.AZURE_SPEECH_REGION
  if (!key || !region) return json(503, { error: 'not_configured' })
  const q = new URL(req.url).searchParams
  const id = String(q.get('editie') || '')
  const voice = VOICES[q.get('stem')] ? q.get('stem') : DEFAULT_VOICE
  const m = id.match(/^\d{4}-\d{2}-\d{2}-(ochtend|middag|avond)$/)
  if (!m) return json(400, { error: 'bad_edition' })

  let store = null
  try {
    store = getStore('hoot')
  } catch {
    /* geen Blobs */
  }
  const cacheKey = `tts-${id}-${voice}`
  if (store) {
    const hit = await store.get(cacheKey, { type: 'arrayBuffer' }).catch(() => null)
    if (hit) return mp3(hit)
  }
  const stored = store ? await store.get('edition3-' + id, { type: 'json' }).catch(() => null) : null
  if (!stored?.entries?.length) return json(404, { error: 'no_edition' })

  const r = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'Hoot' },
    body: ssml(editionParts(stored, m[1]), voice),
  })
  if (!r.ok) return json(502, { error: 'tts_failed', status: r.status })
  const buf = await r.arrayBuffer()
  if (store) await store.set(cacheKey, buf).catch(() => {})
  return mp3(buf)
}

export const config = { path: '/api/tts' }
