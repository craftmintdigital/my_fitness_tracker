// Offline cache for AWAKEN.
// Bump VERSION when files change, and set APP_VERSION in app.js to the same value
// (the smoke test fails if they differ). The page compares the two to decide whether
// to show "Update ready".
const VERSION = 'awaken-v8';
const FILES = ['./', './index.html', './styles.css', './app.js', './manifest.webmanifest', './icon.svg',
  './fonts/oxanium-var.woff2', './fonts/atkinson-400.woff2', './fonts/atkinson-700.woff2', './fonts/atkinson-400-italic.woff2'];

self.addEventListener('install', e => {
  // cache: 'reload' skips the HTTP cache so a new version never precaches stale files.
  // No skipWaiting here: a new version waits until the page says "reload now" (or every tab closes).
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => {
  const t = e.data && e.data.type;
  if (t === 'version' && e.ports[0]) e.ports[0].postMessage(VERSION);
  if (t === 'skip') self.skipWaiting();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Only the app's own files are cached. Cross-origin calls (GitHub Gist sync) go straight to the network.
  if (new URL(e.request.url).origin !== self.location.origin) return;
  // Network first so updates land; fall back to cache offline. 'no-cache' revalidates with the server
  // (a cheap 304 when nothing changed) so the host's HTTP caching can't serve a stale app.js after a deploy.
  e.respondWith(
    fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
