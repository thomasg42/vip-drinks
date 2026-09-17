export type Ingredient = {
  amount: string
  item: string
}

export type Drink = {
  id: string
  name: string
  price: number
  glass: string
  method: string
  garnish: string
  ingredients: Ingredient[]
  videoUrl: string
  /** 'web' drinks come from the online search, not the curated 81. */
  source?: 'local' | 'web'
  /** Photo from the online source, when there is one. */
  thumb?: string
  /** Full method text from the online source. */
  instructions?: string
}

export type MadeEntry = {
  id: string
  drinkId: string
  name: string
  madeAt: string
}

export type Denoms = {
  hundreds: number
  fifties: number
  twenties: number
  tens: number
  fives: number
  ones: number
  coins: number
}

export type SavedShift = {
  id: string
  startedAt: string
  endedAt: string
  openingTotal: number
  closingTotal: number
  drinkTickets: number
  drinksMade: number
  notes: string
}

export type AppState = {
  made: MadeEntry[]
  opening: Denoms
  closing: Denoms
  notes: string
  shiftStartedAt: string | null
  history: SavedShift[]
}

export const EMPTY_DENOMS: Denoms = {
  hundreds: 0,
  fifties: 0,
  twenties: 0,
  tens: 0,
  fives: 0,
  ones: 0,
  coins: 0,
}

export function denomsTotal(d: Denoms): number {
  return (
    d.hundreds * 100 +
    d.fifties * 50 +
    d.twenties * 20 +
    d.tens * 10 +
    d.fives * 5 +
    d.ones * 1 +
    d.coins
  )
}

export function youtubeId(url: string): string | null {
  const watch = url.match(/[?&]v=([\w-]{11})/)
  if (watch) return watch[1]
  const short = url.match(/youtu\.be\/([\w-]{11})/)
  if (short) return short[1]
  const shorts = url.match(/shorts\/([\w-]{11})/)
  if (shorts) return shorts[1]
  return null
}

/** Embeddable player URL, or null when we have no real video id to play. */
export function youtubeEmbed(drink: Drink): string | null {
  const id = youtubeId(drink.videoUrl)
  if (!id) return null
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`
}

export function youtubeSearchUrl(name: string): string {
  const q = `how to make a ${name} cocktail`
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
}

export function youtubeWatch(drink: Drink): string {
  const id = youtubeId(drink.videoUrl)
  if (id) return drink.videoUrl
  return youtubeSearchUrl(drink.name)
}

export function isSameDay(iso: string, now = new Date()): boolean {
  const d = new Date(iso)
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
