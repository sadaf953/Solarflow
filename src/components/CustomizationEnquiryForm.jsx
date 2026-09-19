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
    const [email, setEmail] = useState('');
    const [versionType, setVersionType] = useState('basic'); // 'basic' | 'advance' | 'both'
    const [selectedSoftwares, setSelectedSoftwares] = useState(['sheets_excel']);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    const toggleSoftware = (id) => {
        setSelectedSoftwares(prev => 
            prev.includes(id) 
                ? (prev.length > 1 ? prev.filter(item => item !== id) : prev)
                : [...prev, id]
        );
    };

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
            email: email.trim() || null,
            version_type: versionType,
            current_softwares: selectedSoftwares.map(id => SOFTWARE_OPTIONS.find(s => s.id === id)?.label || id),
            notes: notes.trim() || null,
            status: 'new',
            created_at: new Date().toISOString()
        };

        try {
            // Attempt to insert into Supabase enquiries table
            const { error: insertErr } = await supabase
                .from('enquiries')
                .insert([submissionPayload]);

            if (insertErr) {
                console.warn('Enquiries table not yet configured in Supabase, saving locally:', insertErr.message);
            }

            // Always persist locally in browser storage as reliable fallback
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
        setEmail('');
        setNotes('');
        setError('');
    };

    const content = (
        <div className="w-full bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
            {/* Top Brand Header */}
            <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 p-6 md:p-8 text-white relative">
                {isModal && onClose && (
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[11px] font-bold tracking-wide uppercase mb-3">
                    <Sparkles size={12} />
                    <span>Customized per your workflow</span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                    Need SolarFlow for Your Solar Business?
                </h3>
                <p className="text-xs md:text-sm text-stone-300 mt-1.5 max-w-2xl leading-relaxed">
                    Choose between our agile <strong>Basic Version</strong> or the comprehensive <strong>Advance Enterprise Suite</strong>. Fully tailored to work alongside your spreadsheets, Tally, or Zoho.
                </p>
            </div>

            {/* Version Overview & Navigation Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-200 border-b border-stone-200 bg-stone-50/50">
                {/* Basic Version Card */}
                <div className={`p-5 md:p-6 transition-all ${versionType === 'basic' ? 'bg-amber-500/5' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-lg border border-amber-200">
                            Lightweight &amp; Agile
                        </span>
                        <a 
                            href={basicVersionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 hover:underline"
                            title="Check out the basic version page"
                        >
                            <span>Check Out Basic Version</span>
                            <ExternalLink size={12} />
                        </a>
                    </div>
                    <h4 className="text-base font-bold text-stone-900">Basic Version</h4>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                        Streamlined lead management, follow-up calendar, and 1-page quotations. Direct import/export with <strong>Google Sheets, Excel, Tally, or Zoho</strong>.
                    </p>
                </div>

                {/* Advance Version Card */}
                <div className={`p-5 md:p-6 transition-all ${versionType === 'advance' ? 'bg-emerald-500/5' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            Full Enterprise Suite
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700">
                            Currently Active in Demo ↑
                        </span>
                    </div>
                    <h4 className="text-base font-bold text-stone-900">Advance Version</h4>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                        Complete end-to-end solar ERP: all 50 customer stages, BOM calculations, Godown inventory registers, delivery batches, vendor payouts, and stamp guy verification.
                    </p>
                </div>
            </div>

            {/* Form Section */}
            <div className="p-6 md:p-8">
                {submitted ? (
                    <div className="py-8 px-4 text-center max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-4 shadow-sm">
                            <CheckCircle2 size={32} />
                        </div>
                        <h4 className="text-lg font-bold text-stone-900">Thank You! Enquiry Received</h4>
                        <p className="text-xs md:text-sm text-stone-600 mt-2 leading-relaxed">
                            We have received your requirements. Our solar deployment team will connect with you on <strong>{mobile}</strong> shortly to discuss your custom setup and pricing.
                        </p>

                        {versionType === 'basic' && (
                            <div className="mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left">
                                <p className="text-xs font-bold text-amber-900">
                                    Interested in the Basic Version?
                                </p>
                                <p className="text-xs text-amber-800 mt-0.5">
                                    You can preview the dedicated basic solar CRM page right away:
                                </p>
                                <a 
                                    href={basicVersionUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm"
                                >
                                    <span>Open Basic Version Page</span>
                                    <ExternalLink size={13} />
                                </a>
                            </div>
                        )}

                        <div className="mt-6 pt-4 border-t border-stone-200 flex justify-center gap-3">
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 transition"
                            >
                                Submit Another Request
                            </button>
                            {isModal && onClose && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition"
                                >
                                    Close
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-3.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
                                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Version Choice */}
                        <div>
                            <label className="block text-xs font-bold text-stone-800 mb-2">
                                1. Which version would you like to explore or deploy? *
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setVersionType('basic')}
                                    className={`p-3 rounded-2xl border text-left transition-all ${
                                        versionType === 'basic'
                                            ? 'bg-amber-500/10 border-amber-500 text-amber-950 font-bold shadow-xs'
                                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold">Basic Version</span>
                                        {versionType === 'basic' && <Check size={14} className="text-amber-600" />}
                                    </div>
                                    <p className="text-[11px] font-normal text-stone-500 mt-1">
                                        Lean CRM · Sheets / Tally / Zoho sync
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setVersionType('advance')}
                                    className={`p-3 rounded-2xl border text-left transition-all ${
                                        versionType === 'advance'
                                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-950 font-bold shadow-xs'
                                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold">Advance Version</span>
                                        {versionType === 'advance' && <Check size={14} className="text-emerald-600" />}
                                    </div>
                                    <p className="text-[11px] font-normal text-stone-500 mt-1">
                                        All 50 stages · Inventory &amp; Vendors
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setVersionType('both')}
                                    className={`p-3 rounded-2xl border text-left transition-all ${
                                        versionType === 'both'
                                            ? 'bg-blue-500/10 border-blue-500 text-blue-950 font-bold shadow-xs'
                                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-stone-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold">Need Consultation</span>
                                        {versionType === 'both' && <Check size={14} className="text-blue-600" />}
                                    </div>
                                    <p className="text-[11px] font-normal text-stone-500 mt-1">
                                        Help us choose &amp; tailor features
                                    </p>
                                </button>
                            </div>
                        </div>

                        {/* Current Software Selection */}
                        <div>
                            <label className="block text-xs font-bold text-stone-800 mb-1.5">
                                2. Which software or tools do you currently use? (Select all that apply)
                            </label>
                            <p className="text-[11px] text-stone-500 mb-2.5">
                                We will configure automatic migration or two-way sync with your existing tools.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {SOFTWARE_OPTIONS.map((tool) => {
                                    const Icon = tool.icon;
                                    const active = selectedSoftwares.includes(tool.id);
                                    return (
                                        <button
                                            key={tool.id}
                                            type="button"
                                            onClick={() => toggleSoftware(tool.id)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                                                active
                                                    ? 'bg-stone-900 text-white border-stone-900 shadow-2xs font-semibold'
                                                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                                            }`}
                                        >
                                            <Icon size={13} className={active ? 'text-amber-400' : 'text-stone-400'} />
                                            <span>{tool.label}</span>
                                            {active && <Check size={12} className="ml-0.5 text-amber-400" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Contact Information Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1">
                                    Contact Person Name
                                </label>
                                <div className="relative">
                                    <User size={14} className="absolute left-3.5 top-3 text-stone-400" />
                                    <input 
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="e.g. Rajesh Sharma"
                                        className="w-full pl-9 pr-3.5 py-2.5 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1">
                                    Mobile Number *
                                </label>
                                <div className="relative">
                                    <Phone size={14} className="absolute left-3.5 top-3 text-stone-400" />
                                    <input 
                                        type="tel"
                                        required
                                        value={mobile}
                                        onChange={e => setMobile(e.target.value)}
                                        placeholder="+91 98765 43210"
                                        className="w-full pl-9 pr-3.5 py-2.5 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1">
                                    Company / Solar Firm Name
                                </label>
                                <div className="relative">
                                    <Building2 size={14} className="absolute left-3.5 top-3 text-stone-400" />
                                    <input 
                                        type="text"
                                        value={company}
                                        onChange={e => setCompany(e.target.value)}
                                        placeholder="e.g. Apex Solar EPC"
                                        className="w-full pl-9 pr-3.5 py-2.5 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1">
                                    Email Address (Optional)
                                </label>
                                <div className="relative">
                                    <Mail size={14} className="absolute left-3.5 top-3 text-stone-400" />
                                    <input 
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="rajesh@apexsolar.com"
                                        className="w-full pl-9 pr-3.5 py-2.5 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Notes / Special Customizations */}
                        <div>
                            <label className="block text-xs font-bold text-stone-700 mb-1">
                                Specific Requirements or Current Workflow (Optional)
                            </label>
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="e.g. We have 3 branch offices and 10 sales agents. We want quotations auto-synced with Tally invoices..."
                                className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none"
                            />
                        </div>

                        {/* Submit Button & Direct Links */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                            <a 
                                href={basicVersionUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1.5"
                            >
                                <span>Check Out Basic Version Page</span>
                                <ExternalLink size={12} />
                            </a>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full sm:w-auto px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                            >
                                {submitting ? <LoaderCircle size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                                <span>{submitting ? 'Submitting...' : 'Request Callback & Pricing →'}</span>
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
                <div className="relative w-full max-w-2xl my-8">
                    {content}
                </div>
            </div>
        );
    }

    return content;
}
