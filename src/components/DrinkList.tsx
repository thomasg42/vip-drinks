import type { Drink } from '../types'

type Props = {
  drinks: Drink[]
  flashing: string | null
  onMake: (id: string) => void
  onOpen: (id: string) => void
}

export function DrinkList({ drinks, flashing, onMake, onOpen }: Props) {
  return (
    <ul className="drink-list">
      {drinks.map((drink) => {
        const checked = flashing === drink.id
        return (
          <li key={drink.id} className={`drink-box${checked ? ' is-checked' : ''}`}>
            <button
              type="button"
              className="checkbox"
              aria-pressed={checked}
              aria-label={`Mark ${drink.name} made`}
              onClick={() => onMake(drink.id)}
            >
              {checked ? <CheckIcon /> : null}
            </button>
            <button
              type="button"
              className="drink-open"
              onClick={() => onOpen(drink.id)}
              aria-label={`How to make ${drink.name}`}
            >
              <span className="drink-name">{drink.name}</span>
            </button>
          </li>
        )
      })}
    </ul>
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
