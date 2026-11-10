// ─── display.js ─────────────────────────────────────────────────────────────
// Small, side-effect-free helpers for the install UX: "are we running as an
// installed app?", "is this iOS Safari (where Add to Home Screen is manual)?",
// and localStorage access that never throws (private mode, blocked storage).
// ────────────────────────────────────────────────────────────────────────────

const hasWindow = typeof window !== 'undefined';

function matches(query) {
    try {
        return Boolean(hasWindow && window.matchMedia && window.matchMedia(query).matches);
    } catch {
        return false;
    }
}

/** True when the app is running as an installed PWA (any non-browser display mode). */
export function isStandalone() {
    if (!hasWindow) return false;
    if (matches('(display-mode: standalone)') || matches('(display-mode: fullscreen)') || matches('(display-mode: minimal-ui)')) {
        return true;
    }
    // iOS Safari home-screen apps expose this non-standard flag instead.
    return window.navigator?.standalone === true;
}

/** True for iPhone / iPod / iPad, including iPadOS that reports itself as a Mac. */
export function isIos() {
    if (!hasWindow) return false;
    const ua = window.navigator?.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) return true;
    // iPadOS 13+ desktop-class Safari: "Macintosh" UA, but a touch screen.
    return /Macintosh/i.test(ua) && (window.navigator?.maxTouchPoints || 0) > 1;
}

/**
 * True only for real Safari on iOS/iPadOS, where "Share → Add to Home Screen"
 * is the way to install. Chrome / Firefox / Edge on iOS (CriOS / FxiOS / EdgiOS)
 * and in-app browsers (Instagram, Facebook, LINE, WhatsApp, Gmail…) put that
 * option elsewhere or not at all, so we don't show Safari instructions there.
 */
export function isIosSafari() {
    if (!isIos()) return false;
    const ua = window.navigator?.userAgent || '';
    if (/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|YaBrowser|DuckDuckGo|GSA\//i.test(ua)) return false;
    if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|Snapchat|Twitter|LinkedInApp|MicroMessenger|GoogleApp/i.test(ua)) return false;
    // Real Safari always carries "Safari/"; WKWebView-based in-app browsers usually don't.
    return /Safari\//i.test(ua) && /Version\//i.test(ua);
}

/** localStorage.getItem that returns null instead of throwing. */
export function safeGet(key) {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

/** localStorage.setItem that silently ignores failures. Returns true when stored. */
export function safeSet(key, value) {
    try {
        window.localStorage.setItem(key, String(value));
        return true;
    } catch {
        return false;
    }
}

/** localStorage.removeItem that silently ignores failures. */
export function safeRemove(key) {
    try {
        window.localStorage.removeItem(key);
    } catch {
        // storage unavailable — nothing to remove
    }
}
