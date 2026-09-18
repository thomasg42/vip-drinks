import { DRINK_ART } from '../data/drinkArt'

const RAIL_ART: Record<string, string> = {
  'quick-wine': 'art/wine.jpg',
  'quick-beer': 'art/beer.jpg',
  'quick-mimosa': DRINK_ART.mimosa,
  'quick-seltzer': 'art/seltzer.jpg',
}

/** Decorative imagery only. Names, recipes and tally actions remain authoritative. */
export function DrinkArtwork({ id, thumb }: { id: string; thumb?: string }) {
  const local = RAIL_ART[id] ?? DRINK_ART[id]
  const src = local ? `${import.meta.env.BASE_URL}${local}` : thumb
  if (!src) return null
  return (
    <img
      className="drink-art"
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={(event) => { event.currentTarget.style.visibility = 'hidden' }}
    />
  )
}
