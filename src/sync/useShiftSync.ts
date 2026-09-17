import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppState } from '../types.ts'
import {
  forgetToken,
  mergeState,
  pair,
  pull,
  push,
  setSyncUrl,
  syncUrl,
  token,
  type SyncStatus,
} from './client.ts'

/** How long after the last tap we wait before sending. */
const PUSH_DEBOUNCE_MS = 1500
/** How often a visible tab asks what the other device has been doing. */
const PULL_EVERY_MS = 15_000

/**
 * Keeps this device's shift and the shared ledger in step.
 *
 * Auto-save is the whole point -- nobody taps a save button with a rail full of
 * orders -- so a change is sent a second and a half after the last tap, and
 * again the instant the screen is backgrounded or the app is closed. That last
 * one matters more than the timer: a phone going into a pocket mid-count is the
 * normal way this app is put down.
 */
export function useShiftSync(
  state: AppState,
  applyRemote: (next: AppState) => void,
): {
  status: SyncStatus
  connect: (pin: string, url?: string) => Promise<void>
  disconnect: () => void
  refresh: () => void
} {
  const [status, setStatus] = useState<SyncStatus>(() =>
    !syncUrl() ? { kind: 'off' } : token() ? { kind: 'ok', at: 0 } : { kind: 'unpaired' },
  )

  // The live state, read by callbacks that must not re-subscribe on every tap.
  const latest = useRef(state)
  latest.current = state
  const lastSent = useRef<string>('')
  const applyRef = useRef(applyRemote)
  applyRef.current = applyRemote

  const absorb = useCallback((merged: AppState) => {
    const serialized = JSON.stringify(merged)
    lastSent.current = serialized
    // Only disturb React when the answer actually differs, or the push effect
    // re-fires on its own result and the two devices talk forever.
    if (serialized !== JSON.stringify(latest.current)) applyRef.current(merged)
    setStatus({ kind: 'ok', at: Date.now() })
  }, [])

  const fail = useCallback((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Sync failed.'
    setStatus(token() ? { kind: 'error', message } : { kind: 'unpaired' })
  }, [])

  const send = useCallback(async () => {
    if (!syncUrl() || !token()) return
    const local = latest.current
    const serialized = JSON.stringify(local)
    if (serialized === lastSent.current) return
    // A phone going into a pocket is the normal way this app is put down, and
    // the tab can be frozen before an ordinary fetch finishes. keepalive is what
    // makes that last save actually leave the device.
    const closing = typeof document !== 'undefined' && document.visibilityState === 'hidden'
    try {
      absorb(mergeState(local, await push(local, closing)))
    } catch (err) {
      fail(err)
    }
  }, [absorb, fail])

  const refresh = useCallback(() => {
    if (!syncUrl() || !token()) return
    pull()
      .then((remote) => absorb(mergeState(latest.current, remote)))
      .catch(fail)
  }, [absorb, fail])

  // First contact: take what the other device left, merge it in, send the result.
  useEffect(() => {
    if (!syncUrl() || !token()) return
    let cancelled = false
    pull()
      .then((remote) => {
        if (cancelled) return
        const merged = mergeState(latest.current, remote)
        applyRef.current(merged)
        lastSent.current = ''
        setStatus({ kind: 'ok', at: Date.now() })
        return push(merged).then((confirmed) => {
          if (!cancelled) absorb(mergeState(merged, confirmed))
        })
      })
      .catch((err) => {
        if (!cancelled) fail(err)
      })
    return () => {
      cancelled = true
    }
  }, [absorb, fail])

  // Auto-save.
  useEffect(() => {
    if (!syncUrl() || !token()) return
    const id = window.setTimeout(send, PUSH_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [state, send])

  // Backgrounding is the real save point on a phone.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') void send()
      else refresh()
    }
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', send)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', send)
    }
  }, [send, refresh])

  // Keep an open tab honest about what the other device is doing.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, PULL_EVERY_MS)
    return () => window.clearInterval(id)
  }, [refresh])

  const connect = useCallback(
    async (pin: string, url?: string) => {
      if (url !== undefined) setSyncUrl(url)
      if (!syncUrl()) throw new Error('Paste the sync address first.')
      await pair(pin)
      const remote = await pull()
      const merged = mergeState(latest.current, remote)
      applyRef.current(merged)
      lastSent.current = ''
      absorb(mergeState(merged, await push(merged)))
    },
    [absorb],
  )

  const disconnect = useCallback(() => {
    forgetToken()
    setStatus(syncUrl() ? { kind: 'unpaired' } : { kind: 'off' })
  }, [])

  return { status, connect, disconnect, refresh }
}
