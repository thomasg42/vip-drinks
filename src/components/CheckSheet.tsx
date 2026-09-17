import { useMemo, useState } from 'react'
import type { Drink } from '../types'
import { DrinkList } from './DrinkList'

type Props = {
  drinks: Drink[]
  topMadeIds: string[]
  flashing: string | null
  onOpen: (id: string) => void
  onMake: (id: string) => void
}

export function CheckSheet({ drinks, topMadeIds, flashing, onOpen, onMake }: Props) {
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const match = (d: Drink) => !q || d.name.toLowerCase().includes(q)
    const top = topMadeIds
      .map((id) => drinks.find((d) => d.id === id))
      .filter((d): d is Drink => Boolean(d && match(d)))
      .slice(0, 5)
    const topSet = new Set(top.map((d) => d.id))
    const rest = drinks.filter((d) => match(d) && !topSet.has(d.id))
    return { top, rest }
  }, [drinks, query, topMadeIds])

  return (
    <div className="sheet">
      <label className="search">
        <span>Search drinks</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search every drink"
          autoCapitalize="off"
          autoCorrect="off"
        />
      </label>

      {visible.top.length > 0 ? (
        <>
          <p className="list-label">Most made</p>
          <DrinkList drinks={visible.top} flashing={flashing} onOpen={onOpen} onMake={onMake} />
        </>
      ) : null}

      {visible.rest.length > 0 ? (
        <>
          {visible.top.length > 0 ? <p className="list-label">All drinks</p> : null}
          <DrinkList drinks={visible.rest} flashing={flashing} onOpen={onOpen} onMake={onMake} />
        </>
      ) : null}

      {visible.top.length === 0 && visible.rest.length === 0 ? (
        <p className="empty">No drinks match that search.</p>
      ) : null}
    </div>
  )
}
