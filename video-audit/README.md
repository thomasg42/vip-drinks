# VIP Drinks video audit

Generated 2026-09-18.

`coverage.json` contains one record for each of the 131 `DRINKS` names. The map itself contains 133 keys because it also carries the `Jagerbomb` spelling alias and the unaccented `Virgin Pina Colada` alias.

For each mapped id, the audit checks the YouTube `/shorts/{id}` route and records whether the final URL remains a Shorts route. It also checks oEmbed HTTP 200 as the embeddability signal. The persisted audit currently has **131/131 mapped**, **131/131 oEmbed-embeddable**, and **131/131 confirmed actual Shorts**. The final replacement was `Sex on the Beach` -> `89bcAQitcco`, whose Shorts page title is `Sex on the Beach – dicas, Coquetéis e Drinks`, whose player metadata reports 50 seconds, and whose oEmbed response is HTTP 200.

Duration fields are preserved per record. YouTube intermittently omitted `lengthSeconds` during the bulk pass, so `summary.under60` is intentionally `null` rather than an invented total. `summary.durationKnown` and `summary.durationKnownUnder60` report the confirmed subset; `summary.durationUnknown` names records needing a later duration-only refresh. Among the currently known durations, `Redheaded Slut` is 89 seconds; all other known durations are 60 seconds or less.

`Jack and Ginger` uses a verified 39-second English preparation Short from The Tipsy Twist. `Chocolate Martini` uses a verified 37-second Grey Goose recipe Short titled `How to Make a Chocolate Martini Cocktail | Grey Goose Vodka #Shorts`.
