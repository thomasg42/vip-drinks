import { DRINKS } from '../data/drinks'
import {
  denomsTotal,
  EMPTY_DENOMS,
  type AppState,
  type Denoms,
} from '../types'

type Props = {
  state: AppState
  onChangeOpening: (next: Denoms) => void
  onChangeClosing: (next: Denoms) => void
  onNotes: (notes: string) => void
  onStartShift: () => void
  onEndShift: () => void
}

const BILLS: { key: keyof Denoms; label: string; value: number }[] = [
  { key: 'hundreds', label: '$100', value: 100 },
  { key: 'fifties', label: '$50', value: 50 },
  { key: 'twenties', label: '$20', value: 20 },
  { key: 'tens', label: '$10', value: 10 },
  { key: 'fives', label: '$5', value: 5 },
  { key: 'ones', label: '$1', value: 1 },
]

function money(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function CashDrawer({
  state,
  onChangeOpening,
  onChangeClosing,
  onNotes,
  onStartShift,
  onEndShift,
}: Props) {
  const openingTotal = denomsTotal(state.opening)
  const closingTotal = denomsTotal(state.closing)
  const net = closingTotal - openingTotal
  const drinksMade = state.made.length
  const tickets = state.made.reduce((sum, entry) => {
    const drink = DRINKS.find((d) => d.id === entry.drinkId)
    return sum + (drink?.price ?? 0)
  }, 0)
  const started = Boolean(state.shiftStartedAt)

  return (
    <div className="cash">
      {!started ? (
        <>
          <header className="checks-head">
            <p className="eyebrow">Start of cash money</p>
            <h2>Shift money</h2>
          </header>

          <CountBlock
            title="Beginning of shift"
            denoms={state.opening}
            onChange={onChangeOpening}
          />

          <button type="button" className="made-btn" onClick={onStartShift}>
            Start shift
          </button>
        </>
      ) : (
        <>
          <header className="checks-head">
            <p className="eyebrow">End of shift</p>
            <h2>Shift money</h2>
          </header>

          <div className="cash-summary">
            <div>
              <span>Opening</span>
              <b>{money(openingTotal)}</b>
            </div>
            <div>
              <span>Closing</span>
              <b>{money(closingTotal)}</b>
            </div>
            <div>
              <span>Net</span>
              <b className={net < 0 ? 'short' : 'over'}>{money(net)}</b>
            </div>
          </div>

          <p className="cash-tickets">
            {drinksMade} drinks marked · ~{money(tickets)} mixed-drink tickets
          </p>

          <CountBlock
            title="End of shift count"
            denoms={state.closing}
            onChange={onChangeClosing}
          />

          <label className="notes-label">
            Notes
            <textarea
              value={state.notes}
              onChange={(e) => onNotes(e.target.value)}
              placeholder="Tips, comps, dropped cash…"
              rows={3}
            />
          </label>

          <button type="button" className="made-btn" onClick={onEndShift}>
            End shift & save
          </button>
        </>
      )}

      {state.history.length > 0 ? (
        <section className="history">
          <h3>Past shifts</h3>
          <ul>
            {state.history.map((shift) => (
              <li key={shift.id}>
                <div>
                  <b>{new Date(shift.endedAt).toLocaleDateString()}</b>
                  <span>
                    {money(shift.openingTotal)} → {money(shift.closingTotal)}
                  </span>
                </div>
                <em>
                  {money(shift.closingTotal - shift.openingTotal)} · {shift.drinksMade} drinks
                </em>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function CountBlock({
  title,
  denoms,
  onChange,
}: {
  title: string
  denoms: Denoms
  onChange: (next: Denoms) => void
}) {
  const bump = (key: keyof Denoms, delta: number) => {
    const next = Math.max(0, (denoms[key] ?? 0) + delta)
    onChange({ ...denoms, [key]: key === 'coins' ? roundMoney(next) : next })
  }

  return (
    <section className="count-block">
      <div className="count-head">
        <h3>{title}</h3>
        <b>{money(denomsTotal(denoms))}</b>
      </div>
      <div className="bills">
        {BILLS.map((bill) => (
          <div key={bill.key} className="bill">
            <span>{bill.label}</span>
            <div className="stepper">
              <button
                type="button"
                className="step"
                aria-label={`${title} ${bill.label} minus`}
                onClick={() => bump(bill.key, -1)}
              >
                −
              </button>
              <span className="step-count">{denoms[bill.key]}</span>
              <button
                type="button"
                className="step"
                aria-label={`${title} ${bill.label} plus`}
                onClick={() => bump(bill.key, 1)}
              >
                +
              </button>
            </div>
          </div>
        ))}
        <label className="coins">
          Coins / extra
          <input
            type="number"
            min={0}
            step={0.25}
            inputMode="decimal"
            value={denoms.coins || ''}
            placeholder="0.00"
            onChange={(e) =>
              onChange({
                ...denoms,
                coins: Math.max(0, Number(e.target.value) || 0),
              })
            }
          />
        </label>
        <button
          type="button"
          className="ghost-btn slim"
          onClick={() => onChange({ ...EMPTY_DENOMS })}
        >
          Clear count
        </button>
      </div>
    </section>
  )
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100
}
