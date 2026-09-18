import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { DRINKS } from '../src/data/drinks.ts'
import { VERIFIED_RECIPES } from '../src/data/verifiedRecipes.ts'

const videos = JSON.parse(readFileSync('verification/shorts.json','utf8'))
const hidden = DRINKS.filter(d => !VERIFIED_RECIPES[d.id])
const shown = DRINKS.filter(d => VERIFIED_RECIPES[d.id])
const report = { checkedAt:new Date().toISOString(), catalogCount:DRINKS.length,
  actualShorts:videos.filter(v => v.isShort).length, embeddableVideos:videos.filter(v => v.embedStatus === 200).length,
  sourceBackedRecipes:shown.length, hiddenRecipes:hidden.map(d=>({id:d.id,name:d.name})),
  sources:shown.map(d=>({id:d.id,name:d.name,...VERIFIED_RECIPES[d.id]})) }
writeFileSync('verification/recipes.json',JSON.stringify(report,null,2)+'\n')
mkdirSync('docs',{recursive:true})
writeFileSync('docs/VERIFICATION.md', `# VIP Drinks verification\n\nChecked ${report.checkedAt}.\n\n- ${DRINKS.length} catalog drinks, ${report.actualShorts} actual YouTube Shorts, ${report.embeddableVideos} embeddable videos.\n- ${shown.length} recipes with amounts and preparation aligned to returned .org source text. These Wikimedia sources are community edited, not government certifications.\n- ${hidden.length} unsupported recipes keep their drink cards and videos, but ingredients, method, and numbered instructions are hidden.\n- Eight distinct generated shot images; prompts and provenance: public/art/shot-provenance.json.\n- Cash edits save locally immediately and can be sent with Save now; reconnection retries the existing shared ledger. The production shell is cached after a successful online load. Videos still need internet.\n- Local closeout/history truncation removed. The matching server history-cap removal requires separately deploying the existing Worker; publishing GitHub Pages alone does not update it. Local browser storage can be cleared by browser settings.\n\n## Sources shown in the app\n\n` + shown.map(d=>`- ${d.name}: ${VERIFIED_RECIPES[d.id].sourceUrl}`).join('\n') + '\n\n## Recipe details hidden\n\n' + hidden.map(d=>`- ${d.name}`).join('\n') + '\n\nRecipe adaptations credit the linked Wikimedia page contributors under CC BY-SA; see each page history for author attribution. Video evidence is retained in verification/shorts.json and recipe evidence in verification/recipes.json. No production cash data is included.\n')
console.log(JSON.stringify({shorts:report.actualShorts,embeddable:report.embeddableVideos,recipes:shown.length,hidden:hidden.length}))
