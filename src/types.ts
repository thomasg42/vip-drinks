export type Ingredient = {
  amount: string
  item: string
}

/**
 * 'highball' is the two-things-in-a-glass half of a real shift, 'shot' covers
 * shots and bombs, 'na' is for the people who are not drinking. Drinks from the
 * internet search have no category -- they land under "From the internet".
 */
export type Category = 'cocktail' | 'highball' | 'shot' | 'na'

export type Drink = {
  id: string
  name: string
  /** Defaults to 'cocktail' when absent. */
  category?: Category
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

/**
 * When each mergeable field was last changed, in milliseconds.
 *
 * These are what make the shift survive two devices. The cash count is not a
 * field you can average or add up -- it is one person's reading of one drawer --
 * so the newest reading wins outright, and the clock is how "newest" is decided
 * without either device having to know the other exists.
 *
 * Times come from the SERVER whenever the app has spoken to it, so a phone whose
 * clock is ten minutes fast cannot silently outrank a laptop that is right.
 */
export type Clocks = {
  opening: number
  closing: number
  notes: number
  shift: number
  videos: number
}

export type AppState = {
  made: MadeEntry[]
  /** drink id -> YouTube video id the bartender saved for it themselves. */
  videos: Record<string, string>
  opening: Denoms
  closing: Denoms
  notes: string
  shiftStartedAt: string | null
  history: SavedShift[]
  /**
   * Ids of made-entries deleted somewhere. Without these an undo on the phone
   * is silently undone again by the laptop's copy on the next merge -- a union
   * of two lists can only ever grow.
   */
  removed: string[]
  clocks: Clocks
}

export const EMPTY_CLOCKS: Clocks = {
  opening: 0,
  closing: 0,
  notes: 0,
  shift: 0,
  videos: 0,
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

export function embedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`
}

/**
 * Embeddable player URL, or null when we have no real video id to play.
 * `override` is a video the bartender saved onto this drink themselves.
 */
export function youtubeEmbed(drink: Drink, override?: string | null): string | null {
  const id = override || youtubeId(drink.videoUrl)
  return id ? embedUrl(id) : null
}

/**
 * YouTube's "under 4 minutes" duration filter. The same one the build-time
 * finder uses, so a drink with no baked-in video still lands the viewer on the
 * quickest clips rather than a 20-minute cocktail vlog.
 */
export const SHORT_FILTER = 'EgIYAQ%3D%3D'

/** Search YouTube for the quickest how-to for a drink, shortest clips first. */
export function youtubeSearchUrl(name: string): string {
  const q = `how to make a ${name} drink`
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=${SHORT_FILTER}`
}

export function youtubeWatch(drink: Drink, override?: string | null): string {
  if (override) return `https://www.youtube.com/watch?v=${override}`
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
