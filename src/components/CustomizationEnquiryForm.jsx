import { useState, useRef, useEffect, useId } from 'react';
import { CheckCircle2, ArrowRight, X, AlertCircle, LoaderCircle, Copy, LockKeyhole } from 'lucide-react';
import { supabase } from '../supabase';
import { useGlobalPopup } from './GlobalPopup';
import { enquiryPayload, saveEnquiryStep } from '../enquiries/submit';
import { DOCUMENT_OPTIONS, INTEREST_OPTIONS, SOFTWARE_OPTIONS, TEAM_SIZE_OPTIONS, YES_NO_OPTIONS, preparedBriefLink } from '../enquiries/brief';

export const DEFAULT_BASIC_VERSION_URL = 'https://solarcrm.deeprootsystems.in';

const OTHER_INTEREST_OPTIONS = INTEREST_OPTIONS.filter(option => !DOCUMENT_OPTIONS.includes(option));


export default function CustomizationEnquiryForm({isModal = false, onClose = null, initialStoreFiles, selectedInterest = '', preparedBrief = null, allowPrepare = false}) {
    const locked = preparedBrief || {};
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [company, setCompany] = useState('');
    const [callDate, setCallDate] = useState('');
    const [callTime, setCallTime] = useState('');
    const [interests, setInterests] = useState(() => [...new Set([...(preparedBrief?.interests || []), ...(selectedInterest ? [selectedInterest] : [])])]);
    const [hasWebsite, setHasWebsite] = useState(preparedBrief?.hasWebsite || '');
    const [teamSize, setTeamSize] = useState(preparedBrief?.teamSize || '');
    const [customerCount, setCustomerCount] = useState(preparedBrief?.customerCount || '');
    const [liveCustomerCount, setLiveCustomerCount] = useState(preparedBrief?.liveCustomerCount || '');
    const [software, setSoftware] = useState(preparedBrief?.software || []);
    const [branches, setBranches] = useState(preparedBrief?.branches || '');
    const [partnerOffices, setPartnerOffices] = useState(preparedBrief?.partnerOffices || '');
    const [channelPartners, setChannelPartners] = useState(preparedBrief?.channelPartners || '');
    const [prepareMode, setPrepareMode] = useState(false);
    const [shareLink, setShareLink] = useState('');
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
    const optionalDirty = Boolean(company || callDate || callTime || remarks || hasWebsite || teamSize || customerCount || liveCustomerCount || software.length || branches || partnerOffices || channelPartners || interests.join('|') !== selectedInterest);
    const dirty = prepareMode ? optionalDirty : step === 'contact' ? Boolean(name || mobile) : step === 'details' && optionalDirty;

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
            const message = prepareMode ? 'Your prepared answers have not been copied into a link.' : step === 'contact' ? 'Your name and phone number have not been saved.' : 'Your contact details are saved. These optional details have not been saved.';
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
                interests: chosenInterests,
                businessDetails: contactOnly ? {} : {hasWebsite, teamSize, customerCount, liveCustomerCount, software, branches, partnerOffices, channelPartners}});
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
        setInterests([...new Set([...(locked.interests || []), ...(selectedInterest ? [selectedInterest] : [])])]);
        setHasWebsite(locked.hasWebsite || ''); setTeamSize(locked.teamSize || '');
        setCustomerCount(locked.customerCount || ''); setLiveCustomerCount(locked.liveCustomerCount || '');
        setSoftware(locked.software || []); setBranches(locked.branches || '');
        setPartnerOffices(locked.partnerOffices || ''); setChannelPartners(locked.channelPartners || '');
        setError(''); identityRef.current = null; setStep('contact');
    };
    const toggleList = (setter, option, checked) => setter(current => checked ? [...new Set([...current, option])] : current.filter(item => item !== option));
    const makeShareLink = async () => {
        try {
            const link = preparedBriefLink(window.location.origin + window.location.pathname, {
                hasWebsite, teamSize, customerCount, liveCustomerCount, software, branches, partnerOffices, channelPartners, interests
            });
            setShareLink(link); setError('');
            await navigator.clipboard?.writeText(link);
        } catch (err) { if (err.message?.includes('Choose at least')) setError(err.message); }
    };
    const fieldClass = 'sf-input mt-1 w-full';
    const choiceField = (label, key, value, setValue, options) => <label className="block text-xs font-bold" key={key}>
        {label} {locked[key] && <LockKeyhole size={13} className="inline text-amber-700" aria-label="Prepared answer locked"/>}
        <select className={fieldClass} value={value} onChange={event => setValue(event.target.value)} disabled={Boolean(locked[key])}>
            <option value="">Choose an answer (optional)</option>
            {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
    </label>;
    const checkGrid = (options, values, setter, lockedValues = []) => <div className="grid gap-2 sm:grid-cols-2">
        {options.map(option => <label key={option} className={`flex gap-2 items-center border rounded-xl p-3 text-xs ${lockedValues.includes(option) ? 'border-amber-200 bg-amber-50' : 'border-stone-200 cursor-pointer'}`}>
            <input type="checkbox" checked={values.includes(option)} disabled={lockedValues.includes(option)} onChange={event => toggleList(setter, option, event.target.checked)} className="accent-orange-600 w-4 h-4 shrink-0"/>
            <span>{option}</span>{lockedValues.includes(option) && <LockKeyhole size={12} className="ml-auto text-amber-700" aria-label="Prepared answer locked"/>}
        </label>)}
    </div>;
    const handleModalKey = event => {
        if (event.key === 'Escape') {event.preventDefault(); requestClose();}
        if (event.key !== 'Tab') return;
        const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus();}
        if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus();}
    };
    const content = (
        <section className="w-full bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden text-stone-900" aria-labelledby={`${formId}-title`}>
            <div className="bg-stone-900 p-6 md:p-7 text-white relative">
                {isModal && step !== 'details' && <button type="button" onClick={requestClose} disabled={submitting} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20" aria-label="Close enquiry"><X size={18}/></button>}
                {!prepareMode && step === 'details' && <button type="button" disabled={submitting} onClick={() => {setError(''); setStep('done');}} className="mb-4 block text-sm font-semibold text-amber-300 underline disabled:opacity-50">Skip — contact me with what’s already saved</button>}
                <p className="text-xs font-bold text-amber-300 mb-2">{prepareMode ? 'Prepare a client form' : step === 'contact' ? 'Step 1 · Quick enquiry' : step === 'details' ? 'Step 2 · Your business and tools' : 'Enquiry received'}</p>
                <h3 id={`${formId}-title`} className="text-xl md:text-2xl font-bold pr-8">{prepareMode ? 'Fill what you already know' : step === 'contact' ? 'How can we reach you?' : step === 'details' ? 'Tell us what you need' : 'Thank you for your interest'}</h3>
                <p className="mt-2 text-sm text-stone-300">{prepareMode ? 'Answer any questions below, then copy a link for your client. Your prepared answers will be locked in their form.' : step === 'contact' ? 'Just your name and phone number to start. You can add more details after submitting.' : step === 'details' ? 'Your contact request is saved. Answer as many questions as you like, or skip.' : 'We have your contact details and will reach out to understand your needs.'}</p>
                {selectedInterest && <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-sm text-amber-200">Interested in: {selectedInterest}</p>}
            </div>
            <div className="p-6 md:p-7">
                {allowPrepare && step === 'contact' && <div className="mb-5 flex flex-wrap gap-2">
                    <button type="button" onClick={() => {setPrepareMode(false); setError('');}} className={`rounded-xl px-4 py-2 text-xs font-bold ${!prepareMode ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'}`}>I’m enquiring</button>
                    <button type="button" onClick={() => {setPrepareMode(true); setError('');}} className={`rounded-xl px-4 py-2 text-xs font-bold ${prepareMode ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'}`}>Prepare a form for a client</button>
                </div>}
                {!prepareMode && step === 'done' ? (
                    <div className="text-center space-y-4 py-4" role="status">
                        <CheckCircle2 className="mx-auto w-10 h-10 text-emerald-600"/>
                        <p className="text-sm">Your enquiry is saved with contact number <strong>{mobile}</strong>.</p>
                        <button type="button" onClick={isModal ? requestClose : reset} className="sf-btn-secondary">{isModal ? 'Done' : 'Submit another enquiry'}</button>
                    </div>
                ) : (
                    <form onSubmit={prepareMode ? event => event.preventDefault() : handleSubmit} className="space-y-5">
                        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex gap-2"><AlertCircle size={16} className="shrink-0"/>{error}</p>}
                        <fieldset disabled={submitting} className="space-y-5">
                            {step === 'contact' && !prepareMode ? (
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
                                    {!prepareMode && <p ref={detailsRef} tabIndex={-1} role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 outline-none">Contact saved: {name} · {mobile}</p>}
                                    {!prepareMode && <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="block text-xs font-bold sm:col-span-2">Company name (optional)
                                            <input maxLength={300} autoComplete="organization" value={company} onChange={e => setCompany(e.target.value)} className={fieldClass}/>
                                        </label>
                                        <label className="block text-xs font-bold">Preferred call date (optional)
                                            <input type="date" value={callDate} onChange={e => setCallDate(e.target.value)} className={fieldClass}/>
                                        </label>
                                        <label className="block text-xs font-bold">Preferred call time (optional, India time)
                                            <input type="time" value={callTime} onChange={e => setCallTime(e.target.value)} className={fieldClass}/>
                                        </label>
                                    </div>}
                                    <fieldset className="space-y-4 rounded-2xl border border-stone-200 p-4 md:p-5">
                                        <legend className="px-2 text-sm font-black">1 · Your business</legend>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {choiceField('Do you have a website?', 'hasWebsite', hasWebsite, setHasWebsite, YES_NO_OPTIONS)}
                                            {choiceField('How many employees?', 'teamSize', teamSize, setTeamSize, TEAM_SIZE_OPTIONS)}
                                            <label className="block text-xs font-bold">How many customers in total?
                                                <input type="number" min="0" max="99999999" inputMode="numeric" value={customerCount} disabled={Boolean(locked.customerCount)} onChange={event => setCustomerCount(event.target.value)} placeholder="Approximate number" className={fieldClass}/>
                                            </label>
                                            <label className="block text-xs font-bold">How many live / active customers?
                                                <input type="number" min="0" max="99999999" inputMode="numeric" value={liveCustomerCount} disabled={Boolean(locked.liveCustomerCount)} onChange={event => setLiveCustomerCount(event.target.value)} placeholder="Approximate number" className={fieldClass}/>
                                            </label>
                                        </div>
                                        <p className="text-xs font-bold">What software do you currently use? <span className="font-normal text-stone-500">Tick any that apply.</span></p>
                                        {checkGrid(SOFTWARE_OPTIONS, software, setSoftware, locked.software || [])}
                                    </fieldset>
                                    <fieldset className="space-y-4 rounded-2xl border border-stone-200 p-4 md:p-5">
                                        <legend className="px-2 text-sm font-black">2 · Offices and partners</legend>
                                        <div className="grid gap-4 sm:grid-cols-3">
                                            {choiceField('Do you have branches?', 'branches', branches, setBranches, YES_NO_OPTIONS)}
                                            {choiceField('Channel partner offices?', 'partnerOffices', partnerOffices, setPartnerOffices, YES_NO_OPTIONS)}
                                            {choiceField('Channel partners?', 'channelPartners', channelPartners, setChannelPartners, YES_NO_OPTIONS)}
                                        </div>
                                    </fieldset>
                                    <fieldset className="space-y-3 rounded-2xl border border-stone-200 p-4 md:p-5">
                                        <legend className="px-2 text-sm font-black">3 · Document makers and automation</legend>
                                        <p className="text-xs text-stone-500">Tick the documents you want to create or automate.</p>
                                        {checkGrid(DOCUMENT_OPTIONS, interests, setInterests, locked.interests || [])}
                                    </fieldset>
                                    <fieldset className="space-y-3 rounded-2xl border border-stone-200 p-4 md:p-5">
                                        <legend className="px-2 text-sm font-black">4 · Other tools and setup</legend>
                                        <p className="text-xs text-stone-500">Choose only what is useful to you. Everything here is optional.</p>
                                        {checkGrid(OTHER_INTEREST_OPTIONS, interests, setInterests, locked.interests || [])}
                                    </fieldset>
                                    {!prepareMode && <label className="block text-xs font-bold">Anything else? (optional)
                                        <textarea maxLength={5000} rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} className={fieldClass}/>
                                    </label>}
                                </>
                            )}
                            {prepareMode ? <>
                                <p className="text-xs text-stone-500">The link includes only the business answers above. It does not include a name, phone number, company name or private notes.</p>
                                <button type="button" onClick={makeShareLink} className="w-full py-3 rounded-xl bg-stone-900 text-white font-bold text-sm flex items-center justify-center gap-2"><Copy size={16}/> Create and copy client link</button>
                                {shareLink && <div className="rounded-xl bg-emerald-50 p-3 space-y-2"><p className="text-xs font-bold text-emerald-800">Client link ready — send this link to your client.</p><input readOnly value={shareLink} onFocus={event => event.target.select()} className={fieldClass} aria-label="Prepared client form link"/></div>}
                            </> : <button type="submit" className="w-full py-3 rounded-xl bg-stone-900 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50" disabled={submitting}>
                                {submitting ? <LoaderCircle size={16} className="animate-spin"/> : <ArrowRight size={16}/>}
                                {submitting ? 'Saving…' : step === 'contact' ? 'Submit enquiry' : 'Save additional details'}
                            </button>}
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
