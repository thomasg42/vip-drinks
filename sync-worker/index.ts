import { mergeState, normalizeState } from '../src/sync/merge.ts'

/**
 * The shared shift ledger behind VIP Drinks.
 *
 * It holds exactly one document -- tonight's shift -- and its only real job is
 * to be the place two devices can both be wrong about at the same time and
 * still come out agreeing. It imports the SAME merge function the app uses
 * rather than reimplementing it, because a server that merges slightly
 * differently from the client is a bug that only shows up on a busy night.
 *
 * IT IS OPEN ON PURPOSE. Thomas's call, made twice and deliberately: anyone
 * who has the app syncs, with nothing to type. There is no PIN, no token and no
 * account. The address is published inside the app's JavaScript and the repo is
 * public, so anyone who views source can read tonight's drawer count and
 * overwrite it. The Origin check and the rate limit below are speed bumps
 * against other websites and against hammering -- they are NOT protection from
 * a person who means it. Closing it later is a small change to this file.
 */

interface Env {
  DB: D1Database
}

const STATE_ID = 'shift'
const PAGES_ORIGIN = 'https://thomasg42.github.io'
const MAX_BODY_BYTES = 400_000

// One bartender's phone is a few hundred writes a shift. Anything past this is
// a stuck loop or somebody's script, and either way it should stop.
const WRITE_LIMIT = 600
const WRITE_WINDOW_SECONDS = 300

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get('Origin')
  if (!origin) return null
  if (origin === PAGES_ORIGIN) return origin
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin
  return null
}

function corsHeaders(request: Request): Headers {
  const headers = new Headers({
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  })
  const origin = allowedOrigin(request)
  if (origin) headers.set('Access-Control-Allow-Origin', origin)
  return headers
}

function json(request: Request, payload: unknown, status = 200): Response {
  const headers = corsHeaders(request)
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Cache-Control', 'no-store')
  return new Response(JSON.stringify(payload), { status, headers })
}

/**
 * A write from a browser must come from the app itself.
 *
 * A browser sets Origin and will not let a page lie about it, so this stops
 * any OTHER website scripting against this ledger in a visitor's browser. It
 * does nothing against curl, where Origin is just a header somebody typed --
 * and that is the honest limit of an endpoint with no secret.
 */
function fromSomewhereElse(request: Request): boolean {
  return request.headers.has('Origin') && allowedOrigin(request) === null
}

/** Per-caller cap on writes, so nobody can hammer the ledger flat. */
async function withinWriteLimit(request: Request, env: Env): Promise<boolean> {
  const caller = request.headers.get('CF-Connecting-IP') || 'unknown'
  const nowSeconds = Math.floor(Date.now() / 1000)
  const window = Math.floor(nowSeconds / WRITE_WINDOW_SECONDS)
  const bucket = `write|${caller}|${window}`
  try {
    const row = await env.DB.prepare(
      `INSERT INTO rate_usage (bucket, count, expires_at) VALUES (?1, 1, ?2)
       ON CONFLICT(bucket) DO UPDATE SET count = count + 1
       RETURNING count`,
    )
      .bind(bucket, (window + 1) * WRITE_WINDOW_SECONDS)
      .first<{ count: number }>()
    if ((row?.count ?? 0) === 1) {
      await env.DB.prepare(`DELETE FROM rate_usage WHERE expires_at < ?1`).bind(nowSeconds).run()
    }
    return (row?.count ?? 0) <= WRITE_LIMIT
  } catch {
    // The limiter is a courtesy, not the security boundary. Losing it must not
    // take a bartender's shift down mid-count.
    return true
  }
}

async function readState(env: Env) {
  const row = await env.DB.prepare(`SELECT data, rev FROM shift_state WHERE id = ?1`)
    .bind(STATE_ID)
    .first<{ data: string; rev: number }>()
  if (!row) return { state: normalizeState(null), rev: 0 }
  try {
    return { state: normalizeState(JSON.parse(row.data)), rev: row.rev }
  } catch {
    return { state: normalizeState(null), rev: row.rev }
  }
}

/**
 * Merge-then-write, retried on a lost race.
 *
 * The UPDATE is conditional on the revision that was read, so when two devices
 * push at the same instant the loser re-reads the winner's result and merges
 * again rather than flattening it. Without that, whichever request finished
 * second would simply erase the other's count.
 */
async function writeState(env: Env, incoming: unknown) {
  const candidate = normalizeState(incoming)
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { state: current, rev } = await readState(env)
    const merged = mergeState(current, candidate)
    const result = await env.DB.prepare(
      `INSERT INTO shift_state (id, data, rev, updated_at)
       VALUES (?1, ?2, 1, ?3)
       ON CONFLICT(id) DO UPDATE SET data = ?2, rev = shift_state.rev + 1, updated_at = ?3
       WHERE shift_state.rev = ?4`,
    )
      .bind(STATE_ID, JSON.stringify(merged), new Date().toISOString(), rev)
      .run()
    if (result.meta.changes > 0) return { state: merged, rev: rev + 1 }
  }
  throw new Error('busy')
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    if (url.pathname === '/api/health') {
      return json(request, { ok: true, serverTime: Date.now() })
    }

    if (url.pathname === '/api/state') {
      if (fromSomewhereElse(request)) {
        return json(request, { error: 'Not this ledger.' }, 403)
      }

      if (request.method === 'GET') {
        const { state, rev } = await readState(env)
        return json(request, { state, rev, serverTime: Date.now() })
      }

      if (request.method === 'POST') {
        const raw = await request.text()
        if (raw.length > MAX_BODY_BYTES) {
          return json(request, { error: 'That shift is too big to store.' }, 413)
        }
        if (!(await withinWriteLimit(request, env))) {
          return json(request, { error: 'Too many writes. Try again shortly.' }, 429)
        }
        let payload: { state?: unknown }
        try {
          payload = JSON.parse(raw) as { state?: unknown }
        } catch {
          return json(request, { error: 'Bad request.' }, 400)
        }
        try {
          const { state, rev } = await writeState(env, payload?.state)
          return json(request, { state, rev, serverTime: Date.now() })
        } catch {
          return json(request, { error: 'The ledger is busy. It will retry.' }, 503)
        }
      }
    }

    return json(request, { error: 'Not found.' }, 404)
  },
}
