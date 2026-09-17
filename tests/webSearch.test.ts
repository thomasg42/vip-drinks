import assert from 'node:assert/strict'
import test from 'node:test'
import { searchTheInternet, ingredientLine } from '../src/data/webSearch.ts'

// A minimal localStorage so the cache path runs exactly as it does in the browser.
const store = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as unknown as Storage

test('a real search returns drinks with real ingredients and measures', async () => {
  const result = await searchTheInternet('margarita')
  assert.equal(result.status, 'ok')
  if (result.status !== 'ok') return

  const margarita = result.drinks.find((d) => d.name === 'Margarita')
  assert.ok(margarita, 'the plain Margarita must come back')
  assert.equal(margarita.source, 'web')
  assert.deepEqual(
    margarita.ingredients.map((i) => i.item),
    ['Tequila', 'Triple sec', 'Lime juice', 'Salt'],
  )
  // Fractions are converted for a bartender, not left as "1 1/2 oz".
  assert.equal(margarita.ingredients[0].amount, '1½ oz')
  assert.equal(margarita.ingredients[1].amount, '½ oz')
  assert.equal(margarita.glass, 'Cocktail glass')
  assert.ok(margarita.thumb?.startsWith('https://'))
  // Every result carries ingredients — that is the whole point of the search.
  for (const d of result.drinks) assert.ok(d.ingredients.length > 0, `${d.name} has ingredients`)
})

test('the one-line ingredient summary fits a result row', async () => {
  const result = await searchTheInternet('margarita')
  if (result.status !== 'ok') throw new Error('expected ok')
  const margarita = result.drinks.find((d) => d.name === 'Margarita')!
  assert.equal(ingredientLine(margarita), 'Tequila · Triple sec · Lime juice · Salt')
  assert.equal(ingredientLine(margarita, 2), 'Tequila · Triple sec +2')
})

test('a drink that is not in the sheet still comes back with a full recipe', async () => {
  const result = await searchTheInternet('paloma')
  assert.equal(result.status, 'ok')
  if (result.status !== 'ok') return
  assert.ok(result.drinks.length > 0)
  assert.ok(result.drinks[0].ingredients.length >= 2)
})

test('nonsense returns empty, not a crash', async () => {
  const result = await searchTheInternet('zzzqqnotadrink')
  assert.equal(result.status, 'empty')
})

test('a short query never hits the network', async () => {
  assert.equal((await searchTheInternet('a')).status, 'idle')
})

test('the second identical search is served from cache', async () => {
  await searchTheInternet('mojito')
  const realFetch = globalThis.fetch
  globalThis.fetch = (() => {
    throw new Error('cache miss: the network was hit twice for the same query')
  }) as typeof fetch
  try {
    const again = await searchTheInternet('MOJITO')
    assert.equal(again.status, 'ok')
  } finally {
    globalThis.fetch = realFetch
  }
})
