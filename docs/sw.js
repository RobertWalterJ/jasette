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
// STORAGE. Three caches, and the rule for each (build/lib/tiers.mjs says why):
//   jasette-v-<build>      the shell: page, script, style, deck, fonts. Replaced every deploy.
//   jasette-audio-core     the commonest 1,500 words and the Québec track. NEVER evicted.
//   jasette-audio-other    every other recording, bundled or streamed. Kept least-recently-
//                          played-last, and trimmed to the size the learner chose.
// A small metadata entry (jasette-audio-meta) records each clip's size and last use, which
// the Cache API cannot tell us. Evicted clips are not lost: they come back from the bundle
// or from Wikimedia/Tatoeba the next time they are played.
//
// Recordings from other origins are fetched with CORS so the response is NOT opaque — an
// opaque response is charged to the storage quota at a padded ~7 MB each, which would make
// a few hundred clips look like gigabytes.

const VERSION = "jasette-v-1.1.0-508ecab2e1";          // stamped per deploy by make-deploy.mjs
const SHELL = ['./', 'index.html', 'icons/icon-192.png', 'icons/icon-512.png', "app.d245f361b9.js", "style.504b8ce76c.css", "data/deck.2c1b348d36.json", "data/audio.dd3ffd93b4.json", 'fonts/fonts.css', 'fonts/atkinson-hyperlegible-latin-400.woff2', 'fonts/atkinson-hyperlegible-latin-700.woff2', 'fonts/fraunces-latin.woff2'];   // make-deploy.mjs appends the hashed files
const OURS = /^jasette-v-/;
const CORE = 'jasette-audio-core', OTHER = 'jasette-audio-other', META = 'jasette-audio-meta';
const MB = 1048576;
const CORE_RANK = 1500;                   // keep in step with build/lib/tiers.mjs (build/test-budget.mjs checks)
const DEFAULT_CAP = 200 * MB;
const META_KEY = 'meta.json';

const isCoreUrl = (u) => {
  const m = /\/audio\/w\/(?:fr|qc)-(\d+)\.mp3$/.exec(u);
  if (m) return +m[1] <= CORE_RANK;
  return /\/audio\/w\/q-[^/]+\.mp3$/.test(u);
};

// ── metadata: { cap, items: { url: [bytes, lastUsed] } } ───────────────────
let meta = null, dirty = false, lastFlush = 0;
async function loadMeta() {
  if (meta) return meta;
  try { const c = await caches.open(META); const r = await c.match(META_KEY); meta = r ? await r.json() : null; } catch { meta = null; }
  if (!meta) meta = { cap: DEFAULT_CAP, items: {} };
  return meta;
}
async function flushMeta() {
  if (!meta) return;
  const c = await caches.open(META);
  await c.put(META_KEY, new Response(JSON.stringify(meta), { headers: { 'content-type': 'application/json' } }));
  dirty = false; lastFlush = Date.now();
}
const otherBytes = (m) => Object.entries(m.items).filter(([u]) => !isCoreUrl(u)).reduce((n, [, v]) => n + v[0], 0);
const coreBytes = (m) => Object.entries(m.items).filter(([u]) => isCoreUrl(u)).reduce((n, [, v]) => n + v[0], 0);

// Trim the evictable cache to the cap, least recently played first. Core is never touched.
async function trim() {
  const m = await loadMeta();
  if (!(m.cap > 0) || !Number.isFinite(m.cap)) return 0;
  let total = otherBytes(m);
  if (total <= m.cap) return 0;
  const c = await caches.open(OTHER);
  const victims = Object.entries(m.items).filter(([u]) => !isCoreUrl(u)).sort((a, b) => a[1][1] - b[1][1]);
  let freed = 0;
  for (const [u, [b]] of victims) {
    if (total <= m.cap * 0.85) break;                 // a little below the cap, so the next clip does not trigger another sweep
    await c.delete(u).catch(() => {});
    delete m.items[u]; total -= b; freed += b;
  }
  await flushMeta();
  return freed;
}
async function purgeOther() {
  const m = await loadMeta();
  const c = await caches.open(OTHER);
  let freed = 0;
  for (const [u, v] of Object.entries(m.items)) if (!isCoreUrl(u)) { await c.delete(u).catch(() => {}); delete m.items[u]; freed += v[0]; }
  for (const req of await c.keys()) await c.delete(req).catch(() => {});
  await flushMeta();
  return freed;
}

// ── install / activate ────────────────────────────────────────────────────
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

// ── messages from the page ────────────────────────────────────────────────
self.addEventListener('message', (e) => {
  const d = e.data || {};
  const reply = (x) => e.ports && e.ports[0] && e.ports[0].postMessage(x);
  e.waitUntil((async () => {
    const m = await loadMeta();
    if (d.type === 'budget') { m.cap = d.cap === 0 ? 0 : d.cap || DEFAULT_CAP; await flushMeta(); reply({ ok: true, freed: await trim() }); }
    else if (d.type === 'usage') reply({ cap: m.cap, core: { bytes: coreBytes(m), clips: Object.keys(m.items).filter(isCoreUrl).length }, other: { bytes: otherBytes(m), clips: Object.keys(m.items).filter((u) => !isCoreUrl(u)).length } });
    else if (d.type === 'purge') reply({ ok: true, freed: await purgeOther() });
    else if (d.type === 'forget-all') { for (const n of [CORE, OTHER, META]) await caches.delete(n); meta = { cap: m.cap, items: {} }; reply({ ok: true }); }
  })());
});

// ── fetch ─────────────────────────────────────────────────────────────────
const isAudio = (url) => /\.mp3(\?|$)/.test(url.pathname) || /\.(ogg|wav)$/.test(url.pathname);

async function serveAudio(req) {
  const url = req.url;
  const core = isCoreUrl(url);
  const c = await caches.open(core ? CORE : OTHER);
  const m = await loadMeta();
  const hit = await c.match(req);
  if (hit) {
    if (m.items[url]) { m.items[url][1] = Date.now(); dirty = true; if (Date.now() - lastFlush > 30000) flushMeta().catch(() => {}); }
    return hit;
  }
  // Same-origin clips fetch normally; cross-origin ones with CORS, so the response is storable.
  const same = new URL(url).origin === self.location.origin;
  let res;
  try { res = await fetch(same ? req : new Request(url, { mode: 'cors', credentials: 'omit' })); }
  catch { try { return await fetch(req); } catch { return Response.error(); } }   // CORS refused: play it, do not keep it
  if (res.ok && res.type !== 'opaque') {
    const copy = res.clone();
    const bytes = (await copy.clone().arrayBuffer().catch(() => new ArrayBuffer(0))).byteLength;
    await c.put(req, copy).catch(() => {});
    m.items[url] = [bytes || 20000, Date.now()];
    dirty = true;
    if (!core) await trim(); else await flushMeta();
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (isAudio(url)) { e.respondWith(serveAudio(req)); return; }
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
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
