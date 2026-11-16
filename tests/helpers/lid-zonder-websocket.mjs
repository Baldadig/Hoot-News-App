// Draait als eigen proces met `node --no-experimental-websocket` (zoals Node 20 op Netlify: geen ingebouwde WebSocket),
// vanuit tests/editie-node.test.mjs. Eén vraag als lid door de ECHTE verifyToken en clientForToken (supabase-js), met een
// nep-Supabase achter `fetch`. Schrijft de uitkomst als JSON naar stdout.
import { handle } from '../../netlify/functions/edition.mjs'
import { lidDeps, lidPost } from './lid-nep.mjs'

const d = lidDeps()
const res = await handle(lidPost(), d.deps)
const json = await res.json().catch(() => null)
process.stdout.write(JSON.stringify({ websocket: typeof globalThis.WebSocket, status: res.status, source: json?.source || null, owner: json?.edition?.owner || null, writes: d.pg.writes().length }))
