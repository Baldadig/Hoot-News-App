// De feed opnieuw samenstellen en als één kant-en-klaar antwoord bewaren.
import { buildFeed } from './build.mjs'
import { writeSnapshot } from './kv.mjs'
import { hash } from '../../shared/util.mjs'

let running = null // binnen één functie-instantie nooit twee keer tegelijk

export function refresh() {
  running ||= (async () => {
    try {
      const now = Date.now()
      const body = JSON.stringify(await buildFeed({ now }))
      const snap = { body, builtAt: new Date(now).toISOString(), etag: hash(body) }
      await writeSnapshot(snap)
      return snap
    } finally {
      running = null
    }
  })()
  return running
}
