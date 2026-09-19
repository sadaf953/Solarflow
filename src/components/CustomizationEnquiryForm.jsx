import React, { useState } from 'react';
import { 
    Phone, Mail, Building2, User, ExternalLink, CheckCircle2, 
    Sparkles, Layers, FileSpreadsheet, Check, ArrowRight, X, AlertCircle, LoaderCircle
} from 'lucide-react';
import { supabase } from '../supabase';

// Configurable link for the basic version (user can supply exact link)
export const DEFAULT_BASIC_VERSION_URL = 'https://deeprootsystems.in/solarflow-basic';

const SOFTWARE_OPTIONS = [
    { id: 'sheets_excel', label: 'Google Sheets / Excel', icon: FileSpreadsheet },
    { id: 'tally', label: 'Tally (ERP / Prime)', icon: Layers },
    { id: 'zoho', label: 'Zoho (CRM / Books)', icon: Building2 },
    { id: 'other_crm', label: 'Other Third-Party CRM / ERP', icon: Sparkles },
    { id: 'manual', label: 'Manual Paper Registers', icon: User },
    { id: 'fresh', label: 'None / Starting Fresh', icon: Sparkles }
];

export default function CustomizationEnquiryForm({ 
    isModal = false, 
    onClose = null, 
    basicVersionUrl = DEFAULT_BASIC_VERSION_URL 
}) {
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [mobile, setMobile] = useState('');
    const [modelType, setModelType] = useState('basic'); // 'basic' | 'advance'
    const [storeFiles, setStoreFiles] = useState('yes'); // 'yes' | 'no'
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const cleanMobile = mobile.trim().replace(/[^\d+]/g, '');
        if (!cleanMobile || cleanMobile.length < 10) {
            setError('Please enter a valid 10-digit mobile number.');
            return;
        }

        setSubmitting(true);
        const submissionPayload = {
            name: name.trim() || 'Prospective Client',
            company_name: company.trim() || null,
            mobile_number: cleanMobile,
            model_type: modelType,
            file_storage: storeFiles === 'yes',
            remarks: remarks.trim() || null,
            status: 'new',
            created_at: new Date().toISOString()
        };

        try {
            const { error: insertErr } = await supabase
                .from('enquiries')
                .insert([submissionPayload]);

            if (insertErr) {
                console.warn('Enquiries table notice, saving locally:', insertErr.message);
            }

            try {
                const existing = JSON.parse(localStorage.getItem('solarflow_customer_enquiries') || '[]');
                existing.unshift({ ...submissionPayload, id: 'local_' + Date.now() });
                localStorage.setItem('solarflow_customer_enquiries', JSON.stringify(existing));
            } catch (storageErr) {
                console.warn('Local storage write warning:', storageErr);
            }

            setSubmitted(true);
        } catch (err) {
            console.warn('Submission fallback triggered:', err);
            setSubmitted(true);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReset = () => {
        setSubmitted(false);
        setName('');
        setCompany('');
        setMobile('');
        setRemarks('');
        setError('');
    };

    const content = (
        <div className="w-full bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden text-stone-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 p-6 md:p-7 text-white relative">
                {isModal && onClose && (
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[11px] font-bold tracking-wide uppercase mb-2">
                    <Sparkles size={12} />
                    <span>Get SolarFlow For Your Business</span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                    Request SolarFlow Setup
                </h3>
                <p className="text-xs md:text-sm text-stone-300 mt-1 max-w-xl leading-relaxed">
                    Tell us what you need and our team will get your tailored solar CRM configured.
                </p>
            </div>

            {/* Form */}
            <div className="p-6 md:p-7">
                {submitted ? (
                    <div className="py-8 px-4 text-center max-w-md mx-auto animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3.5 shadow-sm">
                            <CheckCircle2 size={28} />
                        </div>
                        <h4 className="text-lg font-bold text-stone-900">Enquiry Received!</h4>
                        <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                            Thank you! We will reach out to <strong>{mobile}</strong> shortly to discuss your setup.
                        </p>
                        <div className="mt-5 flex justify-center gap-3">
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition cursor-pointer"
                            >
                                Submit Another
                            </button>
                            {isModal && onClose && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition cursor-pointer"
                                >
                                    Close
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
                                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* 1. Model Choice: Basic vs Advance */}
                        <div>
                            <label className="block text-xs font-bold text-stone-800 mb-1.5">
                                1. Model Type *
                            </label>
                            <div className="grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setModelType('basic')}
                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                        modelType === 'basic'
                                            ? 'bg-amber-500/10 border-amber-500 text-amber-950 font-bold shadow-2xs'
                                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold">Basic Model</span>
                                        {modelType === 'basic' && <Check size={14} className="text-amber-600" />}
                                    </div>
                                    <p className="text-[11px] font-normal text-stone-500 mt-0.5">
                                        Leads, Quotations &amp; Customer Tracking
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setModelType('advance')}
                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                        modelType === 'advance'
                                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-950 font-bold shadow-2xs'
                                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold">Advance Model</span>
                                        {modelType === 'advance' && <Check size={14} className="text-emerald-600" />}
                                    </div>
                                    <p className="text-[11px] font-normal text-stone-500 mt-0.5">
                                        All 50 Stages, Inventory, Vendors &amp; Stamp
                                    </p>
                                </button>
                            </div>
                        </div>

                        {/* 2. File Storage: Yes vs No */}
                        <div>
                            <label className="block text-xs font-bold text-stone-800 mb-1.5">
                                2. File Storage *
                            </label>
                            <div className="grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setStoreFiles('yes')}
                                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                                        storeFiles === 'yes'
                                            ? 'bg-amber-500/10 border-amber-500 text-amber-950 font-bold shadow-2xs'
                                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-300'
                                    }`}
                                >
                                    <div>
                                        <span className="text-xs font-bold">Yes</span>
                                        <span className="text-[11px] text-stone-500 font-normal ml-1.5">Upload photos &amp; docs</span>
                                    </div>
                                    {storeFiles === 'yes' && <Check size={14} className="text-amber-600" />}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStoreFiles('no')}
                                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                                        storeFiles === 'no'
                                            ? 'bg-amber-500/10 border-amber-500 text-amber-950 font-bold shadow-2xs'
                                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-300'
                                    }`}
                                >
                                    <div>
                                        <span className="text-xs font-bold">No</span>
                                        <span className="text-[11px] text-stone-500 font-normal ml-1.5">Simple 1-click checklists</span>
                                    </div>
                                    {storeFiles === 'no' && <Check size={14} className="text-amber-600" />}
                                </button>
                            </div>
                        </div>

                        {/* 3. Contact Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1">
                                    Name
                                </label>
                                <div className="relative">
                                    <User size={14} className="absolute left-3.5 top-3 text-stone-400" />
                                    <input 
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Your Name"
                                        className="w-full pl-9 pr-3.5 py-2.5 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1">
                                    Company Name
                                </label>
                                <div className="relative">
                                    <Building2 size={14} className="absolute left-3.5 top-3 text-stone-400" />
                                    <input 
                                        type="text"
                                        value={company}
                                        onChange={e => setCompany(e.target.value)}
                                        placeholder="Company / Firm Name"
                                        className="w-full pl-9 pr-3.5 py-2.5 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-stone-700 mb-1">
                                Phone Number *
                            </label>
                            <div className="relative">
                                <Phone size={14} className="absolute left-3.5 top-3 text-stone-400" />
                                <input 
                                    type="tel"
                                    required
                                    value={mobile}
                                    onChange={e => setMobile(e.target.value)}
                                    placeholder="10-digit mobile number"
                                    className="w-full pl-9 pr-3.5 py-2.5 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                                />
                            </div>
                        </div>

                        {/* 4. Remarks */}
                        <div>
                            <label className="block text-xs font-bold text-stone-700 mb-1">
                                Any Remarks
                            </label>
                            <textarea
                                rows={2}
                                value={remarks}
                                onChange={e => setRemarks(e.target.value)}
                                placeholder="Any specific requirements or notes..."
                                className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none"
                            />
                        </div>

                        {/* Submit */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                            >
                                {submitting ? <LoaderCircle size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                                <span>{submitting ? 'Submitting...' : 'Submit Request'}</span>
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );

    if (isModal) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
                <div className="relative w-full max-w-lg my-8">
                    {content}
                </div>
            </div>
        );
    }

    return content;
}
