import { useEffect, useMemo, useState } from 'react'
import { CheckSheet } from './components/CheckSheet'
import { CashDrawer } from './components/CashDrawer'
import { MadeLog } from './components/MadeLog'
import { RecipeSheet } from './components/RecipeSheet'
import { QuickRail } from './components/QuickRail'
import { DRINKS } from './data/drinks'
import { QUICK_POUR_IDS } from './data/quickPours'
import { loadState, saveState } from './storage'
import { now } from './sync/client'
import { useShiftSync } from './sync/useShiftSync'
import {
  EMPTY_DENOMS,
  denomsTotal,
  isSameDay,
  type AppState,
  type Denoms,
  type Drink,
} from './types'

type Tab = 'sheet' | 'made' | 'cash'

function App() {
  const [state, setState] = useState<AppState>(() => loadState())
  const sync = useShiftSync(state, setState)
  const [tab, setTab] = useState<Tab>('sheet')
  const [openDrink, setOpenDrink] = useState<Drink | null>(null)
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
      if (QUICK_POUR_IDS.has(entry.drinkId)) return
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

  // Today's running count per rail pour, straight off the same log everything else uses.
  const quickCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const entry of todayMade) {
      if (!QUICK_POUR_IDS.has(entry.drinkId)) continue
      counts[entry.drinkId] = (counts[entry.drinkId] ?? 0) + 1
    }
    return counts
  }, [todayMade])

  const markMade = (drinkId: string, name?: string) => {
    const label = name ?? DRINKS.find((d) => d.id === drinkId)?.name
    if (!label) return
    setFlashing(drinkId)
    setState((prev) => ({
      ...prev,
      made: [
        {
          id: crypto.randomUUID(),
          drinkId,
          name: label,
          madeAt: new Date().toISOString(),
        },
        ...prev.made,
      ],
    }))
  }

  /** Rail minus button: drop the most recent pour of that kind from today. */
  const undoQuick = (drinkId: string) => {
    setState((prev) => {
      const target = prev.made.find(
        (entry) => entry.drinkId === drinkId && isSameDay(entry.madeAt),
      )
      if (!target) return prev
      return {
        ...prev,
        made: prev.made.filter((entry) => entry.id !== target.id),
        // Without the tombstone the next merge with the laptop unions the pour
        // straight back in and the minus button looks broken.
        removed: [...prev.removed, target.id],
      }
    })
  }

  /**
   * Save a video the bartender found onto a drink, so the next tap plays it
   * in the app instead of re-opening a YouTube search. null clears it.
   */
  const saveVideo = (drinkId: string, videoId: string | null) => {
    setState((prev) => {
      const videos = { ...prev.videos }
      if (videoId) videos[drinkId] = videoId
      else delete videos[drinkId]
      return { ...prev, videos, clocks: { ...prev.clocks, videos: now() } }
    })
  }

  const unmake = (entryId: string) => {
    setState((prev) => ({
      ...prev,
      made: prev.made.filter((entry) => entry.id !== entryId),
      removed: [...prev.removed, entryId],
    }))
  }

  // Every cash edit carries the moment it was made. That timestamp is the only
  // thing standing between two devices and a drawer count quietly reverting.
  const updateOpening = (opening: Denoms) =>
    setState((prev) => ({ ...prev, opening, clocks: { ...prev.clocks, opening: now() } }))
  const updateClosing = (closing: Denoms) =>
    setState((prev) => ({ ...prev, closing, clocks: { ...prev.clocks, closing: now() } }))

  const startShift = () => {
    setState((prev) => ({
      ...prev,
      shiftStartedAt: new Date().toISOString(),
      clocks: { ...prev.clocks, shift: now() },
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
      const stamp = now()
      return {
        ...prev,
        shiftStartedAt: null,
        opening: { ...EMPTY_DENOMS },
        closing: { ...EMPTY_DENOMS },
        notes: '',
        made: [],
        // Clearing the sheet has to be said out loud, or the other device's copy
        // of tonight's drinks floods back in on the next merge and the new shift
        // starts with the old shift's tally.
        removed: [...prev.removed, ...prev.made.map((entry) => entry.id)],
        clocks: { ...prev.clocks, shift: stamp, opening: stamp, closing: stamp, notes: stamp },
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
            onOpen={setOpenDrink}
            onMake={markMade}
          />
        ) : null}
        {tab === 'made' ? <MadeLog entries={todayMade} onUndo={unmake} /> : null}
        {tab === 'cash' ? (
          <CashDrawer
            state={state}
            onChangeOpening={updateOpening}
            onChangeClosing={updateClosing}
            onNotes={(notes) =>
              setState((prev) => ({ ...prev, notes, clocks: { ...prev.clocks, notes: now() } }))
            }
            onStartShift={startShift}
            onEndShift={endShift}
            sync={sync}
          />
        ) : null}
        {tab === 'sheet' ? (
          <QuickRail counts={quickCounts} onPour={markMade} onUndo={undoQuick} />
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

      <RecipeSheet
        drink={openDrink}
        savedVideoId={openDrink ? (state.videos[openDrink.id] ?? null) : null}
        onClose={() => setOpenDrink(null)}
        onMade={markMade}
        onSaveVideo={saveVideo}
      />
    </div>
  )
}

export default App
