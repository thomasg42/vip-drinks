import test from 'node:test'
import assert from 'node:assert/strict'
import { SHORTEST_VIDEO } from '../src/data/shortestVideos.ts'
import { DRINKS } from '../src/data/drinks.ts'
import { youtubeId } from '../src/types.ts'

/**
 * The video ids are the one thing in this app that can rot without any code
 * changing: an uploader deletes a clip or turns embedding off and the recipe
 * sheet shows a dead frame. oEmbed 404s on a missing id and 401s on one that
 * refuses to embed, so it catches both.
 *
 * The TITLE is the assertion, not the 200 -- a 200 only proves an id parses.
 */
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

async function oembed(id: string) {
  const res = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
    { headers: { 'user-agent': UA } },
  )
  if (!res.ok) return { ok: false as const, status: res.status }
  return { ok: true as const, body: (await res.json()) as { title: string } }
}

async function inBatches<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))))
  }
  return out
}

test('every baked-in video is still real and still embeddable', { timeout: 120_000 }, async () => {
  const entries = Object.entries(SHORTEST_VIDEO)
  assert.ok(entries.length >= 45, `expected the full video index, got ${entries.length}`)

  const results = await inBatches(entries, 4, async ([name, id]) => {
    const r = await oembed(id)
    return { name, id, ...r }
  })

  const dead = results.filter((r) => !r.ok).map((r) => `${r.name} (${r.id}) -> ${r.status}`)
  assert.deepEqual(dead, [], `dead or non-embeddable videos:\n  ${dead.join('\n  ')}`)

  // An id can be alive and still be the wrong drink, so the title has to name it.
  const stopwords = new Set(['and', 'the', 'a', 'of', 'on', 'with', 'shot', 'virgin'])
  const wrong: string[] = []
  for (const r of results) {
    if (!r.ok) continue
    const hay = r.body.title.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ')
    const tokens = r.name
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !stopwords.has(t))
    const hits = tokens.filter((t) => hay.includes(t)).length
    if (tokens.length > 0 && hits / tokens.length < 0.5) {
      wrong.push(`${r.name} -> "${r.body.title}"`)
    }
  }
  assert.deepEqual(wrong, [], `videos whose title does not name the drink:\n  ${wrong.join('\n  ')}`)
})

test('every drink with a video url resolves to an id the player can use', () => {
  const broken = DRINKS.filter((d) => d.videoUrl !== '' && !youtubeId(d.videoUrl)).map((d) => d.name)
  assert.deepEqual(broken, [], `unparseable video urls: ${broken.join(', ')}`)
})

test('the drinks that have no video are a named, deliberate list', () => {
  // These fall through to the in-app "Find the quickest how-to" prompt on
  // purpose: no accurate short existed, and a wrong video is worse than none.
  const expected = ['Vodka Water', 'Amaretto and Coke', 'Fireball Shot']
  const actual = DRINKS.filter((d) => d.category && d.videoUrl === '').map((d) => d.name)
  assert.deepEqual(actual.sort(), expected.sort())
})
