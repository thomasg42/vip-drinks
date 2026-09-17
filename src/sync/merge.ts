import {
  EMPTY_CLOCKS,
  EMPTY_DENOMS,
  type AppState,
  type Clocks,
  type MadeEntry,
  type SavedShift,
} from '../types.ts'

/**
 * One shift, two devices, no server-side locking.
 *
 * This is the whole cross-device story: both the phone and the laptop send
 * their copy, and whoever receives it runs THIS function. It has to be
 * commutative (order of arrival must not matter) and idempotent (the same
 * payload twice must not change anything), or a bartender loses a drawer count
 * to a race they cannot see and will not believe.
 *
 * Two different rules, because the data is two different shapes:
 *
 *  - LISTS grow. Drinks made and past shifts are a union by id, minus the
 *    tombstones, so nothing said on one device is dropped by the other.
 *  - READINGS replace. A cash count is one person looking in one drawer at one
 *    moment. Merging $340 and $280 into $620 or $310 would both be lies, so the
 *    newest reading wins outright and the older one is discarded.
 */

const MAX_HISTORY = 40
const MAX_TOMBSTONES = 500

function newer(a: number, b: number): boolean {
  return a > b
}

/**
 * An untouched default: a drawer counted as nothing, an empty note, no shift.
 *
 * It matters because of the upgrade. A shift saved by the previous version has
 * no clocks at all, so every one of its fields reads as time 0 -- and a first
 * sync against an empty ledger is therefore a dead heat between a real count
 * and nothing. Ordering that tie by anything except "is there actually a number
 * here" wipes a bartender's open drawer count to ship a feature.
 */
function isBlank(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  if (typeof value === 'object') {
    const entries = Object.values(value as Record<string, unknown>)
    return entries.length > 0 && entries.every((v) => v === 0 || v === '' || v === null)
  }
  return false
}

function pickByClock<T>(
  aValue: T,
  aClock: number,
  bValue: T,
  bClock: number,
): T {
  if (newer(aClock, bClock)) return aValue
  if (newer(bClock, aClock)) return bValue
  // A dead heat, which the upgrade above and two devices stamped from the same
  // server millisecond can both produce. Something real beats nothing...
  const blankA = isBlank(aValue)
  const blankB = isBlank(bValue)
  if (blankA !== blankB) return blankA ? bValue : aValue
  // ...and past that, anything deterministic will do, as long as BOTH sides
  // choose the same one -- otherwise they disagree forever and push each
  // other's copy back and forth for the rest of the night.
  const left = JSON.stringify(aValue)
  const right = JSON.stringify(bValue)
  return left <= right ? aValue : bValue
}

function unionById<T extends { id: string }>(a: T[], b: T[]): Map<string, T> {
  const out = new Map<string, T>()
  for (const item of [...a, ...b]) {
    if (item && typeof item.id === 'string' && item.id) out.set(item.id, item)
  }
  return out
}

function clocksOf(state: Partial<AppState> | null | undefined): Clocks {
  return { ...EMPTY_CLOCKS, ...state?.clocks }
}

/** Merges two copies of the shift into one both devices will agree on. */
export function mergeState(a: AppState, b: AppState): AppState {
  const ca = clocksOf(a)
  const cb = clocksOf(b)

  const removed = [...new Set([...(a.removed ?? []), ...(b.removed ?? [])])]
  const dead = new Set(removed)

  const made: MadeEntry[] = [...unionById(a.made ?? [], b.made ?? []).values()]
    .filter((entry) => !dead.has(entry.id))
    .sort((x, y) => (x.madeAt < y.madeAt ? 1 : x.madeAt > y.madeAt ? -1 : 0))

  const history: SavedShift[] = [...unionById(a.history ?? [], b.history ?? []).values()]
    .sort((x, y) => (x.endedAt < y.endedAt ? 1 : x.endedAt > y.endedAt ? -1 : 0))
    .slice(0, MAX_HISTORY)

  // Saved videos are per-drink and almost never collide. When they do, the side
  // with the newer videos clock wins the contested key -- not the whole map, so
  // a video saved only on the phone is never dropped.
  const videos: Record<string, string> = { ...b.videos, ...a.videos }
  for (const key of Object.keys(videos)) {
    const left = a.videos?.[key]
    const right = b.videos?.[key]
    if (left && right && left !== right) {
      videos[key] = pickByClock(left, ca.videos, right, cb.videos)
    }
  }

  return {
    made,
    history,
    videos,
    // Tombstones are kept newest-last and capped; an unbounded list would grow
    // for the life of the bar.
    removed: removed.slice(-MAX_TOMBSTONES),
    opening: pickByClock(a.opening ?? EMPTY_DENOMS, ca.opening, b.opening ?? EMPTY_DENOMS, cb.opening),
    closing: pickByClock(a.closing ?? EMPTY_DENOMS, ca.closing, b.closing ?? EMPTY_DENOMS, cb.closing),
    notes: pickByClock(a.notes ?? '', ca.notes, b.notes ?? '', cb.notes),
    shiftStartedAt: pickByClock(
      a.shiftStartedAt ?? null,
      ca.shift,
      b.shiftStartedAt ?? null,
      cb.shift,
    ),
    clocks: {
      opening: Math.max(ca.opening, cb.opening),
      closing: Math.max(ca.closing, cb.closing),
      notes: Math.max(ca.notes, cb.notes),
      shift: Math.max(ca.shift, cb.shift),
      videos: Math.max(ca.videos, cb.videos),
    },
  }
}

/** Fills in anything a device sent short, so a merge never reads undefined. */
export function normalizeState(raw: unknown): AppState {
  const value = (raw ?? {}) as Partial<AppState>
  return {
    made: Array.isArray(value.made) ? value.made : [],
    videos: value.videos && typeof value.videos === 'object' ? value.videos : {},
    opening: { ...EMPTY_DENOMS, ...value.opening },
    closing: { ...EMPTY_DENOMS, ...value.closing },
    notes: typeof value.notes === 'string' ? value.notes : '',
    shiftStartedAt: typeof value.shiftStartedAt === 'string' ? value.shiftStartedAt : null,
    history: Array.isArray(value.history) ? value.history : [],
    removed: Array.isArray(value.removed) ? value.removed.filter((id) => typeof id === 'string') : [],
    clocks: clocksOf(value),
  }
}
