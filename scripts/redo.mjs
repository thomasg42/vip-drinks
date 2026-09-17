/**
 * Quality pass. The shortest TITLED match is not always the right drink --
 * "Vodka Water" landed on a filtering video, "Fireball Shot" on a margarita.
 * These re-run with a tuned query and a blocklist of the wrong winners.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { findShortest, verify } from './find-shorts.mjs'

const REDO = {
  'Vodka Water': { query: 'how to make a vodka soda water with lime bartender', block: ['9zdM4nQAX8k'] },
  'Vodka Sprite': { query: 'vodka and sprite drink recipe bartender', block: [] },
  'Fireball Shot': { query: 'fireball cinnamon whisky shot how to pour', block: [] },
  'Arnold Palmer': { query: 'arnold palmer iced tea lemonade recipe no alcohol', block: [] },
  'Jack and Ginger': { query: 'jack daniels and ginger ale highball recipe', block: [] },
  'Amaretto and Coke': { query: 'amaretto and coke drink recipe', block: [] },
}

const OUT = new URL('./found-videos.json', import.meta.url)
const rows = JSON.parse(readFileSync(OUT, 'utf8'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

for (const row of rows) {
  const plan = REDO[row.name]
  if (!plan) continue
  const block = new Set([...plan.block, row.id].filter(Boolean))
  const found = await findShortest(row.name, plan.query)
  if (found.error) {
    console.log(`MISS  ${row.name}  (${found.error})`)
    continue
  }
  let picked = null
  for (const c of found.candidates) {
    if (block.has(c.id)) continue
    const v = await verify(c.id)
    await sleep(150)
    if (v.ok) {
      picked = { ...c, title: v.title }
      break
    }
  }
  if (!picked) {
    console.log(`MISS  ${row.name}  (no verifiable candidate)`)
    continue
  }
  console.log(`${row.name}\n   was: ${row.length} ${row.title}\n   now: ${picked.length} ${picked.title}`)
  row.id = picked.id
  row.length = picked.length
  row.title = picked.title
  row.note = ''
  await sleep(450)
}

writeFileSync(OUT, JSON.stringify(rows, null, 2))
console.log(`\n${rows.filter((r) => r.id).length}/${rows.length} verified`)
