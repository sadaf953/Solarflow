// ─── PwaLayer.jsx ───────────────────────────────────────────────────────────
// Everything that makes SolarFlow behave like an installed app, mounted once
// next to <App />: the "new version" toast (top), the offline strip (top) and
// the install card (bottom). Each piece hides itself when it has nothing to say.
// ────────────────────────────────────────────────────────────────────────────

import UpdatePrompt from './UpdatePrompt';
import OfflineBanner from './OfflineBanner';
import InstallPrompt from './InstallPrompt';

export default function PwaLayer() {
    return (
        <>
            <OfflineBanner />
            <UpdatePrompt />
            <InstallPrompt />
        </>
    );
}
