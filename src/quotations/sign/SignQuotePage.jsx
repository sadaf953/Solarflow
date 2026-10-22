// Public customer page (#/sign/<token>) for accepting a quotation.
// Works without signing in and never shows the CRM. It shows the proposal exactly as
// it was sent, then "Accept this proposal" with a draw-or-photo signature.
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../supabase';
import { FitPages } from '../proposal/ProposalDocument';
import { proposalSnapshot, proposalTotals } from '../proposal/source';
import defaultLogo from '../../assets/solarflow-logo-blue.svg?inline';
import SignatureCapture from './SignatureCapture';
import { getSignRequest, submitSignature } from './links';
import './sign.css';

const inr = (v) => '₹' + Math.round(Number(v) || 0).toLocaleString('en-IN');
const longDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

export default function SignQuotePage({ token, client = supabase }) {
    const [req, setReq] = useState(undefined);
    const [loadError, setLoadError] = useState('');
    const [done, setDone] = useState(false);
    const load = () => getSignRequest(client, token).then(next => { setReq(next); setLoadError(''); }).catch(err => setLoadError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { load(); }, [token]);

    const snap = useMemo(() => {
        if (!req?.snapshot) return null;
        try { return proposalSnapshot(req.snapshot); } catch { return null; }
    }, [req]);
    const company = snap?.company;
    useEffect(() => { document.title = company ? `Your solar proposal · ${company.name}` : 'Your solar proposal'; }, [company]);

    const salesperson = snap?.inputs.preparedBy;
    const contact = salesperson?.phone
        ? <a className="sg-call" href={'tel:' + salesperson.phone.replace(/\s/g, '')}>Call {salesperson.name || company.name}: {salesperson.phone}</a>
        : null;
    const linkError = (code) => setReq((r) => ({ ...(r || {}), status: code === 'used' ? 'signed' : code === 'unknown' ? 'unknown' : 'expired' }));
    const head = <header className="sg-head">
        <img src={company?.logo || defaultLogo} alt={company?.name || 'SolarFlow'} className="sg-logo" />
        <div className="sg-co-sub">Solar proposal · secure link</div>
    </header>;

    let body;
    if (loadError) body = <div className="sg-msg"><AlertCircle size={44} /><h1>We could not open your proposal</h1><p>{loadError}</p><button type="button" className="sg-btn" onClick={load}>Try again</button></div>;
    else if (req === undefined) body = <p className="sg-lead" role="status">Loading your proposal…</p>;
    else if (!req || !snap || req.status === 'unknown') body = <div className="sg-msg"><AlertCircle size={44} /><h1>This link does not work</h1><p>The link may be incomplete, or a newer version of your proposal has been sent to you. Please ask your salesperson for the latest link.</p></div>;
    else {
        const totals = proposalTotals(snap);
        const signed = req.status === 'signed';
        const open = req.status === 'open';
        const accepted = signed ? { png: req.signature_png, at: req.signed_at, method: req.signature_method } : null;
        const submit = async (png, method) => {
            await submitSignature(client, token, png, method);
            await load();
            setDone(true);
            setTimeout(() => {
                // Scroll the window (not the clipped page box) to the acceptance page, which now shows the signature.
                const pages = document.querySelectorAll('.pp-fit .pp-page');
                const last = pages[pages.length - 1];
                if (last) window.scrollTo({ top: window.scrollY + last.getBoundingClientRect().top - 12, behavior: 'smooth' });
            }, 300);
        };
        body = <>
            {done
                ? <div className="sg-msg ok"><CheckCircle2 size={48} /><h1>Thank you, {req.first_name}!</h1><p>You have accepted proposal {snap.number}. Your signature is now on the acceptance page below. {company.name} will call you about the next steps.</p></div>
                : <>
                    <h1 className="sg-title">Namaste {req.first_name},</h1>
                    <p className="sg-lead">Here is your <b>{totals.kwp} kW rooftop solar proposal</b> from {company.name} ({snap.number}).{open ? ' Please read it, then accept it at the bottom of this page.' : ''}</p>
                </>}
            {signed && !done && <div className="sg-msg ok sg-compact"><CheckCircle2 size={36} /><p><b>You accepted this proposal{req.signed_at ? ` on ${longDate(req.signed_at)}` : ''}.</b> Nothing more is needed from you.</p></div>}
            {req.status === 'expired' && <div className="sg-msg"><AlertCircle size={40} /><h1>This proposal has expired</h1><p>Prices are valid for a limited time. Please contact {company.name} and we will send you an updated proposal.</p>{contact}</div>}
            <div className="sg-sum">
                <div><span>System</span><b>{totals.kwp} kW</b></div>
                <div><span>Price incl. GST</span><b>{inr(totals.price)}</b></div>
                <div><span>Govt. subsidy (to your bank)</span><b>{inr(totals.subsidy)}</b></div>
                <div><span>Effective cost</span><b>{inr(totals.effectiveCost)}</b></div>
            </div>
            <div className="sg-doc"><FitPages snap={snap} accepted={accepted} /></div>
            {open && <section className="sg-accept" aria-label="Accept this proposal">
                <h2 className="sg-title sg-title-small">Accept this proposal</h2>
                <p className="sg-lead">Sign below to accept proposal {snap.number} for your {totals.kwp} kW solar system.{req.expires_at ? ` This link works until ${longDate(req.expires_at)}.` : ''}</p>
                <SignatureCapture
                    onSubmit={submit}
                    onLinkError={linkError}
                    companyName={company.name}
                    submitLabel="Accept this proposal"
                    fineprint={`By accepting, you agree to this proposal and its terms, and that this signature is yours and may be printed on the proposal from ${company.name}.`}
                />
            </section>}
            {!open && req.status !== 'expired' && contact}
        </>;
    }
    return <div className="sg-page"><main className="sg-card wide">{head}{body}</main></div>;
}
