import type { Drink, Ingredient } from '../types'

/**
 * The search browser: any drink on the internet, with its ingredients.
 *
 * Source is TheCocktailDB's free/open endpoint. It is keyless, sends
 * `access-control-allow-origin: *`, and returns the full ingredient +
 * measure list in the SAME response as the name — which is what lets the
 * results show ingredients off the bat instead of after a second tap.
 *
 * No API key ever goes in this file. A key in a static GitHub Pages bundle
 * is a published key.
 */
const ENDPOINT = 'https://www.thecocktaildb.com/api/json/v1/1/search.php?s='
const TIMEOUT_MS = 6000
const CACHE_KEY = 'vip-drinks-web-cache-v1'
const CACHE_MAX = 40

export type WebSearchResult =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'ok'; drinks: Drink[] }
  | { status: 'empty' }
  | { status: 'offline' }

type RawDrink = Record<string, string | null>

const memory = new Map<string, Drink[]>()

function loadCache(): Map<string, Drink[]> {
  if (memory.size > 0) return memory
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, Drink[]>
      for (const [k, v] of Object.entries(parsed)) memory.set(k, v)
    }
  } catch {
    /* a blocked or full localStorage must never break the search */
  }
  return memory
}

function saveCache() {
  try {
    const entries = [...memory.entries()].slice(-CACHE_MAX)
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    /* ignore */
  }
}

/** "1 1/2 oz " -> "1½ oz" — bartender-readable, matches the curated list. */
function tidyAmount(measure: string | null): string {
  if (!measure) return ''
  return measure
    .trim()
    .replace(/(\d)\s+1\/2/g, '$1½')
    .replace(/(\d)\s+1\/4/g, '$1¼')
    .replace(/(\d)\s+3\/4/g, '$1¾')
    .replace(/\b1\/2\b/g, '½')
    .replace(/\b1\/4\b/g, '¼')
    .replace(/\b3\/4\b/g, '¾')
    .replace(/\b1\/3\b/g, '⅓')
    .replace(/\b2\/3\b/g, '⅔')
    .replace(/\s+/g, ' ')
    .trim()
}

function ingredientsOf(raw: RawDrink): Ingredient[] {
  const out: Ingredient[] = []
  for (let i = 1; i <= 15; i += 1) {
    const item = raw[`strIngredient${i}`]
    if (!item || !item.trim()) continue
    out.push({ amount: tidyAmount(raw[`strMeasure${i}`]), item: item.trim() })
  }
  return out
}

/** First sentence of the instructions is the method; the rest stays available in full. */
function methodOf(instructions: string | null): string {
  if (!instructions) return 'See instructions'
  const first = instructions.trim().split(/(?<=\.)\s+/)[0] ?? instructions
  return first.length > 64 ? `${first.slice(0, 61).trimEnd()}…` : first
}

function toDrink(raw: RawDrink): Drink {
  const name = (raw.strDrink ?? 'Unknown').trim()
  return {
    id: `web-${raw.idDrink ?? name.toLowerCase().replace(/\W+/g, '-')}`,
    name,
    price: 0, // UNCONFIRMED — an off-menu drink has no agreed price. See the open decision.
    glass: (raw.strGlass ?? 'Bartender’s choice').trim(),
    method: methodOf(raw.strInstructions),
    garnish: 'Bartender’s choice',
    ingredients: ingredientsOf(raw),
    videoUrl: raw.strVideo ?? '',
    source: 'web',
    thumb: raw.strDrinkThumb ?? undefined,
    instructions: raw.strInstructions?.trim() || undefined,
  }
}

export async function searchTheInternet(query: string): Promise<WebSearchResult> {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return { status: 'idle' }

  const cache = loadCache()
  const hit = cache.get(q)
  if (hit) return hit.length > 0 ? { status: 'ok', drinks: hit } : { status: 'empty' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(ENDPOINT + encodeURIComponent(q), { signal: controller.signal })
    if (!res.ok) return { status: 'offline' }
    const body = (await res.json()) as { drinks: RawDrink[] | null }
    const drinks = (body.drinks ?? []).map(toDrink).filter((d) => d.ingredients.length > 0)
    cache.set(q, drinks)
    saveCache()
    return drinks.length > 0 ? { status: 'ok', drinks } : { status: 'empty' }
  } catch {
    // Aborted, offline, or the service is down. The curated 81 still work.
    return { status: 'offline' }
  } finally {
    clearTimeout(timer)
  }
}

/** One line of ingredients for the result row — the "off the bat" part. */
export function ingredientLine(drink: Drink, max = 4): string {
  const names = drink.ingredients.map((i) => i.item)
  if (names.length <= max) return names.join(' · ')
  return `${names.slice(0, max).join(' · ')} +${names.length - max}`
}
