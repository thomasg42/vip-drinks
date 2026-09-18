import assert from 'node:assert/strict'
import test from 'node:test'
import { saveState, loadState } from '../src/storage.ts'
import { normalizeState } from '../src/sync/merge.ts'

test('cash and notes persist locally without a network request', () => {
  const data = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  } })
  const state = normalizeState({ opening: { hundreds: 1 }, notes: 'offline test' })
  assert.equal(saveState(state), true)
  assert.deepEqual(loadState(), state)
})

test('blocked storage reports failure instead of claiming an offline save', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    setItem: () => { throw new Error('quota exceeded') },
  } })
  assert.equal(saveState(normalizeState({})), false)
})
