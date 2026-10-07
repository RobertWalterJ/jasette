// Jasette — service worker.
//
// This origin (robertwalterj.github.io) is shared with Landfall, Halyard, Hok
// Gong and the rest, so CacheStorage is SHARED. The rules (PWA Repos/
// PWA-IDENTITY-RULES.md):
//   - delete only caches that are OURS (an exact pattern) and not current;
//   - never the global caches.match(): open our own cache and match in it;
//   - never serve the manifest cache-first, so a changed icon reaches the phone;
//   - install from FRESH files (`cache: 'reload'`), because GitHub Pages lets a
//     browser reuse a file for ten minutes and a new worker would otherwise pin
//     stale ones under its new name.
//
// Two caches. The shell (page, script, style, deck, fonts) is versioned and is
// replaced on every deploy. The recordings live in their own cache and survive a
// deploy: there are hundreds of megabytes of them, they never change, and
// clearing them with the page would mean re-downloading the lot over mobile
// data every time a typo is fixed.

const VERSION = 'jasette-v-dev';          // stamped per deploy by make-deploy.mjs
const SHELL = ['./', 'index.html', 'icons/icon-192.png', 'icons/icon-512.png'];   // make-deploy.mjs appends the hashed files
const AUDIO_CACHE = 'jasette-audio-v1';
const OURS = /^jasette-v-/;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (OURS.test(k) && k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;
  const scope = new URL(self.registration.scope);
  const sameOrigin = url.origin === scope.origin;
  // Recordings: ours bundled, and the ones fetched from Wikimedia and Tatoeba.
  // A recording is the same file forever, so the cache is checked first.
  const isAudio = /\.mp3(\?|$)/.test(url.pathname) || /\.(ogg|wav)$/.test(url.pathname);
  if (isAudio) {
    e.respondWith((async () => {
      const c = await caches.open(AUDIO_CACHE);
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        // An opaque response (a cross-origin <audio> fetch) is kept too: it plays.
        if (res.ok || res.type === 'opaque') c.put(req, res.clone()).catch(() => {});
        return res;
      } catch { return Response.error(); }
    })());
    return;
  }
  if (!sameOrigin || !url.pathname.startsWith(scope.pathname)) return;
  if (url.pathname.endsWith('manifest.webmanifest')) return;           // never cache-first
  const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    // The page: network first, so a new deploy arrives on the next open with signal.
    if (isPage) {
      try { const res = await fetch(req); if (res.ok) c.put('index.html', res.clone()); return res; }
      catch { return (await c.match('index.html')) || (await c.match('./')) || Response.error(); }
    }
    // Everything else is named by a content hash or never changes: cache first.
    const hit = await c.match(req);
    if (hit) return hit;
    try { const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; }
    catch { return Response.error(); }
  })());
});
