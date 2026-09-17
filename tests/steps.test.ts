import assert from 'node:assert/strict'
import test from 'node:test'
import { DRINKS } from '../src/data/drinks.ts'
import { buildSteps } from '../src/data/steps.ts'
import type { Drink } from '../src/types.ts'

const byId = (id: string): Drink => {
  const drink = DRINKS.find((d) => d.id === id)
  assert.ok(drink, `${id} is not on the sheet`)
  return drink!
}

const stepsFor = (id: string) => buildSteps(byId(id))

test('every drink on the sheet has a real build, not a stub', () => {
  for (const drink of DRINKS) {
    const steps = buildSteps(drink)
    assert.ok(steps.length >= 3, `${drink.name} only has ${steps.length} steps`)
    for (const step of steps) {
      assert.equal(typeof step, 'string')
      assert.ok(step.trim().length > 8, `${drink.name} has a stub step: "${step}"`)
      // The tells of a generator running on data it did not understand.
      assert.ok(
        !/undefined|null|NaN|\[object/i.test(step),
        `${drink.name} leaked a value into "${step}"`,
      )
    }
  }
})

test('the last step is always what to do with the finished drink', () => {
  for (const drink of DRINKS) {
    const last = buildSteps(drink).at(-1)!
    assert.ok(
      /garnish|serve|drink it|hand it|brine|lime$|layered/i.test(last),
      `${drink.name} ends on "${last}"`,
    )
  }
})

test('ice goes in the glass first when the drink is built in the glass', () => {
  // Thomas's own description of what the sheet should say: ice cubes in first.
  assert.match(stepsFor('gin-tonic')[0], /fill the highball glass to the top with ice/i)
  assert.match(stepsFor('jack-ginger')[0], /ice/i)
})

test('a bomb is dropped, not stirred', () => {
  const jager = stepsFor('jagerbomb')
  assert.ok(jager.some((s) => /drop the whole shot glass into the pint/i.test(s)))
  assert.ok(!jager.some((s) => /stir/i.test(s)), 'nobody stirs a Jagerbomb')
  assert.ok(stepsFor('irish-slammer').some((s) => /drop the shot into the guinness/i.test(s)))
})

test('a layered shot is layered over a spoon', () => {
  for (const id of ['baby-guinness', 'buttery-nipple']) {
    assert.ok(
      stepsFor(id).some((s) => /over the back of the spoon/i.test(s)),
      `${id} lost its layer`,
    )
  }
})

test('a pickleback is two glasses in an order, not a mixed drink', () => {
  const steps = stepsFor('pickleback')
  assert.ok(steps.some((s) => /second shot glass/i.test(s)))
  assert.ok(!steps.some((s) => /shake|stir|strain/i.test(s)))
})

test('grenadine goes in LAST so it sinks, whatever order it is listed in', () => {
  // "Build on ice, grenadine last" is the whole drink; pouring it first is a
  // different, flat, pink-all-over drink.
  for (const id of ['shirley-temple', 'dirty-shirley', 'roy-rogers']) {
    const steps = stepsFor(id)
    const grenadine = steps.findIndex((s) => /grenadine/i.test(s))
    assert.ok(grenadine >= 0, `${id} lost its grenadine`)
    assert.match(steps[grenadine], /LAST/, `${id} does not pour it last`)
    // Only the garnish may come after it.
    assert.ok(grenadine >= steps.length - 2, `${id} pours grenadine too early`)
  }
})

test('a fizzy last pour is never stirred back in', () => {
  const redbull = stepsFor('vodka-redbull')
  assert.ok(redbull.some((s) => /red bull/i.test(s) && /LAST/.test(s) && /fizz/i.test(s)))
  assert.ok(stepsFor('michelada').some((s) => /lager/i.test(s) && /LAST/.test(s)))
})

test('a Sazerac is rinsed with absinthe and never sees an ice cube', () => {
  // Both were wrong on the first pass: it rinsed with its own rye, then filled
  // a glass the recipe explicitly says takes no ice.
  const steps = stepsFor('sazerac')
  assert.match(steps[0], /rinse the inside of the rocks glass with absinthe/i)
  assert.ok(!steps.some((s) => /fill the rocks glass .*with ice/i.test(s)))
})

test('a shot is not warmed with hot water because "shots" contains "hot"', () => {
  for (const id of ['green-tea-shot', 'surfer-on-acid', 'white-gummy-bear']) {
    assert.ok(!stepsFor(id).some((s) => /warm the/i.test(s)), `${id} got warmed`)
  }
  // The one drink that IS hot still says so.
  assert.match(stepsFor('irish-coffee')[0], /warm the irish coffee glass/i)
  assert.ok(stepsFor('irish-coffee').at(-1)!.includes('hot'))
})

test('"never shake" means do not shake', () => {
  assert.ok(!stepsFor('bloody-maria').some((s) => /shake/i.test(s)))
  assert.ok(stepsFor('bloody-maria').some((s) => /roll it between two tins/i.test(s)))
})

test('rim salt is a rim step, never an ingredient poured into the drink', () => {
  for (const id of ['salty-dog', 'michelada']) {
    const steps = stepsFor(id)
    assert.match(steps[0], /rim/i, `${id} lost its rim step`)
    assert.ok(!steps.some((s) => /^add a rim of|^add rim/i.test(s)), `${id} pours its rim salt in`)
  }
})

test('a muddled drink muddles before the ice, not after', () => {
  for (const id of ['mojito', 'mint-julep', 'virgin-mojito']) {
    const steps = stepsFor(id)
    const muddle = steps.findIndex((s) => /muddle/i.test(s))
    const ice = steps.findIndex((s) => /ice/i.test(s))
    assert.ok(muddle >= 0 && ice >= 0, `${id} lost a step`)
    assert.ok(muddle < ice, `${id} ices before it muddles`)
  }
})

test('a drink made in a tin always gets out of the tin', () => {
  // A shaken drink whose method never says "strain" still has to reach a glass.
  for (const drink of DRINKS) {
    const method = drink.method.toLowerCase()
    if (!/shake/.test(method) || /never shake/.test(method)) continue
    const steps = buildSteps(drink)
    assert.ok(
      steps.some((s) => /strain|dump|pour it into/i.test(s)),
      `${drink.name} is shaken and never served`,
    )
  }
})

test('a drink from the internet keeps the source’s own wording, split into steps', () => {
  const web: Drink = {
    id: 'web-1',
    name: 'Paloma',
    price: 0,
    glass: 'Highball glass',
    method: 'Build.',
    garnish: 'Lime',
    ingredients: [{ amount: '2 oz', item: 'Tequila' }],
    videoUrl: '',
    source: 'web',
    instructions: 'Salt the rim. Build over ice. Top with grapefruit soda',
  }
  assert.deepEqual(buildSteps(web), [
    'Salt the rim.',
    'Build over ice.',
    'Top with grapefruit soda.',
  ])
})
