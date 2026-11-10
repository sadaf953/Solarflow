// ─── installState.js ────────────────────────────────────────────────────────
// Captures the browser's install offer as early as possible. Import this
// module at the very top of src/main.jsx (before React renders): Chrome/Edge
// fire `beforeinstallprompt` once, early, and an event fired before anyone
// listens is lost for the whole page load.
// ────────────────────────────────────────────────────────────────────────────

import { safeSet } from './display';

export const INSTALLED_KEY = 'sf_app_installed_at';

let deferredEvent = null;
const listeners = new Set();

function notify() {
    listeners.forEach(cb => {
        try {
            cb(deferredEvent);
        } catch {
            // a broken subscriber must not stop the others
        }
    });
}

if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', event => {
        // Stop Chrome's own mini-infobar; we show our own card instead.
        event.preventDefault();
        deferredEvent = event;
        notify();
    });

    window.addEventListener('appinstalled', () => {
        deferredEvent = null;
        safeSet(INSTALLED_KEY, Date.now());
        notify();
    });
}

/** Subscribe to install-offer changes. `cb(eventOrNull)`. Returns an unsubscribe function. */
export function subscribeInstall(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

/** The stashed `beforeinstallprompt` event, or null when the browser has not offered install. */
export function getInstallEvent() {
    return deferredEvent;
}

/**
 * Show the browser's install dialog.
 * Resolves to 'accepted', 'dismissed' or 'unavailable' (no offer stashed / prompt failed).
 * The event can be used once, so it is cleared either way.
 */
export async function promptInstall() {
    const event = deferredEvent;
    if (!event) return 'unavailable';
    deferredEvent = null;
    notify();
    try {
        await event.prompt();
        const choice = await event.userChoice;
        return choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
    } catch {
        return 'unavailable';
    }
}
