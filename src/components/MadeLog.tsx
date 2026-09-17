import { useRef, useState } from 'react'
import type { MadeEntry } from '../types'
import { formatTime } from '../types'

type Props = {
  entries: MadeEntry[]
  onUndo: (id: string) => void
}

export function MadeLog({ entries, onUndo }: Props) {
  const todayCount = entries.length
  const byDrink = tally(entries)

  return (
    <div className="made-page">
      <header className="checks-head">
        <p className="eyebrow">Today</p>
        <h2>{todayCount} made</h2>
      </header>

      {byDrink.length > 0 ? (
        <ul className="made-tally">
          {byDrink.map((row) => (
            <li key={row.name}>
              <span>{row.name}</span>
              <b>{row.count}</b>
            </li>
          ))}
        </ul>
      ) : null}

      {entries.length === 0 ? (
        <p className="empty">Nothing made yet. Check a drink on the sheet.</p>
      ) : (
        <ul className="made-list">
          {entries.map((entry) => (
            <MadeRow key={entry.id} entry={entry} onUndo={onUndo} />
          ))}
        </ul>
      )}
    </div>
  )
}

function MadeRow({ entry, onUndo }: { entry: MadeEntry; onUndo: (id: string) => void }) {
  const startX = useRef<number | null>(null)
  const [dx, setDx] = useState(0)

  const end = () => {
    if (dx < -72) onUndo(entry.id)
    startX.current = null
    setDx(0)
  }

  return (
    <li
      className="made-row"
      style={{ transform: `translateX(${Math.min(0, dx)}px)` }}
      onPointerDown={(e) => {
        startX.current = e.clientX
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (startX.current == null) return
        setDx(e.clientX - startX.current)
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div>
        <b>{entry.name}</b>
        <span>{formatTime(entry.madeAt)}</span>
      </div>
      <em>swipe left to undo</em>
    </li>
  )
}

function tally(entries: MadeEntry[]) {
  const map = new Map<string, number>()
  for (const entry of entries) {
    map.set(entry.name, (map.get(entry.name) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}
