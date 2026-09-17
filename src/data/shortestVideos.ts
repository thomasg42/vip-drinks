/**
 * GENERATED — do not hand-edit. Rebuild with:
 *   NODE_USE_ENV_PROXY=1 node scripts/batch-find.mjs && node scripts/write-videos.mjs
 *
 * For each drink, the SHORTEST how-to video YouTube returns under its
 * "under 4 minutes" filter, after a title match and a junk-word filter, that
 * youtube.com/oembed then confirms is real AND embeddable. The comment on each
 * line is the title oEmbed returned — the proof it is the right video, not just
 * a parseable id.
 *
 * A drink missing from this map has no accurate short. It falls through to the
 * in-app "Find the quickest how-to" prompt rather than playing the wrong drink.
 */
export const SHORTEST_VIDEO: Record<string, string> = {
  "Vodka Red Bull": "RmiaDITs5IE", // 0:27 · Smirnoff vodka 90 ml and Red Bull #drink #cocktail #alcohol #bartender
  "Jack and Ginger": "JL3j10N7Oq4", // 0:58 · Jack & Ginger Jack Daniel's cocktail by Chilli Chef
  "Captain and Coke": "b835d3KsArw", // 0:48 · Captain and Coke
  "Vodka Tonic": "xtM3fqE8WTU", // 1:00 · How To Make The Vodka Tonic - Best Drink Recipes
  "Vodka Sprite": "FG-2TxtJ0WY", // 1:25 · Homemade Vodka with Sprite  | Simple Vodka Cocktail | Alcoholic | DeBar
  "Vodka Lemonade": "hJJas1Zat1s", // 1:01 · How to make Vodka Lemonade - Easy Cooking!
  // Vodka Water — no accurate short found - uses the in-app prompt
  "Tequila Soda": "JsDcuQ5aJeo", // 0:48 · Tequila Soda Cocktail - EASY to make Tequila drink
  "Gin and Juice": "8s_NjHRgf6U", // 0:32 · Gin and Juice
  "Greyhound": "roTjjxOzjLY", // 0:43 · How To Make Greyhound Cocktail
  "Salty Dog": "ZOYmGrBcPfo", // 0:52 · Salty Dog Cocktail: Refreshing & Easy Recipe
  "Bay Breeze": "cGv4S_bYpe0", // 0:28 · How to Make a Bay Breeze Cocktail | MyRecipes
  "Sea Breeze": "OD-NAOVz6TU", // 0:29 · How to Make Sea Breeze | Cocktail Recipe
  "Madras": "R0P8xwaGuJs", // 0:41 · How To Make A Madras
  "Fuzzy Navel": "ScRXI3OhZnY", // 0:49 · Fuzzy Navel Cocktail Recipe | Easy to Make
  // Amaretto and Coke — no accurate short found - uses the in-app prompt
  "Malibu Pineapple": "Ivx78B_g9bk", // 1:22 · How to Mix a MALIBU & Pineapple
  "Woo Woo": "Vac5T3WHO0A", // 0:35 · Woo Woo - Tipsy Bartender
  "Transfusion": "rxPPnhc9BAk", // 0:46 · How to make a Transfusion on the Golf Course
  "Michelada": "N6O5dtFaVaA", // 1:01 · Michelada
  "Rum Punch": "NZe5QbUP550", // 0:50 · The Ultimate Rum Punch Recipe
  "Blue Lagoon": "APzwFz70XPQ", // 0:43 · The Blue Lagoon
  "Electric Lemonade": "zWZsvE2Rroc", // 0:57 · Electric Lemonade
  "AMF": "qAuv-tjk-tQ", // 1:29 · Adios Motherf**cker Cocktail Recipe | AMF
  "Tokyo Tea": "ccuiZ79NfQY", // 0:37 · Tokyo Tea!
  "Dirty Shirley": "70U34B_sENU", // 0:40 · Dirty Shirley - Tipsy Bartender
  "Washington Apple": "8ieqEzsk6nw", // 0:27 · Crown Royal Washington Apple Big Game Cocktail
  "Alabama Slammer": "qLQqzbv4Yu4", // 0:37 · How to make an Alabama Slammer drink (step-by-step tutorial)
  "Chocolate Martini": "vJ_Ej_UY9f4", // 1:07 · Chocolate Martini Recipe
  "Amaretto Stone Sour": "5cPrKuDFZK4", // 1:08 · STONE SOUR DRINK RECIPE - HOW TO MIX
  "Bloody Maria": "_Vw0pJJkVCQ", // 0:39 · How to make a bloody Maria ! Cocktail recipe ! BLOODY MARIA !
  "Jagerbomb": "GZBNXTzBcnU", // 1:02 · How to Make a Jagerbomb | Shots Recipes
  "Vegas Bomb": "IuVNk5mz9eE", // 0:43 · Vegas Bomb Cocktail ✶ Easy Drink Recipe ✶
  "Green Tea Shot": "KeW807J7HNA", // 0:43 · Green Tea Shot/ Jameson Green Tea
  "Lemon Drop Shot": "00yQhAcipzg", // 0:43 · Lemon Drop Shot - Tipsy Bartender
  // Fireball Shot — no accurate short found - uses the in-app prompt
  "Tequila Shot": "qR9-PpjncTA", // 0:41 · Chilled Tequila Shots With Lime and Salt | Summer Drinks | The New York Times
  "Pickleback": "wk4BUHAaN1o", // 0:26 · How to Make A Pickleback. Get the recipe and try it at home.
  "Buttery Nipple": "oVQRjaO_W3Q", // 0:32 · Video Bartending Guide : Buttery Nipple Recipe - Liqueur Shots
  "Baby Guinness": "hQ5v1y7jb4g", // 0:45 · Baby Guinness Shots
  "Surfer on Acid": "XbhgAMVKttg", // 0:27 · How to Make a Surfer on Acid Shot
  "Redheaded Slut": "GuhvNPvcBFM", // 0:49 · Redheaded Slut Shot - Tipsy Bartender
  "Irish Slammer": "KVHrPLMGfFk", // 0:26 · Irish Slammer
  "White Gummy Bear Shot": "Q-4KgyxRNM8", // 0:27 · How to Make a White Gummy Bear Shot
  "Shirley Temple": "M-ffUi_JQL4", // 0:31 · How to Make a Shirley Temple | MyRecipes
  "Roy Rogers": "Kyd3J9xSAsI", // 0:37 · Roy Rogers Mocktail
  "Arnold Palmer": "HlMZvx_KyTc", // 0:59 · How to Make an Arnold Palmer Drink!
  "Virgin Mojito": "VVnRbvJP6R0", // 1:16 · Virgin Mojito Mocktail | Mocktail Recipes | Non Alcoholic Drinks Recipes
  "Virgin Pina Colada": "d3SY6GtMhM8", // 0:56 · Easy Virgin Piña Colada Recipe
  "Virgin Mule": "yBcIIeM9fXA", // 1:17 · Virgin Moscow Mule | Mocktail Mule Recipe | Easy Non Alcoholic Drink
}

/** Watch URL for a drink name, or empty when nothing verified was found. */
export function shortestVideoUrl(name: string): string {
  const id = SHORTEST_VIDEO[name]
  return id ? `https://www.youtube.com/watch?v=${id}` : ""
}
