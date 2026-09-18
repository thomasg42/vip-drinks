import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const html = readFileSync('dist/index.html', 'utf8')
const version = createHash('sha256').update(html).digest('hex').slice(0, 16)
const core = ['./', './index.html', ...readdirSync('dist/assets').filter(x => /\.(js|css)$/.test(x)).map(x => `./assets/${x}`)]
writeFileSync('dist/sw.js', `// Generated for this build; ledger responses are never cached here.
const CACHE = 'vip-drinks-${version}';
const CORE = ${JSON.stringify(core)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('vip-drinks-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request, url = new URL(req.url), scope = new URL(self.registration.scope);
  if (req.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname) || url.pathname.includes('/api/')) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.open(CACHE).then(cache => cache.match(new URL('index.html', scope).href))));
    return;
  }
  if (!/\\.(?:js|css|jpg|png|svg|webp|ico|webmanifest)$/.test(url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const saved = await cache.match(req);
    if (saved) return saved;
    const response = await fetch(req);
    if (response.ok) await cache.put(req, response.clone());
    return response;
  }));
});
`)
console.log(`Offline shell generated: vip-drinks-${version}`)
