import { useState, useRef, useEffect, useId } from 'react';
import { CheckCircle2, ArrowRight, X, AlertCircle, LoaderCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { useGlobalPopup } from './GlobalPopup';
import { enquiryPayload, saveEnquiryStep } from '../enquiries/submit';

export const DEFAULT_BASIC_VERSION_URL = 'https://solarcrm.deeprootsystems.in';

const INTEREST_OPTIONS = [
    'Option 1: Small team setup', 'Option 2: Detailed operations', 'A mix of both options', 'Tools only — no CRM',
    'Customer tracking', 'Quotation maker', 'Bill / invoice maker', 'BOM',
    'Delivery challan', 'Gate pass', 'DISCOM submission maker', 'DISCOM submission auto print',
    'Feasibility document automation', 'Inventory', 'Warranty tracking',
    'Vendor login', 'Stamp staff login', 'Technician login',
    'Dealers', 'Channel partner offices (CPOs)', 'Branches', 'Staff management',
    'Installation view', 'Installation commission view', 'Vendor commission page',
    'Channel partner commission view', 'Operations page', 'Dealer-based filtering',
    'MIS upload auto updater', 'Finance', 'Attendance', 'Checklists', 'Document uploads'
];


export default function CustomizationEnquiryForm({isModal = false, onClose = null, initialStoreFiles, selectedInterest = ''}) {
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [company, setCompany] = useState('');
    const [callDate, setCallDate] = useState('');
    const [callTime, setCallTime] = useState('');
    const [interests, setInterests] = useState(() => selectedInterest ? [selectedInterest] : []);
    const [remarks, setRemarks] = useState('');
    const [step, setStep] = useState('contact');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const identityRef = useRef(null);
    const savingRef = useRef(false);
    const detailsRef = useRef(null);
    const nameRef = useRef(null);
    const formId = useId();
    const {showConfirm} = useGlobalPopup();
    const optionalDirty = Boolean(company || callDate || callTime || remarks || interests.join('|') !== selectedInterest);
    const dirty = step === 'contact' ? Boolean(name || mobile) : step === 'details' && optionalDirty;

    useEffect(() => {
        if (!isModal) return;
        const previousFocus = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        nameRef.current?.focus();
        return () => {
            document.body.style.overflow = previousOverflow;
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, [isModal]);
    useEffect(() => {
        if (step === 'details') detailsRef.current?.focus();
    }, [step]);
    useEffect(() => {
        if (!dirty) return;
        const warn = event => {event.preventDefault(); event.returnValue = '';};
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    const requestClose = async () => {
        if (savingRef.current) return;
        if (dirty) {
            const message = step === 'contact' ? 'Your name and phone number have not been saved.' : 'Your contact details are saved. These optional details have not been saved.';
            if (!await showConfirm(message, {title:'Close this form?', confirmLabel:'Close form', cancelLabel:'Keep editing', type:'warning'})) return;
        }
        onClose?.();
    };
    const handleSubmit = async event => {
        event.preventDefault();
        if (savingRef.current || step === 'done') return;
        setError('');
        if (!name.trim()) {setError('Please enter your name.'); return;}
        const contactOnly = step === 'contact';
        const storeFiles = contactOnly ? 'unspecified' : interests.includes('Document uploads') ? 'yes' : interests.includes('Checklists') ? 'no' : initialStoreFiles == null ? 'unspecified' : initialStoreFiles ? 'yes' : 'no';
        const chosenInterests = contactOnly ? selectedInterest ? [selectedInterest] : [] : interests;
        const modelType = chosenInterests.includes('Option 1: Small team setup') && !chosenInterests.includes('Option 2: Detailed operations') && !chosenInterests.includes('A mix of both options') ? 'basic' : chosenInterests.includes('Option 2: Detailed operations') ? 'advance' : 'both';
        let payload;
        try {
            payload = enquiryPayload({name, mobile, modelType, storeFiles, selectedInterest,
                company: contactOnly ? '' : company, remarks: contactOnly ? '' : remarks,
                callDate: contactOnly ? '' : callDate, callTime: contactOnly ? '' : callTime,
                interests: chosenInterests});
        } catch (err) {setError(err.message); return;}
        if (!identityRef.current) identityRef.current = {id:crypto.randomUUID(), editToken:crypto.randomUUID()};
        savingRef.current = true;
        setSubmitting(true);
        try {
            await saveEnquiryStep(supabase, payload, identityRef.current, {contactOnly});
            setStep(contactOnly ? 'details' : 'done');
        } catch (err) {
            setError(err.message?.startsWith('Your contact details are saved.') ? err.message : contactOnly ? 'We could not confirm your enquiry was saved. Please try again; your details are still here.' : 'Your contact details are saved, but we could not save these extra details. Please try again or skip this step.');
        } finally {savingRef.current = false; setSubmitting(false);}
    };
    const reset = () => {
        setName(''); setMobile(''); setCompany(''); setCallDate(''); setCallTime(''); setRemarks('');
        setInterests(selectedInterest ? [selectedInterest] : []);
        setError(''); identityRef.current = null; setStep('contact');
    };
    const fieldClass = 'sf-input mt-1 w-full';
    const handleModalKey = event => {
        if (event.key === 'Escape') {event.preventDefault(); requestClose();}
        if (event.key !== 'Tab') return;
        const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)')];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus();}
        if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus();}
    };
    const content = (
        <section className="w-full bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden text-stone-900" aria-labelledby={`${formId}-title`}>
            <div className="bg-stone-900 p-6 md:p-7 text-white relative">
                {isModal && step !== 'details' && <button type="button" onClick={requestClose} disabled={submitting} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20" aria-label="Close enquiry"><X size={18}/></button>}
                {step === 'details' && <button type="button" disabled={submitting} onClick={() => {setError(''); setStep('done');}} className="mb-4 block text-sm font-semibold text-amber-300 underline disabled:opacity-50">Skip — contact me with what’s already saved</button>}
                <p className="text-xs font-bold text-amber-300 mb-2">{step === 'contact' ? 'Step 1 · Quick enquiry' : step === 'details' ? 'Step 2 · Optional details' : 'Enquiry received'}</p>
                <h3 id={`${formId}-title`} className="text-xl md:text-2xl font-bold pr-8">{step === 'contact' ? 'How can we reach you?' : step === 'details' ? 'Want to add a little more detail?' : 'Thank you for your interest'}</h3>
                <p className="mt-2 text-sm text-stone-300">{step === 'contact' ? 'Just your name and phone number to start. You can add more details after submitting.' : step === 'details' ? 'Your contact request is saved. These extra details are completely optional.' : 'We have your contact details and will reach out to understand your needs.'}</p>
                {selectedInterest && <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-sm text-amber-200">Interested in: {selectedInterest}</p>}
            </div>
            <div className="p-6 md:p-7">
                {step === 'done' ? (
                    <div className="text-center space-y-4 py-4" role="status">
                        <CheckCircle2 className="mx-auto w-10 h-10 text-emerald-600"/>
                        <p className="text-sm">Your enquiry is saved with contact number <strong>{mobile}</strong>.</p>
                        <button type="button" onClick={isModal ? requestClose : reset} className="sf-btn-secondary">{isModal ? 'Done' : 'Submit another enquiry'}</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex gap-2"><AlertCircle size={16} className="shrink-0"/>{error}</p>}
                        <fieldset disabled={submitting} className="space-y-5">
                            {step === 'contact' ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="block text-xs font-bold">Name <span aria-hidden="true">*</span>
                                        <input ref={nameRef} required maxLength={200} autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className={fieldClass}/>
                                    </label>
                                    <label className="block text-xs font-bold">Phone number <span aria-hidden="true">*</span>
                                        <input required type="tel" autoComplete="tel" maxLength={20} value={mobile} onChange={e => setMobile(e.target.value)} placeholder="10-digit mobile number" className={fieldClass}/>
                                    </label>
                                </div>
                            ) : (
                                <>
                                    <p ref={detailsRef} tabIndex={-1} role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 outline-none">Contact saved: {name} · {mobile}</p>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="block text-xs font-bold sm:col-span-2">Company name (optional)
                                            <input maxLength={300} autoComplete="organization" value={company} onChange={e => setCompany(e.target.value)} className={fieldClass}/>
                                        </label>
                                        <label className="block text-xs font-bold">Preferred call date (optional)
                                            <input type="date" value={callDate} onChange={e => setCallDate(e.target.value)} className={fieldClass}/>
                                        </label>
                                        <label className="block text-xs font-bold">Preferred call time (optional, India time)
                                            <input type="time" value={callTime} onChange={e => setCallTime(e.target.value)} className={fieldClass}/>
                                        </label>
                                    </div>
                                    <fieldset className="space-y-3">
                                        <legend className="text-sm font-bold">Interested in (optional)</legend>
                                        <p className="text-xs text-stone-500">Choose just the tools you need, a CRM setup, or both. Tick or untick anything — you can leave these blank.</p>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {INTEREST_OPTIONS.map(option => <label key={option} className="flex gap-2 items-center border border-stone-200 rounded-xl p-3 text-xs cursor-pointer">
                                                <input type="checkbox" checked={interests.includes(option)} onChange={e => setInterests(current => e.target.checked ? [...current, option] : current.filter(item => item !== option))} className="accent-orange-600 w-4 h-4 shrink-0"/>{option}
                                            </label>)}
                                        </div>
                                    </fieldset>
                                    <label className="block text-xs font-bold">Anything else? (optional)
                                        <textarea maxLength={5000} rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} className={fieldClass}/>
                                    </label>
                                </>
                            )}
                            <button type="submit" className="w-full py-3 rounded-xl bg-stone-900 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50" disabled={submitting}>
                                {submitting ? <LoaderCircle size={16} className="animate-spin"/> : <ArrowRight size={16}/>}
                                {submitting ? 'Saving…' : step === 'contact' ? 'Submit enquiry' : 'Save optional details'}
                            </button>
                        </fieldset>
                    </form>
                )}
            </div>
        </section>
    );
    return isModal ? (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs overflow-y-auto p-4 flex items-start justify-center" role="dialog" aria-modal="true" aria-labelledby={`${formId}-title`} onKeyDown={handleModalKey}>
            <div className="w-full max-w-2xl my-8">{content}</div>
        </div>
    ) : content;
}
