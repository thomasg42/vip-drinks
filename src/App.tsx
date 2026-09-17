import { useEffect, useMemo, useState } from 'react'
import { CheckSheet } from './components/CheckSheet'
import { CashDrawer } from './components/CashDrawer'
import { MadeLog } from './components/MadeLog'
import { RecipeSheet } from './components/RecipeSheet'
import { DRINKS } from './data/drinks'
import { loadState, saveState } from './storage'
import {
  EMPTY_DENOMS,
  denomsTotal,
  isSameDay,
  type AppState,
  type Denoms,
} from './types'

type Tab = 'sheet' | 'made' | 'cash'

function App() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [tab, setTab] = useState<Tab>('sheet')
  const [openId, setOpenId] = useState<string | null>(null)
  const [flashing, setFlashing] = useState<string | null>(null)

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    if (!flashing) return
    const id = window.setTimeout(() => setFlashing(null), 450)
    return () => window.clearTimeout(id)
  }, [flashing])

  const todayMade = useMemo(
    () => state.made.filter((entry) => isSameDay(entry.madeAt)),
    [state.made],
  )

  const topMadeIds = useMemo(() => {
    const counts = new Map<string, number>()
    const lastMade = new Map<string, number>()
    todayMade.forEach((entry, index) => {
      counts.set(entry.drinkId, (counts.get(entry.drinkId) ?? 0) + 1)
      if (!lastMade.has(entry.drinkId)) lastMade.set(entry.drinkId, index)
    })
    return [...counts.entries()]
      .sort((a, b) => {
        const byCount = b[1] - a[1]
        if (byCount !== 0) return byCount
        return (lastMade.get(a[0]) ?? 0) - (lastMade.get(b[0]) ?? 0)
      })
      .slice(0, 5)
      .map(([id]) => id)
  }, [todayMade])

  const openDrink = DRINKS.find((d) => d.id === openId) ?? null

  const markMade = (drinkId: string) => {
    const drink = DRINKS.find((d) => d.id === drinkId)
    if (!drink) return
    setFlashing(drinkId)
    setState((prev) => ({
      ...prev,
      made: [
        {
          id: crypto.randomUUID(),
          drinkId,
          name: drink.name,
          madeAt: new Date().toISOString(),
        },
        ...prev.made,
      ],
    }))
  }

  const unmake = (entryId: string) => {
    setState((prev) => ({
      ...prev,
      made: prev.made.filter((entry) => entry.id !== entryId),
    }))
  }

  const updateOpening = (opening: Denoms) => setState((prev) => ({ ...prev, opening }))
  const updateClosing = (closing: Denoms) => setState((prev) => ({ ...prev, closing }))

  const startShift = () => {
    setState((prev) => ({
      ...prev,
      shiftStartedAt: new Date().toISOString(),
    }))
    setTab('sheet')
  }

  const endShift = () => {
    if (!window.confirm('End this shift? The count is saved and the sheet is cleared.')) return
    setState((prev) => {
      const drinksMade = prev.made.filter((entry) => isSameDay(entry.madeAt)).length
      const drinkTickets = prev.made.reduce((sum, entry) => {
        const drink = DRINKS.find((d) => d.id === entry.drinkId)
        return sum + (drink?.price ?? 0)
      }, 0)
      return {
        ...prev,
        shiftStartedAt: null,
        opening: { ...EMPTY_DENOMS },
        closing: { ...EMPTY_DENOMS },
        notes: '',
        made: [],
        history: [
          {
            id: crypto.randomUUID(),
            startedAt: prev.shiftStartedAt ?? new Date().toISOString(),
            endedAt: new Date().toISOString(),
            openingTotal: denomsTotal(prev.opening),
            closingTotal: denomsTotal(prev.closing),
            drinkTickets,
            drinksMade,
            notes: prev.notes,
          },
          ...prev.history,
        ].slice(0, 20),
      }
    })
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="brand">VIP Drinks</p>
          <p className="sub">Orders made</p>
        </div>
        <button type="button" className="made-pill" onClick={() => setTab('made')}>
          {todayMade.length} made
        </button>
      </header>

      <main className="main">
        {tab === 'sheet' ? (
          <CheckSheet
            drinks={DRINKS}
            topMadeIds={topMadeIds}
            flashing={flashing}
            onOpen={setOpenId}
            onMake={markMade}
          />
        ) : null}
        {tab === 'made' ? <MadeLog entries={todayMade} onUndo={unmake} /> : null}
        {tab === 'cash' ? (
          <CashDrawer
            state={state}
            onChangeOpening={updateOpening}
            onChangeClosing={updateClosing}
            onNotes={(notes) => setState((prev) => ({ ...prev, notes }))}
            onStartShift={startShift}
            onEndShift={endShift}
          />
        ) : null}
      </main>

      <nav className="dock">
        <button
          type="button"
          className={tab === 'sheet' ? 'on' : ''}
          onClick={() => setTab('sheet')}
        >
          Sheet
        </button>
        <button
          type="button"
          className={tab === 'made' ? 'on' : ''}
          onClick={() => setTab('made')}
        >
          Made
        </button>
        <button
          type="button"
          className={tab === 'cash' ? 'on' : ''}
          onClick={() => setTab('cash')}
        >
          Cash
        </button>
      </nav>

      <RecipeSheet drink={openDrink} onClose={() => setOpenId(null)} onMade={markMade} />
    </div>
  )
}

export default App
