import { renderToStaticMarkup } from 'react-dom/server'
import assert from 'node:assert/strict'
import { QuickRail } from '../src/components/QuickRail'
import { RecipeSheet } from '../src/components/RecipeSheet'
import { DRINKS } from '../src/data/drinks'
import type { Drink } from '../src/types'

let failures = 0
function check(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ok  ${name}`)
  } catch (err) {
    failures += 1
    console.log(`FAIL  ${name}\n      ${(err as Error).message}`)
  }
}

check('the rail renders all four pours with their counts', () => {
  const html = renderToStaticMarkup(
    <QuickRail counts={{ 'quick-wine': 3, 'quick-beer': 12 }} onPour={() => {}} onUndo={() => {}} />,
  )
  for (const name of ['Wine', 'Beer', 'Mimosa', 'Seltzer']) {
    assert.ok(html.includes(`>${name}</span>`), `${name} tile missing`)
  }
  assert.ok(html.includes('>3</span>'), 'wine count 3 missing')
  assert.ok(html.includes('>12</span>'), 'beer count 12 missing')
  // Untouched pours read 0, not blank.
  assert.equal((html.match(/>0<\/span>/g) ?? []).length, 2, 'mimosa + seltzer should read 0')
})

check('the minus button is disabled at zero and live above it', () => {
  const html = renderToStaticMarkup(
    <QuickRail counts={{ 'quick-wine': 1 }} onPour={() => {}} onUndo={() => {}} />,
  )
  assert.equal((html.match(/class="quick-minus" disabled/g) ?? []).length, 3)
  assert.ok(html.includes('aria-label="Remove one Wine"'))
  assert.ok(!html.includes('aria-label="Remove one Wine" disabled'))
})

check('a curated drink still plays its verified short', () => {
  const margarita = DRINKS.find((d) => d.id === 'margarita')!
  const html = renderToStaticMarkup(
    <RecipeSheet drink={margarita} onClose={() => {}} onMade={() => {}} />,
  )
  assert.ok(html.includes('youtube-nocookie.com/embed/'), 'embed missing')
  assert.ok(!html.includes('listType=search'), 'the dead search-embed param came back')
  assert.ok(html.includes('Blanco tequila'))
})

check('a web drink shows ingredients, method and a real search link, never a dead player', () => {
  const web: Drink = {
    id: 'web-11007',
    name: 'Paloma',
    price: 0,
    glass: 'Highball glass',
    method: 'Shake and serve.',
    garnish: 'Bartender’s choice',
    ingredients: [
      { amount: '2 oz', item: 'Tequila' },
      { amount: '4 oz', item: 'Grapefruit soda' },
    ],
    videoUrl: '',
    source: 'web',
    thumb: 'https://www.thecocktaildb.com/images/media/drink/x.jpg',
    instructions: 'Salt the rim, build over ice, top with grapefruit soda.',
  }
  const html = renderToStaticMarkup(<RecipeSheet drink={web} onClose={() => {}} onMade={() => {}} />)
  assert.ok(!html.includes('<iframe'), 'a drink with no video id must not render a player')
  assert.ok(
    html.includes('https://www.youtube.com/results?search_query=how%20to%20make%20a%20Paloma%20cocktail'),
    'YouTube search link missing or malformed',
  )
  assert.ok(html.includes('Grapefruit soda'), 'ingredients missing')
  assert.ok(html.includes('Salt the rim'), 'method missing')
  assert.ok(html.includes('no house price set'), 'the unpriced warning must be visible')
})

check('a web drink that DOES carry a video plays it', () => {
  const web: Drink = {
    id: 'web-x',
    name: 'Test',
    price: 0,
    glass: 'Coupe',
    method: 'Stir.',
    garnish: '—',
    ingredients: [{ amount: '1 oz', item: 'Gin' }],
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    source: 'web',
  }
  const html = renderToStaticMarkup(<RecipeSheet drink={web} onClose={() => {}} onMade={() => {}} />)
  assert.ok(html.includes('embed/dQw4w9WgXcQ'), 'video id not used')
})

console.log(failures === 0 ? '\nALL RENDER CHECKS PASSED' : `\n${failures} RENDER CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
