/**
 * Run the shortest-video finder over every new drink and keep the first
 * candidate that oEmbed confirms is real AND embeddable.
 *
 * Shortest-first, so the winner is the quickest clip that actually plays
 * inside the app. Anything with no verifiable video is written out with an
 * empty id -- the app's "find the quickest how-to" prompt covers those, and
 * an invented id would be worse than an honest gap.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { findShortest, verify } from './find-shorts.mjs'

const names = JSON.parse(readFileSync(new URL('./drink-names.json', import.meta.url), 'utf8'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = new URL('./found-videos.json', import.meta.url)

// Resumable: a rate-limit or a consent redirect mid-run must not throw away
// the drinks already verified, and must not re-hammer the endpoint for them.
const prior = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : []
const done = new Map(prior.filter((r) => r.id).map((r) => [r.name, r]))
const out = []

for (const name of names) {
  if (done.has(name)) {
    const hit = done.get(name)
    out.push(hit)
    console.log(`skip ${hit.length.padStart(5)}  ${name}  (already verified)`)
    continue
  }
  let row = { name, id: '', length: '', title: '', note: '' }
  try {
    const found = await findShortest(name)
    if (found.error) {
      row.note = found.error
    } else {
      for (const c of found.candidates) {
        const v = await verify(c.id)
        await sleep(150)
        if (v.ok) {
          row = { name, id: c.id, length: c.length, title: v.title, note: '' }
          break
        }
        row.note = `rejected ${c.id} (${v.status})`
      }
    }
  } catch (err) {
    row.note = `error: ${err.message}`
  }
  out.push(row)
  console.log(
    row.id ? `ok   ${row.length.padStart(5)}  ${name}  ->  ${row.title}` : `MISS  ----  ${name}  (${row.note})`,
  )
  await sleep(450) // do not hammer the search endpoint
}

writeFileSync(OUT, JSON.stringify(out, null, 2))
console.log(`\n${out.filter((r) => r.id).length}/${out.length} verified`)
