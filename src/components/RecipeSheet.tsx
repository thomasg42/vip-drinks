import { useEffect } from 'react'
import type { Drink } from '../types'
import { youtubeEmbed, youtubeWatch } from '../types'

type Props = {
  drink: Drink | null
  onClose: () => void
  onMade: (id: string) => void
}

export function RecipeSheet({ drink, onClose, onMade }: Props) {
  useEffect(() => {
    if (!drink) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drink, onClose])

  if (!drink) return null

  return (
    <div className="recipe-overlay" onClick={onClose}>
      <div
        className="recipe"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="recipe-close" onClick={onClose} aria-label="Close recipe">
          ✕
        </button>
        <h2 id="recipe-title">{drink.name}</h2>
        <p className="recipe-meta">
          {drink.glass} · {drink.method}
        </p>

        <div className="video-embed">
          <iframe
            title={`How to make ${drink.name}`}
            src={youtubeEmbed(drink)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <a className="video-open" href={youtubeWatch(drink)} target="_blank" rel="noreferrer">
          Open short
        </a>

        <h3>Ingredients</h3>
        <ul className="ingredients">
          {drink.ingredients.map((ing) => (
            <li key={`${ing.amount}-${ing.item}`}>
              <span>{ing.amount}</span>
              <b>{ing.item}</b>
            </li>
          ))}
        </ul>
        <p className="garnish">Garnish · {drink.garnish}</p>

        <button type="button" className="made-btn" onClick={() => onMade(drink.id)}>
          Mark ordered & made
        </button>
      </div>
    </div>
  )
}
