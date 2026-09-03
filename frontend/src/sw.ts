/**
 * Service Worker: makes the installed app open without a network.
 *
 * Written by hand rather than generated (ADR 0011). The strategy is
 * deliberately small, and rests on one property of the Vite build: everything
 * under `/assets/` carries a content hash in its name, so those files are
 * immutable and can be cached forever, while the document that references them
 * must always be checked against the network first.
 *
 * What it does NOT do: touch anything the server owns. `/api/` because the data
 * of a signed-in user has no place in a cache shared by whoever uses the device
 * — offline data is the job of ADR 0010, which puts it in IndexedDB with proper
 * reconciliation — and `/idp/` because Keycloak serves its own pages there.
 */

/// <reference lib="webworker" />

// `self` is already declared as a Window by the DOM library, so it is narrowed
// through a new binding rather than redeclared.
const worker = self as unknown as ServiceWorkerGlobalScope

/**
 * Bump on every change to this file or to the shell list.
 *
 * The name is the whole cache-invalidation mechanism: a new version means a new
 * cache, and `activate` deletes the previous ones.
 */
const CACHE_NAME = 'cardue-v2'

/**
 * Path prefixes that belong to the server, not to the application shell.
 *
 * They are same-origin, so without this list they would fall into the
 * navigation branch below and be answered with `index.html`. For `/idp/` that
 * is not a theoretical concern: it is the login page of Keycloak, and serving
 * the shell in its place makes React Router render "page not found" on a URL
 * that was never its own. It happened on the first sign-in from the browser.
 */
const SERVER_PATHS = ['/api/', '/idp/']

/**
 * The bare minimum for the app to start with no network.
 *
 * The hashed bundles are not listed — their names are only known at build time.
 * They enter the cache as they are requested, which is enough: the app has to
 * be opened at least once to be installed.
 */
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
]

worker.addEventListener('install', (event) => {
  // No `skipWaiting()`: a new worker waits for the previous one to be released
  // instead of taking over a page that is already running with the old assets.
  // Updates therefore apply the next time the app is fully closed and reopened.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  )
})

worker.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => name.startsWith('cardue-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      )
      // Takes control of pages already open, so the very first visit is
      // covered too instead of waiting for the next navigation.
      await worker.clients.claim()
    })(),
  )
})

worker.addEventListener('fetch', (event) => {
  const { request } = event

  // Only GET is cacheable, and only same-origin: a POST is an action, not a
  // document, and another origin is not ours to serve.
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== worker.location.origin) return

  // Whatever the server owns goes straight to the network, always: the API and
  // the identity provider. See SERVER_PATHS.
  if (SERVER_PATHS.some((prefix) => url.pathname.startsWith(prefix))) return

  if (request.mode === 'navigate') {
    event.respondWith(handleDocument())
    return
  }

  event.respondWith(handleAsset(request))
})

/**
 * Documents: network first, cached shell as a fallback.
 *
 * Every route of the application is served by the same `index.html`
 * (`BrowserRouter`, ADR 0005), so the document is cached under a single key,
 * `/`. That is what makes a deep link such as `/veicoli/1` open offline: the
 * path never reaches the network, React Router resolves it once the shell has
 * booted.
 *
 * The flip side is that this function answers *every* navigation with the
 * shell, whatever the URL — which is correct only for paths the application
 * owns. Everything else has to be filtered out before getting here, which is
 * what SERVER_PATHS does.
 *
 * Network first — rather than cache first — is what lets a deployed update
 * appear immediately for anyone online, without waiting for a new worker.
 */
async function handleDocument(): Promise<Response> {
  const cache = await caches.open(CACHE_NAME)

  try {
    const response = await fetch('/')
    if (response.ok) await cache.put('/', response.clone())
    return response
  } catch {
    const cached = await cache.match('/')
    if (cached) return cached
    // Offline and never visited: there is nothing honest left to return.
    return new Response('Applicazione non disponibile offline.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}

/**
 * Assets: cache first.
 *
 * Safe because the bundles carry a content hash: a changed file is a different
 * URL, so a cached entry can never be stale. The few unhashed files — icons,
 * manifest — are refreshed when `CACHE_NAME` changes.
 */
async function handleAsset(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME)

  const cached = await cache.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) await cache.put(request, response.clone())
  return response
}
