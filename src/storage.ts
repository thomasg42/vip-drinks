import { EMPTY_DENOMS, type AppState, type MadeEntry } from './types'

const KEY = 'vip-drinks-state-v3'

const INITIAL: AppState = {
  made: [],
  opening: { ...EMPTY_DENOMS },
  closing: { ...EMPTY_DENOMS },
  notes: '',
  shiftStartedAt: null,
  history: [],
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return blank()
    const parsed = JSON.parse(raw) as Partial<AppState>
    const made: MadeEntry[] = parsed.made ?? []
    return {
      made,
      opening: { ...EMPTY_DENOMS, ...parsed.opening },
      closing: { ...EMPTY_DENOMS, ...parsed.closing },
      notes: parsed.notes ?? '',
      shiftStartedAt: parsed.shiftStartedAt ?? null,
      history: parsed.history ?? [],
    }
  } catch {
    return blank()
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

function blank(): AppState {
  return {
    ...INITIAL,
    opening: { ...EMPTY_DENOMS },
    closing: { ...EMPTY_DENOMS },
  }
}
