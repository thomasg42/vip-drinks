import { useState } from 'react'
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

  return (
    <div className="cash">
      <SyncBanner sync={sync} />

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

/**
 * Says which of the two worlds this device is in, in words, every time.
 *
 * There is nothing to connect and nothing to type -- the app syncs on its own.
 * So this is not a control, it is a status light, and the only thing it owes
 * anybody is the truth. A bartender who assumes the laptop already has
 * tonight's opening count, and is wrong, only finds out at close.
 */
function SyncBanner({ sync }: { sync: SyncControls }) {
  const [address, setAddress] = useState('')
  const { status } = sync

  if (status.kind === 'ok') {
    return (
      <div className="sync-bar on">
        <span>
          <b>Saved on every device</b>
          <em>Last synced {when(status.at)}</em>
        </span>
        <button type="button" className="ghost-btn slim" onClick={sync.refresh}>
          Check now
        </button>
      </div>
    )
  }

  return (
    <div className={`sync-bar ${status.kind === 'error' ? 'bad' : ''}`}>
      <div className="sync-head">
        <span>
          <b>{status.kind === 'error' ? 'Not reaching the other devices' : 'This device only'}</b>
          <em>
            {status.kind === 'error'
              ? `${status.message} The count is safe on this device and will send itself when it can.`
              : 'This build has no shared ledger, so the count lives here and nowhere else.'}
          </em>
        </span>
        {status.kind === 'error' ? (
          <button type="button" className="ghost-btn slim" onClick={sync.refresh}>
            Retry
          </button>
        ) : null}
      </div>

      {status.kind === 'off' ? (
        <details className="sync-form">
          <summary>Have a ledger address?</summary>
          <label>
            Sync address
            <input
              type="url"
              inputMode="url"
              value={address}
              placeholder="https://…workers.dev"
              onChange={(e) => setAddress(e.target.value)}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          <button
            type="button"
            className="made-btn slim"
            onClick={() => sync.setAddress(address)}
            disabled={address.trim().length === 0}
          >
            Use this address
          </button>
          <p className="sync-note">
            Only needed if this build shipped without one. Normally it is already set.
          </p>
        </details>
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
