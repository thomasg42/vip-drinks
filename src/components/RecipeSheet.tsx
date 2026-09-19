import { useEffect, useState } from 'react'
import type { Drink } from '../types'
import { VERIFIED_RECIPES } from '../data/verifiedRecipes'
import { buildSteps } from '../data/steps'
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
  const recipe = VERIFIED_RECIPES[drink.id]
  const steps = buildSteps(drink)

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
        {/*
          The card is the frame; only this scrolls inside it. That keeps ✕ on screen
          at the bottom of a long build instead of stranding you with no way out but
          scrolling all the way back up.
        */}
        <div className="recipe-scroll">
          <h2 id="recipe-title">{drink.name}</h2>
          <p className="recipe-meta">{drink.glass} · {drink.method}</p>

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
                <p className="pin-note">Saved with your shift and synced when connected.</p>
              </details>
            </div>
          )}

          {/*
            THE HOUSE POUR IS THE RECIPE. This card used to render the .org
            source instead, which had two costs: the Margarita showed a 3:2:1
            reference spec rather than what VIP actually pours, and 55 of the
            131 drinks showed no recipe at all because no Wikimedia page had
            been matched to them. Behind the bar, a card with nothing on it is
            worse than a card with the house pour on it. The source still gets
            shown -- underneath, as a cross-check -- but it no longer overrides.
          */}
          <h3>Ingredients</h3>
          <ul className="ingredients">
            {drink.ingredients.map((ing, i) => (
              <li key={`${i}-${ing.item}`}>
                <span>{ing.amount}</span>
                <b>{ing.item}</b>
              </li>
            ))}
          </ul>

          {/*
            The build, in order, at the bottom of every drink -- the part the sheet
            used to leave out. Numbered and one instruction per line so it can be
            read a step at a time with a bottle in the other hand.
          */}
          <section className="how-to">
            <h3>How to make it</h3>
            <ol className="steps">
              {steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </section>

          {/*
            Provenance kept, precedence removed. Folded shut so it is never in
            the way mid-rush, and open to anyone who wants to check the house
            pour against a published one.
          */}
          {recipe ? (
            <details className="recipe-crosscheck">
              <summary>Cross-check against a published recipe</summary>
              <ul className="ingredients">
                {recipe.ingredients.map((ing, i) => (
                  <li key={`${i}-${ing.item}`}>
                    <span>{ing.amount}</span>
                    <b>{ing.item}</b>
                  </li>
                ))}
              </ul>
              <p className="recipe-source">
                Source: <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">{recipe.sourceLabel}</a>.
                Adapted from Wikimedia contributors; <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA</a>.
                Community-edited reference, not a bar standard &mdash; where it differs from the house pour above, the house pour is what VIP serves.
              </p>
            </details>
          ) : null}

          {fromWeb ? (
            <p className="web-source">From TheCocktailDB · off-menu, no house price set</p>
          ) : drink.price === 0 ? (
            // Not a bug: the price is Thomas's to set. Saying so beats a silent $0
            // disappearing into the shift ticket total.
            <p className="web-source">No house price set · adds $0 to the shift ticket</p>
          ) : null}

          <div className="recipe-foot">
            <button type="button" className="made-btn" onClick={() => onMade(drink.id, drink.name)}>
              Mark ordered &amp; made
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
