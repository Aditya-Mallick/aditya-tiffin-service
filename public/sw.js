/* Aditya Tiffin Service — service worker.
 *
 * Deliberately conservative:
 *  - Supabase (cross-origin) requests are NEVER cached or intercepted, so data
 *    is always live and logins keep working.
 *  - Page loads are network-first with a cached fallback, so a new deploy is
 *    picked up immediately but the app still opens if the network hiccups.
 *  - Build assets (/assets/*) are content-hashed by Vite, so cache-first is safe.
 */
const VERSION = 'v1'
const SHELL = `shell-${VERSION}`
const ASSETS = `assets-${VERSION}`

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(['/', '/manage'])).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => ![SHELL, ASSETS].includes(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return   // leave Supabase & fonts alone

  // Page navigations: network first, fall back to cache when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(SHELL).then((c) => c.put(req, copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/manage') || caches.match('/')))
    )
    return
  }

  // Hashed build assets: cache first (they never change under the same name).
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).then((res) => {
          const copy = res.clone()
          caches.open(ASSETS).then((c) => c.put(req, copy)).catch(() => {})
          return res
        })
      )
    )
  }
})
