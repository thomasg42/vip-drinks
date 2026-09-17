import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeState, normalizeState } from '../src/sync/merge.ts'
import { EMPTY_CLOCKS, EMPTY_DENOMS, type AppState, type Denoms } from '../src/types.ts'

/**
 * The merge is the only thing standing between "two devices" and "a lost
 * drawer count". These tests drive the exact sequences that produce one.
 */

function base(over: Partial<AppState> = {}): AppState {
  return normalizeState({
    made: [],
    videos: {},
    opening: { ...EMPTY_DENOMS },
    closing: { ...EMPTY_DENOMS },
    notes: '',
    shiftStartedAt: null,
    history: [],
    removed: [],
    clocks: { ...EMPTY_CLOCKS },
    ...over,
  })
}

const cash = (twenties: number): Denoms => ({ ...EMPTY_DENOMS, twenties })
const pour = (id: string, at: string) => ({ id, drinkId: 'quick-beer', name: 'Beer', madeAt: at })

test('merging is commutative — which device happens to push first cannot change the answer', () => {
  const phone = base({
    made: [pour('a', '2026-09-17T20:00:00.000Z')],
    opening: cash(17),
    clocks: { ...EMPTY_CLOCKS, opening: 2000 },
  })
  const laptop = base({
    made: [pour('b', '2026-09-17T20:05:00.000Z')],
    closing: cash(31),
    clocks: { ...EMPTY_CLOCKS, closing: 3000 },
  })
  assert.deepEqual(mergeState(phone, laptop), mergeState(laptop, phone))
})

test('merging is idempotent — the same push twice changes nothing', () => {
  const phone = base({ made: [pour('a', '2026-09-17T20:00:00.000Z')], notes: 'tips split' , clocks: { ...EMPTY_CLOCKS, notes: 9 } })
  const laptop = base({ made: [pour('b', '2026-09-17T20:05:00.000Z')] })
  const once = mergeState(phone, laptop)
  assert.deepEqual(mergeState(once, laptop), once)
  assert.deepEqual(mergeState(once, once), once)
})

test('the NEWER cash count wins outright — it is never summed or averaged', () => {
  // $340 counted on the laptop, then recounted as $280 on the phone a minute later.
  const laptop = base({ opening: cash(17), clocks: { ...EMPTY_CLOCKS, opening: 1_000 } })
  const phone = base({ opening: cash(14), clocks: { ...EMPTY_CLOCKS, opening: 60_000 } })
  const merged = mergeState(laptop, phone)
  assert.equal(merged.opening.twenties, 14, 'the recount must win')
  assert.equal(merged.clocks.opening, 60_000)
  // And it does not survive as a sum of the two, which is the failure that
  // would look plausible on screen and be wrong by a full drawer.
  assert.notEqual(merged.opening.twenties, 31)
})

test('a STALE device pushing later does not overwrite the newer count', () => {
  // The laptop has been asleep with an old count and wakes up mid-shift.
  const fresh = base({ closing: cash(20), clocks: { ...EMPTY_CLOCKS, closing: 90_000 } })
  const stale = base({ closing: cash(3), clocks: { ...EMPTY_CLOCKS, closing: 10_000 } })
  assert.equal(mergeState(fresh, stale).closing.twenties, 20)
  assert.equal(mergeState(stale, fresh).closing.twenties, 20)
})

test('drinks made on both devices all survive', () => {
  const phone = base({ made: [pour('a', '2026-09-17T20:00:00.000Z'), pour('b', '2026-09-17T20:01:00.000Z')] })
  const laptop = base({ made: [pour('c', '2026-09-17T20:02:00.000Z')] })
  const merged = mergeState(phone, laptop)
  assert.deepEqual(merged.made.map((m) => m.id).sort(), ['a', 'b', 'c'])
  // Newest first, the order the log renders in.
  assert.equal(merged.made[0].id, 'c')
})

test('an undo on one device is NOT resurrected by the other', () => {
  // This is the bug a plain union silently has: the phone removes a pour, the
  // laptop still has it, and the next merge puts it straight back.
  const phone = base({ made: [pour('a', '2026-09-17T20:00:00.000Z')], removed: ['b'] })
  const laptop = base({ made: [pour('a', '2026-09-17T20:00:00.000Z'), pour('b', '2026-09-17T20:01:00.000Z')] })
  const merged = mergeState(phone, laptop)
  assert.deepEqual(merged.made.map((m) => m.id), ['a'])
  // And it stays gone when the laptop pushes its unchanged copy again.
  assert.deepEqual(mergeState(merged, laptop).made.map((m) => m.id), ['a'])
})

test('ending the shift clears the sheet on the other device too', () => {
  const closing = base({
    made: [],
    removed: ['a', 'b'],
    shiftStartedAt: null,
    history: [
      {
        id: 's1',
        startedAt: '2026-09-17T18:00:00.000Z',
        endedAt: '2026-09-18T02:00:00.000Z',
        openingTotal: 340,
        closingTotal: 812,
        drinkTickets: 0,
        drinksMade: 2,
        notes: '',
      },
    ],
    clocks: { ...EMPTY_CLOCKS, shift: 5000 },
  })
  const stillOpen = base({
    made: [pour('a', '2026-09-17T20:00:00.000Z'), pour('b', '2026-09-17T21:00:00.000Z')],
    shiftStartedAt: '2026-09-17T18:00:00.000Z',
    clocks: { ...EMPTY_CLOCKS, shift: 1000 },
  })
  const merged = mergeState(closing, stillOpen)
  assert.deepEqual(merged.made, [], 'the new shift must not start with the old shift’s tally')
  assert.equal(merged.shiftStartedAt, null)
  assert.equal(merged.history.length, 1, 'the closed shift is banked')
})

test('the memory bank keeps shifts closed on either device, newest first', () => {
  const shift = (id: string, endedAt: string) => ({
    id,
    startedAt: endedAt,
    endedAt,
    openingTotal: 100,
    closingTotal: 200,
    drinkTickets: 0,
    drinksMade: 1,
    notes: '',
  })
  const phone = base({ history: [shift('friday', '2026-09-18T02:00:00.000Z')] })
  const laptop = base({ history: [shift('saturday', '2026-09-19T02:00:00.000Z')] })
  const merged = mergeState(phone, laptop)
  assert.deepEqual(merged.history.map((h) => h.id), ['saturday', 'friday'])
})

test('a saved video from one device is never dropped by the other', () => {
  const phone = base({ videos: { 'fireball-shot': 'aaaaaaaaaaa' }, clocks: { ...EMPTY_CLOCKS, videos: 10 } })
  const laptop = base({ videos: { 'vodka-water': 'bbbbbbbbbbb' }, clocks: { ...EMPTY_CLOCKS, videos: 20 } })
  const merged = mergeState(phone, laptop)
  assert.equal(merged.videos['fireball-shot'], 'aaaaaaaaaaa')
  assert.equal(merged.videos['vodka-water'], 'bbbbbbbbbbb')
})

test('a v3 shift saved before any of this existed merges without losing its count', () => {
  // What is actually in a bartender's browser the moment the new bundle lands.
  const legacy = normalizeState({
    made: [pour('a', '2026-09-17T20:00:00.000Z')],
    videos: {},
    opening: { ...EMPTY_DENOMS, twenties: 17 },
    closing: { ...EMPTY_DENOMS },
    notes: 'carried over',
    shiftStartedAt: '2026-09-17T18:00:00.000Z',
    history: [],
  })
  assert.deepEqual(legacy.removed, [])
  assert.deepEqual(legacy.clocks, EMPTY_CLOCKS)
  const merged = mergeState(legacy, base())
  assert.equal(merged.opening.twenties, 17, 'the pre-upgrade count must survive')
  assert.equal(merged.notes, 'carried over')
  assert.equal(merged.made.length, 1)
})

test('normalizeState refuses to trust anything the wire hands it', () => {
  for (const junk of [null, undefined, 42, 'nope', [], { made: 'not a list', clocks: 7 }]) {
    const state = normalizeState(junk)
    assert.ok(Array.isArray(state.made))
    assert.ok(Array.isArray(state.history))
    assert.ok(Array.isArray(state.removed))
    assert.equal(typeof state.notes, 'string')
    assert.equal(typeof state.clocks.opening, 'number')
  }
})
