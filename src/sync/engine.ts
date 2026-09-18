import type { AppState } from '../types.ts'
import { mergeState } from './merge.ts'

export type SaveStatus =
  | { kind: 'off' }
  | { kind: 'saving' }
  | { kind: 'pending' }
  | { kind: 'ok'; at: number }
  | { kind: 'error'; message: string }

type Options = {
  read: () => AppState
  apply: (state: AppState) => void
  pull: () => Promise<AppState>
  push: (state: AppState, closing?: boolean) => Promise<AppState>
  enabled: () => boolean
  status: (status: SaveStatus) => void
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return Object.fromEntries(Object.keys(record).sort().map(key => [key, canonical(record[key])]))
  }
  return value
}
const same = (a: AppState, b: AppState) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))

/** Responses merge with current edits; a read never marks unsent edits as saved. */
export function createSyncEngine(options: Options) {
  let running: Promise<boolean> | null = null
  let repeat = false
  async function reconcile(closing: boolean): Promise<boolean> {
    options.status({ kind: 'saving' })
    try {
      let remote = closing ? await options.push(options.read(), true) : await options.pull()
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const merged = mergeState(options.read(), remote)
        if (!same(merged, options.read())) options.apply(merged)
        if (same(merged, remote)) {
          options.status({ kind: 'ok', at: Date.now() })
          return true
        }
        remote = await options.push(merged, closing)
      }
      const merged = mergeState(options.read(), remote)
      if (!same(merged, options.read())) options.apply(merged)
      const saved = same(merged, remote)
      options.status(saved ? { kind: 'ok', at: Date.now() } : { kind: 'pending' })
      return saved
    } catch (error) {
      options.status({ kind: 'error', message: error instanceof Error ? error.message : 'Save failed' })
      return false
    }
  }
  async function save(closing = false): Promise<boolean> {
    if (!options.enabled()) { options.status({ kind: 'off' }); return false }
    if (running) {
      repeat = true
      // A regular fetch may freeze on pagehide; send an extra idempotent keepalive.
      if (closing) void options.push(options.read(), true).catch(() => {})
      return running
    }
    running = (async () => {
      let saved: boolean
      do { repeat = false; saved = await reconcile(closing) } while (repeat)
      return saved
    })()
    try { return await running } finally { running = null }
  }
  return { save }
}
