import { mergeState, normalizeState } from '../src/sync/merge.ts'

/**
 * The shared shift ledger behind VIP Drinks.
 *
 * It holds exactly one document -- tonight's shift -- and its only real job is
 * to be the place two devices can both be wrong about at the same time and
 * still come out agreeing. It imports the SAME merge function the app uses
 * rather than reimplementing it, because a server that merges slightly
 * differently from the client is a bug that only shows up on a busy night.
 */

interface Env {
  DB: D1Database
  /**
   * The bar's PIN, set with
   *   npx wrangler secret put OWNER_PIN --config sync-worker/wrangler.jsonc
   *
   * Unset, every authenticated route returns 401 rather than falling open. A
   * Worker deployed without its secret should be loudly broken, not quietly a
   * public read-write ledger of somebody's till.
   */
  OWNER_PIN?: string
}

const STATE_ID = 'shift'
const PAGES_ORIGIN = 'https://thomasg42.github.io'
const MAX_BODY_BYTES = 400_000

/** Bumping this invalidates every device token that was ever issued. */
const DEVICE_TOKEN_VERSION = 'v1'

// Pairing is the only place a guessable secret is accepted, so it is the only
// place brute force buys anything. Eight tries an hour per caller leaves room
// for a mistyped thumb and turns a six-digit PIN into years of guessing. Every
// later request carries a full HMAC instead, which is not guessable at all.
const PAIR_RATE_LIMIT = 8
const PAIR_RATE_WINDOW_SECONDS = 3600

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get('Origin')
  if (!origin) return null
  if (origin === PAGES_ORIGIN) return origin
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin
  return null
}

function corsHeaders(request: Request): Headers {
  const headers = new Headers({
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
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

/** Compares without leaking, through timing, how much of a value matched. */
function constantTimeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a)
  const right = new TextEncoder().encode(b)
  let diff = left.length ^ right.length
  const max = Math.max(left.length, right.length)
  for (let index = 0; index < max; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0)
  }
  return diff === 0
}

function base64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * This device's half of the credential: an HMAC of its random id under the PIN.
 * Nothing is stored, so there is no device table to keep, and rotating the PIN
 * revokes every device at once -- which is what you want the morning a phone
 * goes missing.
 */
async function signDevice(pin: string, deviceId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`vip-drinks|${DEVICE_TOKEN_VERSION}|${deviceId}`),
  )
  return base64Url(signature)
}

async function authorized(request: Request, env: Env): Promise<boolean> {
  if (!env.OWNER_PIN) return false
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') || '')
  if (!match) return false
  const separator = match[1].lastIndexOf('.')
  if (separator <= 0) return false
  const deviceId = match[1].slice(0, separator)
  const signature = match[1].slice(separator + 1)
  if (!deviceId || !signature) return false
  return constantTimeEqual(signature, await signDevice(env.OWNER_PIN, deviceId))
}

/**
 * Per-caller cap on the PIN endpoint. Fails CLOSED: if the counter cannot be
 * read there is no cap, and an uncapped PIN endpoint is a six-digit secret
 * being enumerated at leisure.
 */
async function withinPairLimit(request: Request, env: Env): Promise<boolean> {
  const caller = request.headers.get('CF-Connecting-IP') || 'unknown'
  const nowSeconds = Math.floor(Date.now() / 1000)
  const window = Math.floor(nowSeconds / PAIR_RATE_WINDOW_SECONDS)
  const bucket = `pair|${caller}|${window}`
  try {
    const row = await env.DB.prepare(
      `INSERT INTO rate_usage (bucket, count, expires_at) VALUES (?1, 1, ?2)
       ON CONFLICT(bucket) DO UPDATE SET count = count + 1
       RETURNING count`,
    )
      .bind(bucket, (window + 1) * PAIR_RATE_WINDOW_SECONDS)
      .first<{ count: number }>()
    if ((row?.count ?? 0) === 1) {
      await env.DB.prepare(`DELETE FROM rate_usage WHERE expires_at < ?1`).bind(nowSeconds).run()
    }
    return (row?.count ?? 0) <= PAIR_RATE_LIMIT
  } catch {
    return false
  }
}

async function pairDevice(request: Request, env: Env): Promise<Response> {
  if (!env.OWNER_PIN) {
    return json(request, { error: 'This ledger has no PIN set yet.' }, 503)
  }
  if (!(await withinPairLimit(request, env))) {
    return json(request, { error: 'Too many PIN attempts. Try again later.' }, 429)
  }

  let payload: { pin?: unknown; deviceId?: unknown }
  try {
    payload = (await request.json()) as { pin?: unknown; deviceId?: unknown }
  } catch {
    return json(request, { error: 'Bad request.' }, 400)
  }

  const deviceId = String(payload?.deviceId ?? '').trim()
  // The id only names a device, but it is signed material -- keep it to a
  // charset that cannot smuggle the '.' separator into the token.
  if (!deviceId || deviceId.length > 100 || !/^[A-Za-z0-9-]+$/.test(deviceId)) {
    return json(request, { error: 'Bad request.' }, 400)
  }
  if (!constantTimeEqual(String(payload?.pin ?? ''), env.OWNER_PIN)) {
    return json(request, { error: 'That PIN did not work.' }, 401)
  }

  return json(request, {
    token: `${deviceId}.${await signDevice(env.OWNER_PIN, deviceId)}`,
    serverTime: Date.now(),
  })
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

    // Deliberately says nothing about whether a PIN is set: a health check that
    // reports "no PIN" tells an anonymous caller exactly when to come back.
    if (url.pathname === '/api/health') {
      return json(request, { ok: true, serverTime: Date.now() })
    }

    if (url.pathname === '/api/pair' && request.method === 'POST') {
      return pairDevice(request, env)
    }

    if (url.pathname === '/api/state') {
      if (!(await authorized(request, env))) {
        return json(request, { error: 'Not connected.' }, 401)
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
