import { normalizeState } from './sync/merge.ts'
import { EMPTY_CLOCKS, EMPTY_DENOMS, type AppState } from './types.ts'

/**
 * v4 adds the per-field clocks and the tombstone list that make a shift
 * survive being open on two devices. A v3 shift is read straight through
 * rather than reset -- somebody is mid-shift on the old bundle the moment
 * this deploys, and dropping their drawer count to ship a feature is not a
 * trade worth making. Its clocks come up as 0, so the first real edit on
 * either device wins, which is the correct answer for a shift nobody has
 * touched since the upgrade.
 */
const KEY = 'vip-drinks-state-v4'
const LEGACY_KEY = 'vip-drinks-state-v3'

const INITIAL: AppState = {
  made: [],
  videos: {},
  opening: { ...EMPTY_DENOMS },
  closing: { ...EMPTY_DENOMS },
  notes: '',
  shiftStartedAt: null,
  history: [],
  removed: [],
  clocks: { ...EMPTY_CLOCKS },
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY)
    if (!raw) return blank()
    return normalizeState(JSON.parse(raw))
  } catch {
    return blank()
  }
}

/**
 * Tombstones only need to outlive the other device's copy of the entry they
 * bury. Unbounded, a busy season would carry every drink ever un-tapped.
 */
const MAX_TOMBSTONES = 500

export function saveState(state: AppState): boolean {
  try {
    const trimmed =
      state.removed.length > MAX_TOMBSTONES
        ? { ...state, removed: state.removed.slice(-MAX_TOMBSTONES) }
        : state
    localStorage.setItem(KEY, JSON.stringify(trimmed))
    return true
  } catch {
    /* A full or blocked store must not take the shift down with it. */
    return false
  }
}

function blank(): AppState {
  return {
    ...INITIAL,
    videos: {},
    removed: [],
    opening: { ...EMPTY_DENOMS },
    closing: { ...EMPTY_DENOMS },
    clocks: { ...EMPTY_CLOCKS },
  }
}
