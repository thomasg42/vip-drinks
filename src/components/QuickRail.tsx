import { QUICK_POURS } from '../data/quickPours'

type Props = {
  counts: Record<string, number>
  onPour: (id: string, name: string) => void
  onUndo: (id: string) => void
}

/**
 * Tally rail pinned to the side of the sheet. One tap = one pour.
 *
 * Deliberately NOT animated beyond a 120ms count bump: this sits between a
 * bartender and the next order, and motion costs on the way through.
 */
export function QuickRail({ counts, onPour, onUndo }: Props) {
  return (
    <aside className="quick-rail" aria-label="Quick pour counts">
      {QUICK_POURS.map((pour) => {
        const count = counts[pour.id] ?? 0
        return (
          <div key={pour.id} className="quick-tile" style={{ ['--rail' as string]: pour.tint }}>
            <button
              type="button"
              className="quick-add"
              onClick={() => onPour(pour.id, pour.name)}
              aria-label={`Add one ${pour.name}. ${count} so far.`}
            >
              <span className="quick-count">{count}</span>
              <span className="quick-name">{pour.short}</span>
            </button>
            <button
              type="button"
              className="quick-minus"
              onClick={() => onUndo(pour.id)}
              disabled={count === 0}
              aria-label={`Remove one ${pour.name}`}
            >
              −
            </button>
          </div>
        )
      })}
    </aside>
  )
}
