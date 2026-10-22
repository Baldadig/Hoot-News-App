import { test } from 'node:test'
import assert from 'node:assert/strict'
import { eachLimited } from '../src/lib/pool.js'

test('met 40 bronnen nooit meer dan 6 verzoeken tegelijk, en alles komt aan de beurt', async () => {
  let open = 0
  let most = 0
  const done = []
  await eachLimited([...Array(40).keys()], 6, async (n) => {
    open++
    most = Math.max(most, open)
    await new Promise((r) => setTimeout(r, 1 + (n % 5)))
    open--
    done.push(n)
  })
  assert.equal(most, 6)
  assert.equal(done.length, 40)
})

test('een fout stopt het geheel (zoals Promise.all), een lege lijst doet niets', async () => {
  await assert.rejects(eachLimited([1, 2, 3], 2, async (n) => { if (n === 2) throw new Error('x') }), /x/)
  await eachLimited([], 6, () => assert.fail('mag niet'))
})
