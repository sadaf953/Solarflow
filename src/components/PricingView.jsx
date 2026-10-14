import { useEffect, useState } from 'react';
import CustomizationEnquiryForm from './CustomizationEnquiryForm';
import QuoteBuilder from './QuoteBuilder';
import { LAUNCH_OFFER } from '../pricing/packages';
import QuoteOnWhatsApp from '../demo/QuoteOnWhatsApp';
import { readPreparedBriefId } from '../enquiries/brief';
import { readSubmittedEnquiryId } from '../enquiries/reopen';

export default function PricingView() {
    const [preparedBriefId, setPreparedBriefId] = useState(() => readPreparedBriefId(window.location.hash));
    const [submittedEnquiryId, setSubmittedEnquiryId] = useState(() => readSubmittedEnquiryId(window.location.hash));
    useEffect(() => {
        const update = () => {setPreparedBriefId(readPreparedBriefId(window.location.hash));setSubmittedEnquiryId(readSubmittedEnquiryId(window.location.hash));};
        window.addEventListener('hashchange', update);
        return () => window.removeEventListener('hashchange', update);
    }, []);
    if (preparedBriefId || submittedEnquiryId) return (
        <main className="mx-auto max-w-2xl py-5 sm:py-10 pb-16 space-y-5">
            <header className="px-1 sm:px-0">
                <p className="sf-kicker">Your custom SolarFlow quotation</p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-black leading-tight text-stone-900">Tell us what your team needs</h1>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">We’ve started this form with the details shared with us. Enter the code, review the answers, and choose anything else you need. We’ll use your responses to prepare a quotation for you.</p>
            </header>
            <CustomizationEnquiryForm key={preparedBriefId || submittedEnquiryId} preparedBriefId={preparedBriefId} submittedEnquiryId={submittedEnquiryId}/>
        </main>
    );
    return (
        <div className="max-w-7xl mx-auto py-8 md:py-12 space-y-8">
            <header className="max-w-3xl space-y-3">
                <p className="sf-kicker">SolarFlow for your team</p>
                {LAUNCH_OFFER > 0 && <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Launch offer: {Math.round(LAUNCH_OFFER * 100)}% off every package</p>}
                <h1 className="text-3xl md:text-4xl font-black text-stone-900">Pick your package. See your estimate in 1 minute.</h1>
                <p className="text-sm leading-relaxed text-stone-600">Four packages, one-time payment, no monthly fee. Pick one, answer a few taps, and send it to us on WhatsApp – we reply with your final quotation.</p>
                <p className="text-sm text-stone-600">Rather just talk? <QuoteOnWhatsApp variant="link" label="Ask for a quotation on WhatsApp" context="pricing page"/></p>
            </header>
            <QuoteBuilder/>
        </div>
    );
}
