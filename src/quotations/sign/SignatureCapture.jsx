// Draw-or-photo signature capture for the customer's signing page.
// Sign → Preview → Submit; nothing is sent until the last step.
import { useEffect, useRef, useState } from 'react';
import { Camera, Eraser, PenLine, RefreshCw } from 'lucide-react';
import { cleanImage, readFile, trimToInk } from './cleanImage';

function Pad({ onChange }) {
    const ref = useRef(null);
    const st = useRef({ drawing: false, pts: [], has: false });
    useEffect(() => {
        const c = ref.current;
        const fit = () => {
            const dpr = Math.max(1, window.devicePixelRatio || 1);
            const r = c.getBoundingClientRect();
            if (!r.width || !r.height) return; // hidden (other tab open): keep the drawing as it is
            const keep = st.current.has ? c.toDataURL() : null;
            c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
            const ctx = c.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111827';
            if (keep) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height); img.src = keep; }
        };
        fit();
        const ro = new ResizeObserver(fit); ro.observe(c);
        return () => ro.disconnect();
    }, []);
    const pos = (e) => { const r = ref.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const down = (e) => {
        e.preventDefault();
        ref.current.setPointerCapture?.(e.pointerId);
        st.current.drawing = true; st.current.pts = [pos(e)];
        const ctx = ref.current.getContext('2d');
        const p = st.current.pts[0];
        ctx.beginPath(); ctx.fillStyle = '#111827'; ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2); ctx.fill();
    };
    const move = (e) => {
        const s = st.current;
        if (!s.drawing) return;
        e.preventDefault();
        const evs = e.nativeEvent.getCoalescedEvents ? e.nativeEvent.getCoalescedEvents() : [e];
        const ctx = ref.current.getContext('2d');
        for (const ev of (evs.length ? evs : [e])) {
            s.pts.push(pos(ev));
            const n = s.pts.length;
            if (n === 2) {
                // Join the starting dot to where the smoothed curve begins.
                const [a, b] = s.pts;
                ctx.lineWidth = 2.6;
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo((a.x + b.x) / 2, (a.y + b.y) / 2); ctx.stroke();
            }
            if (n < 3) continue;
            // Quadratic curve through midpoints keeps the line smooth.
            const [a, b, c] = [s.pts[n - 3], s.pts[n - 2], s.pts[n - 1]];
            const m1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; const m2 = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
            const speed = Math.hypot(c.x - b.x, c.y - b.y);
            ctx.lineWidth = Math.max(1.6, Math.min(3.4, 3.6 - speed * 0.08));
            ctx.beginPath(); ctx.moveTo(m1.x, m1.y); ctx.quadraticCurveTo(b.x, b.y, m2.x, m2.y); ctx.stroke();
        }
        if (!s.has) { s.has = true; onChange(true); }
    };
    const up = () => { st.current.drawing = false; st.current.pts = []; };
    return <canvas ref={ref} className="sg-pad" aria-label="Signature area: sign here with your finger"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />;
}

/**
 * Calls onSubmit(png, 'drawn' | 'photo'). An error with a link code
 * (used / expired / unknown) goes to onLinkError instead of the form.
 */
export default function SignatureCapture({ onSubmit, onLinkError, submitLabel = 'Submit signature', companyName, fineprint }) {
    const [tab, setTab] = useState('draw');
    const [review, setReview] = useState(null);
    const [confirming, setConfirming] = useState(false);
    const reviewHeading = useRef(null);
    useEffect(() => { if (review) reviewHeading.current?.focus(); }, [review, confirming]);
    const [hasInk, setHasInk] = useState(false);
    const [padKey, setPadKey] = useState(0);
    const [photo, setPhoto] = useState(null);
    const [photoBusy, setPhotoBusy] = useState(false);
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);
    const padWrap = useRef(null);
    const fileRef = useRef(null);

    const clear = () => { setPadKey((k) => k + 1); setHasInk(false); };
    const pickPhoto = async (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        setErr(''); setPhotoBusy(true); setPhoto(null);
        try {
            const r = await cleanImage(await readFile(f), { strength: 0.5, ink: 'black' });
            if (r.empty) setErr('We could not find a signature in that photo. Please sign on plain white paper and try again.');
            else setPhoto(r);
        } catch (x) { setErr(x.message); } finally { setPhotoBusy(false); }
    };
    const startReview = async () => {
        setErr('');
        if (tab === 'photo') { if (photo?.url) setReview({ png: photo.url, method: 'photo' }); return; }
        const canvas = padWrap.current?.querySelector('canvas');
        if (!canvas) return;
        // Crop the drawing to the ink so it prints at a sensible size and stays small.
        const trimmed = await trimToInk(canvas.toDataURL('image/png'));
        if (trimmed.empty) { setErr('Please sign inside the box first.'); return; }
        setReview({ png: trimmed.url, method: 'drawn' });
    };
    const submit = async () => {
        setErr('');
        if (!review?.png) return;
        setBusy(true);
        try { await onSubmit(review.png, review.method); }
        catch (x) {
            if (x.code === 'used' || x.code === 'expired' || x.code === 'unknown') onLinkError(x.code);
            else setErr(x.message);
        } finally { setBusy(false); }
    };
    const stage = confirming ? 2 : review ? 1 : 0;
    return <>
        <ol className="signature-progress" aria-label="Signing progress">{['Sign', 'Preview', 'Submit'].map((label, i) => <li key={label} aria-current={stage === i ? 'step' : undefined} className={stage >= i ? 'active' : ''}><span>{i + 1}</span>{label}</li>)}</ol>
        <div className="signature-entry" hidden={!!review}>
            <div className="sg-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={tab === 'draw'} className={tab === 'draw' ? 'on' : ''} onClick={() => { setTab('draw'); setErr(''); }}><PenLine size={20} /> Sign on screen</button>
                <button type="button" role="tab" aria-selected={tab === 'photo'} className={tab === 'photo' ? 'on' : ''} onClick={() => { setTab('photo'); setErr(''); }}><Camera size={20} /> Upload a photo</button>
            </div>
            <div className="sg-panel" hidden={tab !== 'draw'}>
                <p className="sg-help">Sign inside the box with your finger.</p>
                <div ref={padWrap} className="sg-pad-wrap"><Pad key={padKey} onChange={setHasInk} /><span className="sg-line" aria-hidden="true" /></div>
                <button type="button" className="sg-btn ghost" onClick={clear} disabled={!hasInk}><Eraser size={20} /> Clear</button>
            </div>
            <div className="sg-panel" hidden={tab !== 'photo'}>
                <p className="sg-help">Sign on plain white paper with a dark pen, then take a clear photo of it.</p>
                {photo ? <>
                    <div className="sg-photo checker"><img src={photo.url} alt="Your signature" /></div>
                    <button type="button" className="sg-btn ghost" onClick={() => fileRef.current?.click()}><RefreshCw size={20} /> Retake</button>
                </> : <button type="button" className="sg-btn ghost big" onClick={() => fileRef.current?.click()} disabled={photoBusy}><Camera size={24} /> {photoBusy ? 'Cleaning the photo…' : 'Take or choose a photo'}</button>}
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
            </div>
            {err && <p className="sg-err" role="alert">{err}</p>}
            <button type="button" className="sg-btn primary" onClick={startReview} disabled={busy || (tab === 'draw' ? !hasInk : !photo)}>Review signature</button>
        </div>
        {review && <section className="signature-review" aria-label={confirming ? 'Submit signature' : 'Preview signature'}>
            <h2 ref={reviewHeading} tabIndex={-1}>{confirming ? 'Ready to submit?' : 'Preview your signature'}</h2>
            <p className="sg-help">{confirming ? `Your signature will be sent to ${companyName} with this document.` : 'Check that your signature is clear and complete.'}</p>
            <div className="sg-photo"><img src={review.png} alt="Your signature preview" /></div>
            {err && <p className="sg-err" role="alert">{err}</p>}
            {confirming ? <>
                <p className="sg-small">{fineprint}</p>
                <button type="button" className="sg-btn primary" disabled={busy} onClick={submit}>{busy ? 'Submitting…' : submitLabel}</button>
                <button type="button" className="sg-btn ghost" disabled={busy} onClick={() => setConfirming(false)}>Back to preview</button>
            </> : <>
                <div className="signature-edit-actions">
                    <button type="button" className="sg-btn ghost" disabled={busy} onClick={() => { setReview(null); setConfirming(false); setErr(''); }}>Change signature</button>
                    <button type="button" className="sg-btn ghost" disabled={busy} onClick={() => { clear(); setPhoto(null); setReview(null); setConfirming(false); setErr(''); }}>Try again</button>
                </div>
                <button type="button" className="sg-btn primary" disabled={busy} onClick={() => setConfirming(true)}>Continue to submit</button>
                <p className="sg-small">Nothing is sent until you submit on the next step.</p>
            </>}
        </section>}
    </>;
}
