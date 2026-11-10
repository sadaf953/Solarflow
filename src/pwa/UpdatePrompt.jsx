import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { applyUpdate, subscribeToUpdate } from './registerSW'

// Top-centre toast shown when a new service worker is waiting.
export default function UpdatePrompt() {
  const [available, setAvailable] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)
  // Refreshing offline would only land on the offline page, and the offline
  // strip already owns the top edge, so stay hidden until the network is back.
  const [online, setOnline] = useState(() => navigator.onLine !== false)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(
    () =>
      subscribeToUpdate((waiting) => {
        setAvailable(waiting)
        if (waiting) setDismissed(false)
      }),
    [],
  )

  if (!available || dismissed || !online) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[1000] flex justify-center px-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
    >
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-stone-900 py-2 pl-4 pr-2 text-sm text-white shadow-lg"
      >
        <span className="font-semibold">New version available</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            applyUpdate()
          }}
          className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-60"
        >
          {busy ? 'Refreshing…' : 'Tap to refresh'}
        </button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="rounded-lg p-1 text-stone-400 hover:bg-stone-800 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
