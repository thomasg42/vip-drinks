import { useEffect } from 'react'
import type { Drink } from '../types'
import { youtubeEmbed, youtubeSearchUrl, youtubeWatch } from '../types'

type Props = {
  drink: Drink | null
  onClose: () => void
  onMade: (id: string, name: string) => void
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

  const embed = youtubeEmbed(drink)
  const fromWeb = drink.source === 'web'

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

        {embed ? (
          <>
            <div className="video-embed">
              <iframe
                title={`How to make ${drink.name}`}
                src={embed}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <a className="video-open" href={youtubeWatch(drink)} target="_blank" rel="noreferrer">
              Open short
            </a>
          </>
        ) : (
          // No verified video id for this drink. A YouTube search link is honest;
          // an embed that renders "Video unavailable" is not.
          <a
            className="video-card"
            href={youtubeSearchUrl(drink.name)}
            target="_blank"
            rel="noreferrer"
          >
            {drink.thumb ? (
              <img src={drink.thumb} alt="" loading="lazy" />
            ) : (
              <span className="video-fallback" aria-hidden="true">
                ▶
              </span>
            )}
            <span>
              <strong>Watch how</strong>
              <em>Opens a YouTube search</em>
            </span>
          </a>
        )}

        <h3>Ingredients</h3>
        <ul className="ingredients">
          {drink.ingredients.map((ing, i) => (
            <li key={`${i}-${ing.item}`}>
              <span>{ing.amount}</span>
              <b>{ing.item}</b>
            </li>
          ))}
        </ul>

        {fromWeb && drink.instructions ? (
          <>
            <h3>Method</h3>
            <p className="web-instructions">{drink.instructions}</p>
          </>
        ) : (
          <p className="garnish">Garnish · {drink.garnish}</p>
        )}

        {fromWeb ? (
          <p className="web-source">
            From TheCocktailDB · off-menu, no house price set
          </p>
        ) : null}

        <button type="button" className="made-btn" onClick={() => onMade(drink.id, drink.name)}>
          Mark ordered &amp; made
        </button>
      </div>
    </div>
  )
}
