import assert from 'node:assert/strict'
import test from 'node:test'
import worker from '../sync-worker/index.ts'
import { normalizeState } from '../src/sync/merge.ts'
import { EMPTY_CLOCKS, EMPTY_DENOMS } from '../src/types.ts'

/**
 * The Worker, driven the way two phones drive it.
 *
 * D1 is stubbed rather than mocked away: the stub keeps a revision number and
 * honours the conditional UPDATE, which is the only part of the storage layer
 * this code actually depends on being real. That is what lets the lost-update
 * race below be a genuine test instead of a hopeful one.
 */

const PIN = '481516'
const ORIGIN = 'https://thomasg42.github.io'

class FakeDB {
  row: { data: string; rev: number } | null = null
  rate = new Map<string, number>()
  /** Fires just before a conditional write lands — used to simulate a race. */
  interlope: (() => void) | null = null

  prepare(sql: string) {
    const db = this
    let args: unknown[] = []
    const stmt = {
      bind(...values: unknown[]) {
        args = values
        return stmt
      },
      async first<T>(): Promise<T | null> {
        if (sql.includes('SELECT data, rev FROM shift_state')) {
          return (db.row as T) ?? null
        }
        if (sql.includes('INSERT INTO rate_usage')) {
          const bucket = String(args[0])
          const count = (db.rate.get(bucket) ?? 0) + 1
          db.rate.set(bucket, count)
          return { count } as T
        }
        throw new Error(`unstubbed first(): ${sql}`)
      },
      async run() {
        if (sql.includes('DELETE FROM rate_usage')) return { meta: { changes: 0 } }
        if (sql.includes('INSERT INTO shift_state')) {
          const [, data, , expectedRev] = args as [string, string, string, number]
          db.interlope?.()
          const currentRev = db.row?.rev ?? 0
          if (db.row && currentRev !== expectedRev) return { meta: { changes: 0 } }
          db.row = { data, rev: currentRev + 1 }
          return { meta: { changes: 1 } }
        }
        throw new Error(`unstubbed run(): ${sql}`)
      },
    }
    return stmt
  }
}

// `null` means "deployed without its secret". An optional param defaulting to
// PIN would swallow an explicit `undefined` and quietly test the wrong thing --
// which it did, and the failure looked like a Worker bug.
function env(db: FakeDB, pin: string | null = PIN) {
  return { DB: db as unknown as D1Database, OWNER_PIN: pin ?? undefined }
}

function req(path: string, init: RequestInit = {}) {
  return new Request(`https://vip-drinks-sync.workers.dev${path}`, {
    ...init,
    headers: { Origin: ORIGIN, ...(init.headers ?? {}) },
  })
}

const pour = (id: string, name: string) => ({
  id,
  drinkId: 'quick-beer',
  name,
  madeAt: '2026-09-17T20:00:00.000Z',
})

const shift = (over: Record<string, unknown> = {}) =>
  normalizeState({
    made: [],
    videos: {},
    opening: { ...EMPTY_DENOMS },
    closing: { ...EMPTY_DENOMS },
    notes: '',
    shiftStartedAt: null,
    history: [],
    removed: [],
    clocks: { ...EMPTY_CLOCKS },
    ...over,
  })

async function pairUp(db: FakeDB, deviceId: string, pin = PIN) {
  const res = await worker.fetch(
    req('/api/pair', { method: 'POST', body: JSON.stringify({ pin, deviceId }) }),
    env(db),
  )
  return { res, body: (await res.json()) as { token?: string; error?: string } }
}

test('health says nothing about whether a PIN is set', async () => {
  const res = await worker.fetch(req('/api/health'), env(new FakeDB(), undefined))
  assert.equal(res.status, 200)
  const body = (await res.json()) as Record<string, unknown>
  assert.equal(body.ok, true)
  assert.ok(!('pin' in body) && !('configured' in body))
})

test('a wrong PIN gets a token from nobody', async () => {
  const db = new FakeDB()
  const { res, body } = await pairUp(db, 'dev-1', '000000')
  assert.equal(res.status, 401)
  assert.equal(body.token, undefined)
})

test('the right PIN pairs a device, and that token opens the ledger', async () => {
  const db = new FakeDB()
  const { res, body } = await pairUp(db, 'dev-1')
  assert.equal(res.status, 200)
  assert.match(body.token!, /^dev-1\./)

  const read = await worker.fetch(
    req('/api/state', { headers: { Authorization: `Bearer ${body.token}` } }),
    env(db),
  )
  assert.equal(read.status, 200)
})

test('no token, no ledger', async () => {
  const db = new FakeDB()
  for (const headers of [{}, { Authorization: 'Bearer nonsense' }, { Authorization: 'Bearer dev-1.forged' }]) {
    const res = await worker.fetch(req('/api/state', { headers }), env(db))
    assert.equal(res.status, 401)
  }
})

test('a Worker deployed with no PIN is loudly broken, never quietly public', async () => {
  const db = new FakeDB()
  const pair = await worker.fetch(
    req('/api/pair', { method: 'POST', body: JSON.stringify({ pin: '', deviceId: 'dev-1' }) }),
    env(db, null),
  )
  assert.equal(pair.status, 503)
  const read = await worker.fetch(
    req('/api/state', { headers: { Authorization: 'Bearer dev-1.anything' } }),
    env(db, null),
  )
  assert.equal(read.status, 401)
})

test('brute-forcing the PIN runs out of attempts', async () => {
  const db = new FakeDB()
  let last = 200
  for (let i = 0; i < 9; i += 1) {
    const { res } = await pairUp(db, `dev-${i}`, '999999')
    last = res.status
  }
  assert.equal(last, 429)
})

test('a push MERGES with what the other device left, it does not replace it', async () => {
  const db = new FakeDB()
  const { body } = await pairUp(db, 'laptop')
  const auth = { Authorization: `Bearer ${body.token}`, 'Content-Type': 'application/json' }

  await worker.fetch(
    req('/api/state', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ state: shift({ made: [pour('a', 'Beer')], opening: { ...EMPTY_DENOMS, twenties: 17 }, clocks: { ...EMPTY_CLOCKS, opening: 1000 } }) }),
    }),
    env(db),
  )

  // The phone has never seen entry 'a' and pushes only its own.
  const res = await worker.fetch(
    req('/api/state', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ state: shift({ made: [pour('b', 'Wine')] }) }),
    }),
    env(db),
  )
  const merged = (await res.json()) as { state: ReturnType<typeof shift> }
  assert.deepEqual(merged.state.made.map((m) => m.id).sort(), ['a', 'b'])
  assert.equal(merged.state.opening.twenties, 17, 'the laptop’s count was erased by a phone that never had it')
})

test('two devices pushing at the same instant — neither count is lost', async () => {
  // The lost-update race, forced: something else writes in between this
  // request's read and its write, so the conditional UPDATE must fail and the
  // Worker must re-read, re-merge and try again.
  const db = new FakeDB()
  const { body } = await pairUp(db, 'laptop')
  const auth = { Authorization: `Bearer ${body.token}`, 'Content-Type': 'application/json' }

  await worker.fetch(
    req('/api/state', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ state: shift({ made: [pour('a', 'Beer')] }) }),
    }),
    env(db),
  )

  let sneaked = false
  db.interlope = () => {
    if (sneaked) return
    sneaked = true
    // Another device lands its own push first.
    db.row = {
      data: JSON.stringify(shift({ made: [pour('a', 'Beer'), pour('c', 'Seltzer')] })),
      rev: (db.row?.rev ?? 0) + 1,
    }
  }

  const res = await worker.fetch(
    req('/api/state', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ state: shift({ made: [pour('a', 'Beer'), pour('b', 'Wine')] }) }),
    }),
    env(db),
  )
  assert.equal(res.status, 200)
  const merged = (await res.json()) as { state: ReturnType<typeof shift> }
  assert.ok(sneaked, 'the race never actually happened')
  assert.deepEqual(
    merged.state.made.map((m) => m.id).sort(),
    ['a', 'b', 'c'],
    'a concurrent push was flattened',
  )
})

test('garbage on the wire cannot corrupt the ledger', async () => {
  const db = new FakeDB()
  const { body } = await pairUp(db, 'laptop')
  const auth = { Authorization: `Bearer ${body.token}`, 'Content-Type': 'application/json' }

  const bad = await worker.fetch(
    req('/api/state', { method: 'POST', headers: auth, body: 'not json' }),
    env(db),
  )
  assert.equal(bad.status, 400)

  const junk = await worker.fetch(
    req('/api/state', { method: 'POST', headers: auth, body: JSON.stringify({ state: { made: 'nope' } }) }),
    env(db),
  )
  assert.equal(junk.status, 200)
  const merged = (await junk.json()) as { state: ReturnType<typeof shift> }
  assert.deepEqual(merged.state.made, [])
})

test('the browser is only let in from the real app', async () => {
  const db = new FakeDB()
  const res = await worker.fetch(
    new Request('https://vip-drinks-sync.workers.dev/api/health', {
      headers: { Origin: 'https://not-the-app.example' },
    }),
    env(db),
  )
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), null)
  const good = await worker.fetch(req('/api/health'), env(db))
  assert.equal(good.headers.get('Access-Control-Allow-Origin'), ORIGIN)
})
