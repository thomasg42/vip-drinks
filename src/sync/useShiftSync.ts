import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppState } from '../types.ts'
import { saveState } from '../storage.ts'
import { pull, push, setSyncUrl, syncUrl, type SyncStatus } from './client.ts'
import { createSyncEngine } from './engine.ts'

const PUSH_DEBOUNCE_MS = 800
const PULL_EVERY_MS = 15_000

export function useShiftSync(state: AppState, applyRemote: (next: AppState) => void) {
  const [status, setStatus] = useState<SyncStatus>({ kind: 'pending' })
  const [localSaved, setLocalSaved] = useState(false)
  const latest = useRef(state)
  latest.current = state
  const applyRef = useRef(applyRemote)
  applyRef.current = applyRemote
  const engine = useRef<ReturnType<typeof createSyncEngine> | null>(null)
  if (!engine.current) engine.current = createSyncEngine({
    read: () => latest.current,
    apply: (next) => {
      latest.current = next
      setLocalSaved(saveState(next))
      applyRef.current(next)
    },
    pull, push, enabled: () => Boolean(syncUrl()), status: setStatus,
  })

  const save = useCallback(() => {
    setLocalSaved(saveState(latest.current))
    return engine.current!.save()
  }, [])
  const refresh = useCallback(() => { void save() }, [save])

  useEffect(() => { void save() }, [save])
  useEffect(() => {
    setLocalSaved(saveState(state))
    setStatus(syncUrl() ? { kind: 'pending' } : { kind: 'off' })
    const id = window.setTimeout(save, PUSH_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [state, save])

  useEffect(() => {
    const backgroundSave = () => {
      saveState(latest.current)
      void engine.current!.save(true)
    }
    const visibility = () => {
      if (document.visibilityState === 'hidden') backgroundSave()
      else refresh()
    }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', backgroundSave)
    window.addEventListener('online', refresh)
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, PULL_EVERY_MS)
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', backgroundSave)
      window.removeEventListener('online', refresh)
      window.clearInterval(id)
    }
  }, [refresh])

  const setAddress = useCallback((url: string) => { setSyncUrl(url); void save() }, [save])
  return { status, setAddress, refresh, save, localSaved }
}
