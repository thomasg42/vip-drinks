import assert from 'node:assert/strict'
import test from 'node:test'
import { createSyncEngine, type SaveStatus } from '../src/sync/engine.ts'
import { mergeState, normalizeState } from '../src/sync/merge.ts'

const state = (notes = '', clock = 0) => normalizeState({ notes, clocks: { notes: clock } })

test('server normalization and JSON property order do not cause endless saving', async () => {
  let local = state('new note', 5), remote = state()
  let writes = 0
  let status: SaveStatus = { kind: 'pending' }
  const engine = createSyncEngine({
    read: () => local, apply: x => { local = x }, enabled: () => true,
    pull: async () => normalizeState(remote),
    push: async x => { writes++; remote = normalizeState(mergeState(remote, x)); return remote },
    status: x => { status = x },
  })
  assert.equal(await engine.save(), true)
  assert.equal(writes, 1)
  assert.equal((status as SaveStatus).kind, 'ok')
  assert.equal(await engine.save(), true)
  assert.equal(writes, 1, 'an unchanged refresh must not write again')
})

test('a refresh uploads unsent edits before claiming saved', async () => {
  let local = state('unsent', 2), remote = state()
  const statuses: SaveStatus[] = []
  let writes = 0
  const engine = createSyncEngine({
    read: () => local, apply: x => { local = x }, enabled: () => true,
    pull: async () => remote,
    push: async x => { writes++; remote = mergeState(remote, x); return remote },
    status: x => statuses.push(x),
  })
  assert.equal(await engine.save(), true)
  assert.equal(remote.notes, 'unsent')
  assert.equal(writes, 1)
  assert.equal(statuses.at(-1)?.kind, 'ok')
})

test('edits made during an in-flight save survive and reach the server', async () => {
  let local = state('first', 1), remote = state()
  let writes = 0
  const engine = createSyncEngine({
    read: () => local, apply: x => { local = x }, enabled: () => true,
    pull: async () => remote,
    push: async x => {
      writes++
      if (writes === 1) local = state('typed while saving', 2)
      await Promise.resolve()
      remote = mergeState(remote, x)
      return remote
    }, status: () => {},
  })
  assert.equal(await engine.save(), true)
  assert.equal(local.notes, 'typed while saving')
  assert.equal(remote.notes, local.notes)
  assert.equal(writes, 2)
})

test('failed writes remain unsaved and recover on retry', async () => {
  let local = state('keep me', 5), remote = state(), fail = true
  let status: SaveStatus = { kind: 'pending' }
  const engine = createSyncEngine({
    read: () => local, apply: x => { local = x }, enabled: () => true,
    pull: async () => remote,
    push: async x => { if (fail) throw new Error('offline'); remote = mergeState(remote, x); return remote },
    status: x => { status = x },
  })
  assert.equal(await engine.save(), false)
  assert.equal((status as SaveStatus).kind, 'error')
  assert.equal(local.notes, 'keep me')
  fail = false
  assert.equal(await engine.save(), true)
  assert.equal(remote.notes, 'keep me')
})

test('manual save during autosave waits for the same work and includes new edits', async () => {
  let local = state('first', 1), remote = state()
  let release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const engine = createSyncEngine({
    read: () => local, apply: x => { local = x }, enabled: () => true,
    pull: async () => { await gate; return remote },
    push: async x => { remote = mergeState(remote, x); return remote }, status: () => {},
  })
  const auto = engine.save()
  local = state('new edit', 2)
  const manual = engine.save()
  release()
  assert.deepEqual(await Promise.all([auto, manual]), [true, true])
  assert.equal(remote.notes, 'new edit')
})

test('history keeps more than forty closed shifts across device merges', () => {
  const history = Array.from({ length: 85 }, (_, i) => ({
    id: String(i), startedAt: new Date(i * 86400000).toISOString(),
    endedAt: new Date(i * 86400000 + 3600000).toISOString(),
    openingTotal: 100, closingTotal: 125, drinkTickets: 0, drinksMade: 0, notes: '',
  }))
  const remote = normalizeState({ history: history.slice(0, 45) })
  const local = normalizeState({ history: history.slice(40) })
  assert.equal(mergeState(local, remote).history.length, 85)
})
