/* SolarFlow CRM service worker (source template).
 *
 * vite.config.js (pwaServiceWorker plugin) copies this file to dist/sw.js at
 * build time and replaces the two placeholders below with the build version
 * and the precache list. It is never bundled or served in dev.
 *
 * Rules:
 * - Only same-origin GET requests are handled. Every cross-origin request
 *   (Supabase REST/auth/realtime/storage, Google Fonts, ...) is left to the
 *   browser untouched and is never cached: the CRM always needs live data.
 * - Navigations are network-first; when offline we show offline.html.
 * - Hashed build assets (assets/*) are cache-first; they are immutable.
 * - A new worker waits until the page asks it to take over (SKIP_WAITING),
 *   so the UI can show a "New version available" prompt.
 */

const VERSION = '__SW_VERSION__'
const PRECACHE = /* __PRECACHE_LIST__ */ []

const CACHE_PREFIX = 'solarflow-'
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`

// Resolve relative entries against the worker's own location so the app
// works at the domain root or under a sub-path.
const scopeUrl = (path) => new URL(path, self.registration.scope).href
const INDEX_URL = () => scopeUrl('./index.html')
const OFFLINE_URL = () => scopeUrl('./offline.html')

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cache: 'reload' bypasses the HTTP cache so we never precache a stale
      // index.html left over from GitHub Pages' max-age=600.
      cache.addAll(PRECACHE.map((path) => new Request(scopeUrl(path), { cache: 'reload' }))),
    ),
  )
  // No skipWaiting() here on purpose: updates wait for the user's tap.
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // Supabase, fonts, etc.

  const scopePath = new URL(self.registration.scope).pathname
  const relPath = url.pathname.startsWith(scopePath) ? url.pathname.slice(scopePath.length) : url.pathname
  // The update checks must always hit the network.
  if (relPath === 'version.json' || relPath === 'sw.js') return

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request))
  } else if (relPath.startsWith('assets/')) {
    event.respondWith(cacheFirst(request))
  } else {
    event.respondWith(networkFirst(request))
  }
})

async function handleNavigation(request) {
  try {
    // 'no-cache' revalidates with the server, so a fresh deploy is picked up.
    const response = await fetch(request, { cache: 'no-cache' })
    const url = new URL(request.url)
    const isAppShell = url.href.split('?')[0] === scopeUrl('./') || url.href.split('?')[0] === INDEX_URL()
    if (response.ok && !response.redirected && isAppShell) {
      const copy = response.clone()
      caches.open(CACHE_NAME).then((cache) => cache.put(INDEX_URL(), copy)).catch(() => {})
    }
    return response
  } catch {
    const offline = await caches.match(OFFLINE_URL())
    return offline || new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } })
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const copy = response.clone()
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {})
  }
  return response
}

async function networkFirst(request) {
  try {
    return await fetch(request)
  } catch (error) {
    // Only precached files (manifest, icons, offline page) are available
    // offline; everything else (e.g. large samples/) is never stored.
    const cached = await caches.match(request)
    if (cached) return cached
    throw error
  }
}
