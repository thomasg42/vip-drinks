/**
 * Find the QUICKEST how-to video for a drink, keylessly.
 *
 * YouTube's results page embeds ytInitialData, which carries videoId, title and
 * lengthText for every hit. Fetched server-side here at build time (the browser
 * cannot: youtube.com sends no CORS header), filtered to clips under 4 minutes,
 * then sorted by actual duration so the winner is the shortest real how-to.
 *
 * Every winner is then re-verified against youtube.com/oembed, and the TITLE it
 * returns is the proof -- a 200 alone only proves an id parses.
 */
const SHORT_FILTER = 'EgIYAQ%3D%3D' // YouTube's "under 4 minutes" duration filter
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
// Without a consent cookie YouTube starts 302-ing to google.com partway through a
// batch, which looks exactly like a network failure. Pre-answering it keeps the run on youtube.com.
const HEADERS = {
  'user-agent': UA,
  'accept-language': 'en-US,en;q=0.9',
  cookie: 'CONSENT=YES+cb; SOCS=CAISNQgREitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQwNDA5LjA2X3AwGgJlbiADGgYIgOatsQY',
}
const MIN_SECONDS = 25 // below this it is a clip or a product promo, not an instruction

/**
 * Shortest is only useful if it actually teaches the pour. These title words mean
 * the clip is a different food, a reaction, or an ad -- length is not the only filter.
 */
const JUNK = [
  'jello', 'jelly', 'gummy', 'cake', 'cupcake', 'popsicle', 'pop sicle', 'ice cream',
  'reaction', 'review', 'taste test', 'mukbang', 'asmr', 'prank', 'parody', 'compilation',
  'tier list', 'ranking', 'vs ', 'challenge', 'story time', 'storytime', 'get ready with',
  'grwm', 'unboxing', 'haul', 'meme', 'funny', 'fail',
]
const STOPWORDS = new Set(['and', 'the', 'a', 'of', 'on', 'with', 'no', 'shot'])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function seconds(text) {
  const parts = String(text).split(':').map(Number)
  if (parts.some(Number.isNaN)) return null
  return parts.reduce((acc, n) => acc * 60 + n, 0)
}

/** Pull every videoRenderer out of the raw page. Regex, because the page is 1 MB of JSON-in-HTML. */
function parseResults(html) {
  const out = []
  const re = /"videoRenderer":\{"videoId":"([\w-]{11})"(.{0,6000}?)"lengthText":\{.{0,200}?"simpleText":"([\d:]+)"/gs
  let m
  while ((m = re.exec(html)) !== null) {
    const [, id, blob, length] = m
    const titleMatch = blob.match(/"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/)
    if (!titleMatch) continue
    let title
    try {
      title = JSON.parse(`"${titleMatch[1]}"`)
    } catch {
      continue
    }
    const secs = seconds(length)
    if (secs === null) continue
    out.push({ id, title, length, secs })
  }
  // The same video appears more than once in the payload; keep the first of each.
  const seen = new Set()
  return out.filter((v) => (seen.has(v.id) ? false : seen.add(v.id)))
}

/** The title has to actually name the drink, or the shortest clip is unrelated junk. */
function isJunk(title, name) {
  const hay = title.toLowerCase()
  const wanted = name.toLowerCase()
  // A word only counts as junk when the drink itself does not contain it.
  return JUNK.some((bad) => hay.includes(bad) && !wanted.includes(bad.trim()))
}

function matches(title, name) {
  const hay = title.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ')
  const tokens = name
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
  if (tokens.length === 0) return false
  const hit = tokens.filter((t) => hay.includes(t)).length
  return hit / tokens.length >= 0.6
}

export async function findShortest(name, query) {
  const q = query ?? `how to make a ${name} drink`
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=${SHORT_FILTER}`
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow' })
  if (!res.ok) return { name, error: `search ${res.status}` }
  const all = parseResults(await res.text())
  const usable = all.filter(
    (v) => v.secs >= MIN_SECONDS && matches(v.title, name) && !isJunk(v.title, name),
  )
  if (usable.length === 0) return { name, error: 'no titled match', scanned: all.length }
  usable.sort((a, b) => a.secs - b.secs)
  return { name, candidates: usable.slice(0, 5), scanned: all.length }
}

/** oEmbed is the proof step: it 404s on a bad id AND on a video that blocks embedding. */
export async function verify(id) {
  const res = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
    { headers: HEADERS },
  )
  if (!res.ok) return { ok: false, status: res.status }
  const body = await res.json()
  return { ok: true, title: body.title, author: body.author_name }
}

if (process.argv[2]) {
  const r = await findShortest(process.argv[2])
  console.log(JSON.stringify(r, null, 2))
  if (r.candidates) {
    for (const c of r.candidates) {
      const v = await verify(c.id)
      console.log(c.id, c.length, v.ok ? `OK  ${v.title}` : `DEAD ${v.status}`)
      await sleep(200)
    }
  }
}
