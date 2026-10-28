// Synchroniseren met je account — los van React, zodat het te testen is (tests/syncEngine.test.mjs).
//
// Drie regels:
// 1. Van wie is wat er op dit toestel staat? `hoot:owner` is 'anon' of een gebruikers-id. Alleen
//    anonieme gegevens worden bij inloggen samengevoegd; gegevens van een ander account nooit.
// 2. De basis is wat de server bevestigd heeft. Wat lokaal afwijkt van die basis staat nog open
//    (instellingen/gelezen als geheel, Bewaard per bericht). De basis schuift pas na een geslaagde
//    schrijfactie; een fout laat alles openstaan, en we proberen het vanzelf opnieuw.
// 3. Ophalen van de server overschrijft geen openstaande wijzigingen: die gaan er na het
//    ophalen gewoon weer overheen (ook verwijderingen).
import { pickSynced, mergeRead, mergeSeen, mergeSaved } from './sync.js'
import { hash } from '../../shared/util.mjs'

export const OWNER_KEY = 'hoot:owner'
export const BASE_KEY = 'hoot:sync-base'
const LEGACY_MARK = 'hoot:synced-user' // tot 1.26: "dit toestel is al eens samengevoegd met <id>"
const RETRY = [5e3, 15e3, 60e3, 5 * 60e3]

const read = (storage, key) => {
  try {
    return JSON.parse(storage.getItem(key))
  } catch {
    return null
  }
}
const write = (storage, key, value) => {
  try {
    if (value == null) storage.removeItem(key)
    else storage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  } catch {
    /* geen opslag: dan alleen in het geheugen */
  }
}

export function ownerOf(storage) {
  try {
    return storage.getItem(OWNER_KEY) || storage.getItem(LEGACY_MARK) || 'anon'
  } catch {
    return 'anon'
  }
}

// Wat te doen bij inloggen als `uid`, gegeven de eigenaar van de lokale gegevens.
export function ownerAction(owner, uid) {
  if (owner === uid) return 'continue'
  if (!owner || owner === 'anon') return 'merge'
  return 'replace'
}

export const stateHash = (local) => hash(JSON.stringify([pickSynced(local.prefs), local.read || [], local.seen || {}]))
export const fingerprint = (entry) => hash(JSON.stringify(entry))

// Openstaande wijzigingen in Bewaard ten opzichte van de bevestigde basis.
export function savedOps(baseSaved = {}, saved = {}) {
  const upserts = Object.keys(saved).filter((k) => baseSaved[k] !== fingerprint(saved[k]))
  const deletes = Object.keys(baseSaved).filter((k) => !(k in saved))
  return { upserts, deletes }
}

// Gegevens die bij een account horen (wat bij het toestel hoort, zoals indeling en tekstgrootte,
// blijft staan): leeg, voor na uitloggen of bij een ander account.
export function emptyAccountData(prefs = {}) {
  const device = Object.fromEntries(Object.entries(prefs).filter(([k]) => !(k in pickSynced(prefs))))
  return { prefs: { ...device, onboarded: true }, read: [], seen: {}, saved: {} }
}

export class SyncEngine {
  // api: { pull(), pushState(local), upsertSaved([[key, entry]]), deleteSaved([key]) } — gooit bij fouten.
  // getLocal()/setLocal(next): { prefs, read, seen, saved } van de app.
  constructor({ uid, api, storage, getLocal, setLocal, onStatus = () => {}, schedule = (fn, ms) => setTimeout(fn, ms), cancel = (t) => clearTimeout(t), isOnline = () => true }) {
    Object.assign(this, { uid, api, storage, getLocal, setLocal, onStatus, schedule, cancel, isOnline })
    this.timer = null
    this.failures = 0
    this.queue = Promise.resolve()
    this.stopped = false
    this.status = 'idle'
  }

  setStatus(s) {
    if (this.status !== s) this.onStatus((this.status = s))
  }

  // Alles achter elkaar: nooit twee keer tegelijk ophalen of schrijven.
  run(task) {
    this.queue = this.queue.then(() => (this.stopped ? null : task())).catch(() => {})
    return this.queue
  }

  loadBase() {
    const b = read(this.storage, BASE_KEY)
    return b && b.uid === this.uid ? b : { uid: this.uid, state: null, saved: {} }
  }
  saveBase() {
    write(this.storage, BASE_KEY, this.base)
  }

  // Inloggen: eigenaar bepalen, dan ophalen en samenvoegen volgens die eigenaar.
  start() {
    const action = ownerAction(ownerOf(this.storage), this.uid)
    this.mode = action
    if (action === 'replace') {
      // Wat hier staat is van een ander account: weg, vóór we iets ophalen of schrijven.
      this.setLocal(emptyAccountData(this.getLocal().prefs))
      write(this.storage, BASE_KEY, null)
    }
    this.base = action === 'continue' ? this.loadBase() : { uid: this.uid, state: null, saved: {} }
    write(this.storage, OWNER_KEY, this.uid)
    write(this.storage, LEGACY_MARK, null)
    return this.pull()
  }

  pull() {
    return this.run(async () => {
      this.setStatus('syncing')
      let remote
      try {
        remote = await this.api.pull()
      } catch {
        return this.failed(() => this.pull())
      }
      // Intussen uitgelogd (of een ander account): dit antwoord hoort niet meer op dit toestel.
      if (this.stopped) return
      const local = this.getLocal()
      const remoteSaved = remote.saved || {}
      const hasRemotePrefs = Object.keys(remote.prefs || {}).length > 0
      // Openstaande lokale instellingen (sinds de laatste bevestiging) gaan voor.
      const statePending = this.mode === 'continue' && this.base.state !== null && stateHash(local) !== this.base.state
      const prefs = statePending || !hasRemotePrefs ? local.prefs : { ...local.prefs, ...pickSynced(remote.prefs) }
      // Bluesky-accounts: bij het samenvoegen (eerste keer met dit account) blijven die van dit
      // toestel erbij; daarna gaat het account voor, zodat ook weghalen meekomt.
      if (this.mode === 'merge' && Array.isArray(local.prefs?.social) && Array.isArray(prefs.social) && prefs !== local.prefs) {
        const known = new Set(prefs.social.map((a) => a?.handle))
        prefs.social = [...prefs.social, ...local.prefs.social.filter((a) => a && !known.has(a.handle))]
      }
      let saved
      if (this.mode === 'merge') saved = mergeSaved(local.saved, remoteSaved)
      else {
        const { upserts, deletes } = this.mode === 'continue' ? savedOps(this.base.saved, local.saved) : { upserts: [], deletes: [] }
        saved = { ...remoteSaved }
        for (const k of upserts) saved[k] = local.saved[k]
        for (const k of deletes) delete saved[k]
      }
      this.setLocal({ prefs, read: mergeRead(remote.read, local.read), seen: mergeSeen(remote.seen, local.seen), saved })
      // De basis is wat de server nu heeft; wat daarvan afwijkt gaat hierna de deur uit.
      this.base = {
        uid: this.uid,
        state: stateHash({ prefs: hasRemotePrefs ? remote.prefs : {}, read: remote.read || [], seen: remote.seen || {} }),
        saved: Object.fromEntries(Object.entries(remoteSaved).map(([k, v]) => [k, fingerprint(v)])),
      }
      this.mode = 'continue'
      this.saveBase()
      this.failures = 0
      await this.flushNow()
    })
  }

  // Er is lokaal iets veranderd: even wachten (meer wijzigingen bundelen), dan schrijven.
  hasPending() {
    const local = this.getLocal()
    const { upserts, deletes } = savedOps(this.base.saved, local.saved)
    return stateHash(local) !== this.base.state || upserts.length > 0 || deletes.length > 0
  }

  changed(delay = 2000) {
    if (this.stopped || !this.base || !this.hasPending()) return
    this.setStatus('pending')
    this.cancel(this.timer)
    this.timer = this.schedule(() => this.flush(), delay)
  }

  flush() {
    return this.run(() => this.flushNow())
  }

  async flushNow() {
    this.cancel(this.timer)
    this.timer = null
    if (!this.base) return
    const local = this.getLocal()
    const hashNow = stateHash(local)
    const { upserts, deletes } = savedOps(this.base.saved, local.saved)
    if (hashNow === this.base.state && !upserts.length && !deletes.length) return this.setStatus('ok')
    if (!this.isOnline()) return this.setStatus('pending') // bij 'online' gaat het verder
    this.setStatus('syncing')
    try {
      if (hashNow !== this.base.state) {
        await this.api.pushState(local)
        if (this.stopped) return // uitgelogd tijdens het schrijven: geen basis meer terugzetten
        this.base.state = hashNow
        this.saveBase()
      }
      if (upserts.length) {
        await this.api.upsertSaved(upserts.map((k) => [k, local.saved[k]]))
        if (this.stopped) return
        for (const k of upserts) this.base.saved[k] = fingerprint(local.saved[k])
        this.saveBase()
      }
      if (deletes.length) {
        await this.api.deleteSaved(deletes)
        if (this.stopped) return
        for (const k of deletes) delete this.base.saved[k]
        this.saveBase()
      }
    } catch {
      return this.failed(() => this.flush())
    }
    if (this.stopped) return
    this.failures = 0
    // Tijdens het schrijven alweer iets veranderd? Dan staat dat nog open.
    if (this.hasPending()) this.changed(0)
    else this.setStatus('ok')
  }

  failed(again) {
    if (this.stopped) return
    this.setStatus('error')
    const wait = RETRY[Math.min(this.failures, RETRY.length - 1)]
    this.failures++
    this.cancel(this.timer)
    this.timer = this.schedule(again, wait)
  }

  // Verbinding terug of de app weer in beeld: meteen proberen.
  online() {
    return this.flush()
  }

  stop() {
    this.stopped = true
    this.cancel(this.timer)
  }
}

// Uitloggen: de gegevens van het account gaan van dit toestel af; daarna is het weer anoniem.
export function forgetAccount(storage, setLocal, prefs) {
  setLocal(emptyAccountData(prefs))
  write(storage, 'hoot:my-edition', null) // de persoonlijke editie hoort bij het account
  write(storage, BASE_KEY, null)
  write(storage, LEGACY_MARK, null)
  write(storage, OWNER_KEY, 'anon')
}
