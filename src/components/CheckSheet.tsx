import { useEffect, useMemo, useRef, useState } from 'react'
import type { Category, Drink } from '../types'
import { DrinkList } from './DrinkList'
import { DrinkArtwork } from './DrinkArtwork'
import { tapOnly } from '../tapOnly'
import { ingredientLine, searchTheInternet, type WebSearchResult } from '../data/webSearch'

type Props = {
  drinks: Drink[]
  topMadeIds: string[]
  flashing: string | null
  onOpen: (drink: Drink) => void
  onMake: (id: string, name: string) => void
}

const DEBOUNCE_MS = 350

/**
 * 131 drinks is too many to thumb past mid-rush, so the sheet filters by what
 * was actually ordered. 'all' first because that is the default reach.
 */
const CHIPS: { key: Category | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'cocktail', label: 'Cocktails' },
  { key: 'highball', label: 'Highballs' },
  { key: 'shot', label: 'Shots' },
  { key: 'na', label: 'No alcohol' },
]

export function CheckSheet({ drinks, topMadeIds, flashing, onOpen, onMake }: Props) {
  const [query, setQuery] = useState('')
  const [chip, setChip] = useState<Category | 'all'>('all')
  const [web, setWeb] = useState<WebSearchResult>({ status: 'idle' })
  const runId = useRef(0)

  const counts = useMemo(() => {
    const out = new Map<Category | 'all', number>([['all', drinks.length]])
    for (const d of drinks) {
      const key = d.category ?? 'cocktail'
      out.set(key, (out.get(key) ?? 0) + 1)
    }
    return out
  }, [drinks])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const inChip = (d: Drink) => chip === 'all' || (d.category ?? 'cocktail') === chip
    const match = (d: Drink) => inChip(d) && (!q || d.name.toLowerCase().includes(q))
    const top = topMadeIds
      .map((id) => drinks.find((d) => d.id === id))
      .filter((d): d is Drink => Boolean(d && match(d)))
      .slice(0, 5)
    const topSet = new Set(top.map((d) => d.id))
    const rest = drinks.filter((d) => match(d) && !topSet.has(d.id))
    return { top, rest }
  }, [chip, drinks, query, topMadeIds])

  const localCount = visible.top.length + visible.rest.length

  // Search the internet for anything the curated sheet does not already cover.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      // Bump the run id here too, or an in-flight search from the longer query
      // resolves after the box is cleared and repopulates the results.
      runId.current += 1
      setWeb({ status: 'idle' })
      return
    }
    const id = (runId.current += 1)
    setWeb({ status: 'searching' })
    const timer = window.setTimeout(() => {
      searchTheInternet(q).then((result) => {
        // A slow earlier request must never overwrite a newer one.
        if (runId.current === id) setWeb(result)
      })
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [query])

  // Anything already on the sheet is not "from the internet".
  const webDrinks = useMemo(() => {
    if (web.status !== 'ok') return []
    const known = new Set(drinks.map((d) => d.name.toLowerCase()))
    return web.drinks.filter((d) => !known.has(d.name.toLowerCase()))
  }, [web, drinks])

  return (
    <div className="sheet">
      <label className="search">
        <span>Search any drink</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="The sheet, then the internet"
          autoCapitalize="off"
          autoCorrect="off"
        />
      </label>

      <div className="chips" role="group" aria-label="Filter by kind of drink">
        {CHIPS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={chip === key}
            className={`chip${chip === key ? ' on' : ''}`}
            onClick={() => setChip(key)}
          >
            {label}
            <span className="chip-count">{counts.get(key) ?? 0}</span>
          </button>
        ))}
      </div>

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

      {localCount === 0 ? (
        <p className="empty">
          {query.trim().length > 0
            ? `Nothing on the sheet matches “${query.trim()}”.`
            : 'Nothing on the sheet under this filter.'}
        </p>
      ) : null}

      {query.trim().length >= 2 ? (
        <section className="web-results">
          <p className="list-label web-label">
            From the internet
            {web.status === 'searching' ? <em className="web-spin">searching…</em> : null}
          </p>

          {web.status === 'offline' ? (
            <p className="empty">Couldn’t reach the drink database. The sheet above still works.</p>
          ) : null}

          {(web.status === 'empty' || (web.status === 'ok' && webDrinks.length === 0)) ? (
            <p className="empty">No online match for “{query.trim()}”.</p>
          ) : null}

          {webDrinks.length > 0 ? (
            <ul className="web-list">
              {webDrinks.map((drink) => (
                <li key={drink.id} className="web-box">
                  <DrinkArtwork id={drink.id} thumb={drink.thumb} />
                  <button
                    type="button"
                    className="checkbox"
                    aria-label={`Mark ${drink.name} made`}
                    {...tapOnly(() => onMake(drink.id, drink.name))}
                  >
                    {flashing === drink.id ? <CheckIcon /> : null}
                  </button>
                  <button type="button" className="web-open" {...tapOnly(() => onOpen(drink))}>
                    <span className="drink-name">{drink.name}</span>
                    <span className="web-ingredients">{ingredientLine(drink)}</span>
                    <span className="web-meta">
                      {drink.glass}
                      {drink.videoUrl ? ' · video' : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
      <p className="art-credit">
        Drink photography: <a href="https://www.thecocktaildb.com/" target="_blank" rel="noreferrer">TheCocktailDB</a>.
        Some images illustrate a drink family. Rail artwork includes AI imagery.
      </p>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <path
        d="M4.5 10.5 8 14l7.5-8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
