import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolveProfile, accountPending, syncedUid, PENDING_TEXT } from '../src/lib/membership.js'

// Nep-Supabase: `profiles` geeft wat er in `db` staat; rpc('join') maakt het profiel aan (of faalt).
function fakeClient({ profile = null, joinWorks = true, readFails = false, throws = false } = {}) {
  const db = { profile, rpc: [] }
  const client = {
    db,
    from: (table) => {
      assert.equal(table, 'profiles')
      return {
        select: () => ({
          eq: (col, id) => ({
            maybeSingle: async () => {
              if (throws) throw new Error('netwerk')
              return readFails ? { data: null, error: { message: 'x' } } : { data: db.profile, error: null }
            },
          }),
        }),
      }
    },
    rpc: async (name) => {
      db.rpc.push(name)
      if (!joinWorks) return { data: null, error: { message: 'function join() does not exist' } }
      db.profile = { is_admin: false, created_at: 'nu' }
      return { data: true, error: null }
    },
  }
  return client
}
const user = { id: 'u1' }

test('profiel bestaat (de trigger deed zijn werk): geen vangnet nodig', async () => {
  const c = fakeClient({ profile: { is_admin: false } })
  assert.deepEqual(await resolveProfile(c, user), { is_admin: false })
  assert.deepEqual(c.db.rpc, [])
})

test('geen profiel: één keer rpc(join), daarna is het er', async () => {
  const c = fakeClient()
  assert.deepEqual(await resolveProfile(c, user), { is_admin: false, created_at: 'nu' })
  assert.deepEqual(c.db.rpc, ['join'])
})

test('vangnet faalt of geen verbinding: null, niet vastlopen', async () => {
  const c = fakeClient({ joinWorks: false })
  assert.equal(await resolveProfile(c, user), null)
  assert.deepEqual(c.db.rpc, ['join'])
  assert.equal(await resolveProfile(fakeClient({ throws: true }), user), null)
  assert.equal(await resolveProfile(fakeClient({ readFails: true, joinWorks: false }), user), null)
})

test('alleen met profiel synchroniseren; zonder profiel zegt Hoot dat het account er bijna is', () => {
  const inMet = { status: 'in', user, profile: { is_admin: false } }
  const inZonder = { status: 'in', user, profile: null }
  assert.equal(syncedUid(inMet), 'u1')
  assert.equal(syncedUid(inZonder), null)
  assert.equal(syncedUid({ status: 'out', user: null }), null)
  assert.equal(syncedUid({ status: 'loading', user: null }), null)
  assert.equal(accountPending(inZonder), true)
  assert.equal(accountPending(inMet), false)
  assert.equal(accountPending({ status: 'out' }), false)
  assert.equal(PENDING_TEXT, 'Je account is er bijna. Probeer het zo nog eens.')
})

test('useAccount kent alleen out, loading en in', () => {
  const src = readFileSync(new URL('../src/hooks/useAccount.js', import.meta.url), 'utf8')
  // Elke toestand die de hook zet: status: '…' of status: … ? '…' : '…'
  const set = [...src.matchAll(/status: ([^,}]+)/g)].flatMap((m) => [...m[1].matchAll(/'([a-zA-Z]+)'/g)].map((q) => q[1]))
  assert.deepEqual([...new Set(set)].sort(), ['in', 'loading', 'out'])
})

test('migratie: trigger en vangnet zijn veilig voor elke inlog', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261104_open_accounts.sql', import.meta.url), 'utf8')
  const code = sql.replace(/^\s*--.*$/gm, '') // alleen de uitvoerbare regels
  assert.match(code, /create or replace function public\.handle_new_user\(\) returns trigger\s+language plpgsql security definer set search_path = ''/)
  assert.match(code, /after insert on auth\.users/)
  assert.match(code, /create or replace function public\."join"\(\) returns boolean\s+language plpgsql security definer set search_path = ''/)
  assert.match(code, /grant execute on function public\."join"\(\) to authenticated/)
  // Elke insert in een profiel of staat botst nooit: on conflict do nothing.
  for (const m of code.matchAll(/insert into public\.(profiles|user_state)[^;]*;/g)) assert.match(m[0], /on conflict \((id|user_id)\) do nothing/, m[0])
  // Groottegrenzen controleren bestaande rijen niet.
  for (const m of code.matchAll(/add constraint [^\n]*/g)) assert.match(m[0], /not valid/, m[0])
  assert.match(code, /^begin;$/m)
  assert.match(code, /^commit;$/m)
})

// Na review 4 november (ACCOUNTS-VERIFICATIE 2f en 3d).
test('offline: geen "Je account is er bijna", maar de bestaande offline-toestand', async () => {
  const { pendingShown } = await import('../src/lib/membership.js')
  const half = { status: 'in', user: { id: 'u' }, profile: null }
  assert.equal(pendingShown(half, true), true)
  assert.equal(pendingShown(half, false), false)
  assert.equal(pendingShown({ status: 'in', user: { id: 'u' }, profile: {} }, true), false)
  const acc = readFileSync(new URL('../src/components/Account.jsx', import.meta.url), 'utf8')
  assert.match(acc, /pendingShown\(account, useOnline\(\)\)/)
  assert.match(acc, /SYNC\.pending/)
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.match(app, /pendingShown\(rawAccount, online\)/)
})

test('plafond bereikt: het web toont de zin van de server bij de Editie in plaats van stil weg te blijven', async () => {
  const { BRIEF_FULL_TEXT } = await import('../src/lib/membership.js')
  const { FULL_TODAY } = await import('../netlify/functions/brief.mjs')
  assert.equal(FULL_TODAY, BRIEF_FULL_TEXT)
  assert.equal(BRIEF_FULL_TEXT, 'Vandaag zijn de samenvattingen op. Morgen maakt Hoot er weer een.')
  const hook = readFileSync(new URL('../src/hooks/usePersonalEdition.js', import.meta.url), 'utf8')
  assert.match(hook, /res\?\.status === 429/)
  const ed = readFileSync(new URL('../src/views/Edition.jsx', import.meta.url), 'utf8')
  assert.match(ed, /briefcta--rust[\s\S]*\{briefNote\}/)
})

test('SQL-proef: het middenstuk is letterlijk de migratie, en het blok eindigt altijd met een fout (terugdraaien)', () => {
  const mig = readFileSync(new URL('../supabase/migrations/20261104_open_accounts.sql', import.meta.url), 'utf8')
  const proef = readFileSync(new URL('../supabase/proef/20261104_open_accounts_proef.sql', import.meta.url), 'utf8')
  const body = mig.split('\nbegin;\n')[1].split('\ncommit;')[0].trim()
  const mid = proef.split('-- ======== begin migratie (letterlijk) ========\n')[1].split('\n-- ======== einde migratie ========')[0].trim()
  assert.equal(mid, body)
  assert.match(proef, /^do \$proef\$/m)
  assert.match(proef, /raise exception 'HOOT-PROEF \(alles teruggedraaid\) te_groot=%/)
  assert.doesNotMatch(proef, /^\s*(begin|commit|rollback);/im)
  assert.match(proef, /pg_column_size\(edition\) > 1048576/)
})
