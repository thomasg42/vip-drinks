import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'

test('the production offline shell reopens without network and never caches the ledger', async () => {
  const handlers = {}, saved = new Map(), deleted = []
  const scope = 'https://example.org/vip-drinks/'
  let online = true
  const cache = {
    addAll: async paths => { for (const path of paths) saved.set(new URL(path, scope).href, new Response(path === './index.html' ? 'cached app' : 'asset')) },
    match: async req => saved.get(typeof req === 'string' ? req : req.url)?.clone(),
    put: async (req, response) => { saved.set(req.url, response) },
  }
  vm.runInNewContext(readFileSync('dist/sw.js','utf8'), {
    URL, self: { registration: { scope }, addEventListener: (name, fn) => { handlers[name] = fn }, skipWaiting: async () => {}, clients: { claim: async () => {} } },
    caches: { open: async () => cache, keys: async () => ['vip-drinks-old', 'another-app-cache'], delete: async key => { deleted.push(key) } },
    fetch: async () => { if (!online) throw new Error('No internet'); return new Response('network') },
  })
  let work
  handlers.install({ waitUntil: promise => { work = promise } }); await work
  handlers.activate({ waitUntil: promise => { work = promise } }); await work
  assert.deepEqual(deleted, ['vip-drinks-old'])
  online = false
  handlers.fetch({ request: { url: scope, method: 'GET', mode: 'navigate' }, respondWith: p => { work = p } })
  assert.equal(await (await work).text(), 'cached app')
  for (const url of ['https://ledger.workers.dev/api/state', scope + 'api/state']) {
    let intercepted = false
    handlers.fetch({ request: { url, method: 'GET' }, respondWith: () => { intercepted = true } })
    assert.equal(intercepted, false, 'ledger must always contact its server')
  }
})
