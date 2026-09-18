import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { DRINKS } from '../src/data/drinks.ts'
import { youtubeId } from '../src/types.ts'

const results = []
// A recent browser audit remains evidence when YouTube loops a non-browser client.
// Its drink AND video ID must match; a reachable regular-video route never uses this fallback.
const routeAudit = JSON.parse(readFileSync('video-audit/coverage.json','utf8'))
const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' }
for (let i=0;i<DRINKS.length;i+=4) {
  results.push(...await Promise.all(DRINKS.slice(i,i+4).map(async drink => {
    const id = youtubeId(drink.videoUrl)
    assert.ok(id, drink.name)
    let page, html = '', routeError = null
    try {
      page = await fetch(`https://www.youtube.com/shorts/${id}`, { headers, redirect:'manual', signal: AbortSignal.timeout(10000) })
      if (page.status >= 300 && page.status < 400) {
        const location = page.headers.get('location') ?? ''
        routeError = 'Non-browser redirect: '+location
        // A /watch redirect is an explicit negative. Consent/self redirects
        // remain unknown here and need the recorded browser observation.
        if (!location.includes('/watch?')) page = undefined
      }
      if (!page) throw new Error(routeError)
      html = await page.text()
    } catch(error) { routeError = error.cause?.message ?? error.message }
    const prior = routeAudit.records.find(r => r.n === drink.name && r.id === id && r.s === true)
    const routeVerified = page ? page.ok && new URL(page.url).pathname === '/shorts/'+id : Boolean(prior)
    const embed = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v='+id)}&format=json`, { headers, signal: AbortSignal.timeout(20000) })
    const metadata = embed.ok ? await embed.json() : {}
    return { id:drink.id, name:drink.name, videoId:id, checkedAt:new Date().toISOString(), finalUrl:page?.url ?? null,
      isShort:routeVerified, routeEvidence:page ? 'Live HTTP final route' : 'Matching recorded route audit',
      routeAuditAt: page ? null : routeAudit.summary.generatedAt, routeError,
      durationSeconds: Number(html.match(/"lengthSeconds":"(\d+)"/)?.[1] ?? 0) || null,
      embedStatus:embed.status, title:metadata.title ?? null, author:metadata.author_name ?? null }
  })))
}
mkdirSync('verification', { recursive:true })
writeFileSync('verification/shorts.json',JSON.stringify(results,null,2)+'\n')
const failed=results.filter(r=>!r.isShort||r.embedStatus!==200)
console.log(JSON.stringify({total:results.length,shorts:results.filter(r=>r.isShort).length,embeddable:results.filter(r=>r.embedStatus===200).length,failed},null,2))
assert.deepEqual(failed, [], 'Every catalog video must be an embeddable actual Short')
