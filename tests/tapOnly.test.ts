import test from 'node:test'
import assert from 'node:assert/strict'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { tapOnly, __tapOnlyInternals } from '../src/tapOnly.ts'

/*
 * The complaint that started this: "if you scroll anywhere on there, the Old
 * Fashioned will just pop up." A drink box is 96px tall, so on a phone nearly
 * every scroll gesture starts on one, and it only takes one click leaking out of
 * a drag to open a drink nobody asked for -- or to tick one onto the shift
 * ticket. A real touch-scroll cannot be reproduced in node, so what is tested
 * here is the judgement itself: what counts as a tap and what counts as a drag.
 */

const at = (x: number, y: number) => ({ clientX: x, clientY: y }) as ReactPointerEvent

test.beforeEach(() => __tapOnlyInternals.reset())

test('a finger that goes down and straight back up opens the drink', () => {
  let opened = 0
  const h = tapOnly(() => (opened += 1))
  h.onPointerDown(at(100, 300))
  h.onClick()
  assert.equal(opened, 1)
})

test('a small wobble is still a tap -- nobody holds a phone perfectly still', () => {
  let opened = 0
  const h = tapOnly(() => (opened += 1))
  h.onPointerDown(at(100, 300))
  h.onPointerMove(at(100 + __tapOnlyInternals.SLOP - 1, 300 + 2))
  h.onClick()
  assert.equal(opened, 1)
})

test('a finger that travels up the sheet is a scroll, and opens nothing', () => {
  let opened = 0
  const h = tapOnly(() => (opened += 1))
  h.onPointerDown(at(100, 500))
  h.onPointerMove(at(102, 500 - __tapOnlyInternals.SLOP - 1))
  h.onClick()
  assert.equal(opened, 0, 'a scroll gesture opened a drink')
})

test('the browser taking the pointer away to scroll with it is a scroll too', () => {
  // This is the path iOS actually takes: pointercancel, then sometimes a click.
  let opened = 0
  const h = tapOnly(() => (opened += 1))
  h.onPointerDown(at(100, 500))
  h.onPointerCancel()
  h.onClick()
  assert.equal(opened, 0, 'a cancelled gesture opened a drink')
})

test('the next real tap after a scroll still works', () => {
  let opened = 0
  const h = tapOnly(() => (opened += 1))
  h.onPointerDown(at(100, 500))
  h.onPointerCancel()
  h.onClick()
  h.onPointerDown(at(100, 300))
  h.onClick()
  assert.equal(opened, 1, 'the tap after a scroll was swallowed')
})

test('keyboard activation always gets through -- it sends no pointer events at all', () => {
  let opened = 0
  const h = tapOnly(() => (opened += 1))
  h.onClick()
  assert.equal(opened, 1, 'Enter on a focused drink did nothing')
})

test('two drags in a row do not leave the guard stuck open', () => {
  let opened = 0
  const h = tapOnly(() => (opened += 1))
  for (const _ of [1, 2]) {
    h.onPointerDown(at(100, 500))
    h.onPointerMove(at(100, 400))
    h.onClick()
  }
  assert.equal(opened, 0)
})
