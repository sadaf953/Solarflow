// ─── InstallPrompt.jsx ──────────────────────────────────────────────────────
// A small card at the bottom of the screen inviting the user to install
// SolarFlow. Chrome/Edge (Android + desktop): uses the stashed
// `beforeinstallprompt`. iOS Safari: explains Share → Add to Home Screen.
// Hidden when already installed, recently dismissed, while a modal is open,
// or when the browser offers no install path at all.
// ────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Share, Sun, X } from 'lucide-react';
import { isDesktopChromium, isIosSafari, isMacSafari, isStandalone, safeGet, safeSet } from './display';
import { getInstallEvent, promptInstall, subscribeInstall } from './installState';

const DISMISS_KEY = 'sf_install_dismissed_at';
const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 4000;
const MODAL_SELECTOR = '[aria-modal="true"], dialog[open]';

function recentlyDismissed() {
    const at = Number(safeGet(DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < DISMISS_FOR_MS;
}

// Client quotation pages (#/plans, #/quote) never show the install card.
const onQuotePage = () => typeof window !== 'undefined' && /^#\/(plans|quote)(\?|\/|$)/.test(window.location.hash || '');

function modalOpen() {
    return typeof document !== 'undefined' && Boolean(document.querySelector(MODAL_SELECTOR));
}

export default function InstallPrompt() {
    const [installEvent, setInstallEvent] = useState(() => getInstallEvent());
    const [ready, setReady] = useState(false);
    const [dismissed, setDismissed] = useState(() => isStandalone() || recentlyDismissed());
    const [iosSafari] = useState(() => isIosSafari());
    const [macSafari] = useState(() => isMacSafari());
    const [desktopChromium] = useState(() => isDesktopChromium());
    const [blockedByModal, setBlockedByModal] = useState(() => modalOpen());
    const [quotePage, setQuotePage] = useState(onQuotePage);

    useEffect(() => {
        const onHash = () => setQuotePage(onQuotePage());
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    useEffect(() => subscribeInstall(setInstallEvent), []);

    useEffect(() => {
        const timer = window.setTimeout(() => setReady(true), SHOW_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, []);

    // Stay out of the way while any dialog / modal is open.
    useEffect(() => {
        if (typeof MutationObserver === 'undefined' || !document.body) return undefined;
        const observer = new MutationObserver(() => setBlockedByModal(modalOpen()));
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-modal', 'open'] });
        return () => observer.disconnect();
    }, []);

    // If the app gets launched standalone in this tab (rare) or installed, hide for good.
    useEffect(() => {
        const media = window.matchMedia?.('(display-mode: standalone)');
        if (!media) return undefined;
        const onChange = () => { if (isStandalone()) setDismissed(true); };
        media.addEventListener?.('change', onChange);
        return () => media.removeEventListener?.('change', onChange);
    }, []);

    const mode = installEvent ? 'prompt' : iosSafari ? 'ios' : macSafari ? 'mac' : desktopChromium ? 'desktop' : null;
    if (!ready || dismissed || blockedByModal || quotePage || !mode) return null;

    const dismiss = () => {
        safeSet(DISMISS_KEY, Date.now());
        setDismissed(true);
    };

    const install = async () => {
        const outcome = await promptInstall();
        // Accepted → `appinstalled` follows; dismissed → respect it for 14 days too.
        if (outcome === 'dismissed') safeSet(DISMISS_KEY, Date.now());
        setDismissed(true);
    };

    const title = 'Add SolarFlow to your home screen';

    return (
        <section
            role="region"
            aria-labelledby="sf-install-title"
            aria-describedby="sf-install-text"
            className="fixed z-[45] left-4 right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:left-auto sm:right-5 sm:w-[22rem] sm:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] rounded-2xl border border-stone-200 bg-white p-4 text-stone-900 shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-300"
        >
            <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center" aria-hidden="true">
                    <Sun size={22} className="text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                    <h2 id="sf-install-title" className="text-sm font-bold leading-snug">{title}</h2>
                    <p id="sf-install-text" className="mt-0.5 text-xs leading-relaxed text-stone-600">
                        {mode === 'ios' && <>Tap the Share button{' '}
                            <Share size={14} className="inline -mt-0.5 text-stone-800" aria-label="Share" role="img" />{' '}
                            then &lsquo;Add to Home Screen&rsquo;.</>}
                        {mode === 'mac' && <>In the menu bar choose File &rarr; &lsquo;Add to Dock&rsquo;. SolarFlow then opens like an app.</>}
                        {mode === 'desktop' && <>Click the install icon at the right end of the address bar, or open the &#8942; menu &rarr; &lsquo;Cast, save and share&rsquo; &rarr; &lsquo;Install page as app&rsquo;.</>}
                        {mode === 'prompt' && <>Open it in one click, like an app, without the browser bar.</>}
                    </p>
                    {mode === 'prompt' && (
                        <div className="mt-3 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={install}
                                className="rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                            >
                                Add to home screen
                            </button>
                            <button
                                type="button"
                                onClick={dismiss}
                                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
                            >
                                Not now
                            </button>
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Dismiss install suggestion"
                    className="shrink-0 -mr-1 -mt-1 rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
                >
                    <X size={16} />
                </button>
            </div>
        </section>
    );
}
