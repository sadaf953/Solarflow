import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ProposalPages, fitProposalPages } from './Pages';
import { proposalSnapshot } from './source';

/**
 * The document a quotation row shows. Once the customer has signed, it is the
 * version they signed (frozen when the link was sent) with their signature on it.
 */
export function proposalFor(row) {
    if (row?.signed_at && row.sign_snapshot) {
        return {
            snap: proposalSnapshot(row.sign_snapshot),
            accepted: { png: row.signature_png, at: row.signed_at, method: row.signature_method },
        };
    }
    return { snap: proposalSnapshot(row), accepted: null };
}

// Preview and PDF must measure the same DOM state. Failed optional assets are
// allowed to settle so one broken image cannot hang preview or export forever.
export async function waitForProposalAssets(root) {
    if (!root) return;
    const fontReady = document.fonts?.ready || Promise.resolve();
    const imageReady = Array.from(root.querySelectorAll('img')).map(img => new Promise(resolve => {
        let settled = false;
        const settle = () => {
            if (settled) return;
            settled = true;
            img.removeEventListener('load', settle);
            img.removeEventListener('error', settle);
            resolve();
        };
        img.addEventListener('load', settle, { once: true });
        img.addEventListener('error', settle, { once: true });
        if (img.complete) settle();
        window.setTimeout(settle, 5000);
    }));
    await Promise.all([fontReady, ...imageReady]);
    await new Promise(resolve => window.requestAnimationFrame(resolve));
}

function useFittedPages(root, deps) {
    useLayoutEffect(() => {
        let active = true;
        waitForProposalAssets(root.current).then(() => { if (active) fitProposalPages(root.current); });
        return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

/** Staff preview at a chosen zoom; reserves exactly the scaled height of the pages. */
export function ProposalPreview({ snap, accepted, zoom }) {
    const inner = useRef(null);
    const [height, setHeight] = useState(0);
    useFittedPages(inner, [snap, accepted]);
    useLayoutEffect(() => {
        const measure = () => setHeight(inner.current?.offsetHeight || 0);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(inner.current);
        return () => observer.disconnect();
    }, []);
    return <div style={{ width: 794 * zoom, height: height * zoom, margin: '0 auto' }}>
        <div ref={inner} className="pp-scale" style={{ transform: `scale(${zoom})` }}><ProposalPages snap={snap} accepted={accepted} /></div>
    </div>;
}

/** Customer's phone/desktop view: the A4 pages scaled down to the available width (never up). */
export function FitPages({ snap, accepted }) {
    const outer = useRef(null);
    const inner = useRef(null);
    const [scale, setScale] = useState(1);
    const [height, setHeight] = useState(0);
    useFittedPages(inner, [snap, accepted]);
    useEffect(() => {
        const fit = () => {
            if (!outer.current || !inner.current) return;
            const pagePx = inner.current.offsetWidth || 793.7;
            const next = Math.min(1, outer.current.clientWidth / pagePx);
            setScale(next); setHeight(inner.current.offsetHeight * next);
        };
        fit();
        const observer = new ResizeObserver(fit);
        observer.observe(outer.current); observer.observe(inner.current);
        return () => observer.disconnect();
    }, []);
    return <div ref={outer} className="pp-fit" style={{ height: height || undefined }}>
        <div ref={inner} className="pp-fit-inner" style={{ transform: `scale(${scale})` }}>
            <ProposalPages snap={snap} accepted={accepted} idPrefix="pub-page-" />
        </div>
    </div>;
}
