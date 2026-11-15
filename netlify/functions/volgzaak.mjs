// POST /api/volgzaak: volgen in Hoot 1.5 (codenaam volgzaak). Het rekenwerk staat in netlify/lib/volgzaak.mjs. Met de
// vlag HOOT_VOLGZAKEN uit antwoordt dit "Nog niet beschikbaar." (404), zonder model en zonder KV.
import Anthropic from '@anthropic-ai/sdk'
import { handle, DUIDING_MS } from '../lib/volgzaak.mjs'
import { volgzakenStand } from '../lib/volgzaak-basis.mjs'
import { memberOf } from './brief.mjs'

export default async (req) => {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const anthropic = apiKey && volgzakenStand() !== 'uit' ? new Anthropic({ apiKey, timeout: DUIDING_MS, maxRetries: 0 }) : null
  return handle(req, { anthropic, member: memberOf })
}

// 30 verzoeken per minuut per IP (Netlify); daarboven 429.
export const config = { path: '/api/volgzaak', rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] } }
