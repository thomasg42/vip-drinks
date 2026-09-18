import type { Drink, Ingredient } from '../types.ts'

/**
 * The bit the sheet was missing: how you actually make it, in order.
 *
 * Every step is DERIVED from the recipe already on the card -- the glass, the
 * method, the ingredients in the order they are listed, the garnish. Nothing
 * here invents a measure, a spirit or a technique that is not already in the
 * data, which is the same claims rule the prices live under. If a drink needs
 * an order the generic flow cannot express -- a shot dropped into a beer, a
 * layer floated over a spoon -- it gets an entry in OVERRIDES and the generator
 * stays out of its way.
 */

/** Drinks whose real build is not "pour, mix, strain" in ingredient order. */
const OVERRIDES: Record<string, string[]> = {
  jagerbomb: [
    'Pour the Red Bull into a pint glass — about half full is plenty.',
    'Fill a shot glass with the Jägermeister.',
    'Drop the whole shot glass into the pint.',
    'Hand it over and tell them to drink it straight away, before it goes flat.',
  ],
  'vegas-bomb': [
    'Pour the Red Bull into a pint glass, about half full.',
    'Shake the Crown Royal, peach schnapps and cranberry with ice, then strain into a shot glass.',
    'Drop the shot glass into the pint.',
    'Hand it over and tell them to drink it straight away — it is a bomb, it does not wait.',
  ],
  'irish-slammer': [
    'Pour the Guinness into a half pint and let the head settle.',
    'Layer the Baileys and the Irish whiskey into a shot glass.',
    'Drop the shot into the Guinness.',
    'Drink it immediately — it curdles within seconds. That is not a mistake, it is the clock.',
  ],
  pickleback: [
    'Pour the whiskey into one shot glass.',
    'Pour the pickle brine into a second shot glass.',
    'Whiskey first, all of it.',
    'Brine straight behind it, no pause. The brine is the chaser, not a mixer.',
  ],
  'buttery-nipple': [
    'Pour the butterscotch schnapps into a shot glass, about two thirds full.',
    'Rest a bar spoon just above the schnapps, curved side up, touching the inside of the glass.',
    'Pour the Irish cream slowly over the back of the spoon so it sits on top instead of mixing.',
    'Serve it layered — do not stir it.',
  ],
  'baby-guinness': [
    'Pour the coffee liqueur into a shot glass, about three quarters full.',
    'Hold a bar spoon just above it, curved side up, against the glass.',
    'Pour the Irish cream slowly over the back of the spoon so it floats as the "head".',
    'Serve it layered — it is meant to look like a tiny pint.',
  ],
  'tequila-shot': [
    'Salt the back of their hand — lick it first so the salt sticks.',
    'Pour the tequila into a shot glass.',
    'Cut a lime wedge and set it beside the shot.',
    'Hand it over and call the order: salt, shoot, lime.',
  ],
  'fireball-shot': [
    'Keep the bottle in the fridge or the well. This one is poured cold, not shaken.',
    'Pour straight into a shot glass.',
    'Serve. No ice, no mixer, no garnish.',
  ],
}

const NO_GARNISH = new Set(['', '—', '-', 'none', 'no garnish', 'bartender’s choice'])

/** Glasses you chill before straining into them. */
const STEMMED = /coupe|nick & nora|nick and nora|martini|flute|poco/i

const MUDDLEABLE =
  /mint|lime|lemon|orange|berries|blackberr|strawberr|raspberr|basil|cucumber|sugar cube|peach|cherr/i

/** Anything with bubbles in it: stirring it back in flattens the drink. */
const FIZZY =
  /soda|\bcola\b|tonic|ginger beer|ginger ale|champagne|prosecco|sparkling|red bull|beer|lager|\bale\b|stout|seltzer|sprite|lemon-lime|7up/i

/** Things that go in last and on top, never into the tin. */
const TOPPER =
  /soda|\bcola\b|tonic|ginger beer|ginger ale|champagne|prosecco|sparkling|red bull|lemonade|beer|club soda|seltzer|sprite|7up|water$/i

function lower(value: string): string {
  return value.toLowerCase()
}

/** "Rocks, salt rim" -> "rocks glass"; "Copper mug" -> "copper mug". */
function glassPhrase(glass: string): string {
  // "Shaker and shot glasses" names the tin AND the serve. Only the serve is a glass.
  const served = /^shaker and (.+)$/i.exec(glass.trim())
  const base = (served ? served[1] : glass.split(',')[0]).trim()
  const name = lower(base)
  if (/glass|mug|cup$/.test(name)) return name
  return `${name} glass`
}

function measure(ing: Ingredient): string {
  const amount = ing.amount.trim()
  // "1 egg white optional" is a note, not a measure -- read it as one.
  const item = ing.item.trim().replace(/\s+optional$/i, ' (optional)')
  // The recipe writes a splash-to-fill as the amount "top"; saying "top it with
  // top soda water" is how a generator gives itself away.
  if (!amount || lower(amount) === 'top') return lower(item)
  // "splash", "pinch", "rim" are descriptions, not measures.
  if (/^(splash|pinch|dash|rinse|rim|float|to taste)$/i.test(amount)) {
    return `a ${lower(amount)} of ${lower(item)}`
  }
  // "8 Mint leaves" reads better than "8 of Mint leaves"; "2 dashes Angostura" needs the "of".
  if (/^\d+\s*(dash|dashes|drop|drops|splash|pinch|barspoon|tsp|tbsp)/i.test(amount)) {
    return `${amount} of ${lower(item)}`
  }
  return `${amount} ${lower(item)}`
}

type Split = {
  muddle: Ingredient[]
  main: Ingredient[]
  toppers: Ingredient[]
  floats: Ingredient[]
  /** Poured in at the very end so it sinks -- grenadine, the beer in a michelada. */
  sinkers: Ingredient[]
  /** Ice listed as an ingredient in a blended drink; the blend step covers it. */
  blendIce: Ingredient | null
}

/**
 * Methods say things like "Build on ice, grenadine last" and "beer last". That
 * is the real order, and it overrides the order the ingredients happen to be
 * listed in. Without it a Shirley Temple pours its grenadine first and never
 * sinks, which is the whole drink.
 */
const LAST_SYNONYM: Record<string, RegExp> = {
  beer: /lager|ale\b|beer|stout|pilsner/i,
}

function lastNamed(method: string, ingredients: Ingredient[]): Ingredient | null {
  const match = /\b([a-z][a-z\s-]*?)\s+last\b/.exec(method)
  if (!match) return null
  const word = match[1].trim()
  const direct = ingredients.find((ing) => lower(ing.item).includes(word))
  if (direct) return direct
  const synonym = LAST_SYNONYM[word]
  return synonym ? (ingredients.find((ing) => synonym.test(ing.item)) ?? null) : null
}

function splitIngredients(drink: Drink, method: string): Split {
  const muddle: Ingredient[] = []
  const main: Ingredient[] = []
  const toppers: Ingredient[] = []
  const floats: Ingredient[] = []
  const sinkers: Ingredient[] = []
  let blendIce: Ingredient | null = null
  const wantsMuddle = method.includes('muddle')
  const wantsFloat = method.includes('float')
  const goesLast = lastNamed(method, drink.ingredients)

  drink.ingredients.forEach((ing, index) => {
    const item = lower(ing.item)
    const amount = lower(ing.amount)
    // Rim salt/sugar is already handled by the rim step; listing it again as a
    // pour reads as "add rim kosher salt", which is not an instruction.
    if (amount === 'rim') return
    if (/^(crushed )?ice$/.test(item)) {
      blendIce = ing
      return
    }
    if (ing === goesLast) {
      sinkers.push(ing)
      return
    }
    if (/float/.test(item) || (wantsFloat && index === drink.ingredients.length - 1)) {
      floats.push(ing)
      return
    }
    if (amount === 'top' || (TOPPER.test(item) && index === drink.ingredients.length - 1 && drink.ingredients.length > 1)) {
      toppers.push(ing)
      return
    }
    if (wantsMuddle && muddle.length === 0 && MUDDLEABLE.test(item)) {
      muddle.push(ing)
      return
    }
    main.push(ing)
  })

  return { muddle, main, toppers, floats, sinkers, blendIce }
}

/**
 * The numbered build for one drink. Pure — no DOM, no state — so it is checked
 * against all 131 drinks in the test suite rather than eyeballed on a phone.
 */
export function buildSteps(drink: Drink): string[] {
  const override = OVERRIDES[drink.id]
  if (override) return override

  // A drink pulled off the internet carries its own method text. Its own words
  // beat anything derived, so split them into steps rather than replace them.
  if (drink.source === 'web' && drink.instructions) {
    return sentenceSteps(drink.instructions)
  }

  const method = lower(drink.method)
  const glass = glassPhrase(drink.glass)
  const rim = lower(drink.glass)

  // "Roll, never shake" is an instruction NOT to shake.
  const blended = method.includes('blend')
  const shaken = !blended && /\bshake/.test(method) && !/never shake|no shake|don't shake/.test(method)
  const stirredOut = method.includes('stir') && method.includes('strain')
  const strained = method.includes('strain')
  const dumped = method.includes('dump')
  // "shots" contains "hot". Word boundary, or every shot gets warmed first.
  const hot = /\bhot\b/.test(method)
  // Sazerac writes it as the glass ("Rocks, no ice"), not the method.
  const noIce = method.includes('no ice') || rim.includes('no ice')
  const noStir = method.includes('no stir')
  const crushed = method.includes('crushed ice')
  const dryShake = method.includes('dry')
  const vessel = shaken ? 'shaker' : blended ? 'blender' : stirredOut ? 'mixing glass' : glass
  const builtInGlass = vessel === glass

  const { muddle, main, toppers, floats, sinkers, blendIce } = splitIngredients(drink, method)
  const steps: string[] = []

  // 1. The glass, before anything goes in it.
  if (/salt rim/.test(rim)) {
    steps.push(`Run a lime wedge round the rim of the ${glass} and roll it in salt.`)
  } else if (/sugar rim/.test(rim)) {
    steps.push(`Wet the rim of the ${glass} with lemon and roll it in sugar.`)
  }
  if (method.includes('rinse')) {
    // The rinse is whichever ingredient SAYS it is a rinse -- taking the first
    // one listed had the Sazerac rinsed with its own rye.
    const at = main.findIndex(
      (ing) => lower(ing.amount).includes('rinse') || lower(ing.item).includes('rinse'),
    )
    const rinse = at >= 0 ? main.splice(at, 1)[0] : null
    if (rinse) {
      const what = lower(rinse.item).replace(/\s*rinse\s*/g, '').trim()
      steps.push(`Rinse the inside of the ${glass} with ${what || lower(rinse.item)} and tip out what is left.`)
    }
  }
  if (strained && STEMMED.test(drink.glass)) {
    steps.push(`Put the ${glass} in the freezer or fill it with ice and water — it wants to be cold when you pour.`)
  }

  // 2. Ice goes in first when the drink is built in the glass, which is most of a shift.
  if (hot) {
    steps.push(`Warm the ${glass} with hot water, then tip it out.`)
  } else if (crushed && !muddle.length) {
    steps.push(`Pack the ${glass} to the top with crushed ice.`)
  } else if (builtInGlass && !noIce && !muddle.length) {
    steps.push(`Fill the ${glass} to the top with ice.`)
  }

  // 3. Muddle before the ice, or you are just chipping cubes.
  if (muddle.length) {
    const what = muddle.map((ing) => measure(ing)).join(' and ')
    steps.push(`Muddle ${what} in the bottom of the ${vessel} — press it, do not shred it.`)
    if (builtInGlass && !noIce) {
      steps.push(crushed ? `Pack in crushed ice.` : `Fill the ${glass} with ice.`)
    }
  }

  // 4. One pour per line, in the order the recipe lists them.
  main.forEach((ing, index) => {
    const verb = index === 0 ? 'Pour in' : 'Add'
    steps.push(`${verb} ${measure(ing)}.`)
  })

  // 5. Mix it. When the drink is built in its own glass AND gets topped up,
  // the stir belongs after the top-up -- stirring a half-built highball and
  // then pouring soda into it is the wrong order in a real well.
  const mixStep = (): string | null => {
  if (dryShake) {
    steps.push('Seal the shaker with NO ice and shake hard for ten seconds — that dry shake is what builds the foam.')
    return 'Open it, fill it with ice, and shake again until the tin is frosted over.'
  }
  if (shaken) return 'Fill the shaker with ice, seal it, and shake hard for about twelve seconds — until the tin frosts and your hand is cold.'
  if (blended) {
    return blendIce
      ? `Add ${measure(blendIce)} and blend until it is smooth, with no chunks left.`
      : 'Add a scoop of crushed ice and blend until it is smooth, with no chunks left.'
  }
  if (stirredOut) return 'Fill the mixing glass with ice and stir for about twenty seconds, until the outside is cold to touch.'
  if (method.includes('swizzle')) return 'Swizzle it with a bar spoon until the outside of the glass frosts over.'
  if (method.includes('roll')) return 'Roll it between two tins — pour it back and forth a few times so it mixes without foaming up.'
  if (noStir) return 'Do not stir it — that last pour is meant to sink and sit where it lands. That is the whole look of the drink.'
  if (method.includes('stir')) return 'Stir it gently — a few turns, not a workout, or you knock the fizz out.'
  // Only worth saying when there are actually two things in there to combine.
  if (!noIce && !hot && main.length + toppers.length >= 2) {
    return 'Give it one gentle stir to bring it together.'
  }
  return null
  }

  const mixLast = builtInGlass && toppers.length > 0 && !method.includes('swizzle')
  if (!mixLast) {
    const mix = mixStep()
    if (mix) steps.push(mix)
  }

  // 6. Into the glass.
  if (dumped) {
    steps.push(`Dump the whole shaker, ice and all, straight into the ${glass}.`)
  } else if (method.includes('double strain') || method.includes('fine strain')) {
    steps.push(`Double-strain it into the chilled ${glass} — through the shaker's strainer AND a fine one, so no ice chips get in.`)
  } else if (method.includes('strain over ice')) {
    steps.push(`Strain it into the ${glass} over fresh ice.`)
  } else if (strained) {
    steps.push(`Strain it into the ${glass}.`)
  } else if (blended) {
    steps.push(`Pour it into the ${glass}.`)
  } else if (!builtInGlass) {
    // Shaken or stirred in a tin with no strain word in the method -- it still
    // has to get out of the tin, or the sheet stops mid-drink.
    steps.push(`Strain it into the ${glass}.`)
  }

  // 7. Whatever goes on top, goes on top.
  toppers.forEach((ing) => {
    steps.push(mixLast && !noStir
      ? `Top it with ${measure(ing)}.`
      : `Top it with ${measure(ing)} and leave it there — do not stir it back in.`)
  })
  floats.forEach((ing) => {
    const item = lower(ing.item).replace(/\s*float$/, '')
    steps.push(`Float ${ing.amount} ${item} over the back of a bar spoon so it sits on top.`)
  })

  if (mixLast) {
    const mix = mixStep()
    if (mix) steps.push(mix)
  }

  sinkers.forEach((ing) => {
    steps.push(
      FIZZY.test(ing.item)
        ? `Pour ${measure(ing)} in LAST and leave it alone — stirring it back in is what knocks the fizz out.`
        : `Pour ${measure(ing)} in LAST, slowly, and let it sink to the bottom. Do not stir it back up.`,
    )
  })

  // 8. Garnish is the last thing, always.
  const garnish = drink.garnish.trim()
  if (!NO_GARNISH.has(lower(garnish))) {
    steps.push(
      hot
        ? `Garnish with ${lower(garnish)} and get it out while it is hot.`
        : `Garnish with ${lower(garnish)} and get it out while it is cold.`,
    )
  } else {
    steps.push('Serve it as it is — no garnish on this one.')
  }

  return steps
}

/** Turns a block of method prose into numbered steps without rewording it. */
function sentenceSteps(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => (/[.!?]$/.test(line) ? line : `${line}.`))
}
