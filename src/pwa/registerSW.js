// Registers dist/sw.js (production only) and exposes a tiny update API:
//   registerServiceWorker()  - call once at startup
//   subscribeToUpdate(cb)    - cb(true) when a new version is waiting; returns unsubscribe
//   applyUpdate()            - activate the waiting worker and reload once

const UPDATE_INTERVAL_MS = 30 * 60 * 1000

let registered = false
let waitingWorker = null
let reloading = false
const listeners = new Set()

function setWaiting(worker) {
  waitingWorker = worker
  listeners.forEach((cb) => cb(Boolean(worker)))
}

function watchInstalling(registration, worker) {
  if (!worker) return
  worker.addEventListener('statechange', () => {
    // 'installed' with an existing controller = an update, not the first install.
    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
      setWaiting(registration.waiting || worker)
    }
  })
}

async function register() {
  try {
    const registration = await navigator.serviceWorker.register(new URL('sw.js', document.baseURI), {
      scope: './',
    })
    if (registration.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting)
    watchInstalling(registration, registration.installing)
    registration.addEventListener('updatefound', () => watchInstalling(registration, registration.installing))

    // Long-lived standalone windows rarely navigate, so poll for deploys.
    const check = () => registration.update().catch(() => {})
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })
    setInterval(check, UPDATE_INTERVAL_MS)
  } catch (error) {
    console.warn('[pwa] service worker registration failed', error)
  }
}

export function registerServiceWorker() {
  if (registered || !import.meta.env.PROD || !('serviceWorker' in navigator)) return
  registered = true

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Only reload when the user asked for the update (the first install also
    // fires controllerchange because of clients.claim()).
    if (!reloading) return
    reloading = false
    window.location.reload()
  })

  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}

export function subscribeToUpdate(cb) {
  listeners.add(cb)
  if (waitingWorker) cb(true)
  return () => listeners.delete(cb)
}

export function applyUpdate() {
  if (!waitingWorker) {
    window.location.reload()
    return
  }
  reloading = true
  waitingWorker.postMessage({ type: 'SKIP_WAITING' })
}
