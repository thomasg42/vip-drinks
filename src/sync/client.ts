import type { AppState } from '../types.ts'
import { mergeState, normalizeState } from './merge.ts'

/**
 * Talks to the shared shift ledger.
 *
 * There is nothing to connect, no PIN and no button: if the app was built with
 * a ledger address, every device that opens it is already on the same shift.
 * Thomas's call, and it is why the whole pairing layer is gone.
 *
 * The app still works with no address at all -- it falls back to this device's
 * own storage exactly as before. What it must never do is look synced when it
 * is not, so every state here is named on screen.
 */

const URL_KEY = 'vip-drinks-sync-url'

/**
 * Where the ledger lives. Set at build time by deploy.sh from the address
 * deploy-worker.sh wrote, so the two cannot drift apart. A device can still be
 * pointed elsewhere at runtime without a rebuild, which is the escape hatch if
 * the Worker is ever redeployed under another name.
 */
const BUILD_URL = (import.meta.env?.VITE_SYNC_URL as string | undefined) ?? ''

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function syncUrl(): string {
  return (safeGet(URL_KEY) || BUILD_URL).replace(/\/+$/, '')
}

export function setSyncUrl(url: string) {
  const clean = url.trim().replace(/\/+$/, '')
  try {
    if (clean) localStorage.setItem(URL_KEY, clean)
    else localStorage.removeItem(URL_KEY)
  } catch {
    /* private mode; the build-time address still applies */
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
  | { kind: 'ok'; at: number }
  | { kind: 'error'; message: string }

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
  const base = syncUrl()
  if (!base) throw new Error('No ledger address in this build.')
  const payload = state ? JSON.stringify({ state }) : undefined
  const res = await fetch(`${base}/api/state`, {
    method,
    headers: state ? { 'Content-Type': 'application/json' } : undefined,
    body: payload,
    keepalive: closing && !!payload && payload.length < KEEPALIVE_LIMIT_BYTES,
  })
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
