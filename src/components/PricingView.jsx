import { useEffect, useState } from 'react';
import CustomizationEnquiryForm from './CustomizationEnquiryForm';
import BudgetPlanner from './BudgetPlanner';
import QuoteOnWhatsApp from '../demo/QuoteOnWhatsApp';
import { readPreparedBriefId } from '../enquiries/brief';
import { readSubmittedEnquiryId } from '../enquiries/reopen';

const isAdminView = hash => new URLSearchParams(hash.split('?')[1] || '').get('admin') === '1';

export default function PricingView() {
    const [preparedBriefId, setPreparedBriefId] = useState(() => readPreparedBriefId(window.location.hash));
    const [submittedEnquiryId, setSubmittedEnquiryId] = useState(() => readSubmittedEnquiryId(window.location.hash));
    const [adminView, setAdminView] = useState(() => isAdminView(window.location.hash));
    useEffect(() => {
        const update = () => {setPreparedBriefId(readPreparedBriefId(window.location.hash));setSubmittedEnquiryId(readSubmittedEnquiryId(window.location.hash));setAdminView(isAdminView(window.location.hash));};
        window.addEventListener('hashchange', update);
        return () => window.removeEventListener('hashchange', update);
    }, []);
    if (preparedBriefId || submittedEnquiryId) return (
        <main className="mx-auto max-w-2xl py-5 sm:py-10 pb-16 space-y-5">
            <header className="px-1 sm:px-0">
                <a href="#/plans?admin=1" className="mb-5 inline-flex min-h-11 items-center rounded-xl border border-stone-300 px-4 text-sm font-bold text-stone-800">Admin access</a>
                <p className="sf-kicker">Your custom SolarFlow quotation</p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-black leading-tight text-stone-900">Tell us what your team needs</h1>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">We’ve started this form with the details shared with us. Enter the code, review the answers, and choose anything else you need. We’ll use your responses to prepare a quotation for you.</p>
            </header>
            <CustomizationEnquiryForm key={preparedBriefId || submittedEnquiryId} preparedBriefId={preparedBriefId} submittedEnquiryId={submittedEnquiryId}/>
        </main>
    );
    if (adminView) return (
        <main className="mx-auto max-w-2xl py-5 sm:py-10 pb-16 space-y-5">
            <header className="px-1 sm:px-0">
                <a href="#/plans" className="mb-5 inline-flex min-h-11 items-center text-sm font-bold text-orange-700 underline">← Back to pricing</a>
                <p className="sf-kicker">SolarFlow form management</p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-black text-stone-900">Admin access</h1>
                <p className="mt-2 text-sm text-stone-600">Open your saved forms, prepare a new one, and share a client link.</p>
            </header>
            <CustomizationEnquiryForm key="admin" startInPrepareMode/>
        </main>
    );
    return (
        <div className="max-w-7xl mx-auto py-8 md:py-12 space-y-8">
            <header className="max-w-3xl space-y-3">
                <a href="#/plans?admin=1" className="inline-flex min-h-11 items-center rounded-xl border border-stone-300 px-4 text-sm font-bold text-stone-800">Admin access</a>
                <p className="sf-kicker">SolarFlow for your team</p>
                <h1 className="text-3xl md:text-4xl font-black text-stone-900">Build your plan in 1 minute</h1>
                <p className="text-sm leading-relaxed text-stone-600">Tell us your team size and budget. We’ll pick the features that fit, you adjust, and we send you a quotation.</p>
                <p className="text-sm text-stone-600">Rather just talk? <QuoteOnWhatsApp variant="link" label="Ask for a quotation on WhatsApp" context="pricing page"/></p>
            </header>
            <BudgetPlanner/>
        </div>
    );
}
