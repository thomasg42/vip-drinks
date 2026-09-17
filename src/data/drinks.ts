import type { Category, Drink, Ingredient } from '../types'
import { MIXED_DRINKS } from './mixedDrinks.ts'

function shorts(id: string) {
  return `https://www.youtube.com/shorts/${id}`
}

function drink(
  id: string,
  name: string,
  glass: string,
  method: string,
  garnish: string,
  video: string,
  ingredients: Ingredient[],
  price = 15,
): Drink {
  return { id, name, price, glass, method, garnish, videoUrl: video, ingredients }
}

const I = (amount: string, item: string): Ingredient => ({ amount, item })

const COCKTAILS: Drink[] = [
  drink('margarita', 'Margarita', 'Rocks, salt rim', 'Shake, strain over ice', 'Lime wheel', shorts('Ckp4SUYlBRU'), [
    I('2 oz', 'Blanco tequila'), I('1 oz', 'Lime juice'), I('¾ oz', 'Cointreau'),
  ]),
  drink('old-fashioned', 'Old Fashioned', 'Rocks', 'Stir in glass', 'Orange peel', shorts('yOIYPQdWT6o'), [
    I('2 oz', 'Bourbon or rye'), I('1 tsp', 'Demerara syrup'), I('2 dashes', 'Angostura bitters'), I('1 dash', 'Orange bitters'),
  ], 16),
  drink('espresso-martini', 'Espresso Martini', 'Coupe', 'Shake hard, double strain', '3 coffee beans', shorts('Lx_bhbCM8ao'), [
    I('2 oz', 'Vodka'), I('1 oz', 'Fresh espresso'), I('½ oz', 'Coffee liqueur'), I('¼ oz', 'Simple syrup'),
  ], 16),
  drink('mojito', 'Mojito', 'Collins', 'Muddle, build, swizzle', 'Mint sprig', shorts('uQlLlNXh-v8'), [
    I('8', 'Mint leaves'), I('2 oz', 'White rum'), I('¾ oz', 'Lime juice'), I('¾ oz', 'Simple syrup'), I('top', 'Soda water'),
  ]),
  drink('negroni', 'Negroni', 'Rocks', 'Stir, strain over ice', 'Orange peel', shorts('H5D4l2JcCUs'), [
    I('1 oz', 'Gin'), I('1 oz', 'Campari'), I('1 oz', 'Sweet vermouth'),
  ], 16),
  drink('manhattan', 'Manhattan', 'Coupe', 'Stir, strain', 'Brandied cherry', shorts('EFFu0YZ_r-8'), [
    I('2 oz', 'Rye whiskey'), I('1 oz', 'Sweet vermouth'), I('2 dashes', 'Angostura bitters'),
  ], 16),
  drink('martini', 'Martini', 'Nick & Nora', 'Stir, strain', 'Olive or lemon twist', shorts('Z5Tgxxr-gFY'), [
    I('2½ oz', 'Gin'), I('½ oz', 'Dry vermouth'), I('1 dash', 'Orange bitters'),
  ], 16),
  drink('daiquiri', 'Daiquiri', 'Coupe', 'Shake, fine strain', 'Lime wheel', shorts('APFRZJSHlBk'), [
    I('2 oz', 'White rum'), I('1 oz', 'Lime juice'), I('¾ oz', 'Simple syrup'),
  ]),
  drink('whiskey-sour', 'Whiskey Sour', 'Rocks', 'Shake dry then wet, strain', 'Cherry and orange', shorts('U_uYdWo3GjU'), [
    I('2 oz', 'Bourbon'), I('¾ oz', 'Lemon juice'), I('¾ oz', 'Simple syrup'), I('1', 'Egg white optional'),
  ]),
  drink('moscow-mule', 'Moscow Mule', 'Copper mug', 'Build, stir', 'Lime wheel and mint', shorts('oNVKUXTxqS8'), [
    I('2 oz', 'Vodka'), I('½ oz', 'Lime juice'), I('4 oz', 'Ginger beer'),
  ], 14),
  drink('cosmo', 'Cosmopolitan', 'Coupe', 'Shake, fine strain', 'Orange peel', shorts('M8sbgJ4Puh8'), [
    I('1½ oz', 'Citrus vodka'), I('1 oz', 'Cointreau'), I('¾ oz', 'Lime juice'), I('¾ oz', 'Cranberry juice'),
  ]),
  drink('gin-tonic', 'Gin and Tonic', 'Highball', 'Build on ice', 'Lime wheel', shorts('93ZufuxM4ho'), [
    I('2 oz', 'Gin'), I('4 oz', 'Tonic water'),
  ], 13),
  drink('french-75', 'French 75', 'Flute', 'Shake base, top sparkling', 'Lemon twist', shorts('w1rsbGnYvAU'), [
    I('1 oz', 'Gin'), I('½ oz', 'Lemon juice'), I('½ oz', 'Simple syrup'), I('3 oz', 'Champagne'),
  ], 16),
  drink('mimosa', 'Mimosa', 'Flute', 'Build, no ice', 'Orange twist', shorts('xQz30NG_fnY'), [
    I('3 oz', 'Champagne'), I('3 oz', 'Orange juice'),
  ], 12),
  drink('paloma', 'Paloma', 'Highball, salt rim', 'Build, stir', 'Grapefruit wedge', shorts('6SLNZGZ2s70'), [
    I('2 oz', 'Blanco tequila'), I('½ oz', 'Lime juice'), I('4 oz', 'Grapefruit soda'),
  ], 14),
  drink('aperol-spritz', 'Aperol Spritz', 'Wine glass', 'Build on ice', 'Orange slice', shorts('YVJ8V5eT60Y'), [
    I('3 oz', 'Prosecco'), I('2 oz', 'Aperol'), I('1 oz', 'Soda water'),
  ], 14),
  drink('lemon-drop', 'Lemon Drop', 'Coupe, sugar rim', 'Shake, fine strain', 'Lemon twist', shorts('uk6UqEF6aG8'), [
    I('2 oz', 'Vodka'), I('¾ oz', 'Triple sec'), I('¾ oz', 'Lemon juice'), I('½ oz', 'Simple syrup'),
  ]),
  drink('mai-tai', 'Mai Tai', 'Rocks', 'Shake, dump', 'Mint sprig', shorts('rREoCTfCKGY'), [
    I('1 oz', 'Jamaican rum'), I('1 oz', 'Aged rum'), I('¾ oz', 'Lime juice'), I('½ oz', 'Orange curaçao'), I('½ oz', 'Orgeat'),
  ], 16),
  drink('pina-colada', 'Pina Colada', 'Poco grande', 'Blend or shake', 'Pineapple and cherry', shorts('jYf3nheLZfE'), [
    I('2 oz', 'White rum'), I('2 oz', 'Pineapple juice'), I('1½ oz', 'Cream of coconut'), I('½ oz', 'Lime juice'),
  ], 14),
  drink('long-island', 'Long Island Iced Tea', 'Collins', 'Shake, top cola', 'Lemon wedge', shorts('s30Q9XvDA5w'), [
    I('½ oz', 'Vodka'), I('½ oz', 'Gin'), I('½ oz', 'White rum'), I('½ oz', 'Tequila'), I('½ oz', 'Triple sec'), I('¾ oz', 'Lemon juice'), I('top', 'Cola'),
  ], 16),
  drink('tequila-sunrise', 'Tequila Sunrise', 'Highball', 'Build, no stir', 'Orange and cherry', shorts('L-LOoAuJcwA'), [
    I('2 oz', 'Blanco tequila'), I('4 oz', 'Orange juice'), I('½ oz', 'Grenadine'),
  ], 14),
  drink('bloody-mary', 'Bloody Mary', 'Highball', 'Build, roll', 'Celery and lemon', shorts('8vlakpt1oIY'), [
    I('2 oz', 'Vodka'), I('4 oz', 'Tomato juice'), I('½ oz', 'Lemon juice'), I('4 dashes', 'Hot sauce'), I('2 dashes', 'Worcestershire'),
  ], 14),
  drink('screwdriver', 'Screwdriver', 'Highball', 'Build, stir', 'Orange slice', shorts('9O_7Lq4f6Oc'), [
    I('2 oz', 'Vodka'), I('4 oz', 'Orange juice'),
  ], 12),
  drink('white-russian', 'White Russian', 'Rocks', 'Build, float cream', 'None', shorts('2VX7-O8F36c'), [
    I('2 oz', 'Vodka'), I('1 oz', 'Coffee liqueur'), I('1 oz', 'Heavy cream'),
  ], 14),
  drink('black-russian', 'Black Russian', 'Rocks', 'Build, stir', 'None', shorts('TvtbSzJiYS0'), [
    I('2 oz', 'Vodka'), I('1 oz', 'Coffee liqueur'),
  ], 13),
  drink('irish-coffee', 'Irish Coffee', 'Irish coffee glass', 'Build hot', 'Lightly whipped cream', shorts('cdfoFhCBcVY'), [
    I('1½ oz', 'Irish whiskey'), I('4 oz', 'Hot coffee'), I('½ oz', 'Brown sugar'), I('top', 'Cream'),
  ], 14),
  drink('mint-julep', 'Mint Julep', 'Julep cup', 'Muddle, pack crushed ice', 'Mint bouquet', shorts('sPYiaw1nz5I'), [
    I('8', 'Mint leaves'), I('2 oz', 'Bourbon'), I('½ oz', 'Simple syrup'),
  ], 16),
  drink('sazerac', 'Sazerac', 'Rocks, no ice', 'Stir, rinse glass', 'Lemon peel', shorts('DCjJnHrxF8A'), [
    I('2 oz', 'Rye whiskey'), I('1 tsp', 'Demerara syrup'), I('3 dashes', 'Peychaud bitters'), I('rinse', 'Absinthe'),
  ], 16),
  drink('boulevardier', 'Boulevardier', 'Rocks', 'Stir, strain over ice', 'Orange peel', shorts('ljZ55qgduJc'), [
    I('1½ oz', 'Bourbon'), I('1 oz', 'Campari'), I('1 oz', 'Sweet vermouth'),
  ], 16),
  drink('paper-plane', 'Paper Plane', 'Coupe', 'Shake, strain', 'None', shorts('9ZrnQ1sDcdc'), [
    I('¾ oz', 'Bourbon'), I('¾ oz', 'Aperol'), I('¾ oz', 'Amaro Nonino'), I('¾ oz', 'Lemon juice'),
  ], 16),
  drink('penicillin', 'Penicillin', 'Rocks', 'Shake, strain over ice', 'Candied ginger', shorts('8LgbwxrYmFc'), [
    I('2 oz', 'Blended Scotch'), I('¾ oz', 'Lemon juice'), I('¾ oz', 'Honey-ginger syrup'), I('¼ oz', 'Islay Scotch float'),
  ], 16),
  drink('last-word', 'Last Word', 'Coupe', 'Shake, fine strain', 'None', shorts('jdVk2-HkiZI'), [
    I('¾ oz', 'Gin'), I('¾ oz', 'Green Chartreuse'), I('¾ oz', 'Maraschino'), I('¾ oz', 'Lime juice'),
  ], 16),
  drink('aviation', 'Aviation', 'Coupe', 'Shake, fine strain', 'Brandied cherry', shorts('JhCYa97s4e0'), [
    I('2 oz', 'Gin'), I('½ oz', 'Maraschino'), I('¼ oz', 'Crème de violette'), I('¾ oz', 'Lemon juice'),
  ], 16),
  drink('gimlet', 'Gimlet', 'Coupe', 'Shake, fine strain', 'Lime wheel', shorts('O11F_Sdx2v4'), [
    I('2 oz', 'Gin'), I('¾ oz', 'Lime juice'), I('¾ oz', 'Simple syrup'),
  ]),
  drink('tom-collins', 'Tom Collins', 'Collins', 'Shake, top soda', 'Lemon wheel', shorts('vW7az-gUiTw'), [
    I('2 oz', 'Gin'), I('¾ oz', 'Lemon juice'), I('¾ oz', 'Simple syrup'), I('top', 'Soda water'),
  ], 14),
  drink('sidecar', 'Sidecar', 'Coupe, sugar rim', 'Shake, fine strain', 'Orange peel', shorts('xgpADS-_ais'), [
    I('2 oz', 'Cognac'), I('¾ oz', 'Cointreau'), I('¾ oz', 'Lemon juice'),
  ], 16),
  drink('bee-knees', 'Bees Knees', 'Coupe', 'Shake, fine strain', 'Lemon twist', shorts('T38pvMzgdlw'), [
    I('2 oz', 'Gin'), I('¾ oz', 'Lemon juice'), I('¾ oz', 'Honey syrup'),
  ]),
  drink('corpse-reviver', 'Corpse Reviver No. 2', 'Coupe', 'Shake, absinthe rinse', 'Orange peel', shorts('KxTPfkCguXU'), [
    I('¾ oz', 'Gin'), I('¾ oz', 'Cointreau'), I('¾ oz', 'Lillet Blanc'), I('¾ oz', 'Lemon juice'), I('rinse', 'Absinthe'),
  ], 16),
  drink('vesper', 'Vesper', 'Coupe', 'Shake, fine strain', 'Lemon peel', shorts('R6eftaRF_Ao'), [
    I('3 oz', 'Gin'), I('1 oz', 'Vodka'), I('½ oz', 'Lillet Blanc'),
  ], 16),
  drink('dirty-martini', 'Dirty Martini', 'Coupe', 'Stir, strain', 'Olives', shorts('yUwpaJVoEqo'), [
    I('2½ oz', 'Gin or vodka'), I('½ oz', 'Dry vermouth'), I('½ oz', 'Olive brine'),
  ], 16),
  drink('pornstar-martini', 'Pornstar Martini', 'Coupe plus shot', 'Shake, strain', 'Passion fruit and prosecco', shorts('CSTSp7N7cag'), [
    I('2 oz', 'Vanilla vodka'), I('1 oz', 'Passion fruit liqueur'), I('1 oz', 'Passion fruit puree'), I('½ oz', 'Lime juice'), I('½ oz', 'Vanilla syrup'),
  ], 16),
  drink('french-martini', 'French Martini', 'Coupe', 'Shake, fine strain', 'Raspberry', shorts('1BW0gthppEI'), [
    I('2 oz', 'Vodka'), I('1 oz', 'Pineapple juice'), I('½ oz', 'Chambord'),
  ]),
  drink('amaretto-sour', 'Amaretto Sour', 'Rocks', 'Shake dry then wet', 'Lemon and cherry', shorts('Ju80Ihaz-Bc'), [
    I('1½ oz', 'Amaretto'), I('¾ oz', 'Cask-strength bourbon'), I('1 oz', 'Lemon juice'), I('1', 'Egg white'),
  ], 14),
  drink('gold-rush', 'Gold Rush', 'Rocks', 'Shake, strain over ice', 'None', shorts('YEA6aN6dzVE'), [
    I('2 oz', 'Bourbon'), I('¾ oz', 'Lemon juice'), I('¾ oz', 'Honey syrup'),
  ], 16),
  drink('dark-n-stormy', 'Dark n Stormy', 'Highball', 'Build', 'Lime wheel', shorts('40yxZayZkvI'), [
    I('2 oz', 'Goslings rum'), I('½ oz', 'Lime juice'), I('4 oz', 'Ginger beer'),
  ], 14),
  drink('cuba-libre', 'Cuba Libre', 'Highball', 'Build', 'Lime wedge', shorts('EbC6SREpajg'), [
    I('2 oz', 'White rum'), I('½ oz', 'Lime juice'), I('4 oz', 'Cola'),
  ], 12),
  drink('caipirinha', 'Caipirinha', 'Rocks', 'Muddle, build', 'Lime', shorts('C4ucGMb8Zyg'), [
    I('½', 'Lime, wedges'), I('2 tsp', 'Sugar'), I('2 oz', 'Cachaça'),
  ], 14),
  drink('jungle-bird', 'Jungle Bird', 'Rocks', 'Shake, strain over ice', 'Pineapple', shorts('EfWoKctmrYk'), [
    I('1½ oz', 'Black rum'), I('¾ oz', 'Campari'), I('1½ oz', 'Pineapple juice'), I('½ oz', 'Lime juice'), I('½ oz', 'Demerara syrup'),
  ], 16),
  drink('painkiller', 'Painkiller', 'Hurricane', 'Shake or blend', 'Nutmeg and pineapple', shorts('cgWqOkCsxKM'), [
    I('2 oz', 'Pusser rum'), I('4 oz', 'Pineapple juice'), I('1 oz', 'Orange juice'), I('1 oz', 'Cream of coconut'),
  ], 14),
  drink('hemingway', 'Hemingway Daiquiri', 'Coupe', 'Shake, fine strain', 'Lime wheel', shorts('D0slRQfRffI'), [
    I('2 oz', 'White rum'), I('¾ oz', 'Lime juice'), I('½ oz', 'Grapefruit juice'), I('½ oz', 'Maraschino'),
  ], 16),
  drink('ranch-water', 'Ranch Water', 'Highball', 'Build', 'Lime', shorts('uvlQz2sSwRs'), [
    I('2 oz', 'Blanco tequila'), I('½ oz', 'Lime juice'), I('top', 'Topo Chico'),
  ], 13),
  drink('spicy-margarita', 'Spicy Margarita', 'Rocks, salt rim', 'Shake, strain over ice', 'Jalapeño', shorts('NFu5Lj9aetc'), [
    I('2 oz', 'Blanco tequila'), I('1 oz', 'Lime juice'), I('¾ oz', 'Agave syrup'), I('2', 'Jalapeño slices'),
  ], 16),
  drink('mezcal-margarita', 'Mezcal Margarita', 'Rocks, salt rim', 'Shake, strain over ice', 'Lime wheel', shorts('ZEPuvqnhtFQ'), [
    I('2 oz', 'Mezcal'), I('1 oz', 'Lime juice'), I('¾ oz', 'Agave syrup'),
  ], 16),
  drink('americano', 'Americano', 'Highball', 'Build on ice', 'Orange slice', shorts('d2d5AiB5F6A'), [
    I('1½ oz', 'Campari'), I('1½ oz', 'Sweet vermouth'), I('top', 'Soda water'),
  ], 13),
  drink('negroni-sbagliato', 'Negroni Sbagliato', 'Rocks', 'Build', 'Orange slice', shorts('Dg50w4CVLIQ'), [
    I('1 oz', 'Campari'), I('1 oz', 'Sweet vermouth'), I('1 oz', 'Prosecco'),
  ], 14),
  drink('hugo-spritz', 'Hugo Spritz', 'Wine glass', 'Build on ice', 'Mint and lime', shorts('_ERc88lP4UE'), [
    I('2 oz', 'Prosecco'), I('1 oz', 'Elderflower liqueur'), I('1 oz', 'Soda water'), I('6', 'Mint leaves'),
  ], 14),
  drink('bellini', 'Bellini', 'Flute', 'Build, no ice', 'None', shorts('Ng4Xl2Vkcg8'), [
    I('2 oz', 'White peach puree'), I('4 oz', 'Prosecco'),
  ], 13),
  drink('kir-royale', 'Kir Royale', 'Flute', 'Build, no ice', 'Lemon twist', shorts('3iAfmlhg4So'), [
    I('½ oz', 'Crème de cassis'), I('5 oz', 'Champagne'),
  ], 14),
  drink('southside', 'Southside', 'Coupe', 'Shake, fine strain', 'Mint leaf', shorts('SLqWEVPwZhs'), [
    I('2 oz', 'Gin'), I('¾ oz', 'Lime juice'), I('¾ oz', 'Simple syrup'), I('6', 'Mint leaves'),
  ]),
  drink('clover-club', 'Clover Club', 'Coupe', 'Shake dry then wet', 'Raspberry', shorts('gmkwRLKJW1E'), [
    I('2 oz', 'Gin'), I('½ oz', 'Raspberry syrup'), I('½ oz', 'Lemon juice'), I('¼ oz', 'Dry vermouth'), I('1', 'Egg white'),
  ], 16),
  drink('brandy-alexander', 'Brandy Alexander', 'Coupe', 'Shake, fine strain', 'Nutmeg', shorts('Duddr_uzOlo'), [
    I('1½ oz', 'Cognac'), I('1 oz', 'Crème de cacao'), I('1 oz', 'Cream'),
  ], 14),
  drink('grasshopper', 'Grasshopper', 'Coupe', 'Shake, fine strain', 'Mint', shorts('AGRgVlQNTms'), [
    I('1 oz', 'Crème de menthe'), I('1 oz', 'White crème de cacao'), I('1 oz', 'Cream'),
  ], 13),
  drink('mudslide', 'Mudslide', 'Rocks or blended', 'Shake or blend', 'Chocolate', shorts('Qf2aQVTSiPA'), [
    I('1 oz', 'Vodka'), I('1 oz', 'Coffee liqueur'), I('1 oz', 'Irish cream'), I('1 oz', 'Cream'),
  ], 14),
  drink('sex-on-the-beach', 'Sex on the Beach', 'Highball', 'Build', 'Orange slice', shorts('U5iAJ6zSaG0'), [
    I('1½ oz', 'Vodka'), I('¾ oz', 'Peach schnapps'), I('2 oz', 'Orange juice'), I('2 oz', 'Cranberry juice'),
  ], 13),
  drink('blue-hawaiian', 'Blue Hawaiian', 'Hurricane', 'Blend or shake', 'Pineapple', shorts('m4h2pVJnzZg'), [
    I('1 oz', 'White rum'), I('1 oz', 'Blue curaçao'), I('2 oz', 'Pineapple juice'), I('1 oz', 'Cream of coconut'),
  ], 14),
  drink('hurricane', 'Hurricane', 'Hurricane', 'Shake, dump', 'Orange and cherry', shorts('HqRkJkRe5QA'), [
    I('2 oz', 'Light rum'), I('2 oz', 'Dark rum'), I('1 oz', 'Passion fruit puree'), I('1 oz', 'Orange juice'), I('½ oz', 'Lime juice'), I('½ oz', 'Simple syrup'),
  ], 14),
  drink('zombie', 'Zombie', 'Tiki mug', 'Shake or flash blend', 'Mint', shorts('gN2lAKfTipc'), [
    I('1½ oz', 'Puerto Rican rum'), I('1½ oz', 'Gold rum'), I('1 oz', '151 rum'), I('¾ oz', 'Lime juice'), I('½ oz', 'Grapefruit juice'), I('½ oz', 'Cinnamon syrup'), I('½ oz', 'Falernum'),
  ], 16),
  drink('godfather', 'Godfather', 'Rocks', 'Build, stir', 'None', shorts('I46xSB4ePq0'), [
    I('2 oz', 'Scotch'), I('1 oz', 'Amaretto'),
  ], 14),
  drink('rusty-nail', 'Rusty Nail', 'Rocks', 'Build, stir', 'Lemon peel', shorts('s4trJtXeogQ'), [
    I('2 oz', 'Scotch'), I('¾ oz', 'Drambuie'),
  ], 14),
  drink('rob-roy', 'Rob Roy', 'Coupe', 'Stir, strain', 'Cherry', shorts('p6iJjxmF85M'), [
    I('2 oz', 'Scotch'), I('1 oz', 'Sweet vermouth'), I('2 dashes', 'Angostura bitters'),
  ], 16),
  drink('vieux-carre', 'Vieux Carre', 'Rocks', 'Stir, strain over ice', 'Lemon peel', shorts('Fml8XFzY0ik'), [
    I('1 oz', 'Rye'), I('1 oz', 'Cognac'), I('1 oz', 'Sweet vermouth'), I('1 tsp', 'Bénédictine'), I('2 dashes', 'Peychaud bitters'), I('2 dashes', 'Angostura bitters'),
  ], 16),
  drink('new-york-sour', 'New York Sour', 'Rocks', 'Shake, red wine float', 'None', shorts('bEjG83TyNrs'), [
    I('2 oz', 'Rye or bourbon'), I('1 oz', 'Lemon juice'), I('¾ oz', 'Simple syrup'), I('½ oz', 'Red wine float'),
  ], 16),
  drink('irish-maid', 'Irish Maid', 'Rocks', 'Muddle, shake', 'Cucumber', shorts('99tD9dKwDjo'), [
    I('2 oz', 'Irish whiskey'), I('½ oz', 'St-Germain'), I('¾ oz', 'Lemon juice'), I('¾ oz', 'Simple syrup'), I('3', 'Cucumber slices'),
  ], 15),
  drink('whiskey-ginger', 'Whiskey Ginger', 'Highball', 'Build', 'Lime', shorts('k3zgFSdiccw'), [
    I('2 oz', 'Whiskey'), I('4 oz', 'Ginger ale'),
  ], 12),
  drink('vodka-soda', 'Vodka Soda', 'Highball', 'Build', 'Lime', shorts('7WELLdf6emA'), [
    I('2 oz', 'Vodka'), I('4 oz', 'Soda water'),
  ], 12),
  drink('vodka-cranberry', 'Vodka Cranberry', 'Highball', 'Build', 'Lime', shorts('E32B8omMvXI'), [
    I('2 oz', 'Vodka'), I('4 oz', 'Cranberry juice'),
  ], 12),
  drink('rum-and-coke', 'Rum and Coke', 'Highball', 'Build', 'Lime', shorts('cqHX9G6NOYY'), [
    I('2 oz', 'Rum'), I('4 oz', 'Cola'),
  ], 12),
  drink('jack-and-coke', 'Jack and Coke', 'Highball', 'Build', 'Lime', shorts('zeVnrChCog0'), [
    I('2 oz', 'Jack Daniel\'s'), I('4 oz', 'Cola'),
  ], 12),
  drink('seven-and-seven', 'Seven and Seven', 'Highball', 'Build', 'Lemon', shorts('BSh86z6f9SY'), [
    I('2 oz', 'Seagram\'s 7'), I('4 oz', '7UP'),
  ], 12),
  drink('kamikaze', 'Kamikaze', 'Coupe or shot', 'Shake, strain', 'Lime', shorts('JkWUdcohAgk'), [
    I('1 oz', 'Vodka'), I('1 oz', 'Triple sec'), I('1 oz', 'Lime juice'),
  ], 12),
  drink('appletini', 'Appletini', 'Coupe', 'Shake, strain', 'Apple slice', shorts('BekipXERIg4'), [
    I('2 oz', 'Vodka'), I('1 oz', 'Apple schnapps'), I('½ oz', 'Lemon juice'),
  ], 14),
]

/**
 * These shipped in the original 81 as "cocktails", but a bartender reaching for
 * the Highballs chip expects to find them there. Listed once, here, rather than
 * threaded through eighty call sites.
 */
const RECLASSIFIED: Record<string, Category> = {
  'gin-tonic': 'highball',
  'jack-and-coke': 'highball',
  'rum-and-coke': 'highball',
  'cuba-libre': 'highball',
  'vodka-soda': 'highball',
  'vodka-cranberry': 'highball',
  'screwdriver': 'highball',
  'whiskey-ginger': 'highball',
  'seven-and-seven': 'highball',
  'ranch-water': 'highball',
  'dark-n-stormy': 'highball',
  'black-russian': 'highball',
  'kamikaze': 'shot',
}

export const DRINKS: Drink[] = [
  ...COCKTAILS.map((d) => ({ ...d, category: RECLASSIFIED[d.id] ?? ('cocktail' as Category) })),
  ...MIXED_DRINKS,
]
