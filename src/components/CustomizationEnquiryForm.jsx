import { useState, useRef, useEffect, useId } from 'react';
import { CheckCircle2, ArrowRight, X, AlertCircle, LoaderCircle, Copy, LockKeyhole } from 'lucide-react';
import { supabase } from '../supabase';
import { useGlobalPopup } from './GlobalPopup';
import { enquiryPayload, saveEnquiryStep } from '../enquiries/submit';
import { CORE_DOCUMENT_OPTIONS, OPTIONAL_DOCUMENT_OPTIONS, SOFTWARE_OPTIONS, TEAM_SIZE_OPTIONS, YES_NO_OPTIONS, createSavedBrief, findOwnedPreparedBriefs, preparedBriefLink, unlockSavedBrief, verifyPreparationPin } from '../enquiries/brief';

export const DEFAULT_BASIC_VERSION_URL = 'https://solarcrm.deeprootsystems.in';

const OTHER_INTEREST_OPTIONS = [
    'Inventory', 'Warranty tracking',
    'Installation view', 'Installation commission view', 'Vendor commission page',
    'Channel partner commission view', 'Attendance', 'Calendar', 'MIS upload auto updater'
];
const DOCUMENT_COPY = {
    'Feasibility document maker':['Bank feasibility document','Prepare the document for bank submission.'],
    'DISCOM submission document maker':['DISCOM submission document','Prepare the document for upload to the PM Surya Ghar portal.'],
    'Quotation maker':['Quotation maker','Create customer quotations.'],
    'BOM maker':['BOM maker','Generate the bill of materials.']
};
const STORAGE_PRICING = [
    {name:'Google personal account', price:'15 GB free; Google One paid plans vary by account', detail:'Uses the customer’s Google account.', href:'https://one.google.com/about/plans?hl=en_IN'},
    {name:'Google Workspace business account', price:'From ₹99/user/month on an annual plan; 20 GB pooled per user', detail:'Monthly billing starts at ₹120/user/month.', href:'https://workspace.google.com/intl/en_in/business/'},
    {name:'Supabase Storage', price:'1 GB free; Pro from $25/month with 100 GB included', detail:'Extra storage on Pro: $0.0213/GB/month.', href:'https://supabase.com/pricing'}
];


export default function CustomizationEnquiryForm({isModal = false, onClose = null, initialStoreFiles, selectedInterest = '', preparedBriefId = null, allowPrepare = false}) {
    const [preparedBrief, setPreparedBrief] = useState(null);
    const locked = preparedBrief || {};
    const needsUnlock = Boolean(preparedBriefId && !preparedBrief);
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [company, setCompany] = useState('');
    const [callDate, setCallDate] = useState('');
    const [callTime, setCallTime] = useState('');
    const [interests, setInterests] = useState(() => selectedInterest ? [selectedInterest] : []);
    const [hasWebsite, setHasWebsite] = useState('');
    const [teamSize, setTeamSize] = useState('');
    const [customerCount, setCustomerCount] = useState('');
    const [liveCustomerCount, setLiveCustomerCount] = useState('');
    const [software, setSoftware] = useState([]);
    const [otherSoftware, setOtherSoftware] = useState('');
    const [fileStorage, setFileStorage] = useState(() => initialStoreFiles == null ? '' : initialStoreFiles ? 'Yes' : 'No');
    const [storageProvider, setStorageProvider] = useState('');
    const [branches, setBranches] = useState('');
    const [partnerOffices, setPartnerOffices] = useState('');
    const [channelPartners, setChannelPartners] = useState('');
    const [installationTeams, setInstallationTeams] = useState('');
    const [stampStaffLogin, setStampStaffLogin] = useState('');
    const [technicianLogin, setTechnicianLogin] = useState('');
    const [prepareMode, setPrepareMode] = useState(false);
    const [prepareUnlocked, setPrepareUnlocked] = useState(false);
    const [preparePin, setPreparePin] = useState('');
    const [savedMatches, setSavedMatches] = useState([]);
    const [shareLink, setShareLink] = useState('');
    const [shareCode, setShareCode] = useState('');
    const [accessCode, setAccessCode] = useState('');
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
    const optionalDirty = Boolean(company || callDate || callTime || remarks || hasWebsite || teamSize || customerCount || liveCustomerCount || software.length || (software.includes('Other third-party software') && otherSoftware) || branches || partnerOffices || channelPartners || installationTeams || stampStaffLogin || technicianLogin || fileStorage || storageProvider || interests.join('|') !== selectedInterest);
    const dirty = prepareMode ? Boolean(name || mobile || optionalDirty) : step === 'contact' ? Boolean(name || mobile) : step === 'details' && optionalDirty;

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
        const storeFiles = contactOnly ? 'unspecified' : fileStorage === 'Yes' ? 'yes' : fileStorage === 'No' ? 'no' : 'unspecified';
        const chosenInterests = contactOnly ? selectedInterest ? [selectedInterest] : [] : interests;
        const modelType = chosenInterests.includes('Option 1: Small team setup') && !chosenInterests.includes('Option 2: Detailed operations') && !chosenInterests.includes('A mix of both options') ? 'basic' : chosenInterests.includes('Option 2: Detailed operations') ? 'advance' : 'both';
        let payload;
        try {
            payload = enquiryPayload({name, mobile, modelType, storeFiles, storageProvider:storeFiles === 'yes' ? storageProvider : '', selectedInterest,
                company: contactOnly && !preparedBrief ? '' : company, remarks: contactOnly ? '' : remarks,
                callDate: contactOnly ? '' : callDate, callTime: contactOnly ? '' : callTime,
                interests: chosenInterests,
                businessDetails: contactOnly ? {} : {hasWebsite, teamSize, customerCount, liveCustomerCount, software, otherSoftware:software.includes('Other third-party software') ? otherSoftware : '', branches, partnerOffices, channelPartners, installationTeams, stampStaffLogin, technicianLogin}});
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
        setName(locked.name || ''); setMobile(locked.mobile || ''); setCompany(locked.company || ''); setCallDate(''); setCallTime(''); setRemarks('');
        setInterests([...new Set([...(locked.interests || []), ...(selectedInterest ? [selectedInterest] : [])])]);
        setHasWebsite(locked.hasWebsite || ''); setTeamSize(locked.teamSize || '');
        setCustomerCount(locked.customerCount || ''); setLiveCustomerCount(locked.liveCustomerCount || '');
        setSoftware(locked.software || []); setOtherSoftware(locked.otherSoftware || ''); setBranches(locked.branches || '');
        setFileStorage(locked.fileStorage || (initialStoreFiles == null ? '' : initialStoreFiles ? 'Yes' : 'No')); setStorageProvider(locked.storageProvider || '');
        setPartnerOffices(locked.partnerOffices || ''); setChannelPartners(locked.channelPartners || '');
        setInstallationTeams(locked.installationTeams || ''); setStampStaffLogin(locked.stampStaffLogin || ''); setTechnicianLogin(locked.technicianLogin || '');
        setError(''); identityRef.current = null; setStep('contact');
    };
    const applyBrief = brief => {
        setPreparedBrief(brief);
        setName(brief.name || ''); setMobile(brief.mobile || ''); setCompany(brief.company || '');
        setInterests(current => [...new Set([...(brief.interests || []), ...current])]);
        setHasWebsite(brief.hasWebsite || ''); setTeamSize(brief.teamSize || '');
        setCustomerCount(brief.customerCount || ''); setLiveCustomerCount(brief.liveCustomerCount || '');
        setSoftware(brief.software || []); setOtherSoftware(brief.otherSoftware || ''); setBranches(brief.branches || '');
        setFileStorage(brief.fileStorage || ''); setStorageProvider(brief.storageProvider || '');
        setPartnerOffices(brief.partnerOffices || ''); setChannelPartners(brief.channelPartners || '');
        setInstallationTeams(brief.installationTeams || ''); setStampStaffLogin(brief.stampStaffLogin || ''); setTechnicianLogin(brief.technicianLogin || '');
        setPrepareMode(false); setPrepareUnlocked(false); setPreparePin(''); setSavedMatches([]); setAccessCode('');
    };
    const handleUnlock = async event => {
        event.preventDefault();
        if (savingRef.current) return;
        savingRef.current = true; setSubmitting(true); setError('');
        try { applyBrief(await unlockSavedBrief(supabase, preparedBriefId, accessCode)); }
        catch (err) { setError(err.message || 'Could not open this prepared form.'); }
        finally { savingRef.current = false; setSubmitting(false); }
    };
    const toggleList = (setter, option, checked) => setter(current => checked ? [...new Set([...current, option])] : current.filter(item => item !== option));
    const handlePrepareUnlock = async event => {
        event.preventDefault();
        if (savingRef.current) return;
        savingRef.current = true; setSubmitting(true); setError('');
        try {
            if (preparePin === '0905') {
                if (!await verifyPreparationPin(supabase, preparePin)) throw new Error('Incorrect preparation code.');
                setPrepareUnlocked(true);
            } else {
                const matches = await findOwnedPreparedBriefs(supabase, preparePin);
                if (!matches.length) throw new Error('No saved form with those phone digits was found in this browser. Use the client link if it was prepared elsewhere.');
                if (matches.length === 1) applyBrief(await unlockSavedBrief(supabase, matches[0].id, preparePin));
                else setSavedMatches(matches);
            }
        } catch (err) { setError(err.message || 'Could not open the saved form. Please try again.'); }
        finally { savingRef.current = false; setSubmitting(false); }
    };
    const openSavedMatch = async id => {
        if (savingRef.current) return;
        savingRef.current = true; setSubmitting(true); setError('');
        try { applyBrief(await unlockSavedBrief(supabase, id, preparePin)); }
        catch (err) { setError(err.message || 'Could not open the saved form.'); }
        finally { savingRef.current = false; setSubmitting(false); }
    };
    const findSavedInstead = async () => {
        if (savingRef.current) return;
        savingRef.current = true; setSubmitting(true); setError('');
        try {
            const matches = await findOwnedPreparedBriefs(supabase, preparePin);
            if (!matches.length) throw new Error('No saved form with those phone digits was found in this browser. Use the client link if it was prepared elsewhere.');
            if (matches.length === 1) applyBrief(await unlockSavedBrief(supabase, matches[0].id, preparePin));
            else setSavedMatches(matches);
        } catch (err) { setError(err.message || 'Could not find saved forms.'); }
        finally { savingRef.current = false; setSubmitting(false); }
    };
    const makeShareLink = async () => {
        if (savingRef.current) return;
        if (!name.trim() || !company.trim() || !/^\d{10}$/.test(mobile.trim().replace(/[\s()-]/g, '').replace(/^\+91/, ''))) {
            setError('Enter the client name, a valid 10-digit phone number, and company name.');
            return;
        }
        savingRef.current = true; setSubmitting(true); setError('');
        try {
            const saved = await createSavedBrief(supabase, {
                name, mobile, company, hasWebsite, teamSize, customerCount, liveCustomerCount, software, otherSoftware, branches, partnerOffices, channelPartners, installationTeams, stampStaffLogin, technicianLogin, fileStorage, storageProvider, interests
            }, preparePin);
            const link = preparedBriefLink(window.location.origin + window.location.pathname, saved.id);
            setShareLink(link); setShareCode(saved.code);
            try { await navigator.clipboard?.writeText(link); } catch { /* The link remains selectable below. */ }
        } catch (err) { setError(err.message || 'Could not prepare the client form.'); }
        finally { savingRef.current = false; setSubmitting(false); }
    };
    const fieldClass = 'sf-input mt-1 w-full min-h-11';
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
    const documentChoices = (options, showDescription = false) => <div className="grid gap-2 sm:grid-cols-2">
        {options.map(option => {
            const isLocked = (locked.interests || []).includes(option);
            const [title, description] = DOCUMENT_COPY[option] || [option, ''];
            return <label key={option} className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${isLocked ? 'border-amber-200 bg-amber-50' : 'border-stone-200 cursor-pointer hover:border-orange-300'}`}>
                <input type="checkbox" checked={interests.includes(option)} disabled={isLocked} onChange={event => toggleList(setInterests, option, event.target.checked)} className="mt-0.5 accent-orange-600 w-4 h-4 shrink-0"/>
                <span><span className="font-semibold">{title}</span>{showDescription && description && <span className="block mt-1 text-xs text-stone-500 leading-relaxed">{description}</span>}</span>
                {isLocked && <LockKeyhole size={12} className="ml-auto text-amber-700" aria-label="Prepared answer locked"/>}
            </label>;
        })}
    </div>;
    const compactChoices = options => <div className="grid gap-x-5 gap-y-1 sm:grid-cols-2 md:grid-cols-3">
        {options.map(option => {
            const isLocked = (locked.interests || []).includes(option);
            return <label key={option} className={`flex items-center gap-2 min-h-11 py-2 text-sm font-medium border-b border-stone-100 ${isLocked ? 'text-stone-500' : 'cursor-pointer hover:text-orange-700'}`}>
                <input type="checkbox" checked={interests.includes(option)} disabled={isLocked} onChange={event => toggleList(setInterests, option, event.target.checked)} className="accent-orange-600 w-4 h-4 shrink-0"/>
                <span>{option}</span>{isLocked && <LockKeyhole size={11} className="ml-auto text-amber-700" aria-label="Prepared answer locked"/>}
            </label>;
        })}
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
            <div className="bg-stone-900 p-4 sm:p-6 md:p-7 text-white relative">
                {isModal && step !== 'details' && <button type="button" onClick={requestClose} disabled={submitting} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20" aria-label="Close enquiry"><X size={18}/></button>}
                {!prepareMode && step === 'details' && <button type="button" disabled={submitting} onClick={() => {setError(''); setStep('done');}} className="mb-4 block text-sm font-semibold text-amber-300 underline disabled:opacity-50">Skip — contact me with what’s already saved</button>}
                <p className="text-xs font-bold text-amber-300 mb-2">{needsUnlock ? 'Prepared client form' : prepareMode ? 'Prepare a client form' : step === 'contact' ? 'Step 1 · Quick enquiry' : step === 'details' ? 'Step 2 · Your business and tools' : 'Enquiry received'}</p>
                <h3 id={`${formId}-title`} className="text-xl md:text-2xl font-bold pr-8">{needsUnlock ? 'Enter your access code' : prepareMode && !prepareUnlocked ? 'Open a client form' : prepareMode ? 'Prepare the client form' : step === 'contact' ? 'How can we reach you?' : step === 'details' ? 'Tell us what you need' : 'Thank you for your interest'}</h3>
                <p className="mt-2 text-sm text-stone-300">{needsUnlock ? 'Enter the last four digits of your phone number to open this form. Older prepared links still use their original access code.' : prepareMode && !prepareUnlocked ? 'Enter the preparation code to start a new form, or the last four digits of a client’s phone number to reopen a form you prepared in this browser.' : prepareMode ? 'Enter the client’s contact details and any answers you know. The completed fields will be locked in their form.' : step === 'contact' ? 'Just your name and phone number to start. You can add more details after submitting.' : step === 'details' ? 'Your contact request is saved. Answer as many questions as you like, or skip.' : 'We have your contact details and will reach out to understand your needs.'}</p>
                {selectedInterest && <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-sm text-amber-200">Interested in: {selectedInterest}</p>}
            </div>
            <div className="p-4 sm:p-6 md:p-7">
                {allowPrepare && !preparedBrief && step === 'contact' && <div className="mb-5 flex flex-wrap gap-2">
                    <button type="button" onClick={() => {setPrepareMode(false); setPrepareUnlocked(false); setPreparePin(''); setSavedMatches([]); setError('');}} className={`min-h-11 w-full sm:w-auto rounded-xl px-4 py-2 text-xs font-bold ${!prepareMode ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'}`}>I’m enquiring</button>
                    <button type="button" onClick={() => {setPrepareMode(true); setError('');}} className={`min-h-11 w-full sm:w-auto rounded-xl px-4 py-2 text-xs font-bold ${prepareMode ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'}`}>Prepare a form for a client</button>
                </div>}
                {needsUnlock ? <form onSubmit={handleUnlock} className="space-y-4">
                    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
                    <label className="block text-xs font-bold">Access code
                        <input required maxLength={17} autoComplete="one-time-code" inputMode="text" value={accessCode} onChange={event => setAccessCode(event.target.value)} placeholder="Last 4 phone digits" className="sf-input mt-1 w-full uppercase"/>
                    </label>
                    <button type="submit" disabled={submitting} className="w-full min-h-11 py-3 rounded-xl bg-stone-900 text-white font-bold text-sm disabled:opacity-50">{submitting ? 'Opening…' : 'Open prepared form'}</button>
                    <a href="#/plans" className="block text-center text-xs text-stone-600 underline">Start a new form instead</a>
                </form> : prepareMode && !prepareUnlocked ? <form onSubmit={handlePrepareUnlock} className="space-y-4">
                    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
                    <label className="block text-xs font-bold">Four-digit code
                        <input required type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" value={preparePin} onChange={event => {setPreparePin(event.target.value.replace(/\D/g, '').slice(0, 4)); setSavedMatches([]);}} placeholder="Preparation code or last 4 phone digits" className={fieldClass}/>
                    </label>
                    <button type="submit" disabled={submitting} className="w-full min-h-11 rounded-xl bg-stone-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{submitting ? 'Checking…' : preparePin === '0905' ? 'Prepare new form' : 'Open saved form'}</button>
                    {preparePin === '0905' && <button type="button" disabled={submitting} onClick={findSavedInstead} className="w-full min-h-11 rounded-xl border border-stone-300 px-4 py-3 text-sm font-bold text-stone-800 disabled:opacity-50">Open a saved form ending 0905</button>}
                    {savedMatches.length > 1 && <div className="space-y-2" role="group" aria-label="Saved client forms"><p className="text-xs text-stone-600">More than one client has these last four digits. Choose the correct form:</p>{savedMatches.map(match => <button key={match.id} type="button" disabled={submitting} onClick={() => openSavedMatch(match.id)} className="w-full min-h-11 rounded-xl border border-stone-200 px-4 py-3 text-left text-sm hover:border-orange-400 disabled:opacity-50"><strong className="block">{match.name}</strong><span className="text-stone-600">{match.company}</span></button>)}</div>}
                </form> : !prepareMode && step === 'done' ? (
                    <div className="text-center space-y-4 py-4" role="status">
                        <CheckCircle2 className="mx-auto w-10 h-10 text-emerald-600"/>
                        <p className="text-sm">Your enquiry is saved with contact number <strong>{mobile}</strong>.</p>
                        <button type="button" onClick={isModal ? requestClose : reset} className="sf-btn-secondary">{isModal ? 'Done' : 'Submit another enquiry'}</button>
                    </div>
                ) : (
                    <form onSubmit={prepareMode ? event => {event.preventDefault(); makeShareLink();} : handleSubmit} className="space-y-5">
                        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex gap-2"><AlertCircle size={16} className="shrink-0"/>{error}</p>}
                        <fieldset disabled={submitting} className="space-y-5">
                            {step === 'contact' && !prepareMode ? (
                                <div className="space-y-4">
                                    {preparedBrief && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">Prepared answers loaded. Fill any blank contact fields, then continue.</p>}
                                    <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="block text-xs font-bold">Name <span aria-hidden="true">*</span> {locked.name && <LockKeyhole size={13} className="inline text-amber-700" aria-label="Prepared answer locked"/>}
                                        <input ref={nameRef} required maxLength={200} autoComplete="name" value={name} disabled={Boolean(locked.name)} onChange={e => setName(e.target.value)} placeholder="Your name" className={fieldClass}/>
                                    </label>
                                    <label className="block text-xs font-bold">Phone number <span aria-hidden="true">*</span> {locked.mobile && <LockKeyhole size={13} className="inline text-amber-700" aria-label="Prepared answer locked"/>}
                                        <input required type="tel" autoComplete="tel" maxLength={20} value={mobile} disabled={Boolean(locked.mobile)} onChange={e => setMobile(e.target.value)} placeholder="10-digit mobile number" className={fieldClass}/>
                                    </label>
                                    {locked.company && <label className="block text-xs font-bold sm:col-span-2">Company name <LockKeyhole size={13} className="inline text-amber-700" aria-label="Prepared answer locked"/>
                                        <input value={company} disabled className={fieldClass}/>
                                    </label>}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {prepareMode && <fieldset className="space-y-3 rounded-2xl border border-stone-200 p-4 md:p-5">
                                        <legend className="px-2 text-sm font-black">Client contact</legend>
                                        <p className="text-xs text-stone-500">These three fields are required. You can fill the remaining questions for the client.</p>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <label className="block text-xs font-bold">Client name <span aria-hidden="true">*</span>
                                                <input required maxLength={200} autoComplete="off" value={name} onChange={event => setName(event.target.value)} placeholder="Client name" className={fieldClass}/>
                                            </label>
                                            <label className="block text-xs font-bold">Client phone number <span aria-hidden="true">*</span>
                                                <input required type="tel" maxLength={20} autoComplete="off" value={mobile} onChange={event => setMobile(event.target.value)} placeholder="10-digit mobile number" className={fieldClass}/>
                                            </label>
                                            <label className="block text-xs font-bold sm:col-span-2">Company name <span aria-hidden="true">*</span>
                                                <input required maxLength={300} autoComplete="off" value={company} onChange={event => setCompany(event.target.value)} placeholder="Company name" className={fieldClass}/>
                                            </label>
                                        </div>
                                    </fieldset>}
                                    {!prepareMode && <p ref={detailsRef} tabIndex={-1} role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 outline-none">Contact saved: {name} · {mobile}</p>}
                                    {!prepareMode && <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="block text-xs font-bold sm:col-span-2">Company name (optional) {locked.company && <LockKeyhole size={13} className="inline text-amber-700" aria-label="Prepared answer locked"/>}
                                            <input maxLength={300} autoComplete="organization" value={company} disabled={Boolean(locked.company)} onChange={e => setCompany(e.target.value)} className={fieldClass}/>
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
                                        {software.includes('Other third-party software') && <label className="block text-xs font-bold">Which other software do you use? (optional) {locked.otherSoftware && <LockKeyhole size={13} className="inline text-amber-700" aria-label="Prepared answer locked"/>}
                                            <input type="text" maxLength={200} value={otherSoftware} disabled={Boolean(locked.otherSoftware)} onChange={event => setOtherSoftware(event.target.value)} placeholder="Enter software name" className={fieldClass}/>
                                        </label>}
                                    </fieldset>
                                    <fieldset className="space-y-4 rounded-2xl border border-stone-200 p-4 md:p-5">
                                        <legend className="px-2 text-sm font-black">2 · Offices and partners</legend>
                                        <div className="grid gap-4 sm:grid-cols-3">
                                            {choiceField('Do you have branches?', 'branches', branches, setBranches, YES_NO_OPTIONS)}
                                            {choiceField('Channel partner offices?', 'partnerOffices', partnerOffices, setPartnerOffices, YES_NO_OPTIONS)}
                                            {choiceField('Channel partners?', 'channelPartners', channelPartners, setChannelPartners, YES_NO_OPTIONS)}
                                            {choiceField('Do you use third-party or multiple installation teams?', 'installationTeams', installationTeams, setInstallationTeams, YES_NO_OPTIONS)}
                                            {choiceField('Do you need a stamp staff login?', 'stampStaffLogin', stampStaffLogin, setStampStaffLogin, YES_NO_OPTIONS)}
                                            {choiceField('Do you need technician logins?', 'technicianLogin', technicianLogin, setTechnicianLogin, YES_NO_OPTIONS)}
                                        </div>
                                    </fieldset>
                                    <fieldset className="space-y-3 rounded-2xl border border-stone-200 p-4 md:p-5">
                                        <legend className="px-2 text-sm font-black">3 · File storage</legend>
                                        <p className="text-xs text-stone-500">Do you want to store uploaded files with customer records?</p>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {['Yes','No'].map(option => <label key={option} className={`flex gap-3 rounded-xl border p-3 cursor-pointer ${fileStorage === option ? 'border-orange-400 bg-orange-50' : 'border-stone-200'}`}>
                                                <input type="radio" name={`${formId}-file-storage`} value={option} checked={fileStorage === option} disabled={Boolean(locked.fileStorage)} onChange={() => setFileStorage(option)} className="accent-orange-600 mt-0.5"/>
                                                <span className="text-xs"><strong className="block text-sm">{option === 'Yes' ? 'Yes, store files' : 'No, use simple checklists'}</strong>{option === 'No' && <span className="block mt-1 text-stone-600">Included at no extra cost.</span>}</span>
                                            </label>)}
                                        </div>
                                        {fileStorage === 'Yes' && <div className="space-y-2 pt-2">
                                            <p className="text-xs font-bold">Which storage account would you prefer? (optional)</p>
                                            <div className="space-y-2">
                                                {STORAGE_PRICING.map(provider => <label key={provider.name} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${storageProvider === provider.name ? 'border-orange-400 bg-orange-50' : 'border-stone-200'}`}>
                                                    <input type="radio" name={`${formId}-storage-provider`} checked={storageProvider === provider.name} disabled={Boolean(locked.storageProvider)} onChange={() => setStorageProvider(provider.name)} className="accent-orange-600 mt-0.5"/>
                                                    <span className="text-xs leading-relaxed"><strong className="block text-sm">{provider.name}</strong><span className="block mt-1">{provider.price}</span><span className="block text-stone-500">{provider.detail}</span><a href={provider.href} target="_blank" rel="noopener noreferrer" onClick={event => event.stopPropagation()} className="text-orange-700 underline">Provider pricing</a></span>
                                                </label>)}
                                            </div>
                                            <p className="text-[11px] text-stone-500">Storage plans are third-party charges paid to the provider. Prices and taxes can change; check the linked plan before buying.</p>
                                        </div>}
                                    </fieldset>
                                    <fieldset className="space-y-3 rounded-2xl border border-stone-200 p-4 md:p-5">
                                        <legend className="px-2 text-sm font-black">4 · Automated documents</legend>
                                        <p className="text-xs text-stone-500">Select the documents you want us to automate.</p>
                                        {documentChoices(CORE_DOCUMENT_OPTIONS, true)}
                                    </fieldset>
                                    <fieldset className="space-y-3 rounded-2xl border border-stone-200 p-4 md:p-5">
                                        <legend className="px-2 text-sm font-black">5 · Optional document makers</legend>
                                        <p className="text-xs text-stone-500">The delivery truck tally checklist shows the total quantity of each item to load onto the truck.</p>
                                        {documentChoices(OPTIONAL_DOCUMENT_OPTIONS)}
                                    </fieldset>
                                    <fieldset className="space-y-3 rounded-2xl border border-stone-200 p-4 md:p-5">
                                        <legend className="px-2 text-sm font-black">6 · Other features</legend>
                                        <p className="text-xs text-stone-500">Pick anything else your team needs. MIS upload automation is an extra feature.</p>
                                        {compactChoices(OTHER_INTEREST_OPTIONS)}
                                    </fieldset>
                                    {!prepareMode && <label className="block text-xs font-bold">Anything else? (optional)
                                        <textarea maxLength={5000} rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} className={fieldClass}/>
                                    </label>}
                                </>
                            )}
                            {prepareMode ? <>
                                <p className="text-xs text-stone-500">Share the link with your client. They unlock it with the last four digits of their phone number. The form stays available for 30 days.</p>
                                <button type="submit" disabled={submitting} className="w-full min-h-11 py-3 rounded-xl bg-stone-900 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"><Copy size={16}/>{submitting ? 'Preparing…' : 'Create and copy client link'}</button>
                                {shareLink && <div className="rounded-xl bg-emerald-50 p-3 space-y-2" role="status"><p className="text-xs font-bold text-emerald-800">Client form ready — send the link to your client.</p><label className="block text-xs font-bold">Client link<input readOnly value={shareLink} onFocus={event => event.target.select()} className={fieldClass} aria-label="Prepared client form link"/></label><p className="text-xs text-stone-600">Unlock code: last four digits of the client phone number ({shareCode}). Each link opens only its own client form.</p></div>}
                            </> : <button type="submit" className="w-full min-h-11 py-3 rounded-xl bg-stone-900 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50" disabled={submitting}>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs overflow-y-auto p-3 sm:p-4 flex items-start justify-center" role="dialog" aria-modal="true" aria-labelledby={`${formId}-title`} onKeyDown={handleModalKey}>
            <div className="w-full max-w-2xl my-3 sm:my-8">{content}</div>
        </div>
    ) : content;
}
