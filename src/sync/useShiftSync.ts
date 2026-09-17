import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppState } from '../types.ts'
import { mergeState, pull, push, setSyncUrl, syncUrl, type SyncStatus } from './client.ts'

/** How long after the last tap we wait before sending. */
const PUSH_DEBOUNCE_MS = 1500
/** How often a visible tab asks what the other device has been doing. */
const PULL_EVERY_MS = 15_000

/**
 * Keeps this device's shift and the shared ledger in step, with nothing to set up.
 *
 * Auto-save is the whole point -- nobody taps a save button with a rail full of
 * orders -- so a change is sent a second and a half after the last tap, and
 * again the instant the screen is backgrounded. That last one matters more than
 * the timer: a phone going into a pocket is the normal way this app is put down.
 */
export function useShiftSync(
  state: AppState,
  applyRemote: (next: AppState) => void,
): { status: SyncStatus; setAddress: (url: string) => void; refresh: () => void } {
  const [status, setStatus] = useState<SyncStatus>(() =>
    syncUrl() ? { kind: 'ok', at: 0 } : { kind: 'off' },
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
    setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Sync failed.' })
  }, [])

  const send = useCallback(async () => {
    if (!syncUrl()) return
    const local = latest.current
    const serialized = JSON.stringify(local)
    if (serialized === lastSent.current) return
    // A phone going into a pocket can be frozen before an ordinary fetch
    // finishes. keepalive is what makes that last save leave the device.
    const closing = typeof document !== 'undefined' && document.visibilityState === 'hidden'
    try {
      absorb(mergeState(local, await push(local, closing)))
    } catch (err) {
      fail(err)
    }
  }, [absorb, fail])

  const refresh = useCallback(() => {
    if (!syncUrl()) return
    pull()
      .then((remote) => absorb(mergeState(latest.current, remote)))
      .catch(fail)
  }, [absorb, fail])

  // First contact: take what the other device left, merge it in, send the result.
  const join = useCallback(async () => {
    if (!syncUrl()) return
    try {
      const merged = mergeState(latest.current, await pull())
      applyRef.current(merged)
      lastSent.current = ''
      setStatus({ kind: 'ok', at: Date.now() })
      absorb(mergeState(merged, await push(merged)))
    } catch (err) {
      fail(err)
    }
  }, [absorb, fail])

  useEffect(() => {
    void join()
  }, [join])

  // Auto-save.
  useEffect(() => {
    if (!syncUrl()) return
    const id = window.setTimeout(send, PUSH_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [state, send])

  // Backgrounding is the real save point on a phone.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void send()
      else refresh()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', send)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
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

  /** Recovery only: point this device at a different Worker, no rebuild. */
  const setAddress = useCallback(
    (url: string) => {
      setSyncUrl(url)
      setStatus(syncUrl() ? { kind: 'ok', at: 0 } : { kind: 'off' })
      void join()
    },
    [join],
  )

  return { status, setAddress, refresh }
}
