import { renderToStaticMarkup } from 'react-dom/server'
import assert from 'node:assert/strict'
import { QuickRail } from '../src/components/QuickRail'
import { RecipeSheet } from '../src/components/RecipeSheet'
import { CheckSheet } from '../src/components/CheckSheet'
import { CashDrawer } from '../src/components/CashDrawer'
import { loadState } from '../src/storage'
import { DRINKS } from '../src/data/drinks'
import { MIXED_DRINKS } from '../src/data/mixedDrinks'
import { VERIFIED_RECIPES } from '../src/data/verifiedRecipes'
import { buildSteps } from '../src/data/steps'
import { SHORTEST_VIDEO } from '../src/data/shortestVideos'
import { youtubeId, type Drink } from '../src/types'

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

check('EVERY drink on the sheet shows the house pour and a numbered build -- none are blank', () => {
  for (const drink of DRINKS) {
    const html = renderToStaticMarkup(<RecipeSheet drink={drink} onClose={() => {}} onMade={() => {}} />)
    // The regression this pins: 55 of the 131 used to render "Recipe steps
    // hidden" and nothing else, because no Wikimedia page had been matched.
    assert.ok(!html.includes('Recipe steps hidden'), `${drink.name} is still hiding its recipe`)
    assert.ok(html.includes('class="steps"'), `${drink.name} has no build`)
    assert.ok(html.includes('class="ingredients"'), `${drink.name} has no ingredients`)
    assert.ok(html.includes('class="recipe-meta"'), `${drink.name} has no glass/method line`)
    // The pour on the card is the HOUSE pour, not a reference one.
    for (const ing of drink.ingredients) {
      assert.ok(
        html.includes(ing.item.replaceAll('&', '&amp;').replaceAll("'", '&#x27;')),
        `${drink.name} does not show its house ingredient "${ing.item}"`,
      )
    }
    const recipe = VERIFIED_RECIPES[drink.id]
    if (recipe) {
      // Provenance is kept, just demoted to a cross-check.
      const url = new URL(recipe.sourceUrl)
      assert.equal(url.protocol, 'https:', drink.name)
      assert.match(url.hostname, /\.(org|gov)$/, drink.name)
      assert.ok(html.includes(recipe.sourceUrl.replaceAll('&', '&amp;')), drink.name)
      assert.ok(html.includes('recipe-crosscheck'), `${drink.name} lost its source cross-check`)
    }
    assert.ok(html.includes('youtube-nocookie.com/embed/'), `${drink.name} lost its video`)
  }
})

check('the house Margarita is Thomas\u2019s pour, asked-for rim and all', () => {
  const margarita = DRINKS.find((d) => d.id === 'margarita')!
  const html = renderToStaticMarkup(<RecipeSheet drink={margarita} onClose={() => {}} onMade={() => {}} />)
  for (const line of ['2 oz', 'Blanco tequila', '1 oz', 'Triple sec', 'Lime or lemon juice', 'splash', 'Simple syrup']) {
    assert.ok(html.includes(line), `house Margarita is missing "${line}"`)
  }
  // The rim is a QUESTION, not an action -- salting a rim nobody asked for
  // cannot be undone once the drink is poured.
  const steps = buildSteps(margarita)
  assert.match(steps[0], /^Ask first: do they want salt on the rim\?/, 'the rim question is not the first step')
  // Strained into an empty glass. "Strain it into the rocks glass over fresh
  // ice" would be the wrong drink.
  assert.ok(steps.some((s) => /Strain it into the rocks glass\.$/.test(s)), 'the serve is not ice-free')
  assert.ok(!steps.some((s) => /over fresh ice/.test(s)), 'ice leaked into the house Margarita serve')
})

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
  assert.ok(html.includes('Cross-check against a published recipe'), 'the source cross-check is missing')
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
    html.includes('https://www.youtube.com/results?search_query=how%20to%20make%20a%20Paloma%20drink&amp;sp=EgIYAQ%3D%3D'),
    'the search link must carry YouTube\u2019s under-4-minutes filter',
  )
  assert.ok(html.includes('Find the quickest how-to'), 'the how-to prompt is missing')
  assert.ok(html.includes('Grapefruit soda'), 'a web drink must still show what goes in it')
  assert.ok(!html.includes('Recipe steps hidden'), 'no drink hides its recipe any more')
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

// ---- The drinks Thomas asked for, and the videos behind them ----

check('the calls that were missing are on the sheet now', () => {
  const names = new Set(DRINKS.map((d) => d.name))
  for (const wanted of [
    'Vodka Red Bull', 'Dirty Shirley', 'J\u00e4gerbomb', 'Shirley Temple',
    'Jack and Ginger', 'Green Tea Shot', 'Arnold Palmer', 'Michelada',
  ]) {
    assert.ok(names.has(wanted), `${wanted} missing from the sheet`)
  }
  assert.equal(DRINKS.length, 81 + MIXED_DRINKS.length, 'the curated 81 must all survive the merge')
})

check('no drink name is used twice either', () => {
  // A duplicate name renders the same drink twice on the sheet and breaks the
  // internet-results de-dup, which matches on name.
  const seen = new Map<string, string>()
  for (const d of DRINKS) {
    const key = d.name.toLowerCase()
    assert.ok(!seen.has(key), `duplicate name ${d.name} (${seen.get(key)} and ${d.id})`)
    seen.set(key, d.id)
  }
})

check('the new drinks carry no invented house price', () => {
  // Pricing is Thomas's decision. A guessed number would flow into the Cash
  // tab's shift ticket total looking exactly like a real one.
  for (const d of MIXED_DRINKS) {
    assert.equal(d.price, 0, `${d.name} has an unapproved price of ${d.price}`)
  }
  const html = renderToStaticMarkup(
    <RecipeSheet drink={MIXED_DRINKS[0]} onClose={() => {}} onMade={() => {}} />,
  )
  assert.ok(html.includes('No house price set'), 'an unpriced drink must say so on screen')
})

check('a saved video accepts a share link or a bare id', () => {
  const saved: [string, string | null][] = []
  const fireball = { ...DRINKS.find((d) => d.id === 'fireball-shot')!, videoUrl: '' }
  const html = renderToStaticMarkup(
    <RecipeSheet
      drink={fireball}
      onClose={() => {}}
      onMade={() => {}}
      onSaveVideo={(id, video) => saved.push([id, video])}
    />,
  )
  assert.ok(html.includes('Paste the YouTube link'), 'the paste field is missing')
  // The parser behind the field, checked directly -- these are the three shapes
  // a phone share sheet actually produces, plus the bare id people type.
  for (const shape of [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
  ]) {
    assert.equal(youtubeId(shape), 'dQw4w9WgXcQ', `${shape} did not parse`)
  }
  assert.equal(youtubeId('not a link'), null)
})

check('no drink id is used twice', () => {
  const seen = new Map<string, string>()
  for (const d of DRINKS) {
    assert.ok(!seen.has(d.id), `duplicate id ${d.id} (${seen.get(d.id)} and ${d.name})`)
    seen.set(d.id, d.name)
  }
})

check('every drink on the sheet is filed under a chip', () => {
  const allowed = new Set(['cocktail', 'highball', 'shot', 'na'])
  for (const d of DRINKS) {
    assert.ok(d.category, `${d.name} has no category`)
    assert.ok(allowed.has(d.category!), `${d.name} has an unknown category ${d.category}`)
  }
  // The point of the chips is that highballs and shots actually populate them.
  const count = (c: string) => DRINKS.filter((d) => d.category === c).length
  assert.ok(count('highball') >= 40, `only ${count('highball')} highballs`)
  assert.ok(count('shot') >= 13, `only ${count('shot')} shots`)
  assert.ok(count('na') >= 6, `only ${count('na')} no-alcohol drinks`)
})

check('every baked-in video id is a real id, never a placeholder', () => {
  for (const [name, id] of Object.entries(SHORTEST_VIDEO)) {
    assert.match(id, /^[\w-]{11}$/, `${name} has a malformed id ${id}`)
  }
  const ids = DRINKS.map(d => youtubeId(d.videoUrl))
  assert.equal(new Set(ids).size, ids.length, 'the same video is reused for two drinks')
  for (const d of MIXED_DRINKS) {
    if (d.videoUrl === '') continue
    assert.ok(youtubeId(d.videoUrl), `${d.name} has an unparseable video url ${d.videoUrl}`)
  }
})

check('a new drink with a verified short plays it in the app', () => {
  const redbull = DRINKS.find((d) => d.id === 'vodka-redbull')!
  const html = renderToStaticMarkup(
    <RecipeSheet drink={redbull} onClose={() => {}} onMade={() => {}} />,
  )
  assert.ok(html.includes('youtube-nocookie.com/embed/'), 'no player for a drink that has a video')
  assert.ok(!html.includes('Find the quickest how-to'), 'should not prompt when a video exists')
  assert.ok(html.includes('Vodka Red Bull'), 'drink title missing')
})

check('a drink with no verified video prompts instead of playing nothing', () => {
  const fireball = { ...DRINKS.find((d) => d.id === 'fireball-shot')!, videoUrl: '' }
  assert.equal(fireball.videoUrl, '', 'fixture drink should have no baked-in video')
  const html = renderToStaticMarkup(
    <RecipeSheet drink={fireball} onClose={() => {}} onMade={() => {}} />,
  )
  assert.ok(!html.includes('<iframe'), 'no player without a real video id')
  assert.ok(html.includes('Find the quickest how-to'), 'the prompt is missing')
  assert.ok(html.includes('sp=EgIYAQ%3D%3D'), 'the short-duration filter is missing')
  assert.ok(html.includes('Save it to this drink'), 'no way to make this drink fully integrated')
})

check('a video saved onto a drink plays instead of the prompt', () => {
  const fireball = { ...DRINKS.find((d) => d.id === 'fireball-shot')!, videoUrl: '' }
  const html = renderToStaticMarkup(
    <RecipeSheet
      drink={fireball}
      savedVideoId="dQw4w9WgXcQ"
      onClose={() => {}}
      onMade={() => {}}
      onSaveVideo={() => {}}
    />,
  )
  assert.ok(html.includes('embed/dQw4w9WgXcQ'), 'the saved video is not being played')
  assert.ok(!html.includes('Find the quickest how-to'), 'still prompting after a video was saved')
  assert.ok(html.includes('Remove saved video'), 'a saved video must be removable')
})

check('the chips render with real counts and every kind is reachable', () => {
  const html = renderToStaticMarkup(
    <CheckSheet drinks={DRINKS} topMadeIds={[]} flashing={null} onOpen={() => {}} onMake={() => {}} />,
  )
  for (const label of ['All', 'Cocktails', 'Highballs', 'Shots', 'No alcohol']) {
    assert.ok(html.includes(`${label}<span class="chip-count"`), `${label} chip missing`)
  }
  assert.ok(
    html.includes(`>${DRINKS.length}</span>`),
    `the All chip should count ${DRINKS.length} drinks`,
  )
  // Default view is unfiltered, so a shot and a mocktail are both on screen.
  assert.ok(html.includes('J\u00e4gerbomb'), 'shots missing from the default list')
  assert.ok(html.includes('Shirley Temple'), 'no-alcohol drinks missing from the default list')
})

// ---- The build steps, and the shared shift ledger ----

check('a drink shows its HOUSE build, numbered, below the ingredients', () => {
  const html = renderToStaticMarkup(
    <RecipeSheet drink={DRINKS.find((d) => d.id === 'margarita')!} onClose={() => {}} onMade={() => {}} />,
  )
  assert.ok(html.includes('How to make it'), 'the how-to block is missing')
  assert.ok(html.includes('<ol class="steps">'), 'the steps are not a numbered list')
  const house = buildSteps(DRINKS.find((d) => d.id === 'margarita')!)
  assert.ok(house.every(step => html.includes(step.replaceAll('&', '&amp;').replaceAll('\"', '&quot;').replaceAll("'", '&#x27;'))), 'house build steps missing')
  assert.ok(html.includes('en.wikibooks.org'), 'source cross-check missing')
  // It has to come AFTER the ingredients and BEFORE the action -- that is what
  // "at the bottom of all these" meant.
  assert.ok(html.indexOf('Ingredients') < html.indexOf('How to make it'))
  assert.ok(html.indexOf('How to make it') < html.indexOf('Mark ordered'))
})

check('the action button has a floor to sit on, so nothing ends up underneath it', () => {
  const html = renderToStaticMarkup(
    <RecipeSheet drink={DRINKS.find((d) => d.id === 'mojito')!} onClose={() => {}} onMade={() => {}} />,
  )
  assert.ok(html.includes('class="recipe-foot"'), 'the sticky footer is missing')
  assert.ok(html.includes('class="steps"'), 'verified mojito build missing')
})

/*
 * An open drink has to land where the bartender already is. The card used to be
 * absolutely positioned inside .app -- anchored to the top of the PAGE -- so
 * opening a drink partway down the sheet rendered it off-screen above, and it
 * then appeared to pop up by itself on the way back. CSS is what fixes that, so
 * what is pinned here is the structure the CSS needs: a card that does not
 * scroll, wrapped round a build that does, with the close button outside the
 * scroller so it cannot ride away at the bottom of a long recipe.
 */
check('the card is a fixed frame with only the build scrolling inside it', () => {
  const html = renderToStaticMarkup(
    <RecipeSheet drink={DRINKS.find((d) => d.id === 'mojito')!} onClose={() => {}} onMade={() => {}} />,
  )
  assert.ok(html.includes('class="recipe-scroll"'), 'the build has no scroll container of its own')
  // Close comes first and sits OUTSIDE the scroller, or it scrolls off with the steps.
  assert.ok(
    html.indexOf('class="recipe-close"') < html.indexOf('class="recipe-scroll"'),
    'the close button is inside the scrolling area',
  )
  // The sticky footer still belongs to the scroller -- that is what it sticks to.
  assert.ok(
    html.indexOf('class="recipe-scroll"') < html.indexOf('class="recipe-foot"'),
    'the sticky footer escaped the scroll container',
  )
})

const blankState = (() => {
  const store = new Map<string, string>()
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage
  return loadState()
})()

const offlineSync = {
  status: { kind: 'off' } as const,
  setAddress: () => {},
  refresh: () => {},
  save: async () => true,
  localSaved: true,
}

check('there is nothing to connect — no PIN field, no pairing button anywhere', () => {
  // Thomas asked for this twice. A disabled "Connect this device" button that
  // does nothing until a PIN is typed is exactly what was removed.
  for (const status of [
    { kind: 'off' } as const,
    { kind: 'ok', at: Date.now() } as const,
    { kind: 'error', message: 'offline' } as const,
  ]) {
    const html = renderToStaticMarkup(
      <CashDrawer
        state={blankState}
        onChangeOpening={() => {}}
        onChangeClosing={() => {}}
        onNotes={() => {}}
        onStartShift={() => {}}
        onEndShift={() => {}}
        sync={{ ...offlineSync, status }}
      />,
    )
    assert.ok(!/PIN|Connect this device|one-time-code/i.test(html), `${status.kind} still asks to pair`)
  }
})

check('a build with no ledger says so instead of implying the laptop has the count', () => {
  const html = renderToStaticMarkup(
    <CashDrawer
      state={blankState}
      onChangeOpening={() => {}}
      onChangeClosing={() => {}}
      onNotes={() => {}}
      onStartShift={() => {}}
      onEndShift={() => {}}
      sync={offlineSync}
    />,
  )
  assert.ok(html.includes('Cloud save unavailable'), 'an unsynced build must say so')
  assert.ok(html.includes('Cloud sync is not configured'))
  assert.ok(!html.includes('Saved to shared ledger'), 'it must not claim to be synced')
})

check('a synced device says when it last saved', () => {
  const html = renderToStaticMarkup(
    <CashDrawer
      state={blankState}
      onChangeOpening={() => {}}
      onChangeClosing={() => {}}
      onNotes={() => {}}
      onStartShift={() => {}}
      onEndShift={() => {}}
      sync={{ ...offlineSync, status: { kind: 'ok', at: Date.now() } }}
    />,
  )
  assert.ok(html.includes('Saved to shared ledger'))
  assert.ok(html.includes('Last saved just now'))
})

check('a device that has a token but has not reached the ledger does not claim it has', () => {
  const html = renderToStaticMarkup(
    <CashDrawer
      state={blankState}
      onChangeOpening={() => {}}
      onChangeClosing={() => {}}
      onNotes={() => {}}
      onStartShift={() => {}}
      onEndShift={() => {}}
      sync={{ ...offlineSync, status: { kind: 'ok', at: 0 } }}
    />,
  )
  assert.ok(html.includes('not yet'), 'an unconfirmed sync must not read as "just now"')
  assert.ok(!html.includes('Last saved just now'))
})

check('the memory bank is at the bottom even when it is empty', () => {
  const html = renderToStaticMarkup(
    <CashDrawer
      state={blankState}
      onChangeOpening={() => {}}
      onChangeClosing={() => {}}
      onNotes={() => {}}
      onStartShift={() => {}}
      onEndShift={() => {}}
      sync={offlineSync}
    />,
  )
  assert.ok(html.includes('Memory bank'), 'the memory bank heading is missing')
  assert.ok(html.includes('Nothing closed out yet'), 'an empty bank must say it is empty')
  // Last thing on the page, under the count and the start button.
  assert.ok(html.indexOf('Start shift') < html.indexOf('Memory bank'))
})

check('closed-shift totals appear above the current drawer using the Denver shift date', () => {
  const html = renderToStaticMarkup(<CashDrawer
    state={{ ...blankState, history: [{ id: 'test', startedAt: '2026-01-04T23:00:00Z',
      endedAt: '2026-01-05T00:04:00Z', openingTotal: 100, closingTotal: 125,
      drinkTickets: 0, drinksMade: 0, notes: '' }] }}
    onChangeOpening={() => {}} onChangeClosing={() => {}} onNotes={() => {}}
    onStartShift={() => {}} onEndShift={() => {}} sync={offlineSync} />)
  assert.ok(html.includes('Last saved shift · Jan 4, 2026'))
  assert.ok(html.includes('Opening<strong>$100.00</strong>'))
  assert.ok(html.includes('Closing<strong>$125.00</strong>'))
  assert.ok(html.includes('Difference<strong>$25.00</strong>'))
  assert.ok(html.indexOf('Last saved shift') < html.indexOf('Beginning of shift'))
  assert.ok(html.includes('Save now'))
  assert.ok(html.includes('Auto-save on'))
})

check('an offline save is only claimed when local storage confirmed it', () => {
  const render = (localSaved: boolean) => renderToStaticMarkup(<CashDrawer
    state={blankState} onChangeOpening={() => {}} onChangeClosing={() => {}} onNotes={() => {}}
    onStartShift={() => {}} onEndShift={() => {}}
    sync={{ ...offlineSync, localSaved, status: { kind: 'error', message: 'Network down' } }} />)
  assert.ok(render(true).includes('Saved offline. Sync retries automatically.'))
  assert.ok(!render(false).includes('Saved offline.'))
  assert.ok(render(false).includes('Keep this app open until a save succeeds.'))
})

console.log(failures === 0 ? '\nALL RENDER CHECKS PASSED' : `\n${failures} RENDER CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
