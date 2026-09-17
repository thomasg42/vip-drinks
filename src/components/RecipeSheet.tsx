import { useEffect, useState } from 'react'
import type { Drink } from '../types'
import { youtubeEmbed, youtubeId, youtubeSearchUrl, youtubeWatch } from '../types'

type Props = {
  drink: Drink | null
  /** A video the bartender saved onto this drink themselves, if any. */
  savedVideoId?: string | null
  onClose: () => void
  onMade: (id: string, name: string) => void
  onSaveVideo?: (drinkId: string, videoId: string | null) => void
}

export function RecipeSheet({ drink, savedVideoId, onClose, onMade, onSaveVideo }: Props) {
  const [paste, setPaste] = useState('')
  const [pasteError, setPasteError] = useState<string | null>(null)

  useEffect(() => {
    if (!drink) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drink, onClose])

  // A link pasted for one drink must not linger on the next one opened.
  useEffect(() => {
    setPaste('')
    setPasteError(null)
  }, [drink?.id])

  if (!drink) return null

  const embed = youtubeEmbed(drink, savedVideoId)
  const fromWeb = drink.source === 'web'
  const searchUrl = youtubeSearchUrl(drink.name)

  const savePasted = () => {
    const raw = paste.trim()
    // A pasted share link, or just the id on its own -- both are what people have on hand.
    const id = youtubeId(raw) ?? (/^[\w-]{11}$/.test(raw) ? raw : null)
    if (!id) {
      setPasteError('That is not a YouTube link.')
      return
    }
    onSaveVideo?.(drink.id, id)
    setPaste('')
    setPasteError(null)
  }

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
            <div className="video-actions">
              <a href={youtubeWatch(drink, savedVideoId)} target="_blank" rel="noreferrer">
                Open on YouTube
              </a>
              {savedVideoId ? (
                <button type="button" onClick={() => onSaveVideo?.(drink.id, null)}>
                  Remove saved video
                </button>
              ) : null}
            </div>
          </>
        ) : (
          // Not fully integrated: no verified video for this drink. Send the
          // bartender straight at the shortest clips rather than a dead player
          // or a 20-minute vlog -- the link carries YouTube's under-4-minutes filter.
          <div className="no-video">
            <a className="video-card" href={searchUrl} target="_blank" rel="noreferrer">
              {drink.thumb ? (
                <img src={drink.thumb} alt="" loading="lazy" />
              ) : (
                <span className="video-fallback" aria-hidden="true">
                  ▶
                </span>
              )}
              <span>
                <strong>Find the quickest how-to</strong>
                <em>Opens YouTube, shortest clips first</em>
              </span>
            </a>
            <details className="pin-video">
              <summary>Found a good one? Save it to this drink</summary>
              <div className="pin-row">
                <input
                  type="url"
                  inputMode="url"
                  value={paste}
                  placeholder="Paste the YouTube link"
                  onChange={(e) => {
                    setPaste(e.target.value)
                    setPasteError(null)
                  }}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
                <button type="button" onClick={savePasted} disabled={paste.trim().length === 0}>
                  Save
                </button>
              </div>
              {pasteError ? <p className="pin-error">{pasteError}</p> : null}
              <p className="pin-note">Saved on this phone. It plays in the app from then on.</p>
            </details>
          </div>
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
          <p className="web-source">From TheCocktailDB · off-menu, no house price set</p>
        ) : drink.price === 0 ? (
          // Not a bug: the price is Thomas's to set. Saying so beats a silent $0
          // disappearing into the shift ticket total.
          <p className="web-source">No house price set · adds $0 to the shift ticket</p>
        ) : null}

        <button type="button" className="made-btn" onClick={() => onMade(drink.id, drink.name)}>
          Mark ordered &amp; made
        </button>
      </div>
    </div>
  )
}
