import type { AppState } from '../types.ts'
import { mergeState, normalizeState } from './merge.ts'

/**
 * Talks to the shift ledger.
 *
 * The app works with none of this: no Worker URL, or no PIN entered, and it
 * falls straight back to the phone's own storage exactly as before. What it
 * must never do is look synced when it is not -- a bartender who believes the
 * laptop already has tonight's drawer count, and is wrong, finds out at close.
 * So every state here is named on screen.
 */

const DEVICE_KEY = 'vip-drinks-device-id'
const TOKEN_KEY = 'vip-drinks-sync-token'
const URL_KEY = 'vip-drinks-sync-url'

/**
 * Where the ledger lives. Set at build time by deploy-worker.sh, which is the
 * same script that names the Worker -- so the two cannot drift apart. A phone
 * can still be pointed somewhere else at runtime without a rebuild, which is
 * the escape hatch if the Worker is ever deployed under another name.
 */
const BUILD_URL = (import.meta.env?.VITE_SYNC_URL as string | undefined) ?? ''

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode; sync just stays off */
  }
}

export function syncUrl(): string {
  return (safeGet(URL_KEY) || BUILD_URL).replace(/\/+$/, '')
}

export function setSyncUrl(url: string) {
  const clean = url.trim().replace(/\/+$/, '')
  if (clean) safeSet(URL_KEY, clean)
  else try { localStorage.removeItem(URL_KEY) } catch { /* ignore */ }
}

export function deviceId(): string {
  const existing = safeGet(DEVICE_KEY)
  if (existing) return existing
  const fresh = `dev-${crypto.randomUUID()}`
  safeSet(DEVICE_KEY, fresh)
  return fresh
}

export function token(): string | null {
  return safeGet(TOKEN_KEY)
}

export function forgetToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * How far this device's clock is from the Worker's, in ms.
 *
 * Every merge decision is a comparison of two timestamps. If the phone is ten
 * minutes fast, its stale drawer count outranks the laptop's fresh one and the
 * bartender loses the number they just typed. Stamping from server time removes
 * that whole class of bug, so the app prefers it wherever it has one.
 */
let clockOffset = 0

export function now(): number {
  return Date.now() + clockOffset
}

function noteServerTime(serverTime: unknown) {
  if (typeof serverTime === 'number' && Number.isFinite(serverTime)) {
    clockOffset = serverTime - Date.now()
  }
}

export type SyncStatus =
  | { kind: 'off' }
  | { kind: 'unpaired' }
  | { kind: 'ok'; at: number }
  | { kind: 'error'; message: string }

async function call(path: string, init: RequestInit): Promise<Response> {
  const base = syncUrl()
  if (!base) throw new Error('No sync address set yet.')
  return fetch(`${base}${path}`, init)
}

/** Trades the bar's PIN for this device's own token, once per device. */
export async function pair(pin: string): Promise<void> {
  const res = await call('/api/pair', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: pin.trim(), deviceId: deviceId() }),
  })
  const body = (await res.json().catch(() => ({}))) as { token?: string; error?: string }
  if (!res.ok || !body.token) {
    throw new Error(body.error || 'That PIN did not work.')
  }
  safeSet(TOKEN_KEY, body.token)
}

type Envelope = { state?: unknown; serverTime?: unknown; error?: string }

/**
 * A request the browser will finish even though the page is going away.
 *
 * `keepalive` is capped at 64 KB by the spec, and a busy night's shift can pass
 * that, so it is only asked for when the body actually fits. Over the limit the
 * request is sent normally and takes its chances -- which is still better than
 * a rejected request that saves nothing at all.
 */
const KEEPALIVE_LIMIT_BYTES = 60_000

async function exchange(
  method: 'GET' | 'POST',
  state?: AppState,
  closing = false,
): Promise<AppState> {
  const auth = token()
  if (!auth) throw new Error('This device is not connected yet.')
  const payload = state ? JSON.stringify({ state }) : undefined
  const res = await call('/api/state', {
    method,
    headers: {
      Authorization: `Bearer ${auth}`,
      ...(state ? { 'Content-Type': 'application/json' } : {}),
    },
    body: payload,
    keepalive: closing && !!payload && payload.length < KEEPALIVE_LIMIT_BYTES,
  })
  if (res.status === 401) {
    // The PIN was rotated, or this token was issued by a different Worker.
    forgetToken()
    throw new Error('This device was disconnected. Enter the PIN again.')
  }
  const body = (await res.json().catch(() => ({}))) as Envelope
  if (!res.ok) throw new Error(body.error || `Sync failed (${res.status}).`)
  noteServerTime(body.serverTime)
  return normalizeState(body.state)
}

export async function pull(): Promise<AppState> {
  return exchange('GET')
}

/**
 * Sends this device's copy and returns the merged truth.
 *
 * The Worker merges too, with the same function, so a push never overwrites
 * what another device said between this device's last pull and this push.
 */
export async function push(state: AppState, closing = false): Promise<AppState> {
  return exchange('POST', state, closing)
}

/** Local-side merge, re-exported so the app has one name for it. */
export { mergeState, normalizeState }
