import type { PointerEvent as ReactPointerEvent } from 'react'

/** Past this much travel the finger was scrolling the sheet, not picking a drink. */
const SLOP = 10

/**
 * A browser is supposed to swallow the click that follows a drag, and on a phone
 * it does not always manage it -- which is how a drink "just popped up" while the
 * sheet was being scrolled. A drink box is 96px tall, so almost every scroll
 * gesture starts on one; it only takes one leaked click to open a recipe nobody
 * asked for, or worse, to tick a drink onto the shift ticket.
 *
 * So the gesture is judged here: remember where the finger went down, and drop the
 * click if it travelled or if the browser took the pointer away to scroll with it.
 * Keyboard activation sends no pointer events at all, so it is never mistaken for
 * a drag and always gets through.
 */
const GRACE_MS = 700

let start: { x: number; y: number } | null = null
let dragUntil = 0

function markDrag() {
  dragUntil = performance.now() + GRACE_MS
  start = null
}

export function tapOnly(onTap: () => void) {
  return {
    onPointerDown(e: ReactPointerEvent) {
      start = { x: e.clientX, y: e.clientY }
      dragUntil = 0
    },
    onPointerMove(e: ReactPointerEvent) {
      if (!start) return
      if (Math.abs(e.clientX - start.x) > SLOP || Math.abs(e.clientY - start.y) > SLOP) markDrag()
    },
    onPointerCancel() {
      markDrag()
    },
    onClick() {
      start = null
      if (performance.now() < dragUntil) {
        dragUntil = 0
        return
      }
      onTap()
    },
  }
}

/** Exposed for the tests only -- a scroll that leaks a click is not reproducible in jsdom. */
export const __tapOnlyInternals = {
  reset() {
    start = null
    dragUntil = 0
  },
  SLOP,
}
