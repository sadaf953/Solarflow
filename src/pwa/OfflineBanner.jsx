// ─── OfflineBanner.jsx ──────────────────────────────────────────────────────
// Thin strip pinned to the top while the device is offline, plus a short
// "Back online" flash when the connection returns. Renders nothing otherwise.
// ────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

const BACK_ONLINE_MS = 2000;

function currentlyOffline() {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export default function OfflineBanner() {
    const [offline, setOffline] = useState(currentlyOffline);
    const [backOnline, setBackOnline] = useState(false);
    const offlineRef = useRef(offline);

    useEffect(() => {
        let timer;
        const goOffline = () => {
            window.clearTimeout(timer);
            setBackOnline(false);
            offlineRef.current = true;
            setOffline(true);
        };
        const goOnline = () => {
            if (!offlineRef.current) return;
            offlineRef.current = false;
            setOffline(false);
            setBackOnline(true);
            window.clearTimeout(timer);
            timer = window.setTimeout(() => setBackOnline(false), BACK_ONLINE_MS);
        };
        window.addEventListener('offline', goOffline);
        window.addEventListener('online', goOnline);
        return () => {
            window.removeEventListener('offline', goOffline);
            window.removeEventListener('online', goOnline);
            window.clearTimeout(timer);
        };
    }, []);

    if (!offline && !backOnline) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className={`fixed inset-x-0 top-0 z-[10001] pt-[env(safe-area-inset-top)] text-white text-xs font-semibold shadow-md ${offline ? 'bg-stone-900' : 'bg-green-600'}`}
        >
            <div className="flex items-center justify-center gap-2 px-4 py-1.5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] text-center">
                {offline ? <WifiOff size={14} aria-hidden="true" className="shrink-0" /> : <Wifi size={14} aria-hidden="true" className="shrink-0" />}
                <span>{offline ? 'You’re offline — changes can’t be saved until you reconnect' : 'Back online'}</span>
            </div>
        </div>
    );
}
