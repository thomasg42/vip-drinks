import { DRINKS } from '../data/drinks'
import type { SyncStatus } from '../sync/client'
import {
  denomsTotal,
  EMPTY_DENOMS,
  type AppState,
  type Denoms,
} from '../types'

export type SyncControls = {
  status: SyncStatus
  /** Recovery only: point this device at a different Worker, no rebuild. */
  setAddress: (url: string) => void
  refresh: () => void
  save: () => Promise<boolean>
  localSaved: boolean
}

type Props = {
  state: AppState
  onChangeOpening: (next: Denoms) => void
  onChangeClosing: (next: Denoms) => void
  onNotes: (notes: string) => void
  onStartShift: () => void
  onEndShift: () => void
  sync: SyncControls
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
  sync,
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
  const latestShift = [...state.history].sort((a, b) => b.endedAt.localeCompare(a.endedAt))[0]

  return (
    <div className="cash">
      <SyncBanner sync={sync} />
      {latestShift ? (
        <section className="last-shift" aria-label="Last saved shift">
          <p>Last saved shift · {shiftDate(latestShift.endedAt)}</p>
          <div className="last-shift-totals">
            <span>Opening<strong>{money(latestShift.openingTotal)}</strong></span>
            <span>Closing<strong>{money(latestShift.closingTotal)}</strong></span>
            <span>Difference<strong>{money(latestShift.closingTotal - latestShift.openingTotal)}</strong></span>
          </div>
        </section>
      ) : null}

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

      {/*
        The memory bank, at the very bottom, always here -- an empty one says so
        rather than vanishing, because a missing list and a list of nothing read
        identically on a phone and only one of them is good news.
      */}
      <section className="history">
        <h3>Memory bank · every shift closed</h3>
        {state.history.length > 0 ? (
          <ul>
            {state.history.map((shift) => (
              <li key={shift.id}>
                <div>
                  <b>{shiftDate(shift.endedAt)}</b>
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
        ) : (
          <p className="history-empty">
            Nothing closed out yet. Every shift you end lands here and stays.
          </p>
        )}
      </section>
    </div>
  )
}

function when(at: number): string {
  // A device with a saved token has not necessarily reached the ledger yet.
  // Saying "just now" before the first successful sync is the exact lie this
  // banner exists to prevent.
  if (!at) return 'not yet — checking'
  const seconds = Math.round((Date.now() - at) / 1000)
  if (seconds < 45) return 'just now'
  if (seconds < 90) return 'a minute ago'
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes ago`
  return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function shiftDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Denver' })
}

function SyncBanner({ sync }: { sync: SyncControls }) {
  const { status } = sync
  const saved = status.kind === 'ok' && status.at > 0
  const title = saved ? 'Saved to shared ledger'
    : status.kind === 'saving' ? 'Saving…'
    : status.kind === 'error' ? (sync.localSaved ? 'Saved · waiting for cloud sync' : 'Save needs attention')
    : status.kind === 'off' ? 'Cloud save unavailable' : 'Checking saved changes…'
  return (
    <section className="save-panel" aria-label="Cash saving">
      <div className="save-panel-head">
        <span className="autosave-badge">Auto-save on</span>
        <button type="button" className="save-now" onClick={() => { void sync.save() }} disabled={status.kind === 'saving'}>
          {status.kind === 'saving' ? 'Saving…' : 'Save now'}
        </button>
      </div>
      <p role="status" aria-live="polite" className={status.kind === 'error' || status.kind === 'off' ? 'save-warning' : ''}>
        <strong>{title}</strong>
        <span>{saved ? 'Last saved ' + when(status.at)
          : status.kind === 'off' ? 'Cloud sync is not configured in this build.'
          : status.kind === 'error' ? (sync.localSaved ? 'Saved offline. Sync retries automatically.' : 'Keep this app open until a save succeeds.')
          : 'Checking the shared ledger; not yet confirmed.'}</span>
      </p>
    </section>
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
