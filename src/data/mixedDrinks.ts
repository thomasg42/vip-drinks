import type { Category, Drink, Ingredient } from '../types'
import { shortestVideoUrl } from './shortestVideos.ts'

/**
 * The calls the curated 81 never covered.
 *
 * The 81 are cocktails. What actually gets ordered at a bar is mostly two
 * things in a glass — vodka Red Bull, Jack and ginger, a Dirty Shirley — plus
 * shots, plus something for the people who are not drinking. None of that was
 * on the sheet, so anyone asking for it got a blank search.
 *
 * Each video is the SHORTEST how-to YouTube has under four minutes, verified
 * embeddable at build time. See shortestVideos.ts. A drink with no accurate
 * short gets an empty videoUrl and falls through to the in-app prompt rather
 * than playing the wrong drink.
 */

/**
 * HOUSE PRICES -- Thomas fills these in. Every one is 0 on purpose.
 *
 * What a drink rings in at is a business decision, the same call already made
 * for off-menu drinks and the rail pours. An invented $13 would flow straight
 * into the Cash tab's shift ticket total and look exactly like a real number,
 * which is worse than a visible zero. Until a price is set here the drink
 * counts as made, adds $0 to the ticket, and says so on its recipe card.
 *
 * Set them in one pass: replace the 0, rebuild, done.
 */
const HOUSE_PRICE: Record<string, number> = {}

const I = (amount: string, item: string): Ingredient => ({ amount, item })

function call(
  id: string,
  name: string,
  category: Category,
  glass: string,
  method: string,
  garnish: string,
  ingredients: Ingredient[],
  /** Only when the display name carries an accent the video index does not. */
  videoName = name,
): Drink {
  return {
    id,
    name,
    category,
    price: HOUSE_PRICE[id] ?? 0,
    glass,
    method,
    garnish,
    ingredients,
    videoUrl: shortestVideoUrl(videoName),
  }
}

export const MIXED_DRINKS: Drink[] = [
  // ---- Highballs: two things in a glass, which is most of a real shift ----
  call('vodka-redbull', 'Vodka Red Bull', 'highball', 'Highball', 'Build on ice, Red Bull last', 'Lime wedge', [
    I('2 oz', 'Vodka'), I('8.4 oz', 'Red Bull'),
  ]),
  call('jack-ginger', 'Jack and Ginger', 'highball', 'Highball', 'Build on ice', 'Lime wedge', [
    I('2 oz', 'Tennessee whiskey'), I('5 oz', 'Ginger ale'),
  ]),
  call('captain-coke', 'Captain and Coke', 'highball', 'Highball', 'Build on ice', 'Lime wedge', [
    I('2 oz', 'Spiced rum'), I('5 oz', 'Cola'),
  ]),
  call('vodka-tonic', 'Vodka Tonic', 'highball', 'Highball', 'Build on ice', 'Lime wedge', [
    I('2 oz', 'Vodka'), I('4 oz', 'Tonic water'),
  ]),
  call('vodka-sprite', 'Vodka Sprite', 'highball', 'Highball', 'Build on ice', 'Lemon wedge', [
    I('2 oz', 'Vodka'), I('5 oz', 'Lemon-lime soda'),
  ]),
  call('vodka-lemonade', 'Vodka Lemonade', 'highball', 'Highball', 'Build on ice', 'Lemon wheel', [
    I('2 oz', 'Vodka'), I('5 oz', 'Lemonade'),
  ]),
  call('vodka-water', 'Vodka Water', 'highball', 'Highball', 'Build on ice', 'Lime wedge', [
    I('2 oz', 'Vodka'), I('5 oz', 'Soda water'), I('½ oz', 'Lime juice'),
  ]),
  call('tequila-soda', 'Tequila Soda', 'highball', 'Highball', 'Build on ice', 'Lime wedge', [
    I('2 oz', 'Blanco tequila'), I('5 oz', 'Soda water'), I('½ oz', 'Lime juice'),
  ]),
  call('gin-juice', 'Gin and Juice', 'highball', 'Highball', 'Build on ice', 'Orange slice', [
    I('2 oz', 'Gin'), I('5 oz', 'Orange juice'),
  ]),
  call('greyhound', 'Greyhound', 'highball', 'Highball', 'Build on ice', 'Grapefruit wedge', [
    I('2 oz', 'Vodka'), I('5 oz', 'Grapefruit juice'),
  ]),
  call('salty-dog', 'Salty Dog', 'highball', 'Highball, salt rim', 'Salt the rim, build on ice', 'Grapefruit wedge', [
    I('2 oz', 'Vodka'), I('5 oz', 'Grapefruit juice'), I('rim', 'Kosher salt'),
  ]),
  call('bay-breeze', 'Bay Breeze', 'highball', 'Highball', 'Build on ice', 'Lime wedge', [
    I('2 oz', 'Vodka'), I('3 oz', 'Pineapple juice'), I('2 oz', 'Cranberry juice'),
  ]),
  call('sea-breeze', 'Sea Breeze', 'highball', 'Highball', 'Build on ice', 'Lime wedge', [
    I('2 oz', 'Vodka'), I('3 oz', 'Cranberry juice'), I('2 oz', 'Grapefruit juice'),
  ]),
  call('madras', 'Madras', 'highball', 'Highball', 'Build on ice', 'Orange slice', [
    I('2 oz', 'Vodka'), I('3 oz', 'Cranberry juice'), I('2 oz', 'Orange juice'),
  ]),
  call('fuzzy-navel', 'Fuzzy Navel', 'highball', 'Highball', 'Build on ice', 'Orange slice', [
    I('2 oz', 'Peach schnapps'), I('5 oz', 'Orange juice'),
  ]),
  call('amaretto-coke', 'Amaretto and Coke', 'highball', 'Highball', 'Build on ice', 'Orange slice', [
    I('2 oz', 'Amaretto'), I('5 oz', 'Cola'),
  ]),
  call('malibu-pineapple', 'Malibu Pineapple', 'highball', 'Highball', 'Build on ice', 'Pineapple wedge', [
    I('2 oz', 'Coconut rum'), I('5 oz', 'Pineapple juice'),
  ]),
  call('woo-woo', 'Woo Woo', 'highball', 'Highball', 'Build on ice', 'Lime wedge', [
    I('1½ oz', 'Vodka'), I('¾ oz', 'Peach schnapps'), I('4 oz', 'Cranberry juice'),
  ]),
  call('transfusion', 'Transfusion', 'highball', 'Highball', 'Build on ice', 'Lime wedge', [
    I('2 oz', 'Vodka'), I('2 oz', 'Concord grape juice'), I('4 oz', 'Ginger ale'), I('½ oz', 'Lime juice'),
  ]),
  call('michelada', 'Michelada', 'highball', 'Pint, salt rim', 'Build over ice, beer last', 'Lime wedge', [
    I('12 oz', 'Mexican lager'), I('1 oz', 'Lime juice'), I('3 dashes', 'Hot sauce'),
    I('2 dashes', 'Worcestershire'), I('rim', 'Kosher salt'),
  ]),
  call('rum-punch', 'Rum Punch', 'highball', 'Hurricane', 'Build over ice, float the dark rum', 'Orange and cherry', [
    I('1½ oz', 'White rum'), I('2 oz', 'Pineapple juice'), I('2 oz', 'Orange juice'),
    I('½ oz', 'Lime juice'), I('½ oz', 'Grenadine'), I('½ oz', 'Dark rum float'),
  ]),
  call('blue-lagoon', 'Blue Lagoon', 'highball', 'Highball', 'Build on ice', 'Lemon wheel', [
    I('1½ oz', 'Vodka'), I('1 oz', 'Blue curaçao'), I('4 oz', 'Lemonade'),
  ]),
  call('electric-lemonade', 'Electric Lemonade', 'highball', 'Collins', 'Shake the base, top with soda', 'Lemon wheel', [
    I('1½ oz', 'Vodka'), I('¾ oz', 'Blue curaçao'), I('1 oz', 'Sweet and sour'), I('3 oz', 'Lemon-lime soda'),
  ]),
  call('amf', 'AMF', 'highball', 'Collins', 'Build on ice, top with soda', 'Lemon wheel', [
    I('½ oz', 'Vodka'), I('½ oz', 'Gin'), I('½ oz', 'White rum'), I('½ oz', 'Blanco tequila'),
    I('½ oz', 'Blue curaçao'), I('1 oz', 'Sweet and sour'), I('2 oz', 'Lemon-lime soda'),
  ]),
  call('tokyo-tea', 'Tokyo Tea', 'highball', 'Collins', 'Build on ice, top with soda', 'Lemon wheel', [
    I('½ oz', 'Vodka'), I('½ oz', 'Gin'), I('½ oz', 'White rum'), I('½ oz', 'Blanco tequila'),
    I('½ oz', 'Midori'), I('1 oz', 'Sweet and sour'), I('2 oz', 'Lemon-lime soda'),
  ]),
  call('dirty-shirley', 'Dirty Shirley', 'highball', 'Highball', 'Build on ice, grenadine last', 'Maraschino cherry', [
    I('2 oz', 'Vodka'), I('½ oz', 'Grenadine'), I('5 oz', 'Lemon-lime soda'),
  ]),
  call('washington-apple', 'Washington Apple', 'highball', 'Rocks', 'Shake, strain over ice', 'Apple slice', [
    I('1 oz', 'Canadian whisky'), I('1 oz', 'Sour apple schnapps'), I('1 oz', 'Cranberry juice'),
  ]),
  call('alabama-slammer', 'Alabama Slammer', 'highball', 'Highball', 'Build on ice', 'Orange slice', [
    I('¾ oz', 'Amaretto'), I('¾ oz', 'Southern Comfort'), I('¾ oz', 'Sloe gin'), I('3 oz', 'Orange juice'),
  ]),
  call('amaretto-stone-sour', 'Amaretto Stone Sour', 'highball', 'Rocks', 'Shake, strain over ice', 'Orange and cherry', [
    I('1½ oz', 'Amaretto'), I('2 oz', 'Sweet and sour'), I('2 oz', 'Orange juice'),
  ]),
  call('bloody-maria', 'Bloody Maria', 'highball', 'Highball', 'Roll, never shake', 'Lime, olive, celery', [
    I('2 oz', 'Blanco tequila'), I('4 oz', 'Tomato juice'), I('½ oz', 'Lime juice'),
    I('3 dashes', 'Hot sauce'), I('2 dashes', 'Worcestershire'), I('pinch', 'Celery salt'),
  ]),

  // ---- One cocktail the 81 missed ----
  call('chocolate-martini', 'Chocolate Martini', 'cocktail', 'Coupe', 'Shake hard, double strain', 'Chocolate shavings', [
    I('2 oz', 'Vodka'), I('1 oz', 'Crème de cacao'), I('½ oz', 'Chocolate liqueur'),
  ]),

  // ---- Shots and bombs ----
  call('jagerbomb', 'Jägerbomb', 'shot', 'Pint and shot glass', 'Drop the shot into the Red Bull', '—', [
    I('1 oz', 'Jägermeister'), I('4 oz', 'Red Bull'),
  ], 'Jagerbomb'),
  call('vegas-bomb', 'Vegas Bomb', 'shot', 'Pint and shot glass', 'Drop the shot in', '—', [
    I('½ oz', 'Canadian whisky'), I('½ oz', 'Peach schnapps'), I('splash', 'Cranberry juice'), I('3 oz', 'Red Bull'),
  ]),
  call('green-tea-shot', 'Green Tea Shot', 'shot', 'Shaker and shot glasses', 'Shake, strain into shots', '—', [
    I('¾ oz', 'Irish whiskey'), I('¾ oz', 'Peach schnapps'), I('¾ oz', 'Sweet and sour'), I('splash', 'Lemon-lime soda'),
  ]),
  call('lemon-drop-shot', 'Lemon Drop Shot', 'shot', 'Shot, sugar rim', 'Sugar the rim, shake, strain', 'Lemon wedge', [
    I('1 oz', 'Citrus vodka'), I('½ oz', 'Triple sec'), I('½ oz', 'Lemon juice'),
  ]),
  call('fireball-shot', 'Fireball Shot', 'shot', 'Shot', 'Pour cold, straight from the fridge', '—', [
    I('1½ oz', 'Cinnamon whisky'),
  ]),
  call('tequila-shot', 'Tequila Shot', 'shot', 'Shot', 'Salt, shoot, lime', 'Lime wedge and salt', [
    I('1½ oz', 'Blanco tequila'),
  ]),
  call('pickleback', 'Pickleback', 'shot', 'Two shot glasses', 'Whiskey first, brine right behind it', '—', [
    I('1½ oz', 'Irish whiskey'), I('1½ oz', 'Pickle brine'),
  ]),
  call('buttery-nipple', 'Buttery Nipple', 'shot', 'Shot', 'Layer the cream on top over a spoon', '—', [
    I('¾ oz', 'Butterscotch schnapps'), I('¾ oz', 'Irish cream'),
  ]),
  call('baby-guinness', 'Baby Guinness', 'shot', 'Shot', 'Float the cream over a spoon', '—', [
    I('¾ oz', 'Coffee liqueur'), I('¼ oz', 'Irish cream'),
  ]),
  call('surfer-on-acid', 'Surfer on Acid', 'shot', 'Shaker and shot glasses', 'Shake, strain into shots', '—', [
    I('¾ oz', 'Jägermeister'), I('¾ oz', 'Coconut rum'), I('¾ oz', 'Pineapple juice'),
  ]),
  call('redheaded-slut', 'Redheaded Slut', 'shot', 'Shaker and shot glasses', 'Shake, strain into shots', '—', [
    I('¾ oz', 'Jägermeister'), I('¾ oz', 'Peach schnapps'), I('¾ oz', 'Cranberry juice'),
  ]),
  call('irish-slammer', 'Irish Slammer', 'shot', 'Half pint and shot glass', 'Drop it in and drink it straight away', '—', [
    I('½ oz', 'Irish whiskey'), I('½ oz', 'Irish cream'), I('6 oz', 'Stout'),
  ]),
  call('white-gummy-bear', 'White Gummy Bear Shot', 'shot', 'Shaker and shot glasses', 'Shake, strain into shots', '—', [
    I('½ oz', 'Vodka'), I('½ oz', 'Peach schnapps'), I('½ oz', 'Sweet and sour'), I('splash', 'Lemon-lime soda'),
  ]),

  // ---- No alcohol. Every event has people who are not drinking. ----
  call('shirley-temple', 'Shirley Temple', 'na', 'Highball', 'Build on ice, grenadine last', 'Maraschino cherry', [
    I('½ oz', 'Grenadine'), I('6 oz', 'Lemon-lime soda'),
  ]),
  call('roy-rogers', 'Roy Rogers', 'na', 'Highball', 'Build on ice, grenadine last', 'Maraschino cherry', [
    I('½ oz', 'Grenadine'), I('6 oz', 'Cola'),
  ]),
  call('arnold-palmer', 'Arnold Palmer', 'na', 'Collins', 'Build on ice', 'Lemon wheel', [
    I('4 oz', 'Iced tea'), I('4 oz', 'Lemonade'),
  ]),
  call('virgin-mojito', 'Virgin Mojito', 'na', 'Collins', 'Muddle, build, swizzle', 'Mint sprig', [
    I('8', 'Mint leaves'), I('¾ oz', 'Lime juice'), I('¾ oz', 'Simple syrup'), I('top', 'Soda water'),
  ]),
  call('virgin-pina-colada', 'Virgin Piña Colada', 'na', 'Hurricane', 'Blend with ice', 'Pineapple wedge', [
    I('3 oz', 'Pineapple juice'), I('1½ oz', 'Cream of coconut'), I('1 cup', 'Ice'),
  ], 'Virgin Pina Colada'),
  call('virgin-mule', 'Virgin Mule', 'na', 'Copper mug', 'Build, stir', 'Lime wheel and mint', [
    I('4 oz', 'Ginger beer'), I('½ oz', 'Lime juice'), I('2 oz', 'Soda water'),
  ]),
]
