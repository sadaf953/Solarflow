// Staff dialog shown after "Send for signature": the link with Copy, WhatsApp and Open.
import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, MessageCircle, PenLine } from 'lucide-react';
import { proposalSnapshot } from '../proposal/source';
import { signWhatsAppLink } from './links';
import './sign.css';

const longDate = iso => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

export default function SignLinkDialog({ row, link, onClose }) {
    const [copied, setCopied] = useState(false);
    const closeRef = useRef(null);
    useEffect(() => {
        closeRef.current?.focus();
        const onKey = event => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    const snap = proposalSnapshot(row);
    const whatsapp = signWhatsAppLink({
        phone: row.customer_phone, customerName: row.customer_name, companyName: snap.company.name,
        kwp: snap.inputs.kwp, number: snap.number, url: link.url,
    });
    const copy = async () => {
        try { await navigator.clipboard.writeText(link.url); setCopied(true); }
        catch { document.getElementById('q-sign-link')?.select(); }
    };
    return <div className="q-dialog" role="dialog" aria-modal="true" aria-labelledby="q-sign-title" onClick={onClose}>
        <div className="q-panel" onClick={event => event.stopPropagation()}>
            <h2 id="q-sign-title"><PenLine size={18} /> Signature link for {row.customer_name}</h2>
            <p className="q-muted">The customer opens this link on their phone, reads proposal {snap.number} and accepts it by signing on screen or uploading a photo of their signature. It works once, until {longDate(link.expiresAt)}. Sending a new link replaces this one, and the quotation can’t be edited after it is signed.</p>
            <p className="q-sign-message">{whatsapp.text}</p>
            <label className="q-field"><span>Signature link</span><input id="q-sign-link" className="q-sign-link" readOnly value={link.url} onFocus={event => event.target.select()} /></label>
            <div className="q-actions">
                <button type="button" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy link'}</button>
                <a className="q-whatsapp" href={whatsapp.href} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> Send on WhatsApp</a>
                <a className="q-whatsapp q-open-link" href={link.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> Open as customer</a>
                <button ref={closeRef} type="button" onClick={onClose}>Close</button>
            </div>
        </div>
    </div>;
}
