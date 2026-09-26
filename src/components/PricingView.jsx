// src/components/PricingView.jsx
// Pricing & Custom Plans Comparison Page
// Demonstrates Base Model (Lifetime All-Time Buy), Mid-Tier (Google Drive), and Advanced Enterprise tiers,
// with custom modular options calculator (financial tracking, data migration, attendance, storage choices).

import { useState } from 'react';
import { 
    Check, Sparkles, Building2, HardDrive, Users, Shield, 
    ArrowRight, Calculator, FileSpreadsheet, KeyRound, CheckCircle2, 
    CalendarCheck, IndianRupee, Layers, HelpCircle, PhoneCall, Copy, MessageSquare
} from 'lucide-react';

const DOCUMENT_MAKERS = [
    'Quotation',
    'Bill / Invoice',
    'Bill of Materials (BOM)',
    'Delivery Challan / Truck Sheet',
    'DISCOM Submission',
    'Feasibility Report',
];

export default function PricingView({ currentUser }) {
    // Interactive Custom Builder State
    const [clientName, setClientName] = useState(currentUser?.name || '');
    const [companyName, setCompanyName] = useState(currentUser?.channel_partner || '');
    const [phone, setPhone] = useState(currentUser?.phone || '');
    const [loginsTier, setLoginsTier] = useState('base'); // 'base' (5-8) | 'mid' (9-20) | 'enterprise' (unlimited)
    const [storageOption, setStorageOption] = useState('checklist'); // 'checklist' | 'gdrive' | 'ultra_premium'
    const [includeFinance, setIncludeFinance] = useState(true);
    const [includeAttendance, setIncludeAttendance] = useState(false);
    const [includeInventory, setIncludeInventory] = useState(true);
    const [includePartners, setIncludePartners] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [copied, setCopied] = useState(false);
    const selectedModuleCount = [includeFinance, includeAttendance, includeInventory, includePartners].filter(Boolean).length;

    const chooseTier = (tier) => {
        setLoginsTier(tier);
        if (tier === 'base' && selectedModuleCount > 2) {
            setIncludeFinance(true);
            setIncludeAttendance(false);
            setIncludeInventory(true);
            setIncludePartners(false);
        }
    };

    const toggleModule = (enabled, setter) => {
        if (!enabled && loginsTier === 'base' && selectedModuleCount >= 2) return;
        setter(!enabled);
    };

    const handleCopySpec = () => {
        const specSummary = `
SolarFlow Custom CRM Deployment Specification
----------------------------------------------
Client Name: ${clientName || 'Not specified'}
Company: ${companyName || 'Not specified'}
Phone: ${phone || 'Not specified'}

Selected Configuration:
• Logins: ${loginsTier === 'base' ? 'Foundation (5 to 8 users - Admin and Office access)' : loginsTier === 'mid' ? 'Growth Tier (9 to 20 users)' : 'Enterprise Tier (Unlimited Team Logins)'}
• Workflow: Custom stages, client entry and checklist tracking
• Exports: Daily CSV plus month-wise, year-wise and custom date-range exports
• Document Maker Options: Quotation, bill, BOM, delivery challan, DISCOM submission and feasibility documents
• File Storage Architecture: ${storageOption === 'checklist' ? 'Simple Checklist Mode (Zero cloud storage bills)' : storageOption === 'gdrive' ? 'Google Drive / Google One Integration (Pay Google directly ~₹130/mo)' : 'Ultra-Premium Built-in High Speed Cloud Storage'}
• Financial & Subsidy Tracking: ${includeFinance ? 'YES' : 'NO'}
• Staff Attendance & Holiday Approval: ${includeAttendance ? 'YES' : 'NO'}
• Inventory & Delivery Operations: ${includeInventory ? 'YES' : 'NO'}
• Channel Partner & Dealer Portals: ${includePartners ? 'YES' : 'NO'}
• Deployment Mode: Lifetime All-Time Buy / Perpetual Setup
        `.trim();

        navigator.clipboard.writeText(specSummary);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
        handleCopySpec();
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10 py-4 pb-16 animate-in fade-in duration-300">
            {/* Header */}
            <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Custom-Built Lifetime Deployments · No Per-User Monthly Penalties
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
                    SolarFlow Editions &amp; Modular Customization
                </h1>
                <p className="text-sm sm:text-base text-stone-600 max-w-2xl mx-auto leading-relaxed">
                    Solar companies range from lean regional EPCs to statewide multi-branch channel networks. 
                    Choose a lifetime base foundation or tailor exactly the modules and storage you need.
                </p>
            </div>

            {/* 3 Core Tier Comparison Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {/* 1. Base Model */}
                <div className="bg-white rounded-3xl border border-stone-200 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
                                Base Model
                            </span>
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                Lifetime All-Time Buy
                            </span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-stone-900">Admin + Office Foundation</h2>
                            <p className="text-xs text-stone-500 mt-1">Clean, lean start for companies that want simplicity without ongoing fees.</p>
                        </div>

                        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
                            <p className="text-xs font-bold text-stone-800">5 to 8 Team Users</p>
                            <p className="text-[11px] text-stone-500">Two access types: Admin and Office / Sales.</p>
                        </div>

                        <div className="space-y-2.5 text-xs text-stone-700 pt-2">
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span><strong>Custom Workflow:</strong> use the 16-stage solar flow or tailor the stages to the company</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span><strong>Simple Checklist Mode:</strong> 1-click verify required items without file storage overhead</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span><strong>Client Management:</strong> add clients, update progress and keep every project searchable</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span><strong>Flexible Exports:</strong> daily CSV plus month, year and custom date-range downloads</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span><strong>Document Maker Options:</strong> add quotation, bill, BOM, delivery challan, DISCOM submission or feasibility makers</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span><strong>Google Drive Links:</strong> link each client to their existing Drive folder without duplicating storage</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span><strong>Choose 2 Operational Modules:</strong> finance, inventory, partner portals or attendance</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span><strong>Perpetual Ownership:</strong> One-time setup, zero monthly subscription</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-stone-100">
                        <button
                            type="button"
                            onClick={() => { chooseTier('base'); setStorageOption('checklist'); }}
                            className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                            Select Base Spec
                        </button>
                    </div>
                </div>

                {/* 2. Mid Tier (Featured) */}
                <div className="bg-stone-900 text-white rounded-3xl p-6 flex flex-col justify-between shadow-xl ring-2 ring-amber-500 relative transform lg:-translate-y-2">
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-stone-950 px-3.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                        Most Popular for EPCs
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 bg-white/10 px-2.5 py-1 rounded-lg">
                                Growth Edition
                            </span>
                            <span className="text-xs font-bold text-stone-300">
                                Google Drive Connected
                            </span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Multi-Role + Drive Integration</h2>
                            <p className="text-xs text-stone-300 mt-1">Full team collaboration using your own affordable Google storage.</p>
                        </div>

                        <div className="p-3 bg-white/10 rounded-2xl border border-white/10 space-y-1">
                            <p className="text-xs font-bold text-amber-300">9 to 20 Logins</p>
                            <p className="text-[11px] text-stone-300">Admin, Office, Manager, Dealers &amp; Field Agents.</p>
                        </div>

                        <div className="space-y-2.5 text-xs text-stone-200 pt-2">
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <span><strong>Everything in Base Model</strong> plus advanced logistics</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <span><strong>Google Drive / Google One Integration:</strong> Store documents directly in client’s Google account</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <span><strong>Direct Google Cost:</strong> Pay Google directly (~₹130/mo for 100GB or ~$6/mo for Google Workspace Enterprise) — no CRM markup!</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <span><strong>Channel Partner &amp; Dealer Portals:</strong> Scoped visibility so partners only see their clients</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <span><strong>Inventory &amp; Stock Management:</strong> Daily stock logs, BOM, and delivery batches</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => { chooseTier('mid'); setStorageOption('gdrive'); }}
                            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                            Select Mid-Tier Spec
                        </button>
                    </div>
                </div>

                {/* 3. Advanced / Enterprise */}
                <div className="bg-white rounded-3xl border border-stone-200 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow relative">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                                Enterprise Edition
                            </span>
                            <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg">
                                Ultra-Premium Stack
                            </span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-stone-900">Full Enterprise Solar Suite</h2>
                            <p className="text-xs text-stone-500 mt-1">Complete operation with financial ledgers, staff attendance &amp; high-speed cloud storage.</p>
                        </div>

                        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 space-y-1">
                            <p className="text-xs font-bold text-stone-800">Unlimited Team Logins</p>
                            <p className="text-[11px] text-stone-500">All departments: Vendors, Stamp Makers, Technicians, CPO.</p>
                        </div>

                        <div className="space-y-2.5 text-xs text-stone-700 pt-2">
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                                <span><strong>Ultra-Premium High-Speed File Storage:</strong> CDN-accelerated, geotagged photo capture &amp; in-browser document previews</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                                <span><strong>Financial &amp; Subsidy Tracking:</strong> Loan disbursements, bank sanctions, customer cash flow</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                                <span><strong>Staff Attendance &amp; Holiday Approvals:</strong> Self-mark check-in with 1-click Admin approvals</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                                <span><strong>Vendor &amp; Installation Payments:</strong> Rate per watt ledgers, TDS, and balance settlement</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Check className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                                <span><strong>White-Glove Data Migration:</strong> Complete import of your existing historical spreadsheets</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-stone-100">
                        <button
                            type="button"
                            onClick={() => { chooseTier('enterprise'); setStorageOption('ultra_premium'); setIncludeInventory(true); }}
                            className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                            Select Enterprise Spec
                        </button>
                    </div>
                </div>
            </div>

            {/* Storage Architecture Comparison Callout */}
            <div className="bg-amber-50/60 rounded-3xl border border-amber-200/70 p-6 md:p-8 space-y-4">
                <div className="flex items-center gap-3">
                    <HardDrive className="w-6 h-6 text-amber-600 shrink-0" />
                    <div>
                        <h3 className="text-base font-bold text-stone-900">Transparent Storage Economics: Why SolarFlow Saves You Lakhs</h3>
                        <p className="text-xs text-stone-600">Traditional CRMs charge ₹500–₹1,500/user/month just for document hosting. We give you three cost-saving choices:</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="bg-white p-4 rounded-2xl border border-stone-200/80 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">Option 1: Checklist Mode</span>
                        <p className="text-xs font-bold text-stone-900">₹0 / month (Zero Storage Cost)</p>
                        <p className="text-[11px] text-stone-500 leading-relaxed">
                            Ideal for teams that only track stage checklist milestones (Aadhaar verified, Electricity Bill verified) without storing actual heavy PDFs on the server.
                        </p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-stone-200/80 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 bg-sky-50 px-2 py-0.5 rounded">Option 2: Google Drive / Workspace</span>
                        <p className="text-xs font-bold text-stone-900">~₹130/mo or $6/mo (Paid directly to Google)</p>
                        <p className="text-[11px] text-stone-500 leading-relaxed">
                            SolarFlow integrates with your existing Google One / Google Workspace Enterprise. You pay Google standard consumer/enterprise rates directly. Zero CRM markup.
                        </p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-stone-200/80 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 bg-purple-50 px-2 py-0.5 rounded">Option 3: Ultra-Premium Built-in</span>
                        <p className="text-xs font-bold text-stone-900">High-Performance Managed S3 / Supabase</p>
                        <p className="text-[11px] text-stone-500 leading-relaxed">
                            High-volume photo storage with automated geo-tag watermarking, instant in-app previews, DISCOM export bundles, and military-grade encryption.
                        </p>
                    </div>
                </div>
            </div>

            {/* Custom Interactive Specification Builder */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-5">
                    <div>
                        <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-amber-500" />
                            Build Your Custom Spec &amp; Inquiry
                        </h2>
                        <p className="text-xs text-stone-500">Select only what your team needs. We prepare a tailored deployment proposal.</p>
                    </div>
                    {copied && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl animate-in fade-in">
                            ✓ Copied to clipboard!
                        </span>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Contact Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold text-stone-700 block mb-1">Your Name</label>
                            <input
                                type="text"
                                required
                                value={clientName}
                                onChange={e => setClientName(e.target.value)}
                                placeholder="e.g. Ramesh Patel"
                                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-stone-700 block mb-1">Company / Solar Business</label>
                            <input
                                type="text"
                                required
                                value={companyName}
                                onChange={e => setCompanyName(e.target.value)}
                                placeholder="e.g. SunPower EPC Gujarat"
                                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-stone-700 block mb-1">WhatsApp / Phone</label>
                            <input
                                type="tel"
                                required
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="e.g. +91 98250 12345"
                                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                        </div>
                    </div>

                    {/* Team Logins Scope */}
                    <div>
                        <label className="text-xs font-bold text-stone-700 block mb-2">Team Logins &amp; Roles Required</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => chooseTier('base')}
                                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                                    loginsTier === 'base'
                                        ? 'border-amber-500 bg-amber-50/60 ring-1 ring-amber-500 text-stone-900'
                                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                                }`}
                            >
                                <p className="text-xs font-black">Foundation (5-8 Users)</p>
                                <p className="text-[11px] text-stone-500 mt-0.5">Admin + Office access types</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => chooseTier('mid')}
                                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                                    loginsTier === 'mid'
                                        ? 'border-amber-500 bg-amber-50/60 ring-1 ring-amber-500 text-stone-900'
                                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                                }`}
                            >
                                <p className="text-xs font-black">Growth (9-20 Users)</p>
                                <p className="text-[11px] text-stone-500 mt-0.5">Admin, Office, Manager, Dealers</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => chooseTier('enterprise')}
                                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                                    loginsTier === 'enterprise'
                                        ? 'border-amber-500 bg-amber-50/60 ring-1 ring-amber-500 text-stone-900'
                                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                                }`}
                            >
                                <p className="text-xs font-black">Enterprise (Unlimited)</p>
                                <p className="text-[11px] text-stone-500 mt-0.5">All team roles, vendors, agents</p>
                            </button>
                        </div>
                    </div>

                    {/* Document generator options */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                            <label className="text-xs font-bold text-stone-700">Document Maker Options</label>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {DOCUMENT_MAKERS.map(name => (
                                <div key={name} className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
                                    <FileSpreadsheet className="w-4 h-4 text-amber-600 shrink-0" />
                                    <span className="text-[11px] font-semibold text-stone-700">{name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* File Storage Preference */}
                    <div>
                        <label className="text-xs font-bold text-stone-700 block mb-2">Document &amp; File Storage Choice</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button
                                type="button"
                                onClick={() => setStorageOption('checklist')}
                                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                                    storageOption === 'checklist'
                                        ? 'border-amber-500 bg-amber-50/60 ring-1 ring-amber-500 text-stone-900'
                                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                                }`}
                            >
                                <p className="text-xs font-black">✓ Simple Checklist</p>
                                <p className="text-[11px] text-stone-500 mt-0.5">Zero storage bills, milestone tracking</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setStorageOption('gdrive')}
                                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                                    storageOption === 'gdrive'
                                        ? 'border-amber-500 bg-amber-50/60 ring-1 ring-amber-500 text-stone-900'
                                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                                }`}
                            >
                                <p className="text-xs font-black">📁 Google Drive / Workspace</p>
                                <p className="text-[11px] text-stone-500 mt-0.5">Direct to client Drive, ~₹130/mo</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setStorageOption('ultra_premium')}
                                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                                    storageOption === 'ultra_premium'
                                        ? 'border-amber-500 bg-amber-50/60 ring-1 ring-amber-500 text-stone-900'
                                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                                }`}
                            >
                                <p className="text-xs font-black">⚡ Ultra-Premium Cloud</p>
                                <p className="text-[11px] text-stone-500 mt-0.5">Dedicated S3/Supabase CDN</p>
                            </button>
                        </div>
                    </div>

                    {/* Modular Options Checklist */}
                    <div>
                        <div className="flex flex-wrap items-end justify-between gap-2 mb-2">
                            <label className="text-xs font-bold text-stone-700">Operational Module Basket</label>
                            <span className="text-[11px] text-stone-500">Foundation includes any 2 modules</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${includeFinance ? 'bg-amber-50/50 border-amber-300' : 'bg-stone-50 border-stone-200'}`}>
                                <input
                                    type="checkbox"
                                    checked={includeFinance}
                                    onChange={() => toggleModule(includeFinance, setIncludeFinance)}
                                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                                />
                                <div>
                                    <p className="text-xs font-bold text-stone-900">Financial Tracking &amp; Payment Ledgers</p>
                                    <p className="text-[11px] text-stone-500">Stage payments, loan status, customer receipts</p>
                                </div>
                            </label>

                            <label className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${includeAttendance ? 'bg-amber-50/50 border-amber-300' : 'bg-stone-50 border-stone-200'}`}>
                                <input
                                    type="checkbox"
                                    checked={includeAttendance}
                                    onChange={() => toggleModule(includeAttendance, setIncludeAttendance)}
                                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                                />
                                <div>
                                    <p className="text-xs font-bold text-stone-900">Staff Attendance &amp; Holiday Approval</p>
                                    <p className="text-[11px] text-stone-500">Self-mark checkin, leave requests &amp; admin approval</p>
                                </div>
                            </label>

                            <label className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${includeInventory ? 'bg-amber-50/50 border-amber-300' : 'bg-stone-50 border-stone-200'}`}>
                                <input
                                    type="checkbox"
                                    checked={includeInventory}
                                    onChange={() => toggleModule(includeInventory, setIncludeInventory)}
                                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                                />
                                <div>
                                    <p className="text-xs font-bold text-stone-900">Inventory &amp; Delivery Operations</p>
                                    <p className="text-[11px] text-stone-500">Stock, BOM requirements and delivery batches</p>
                                </div>
                            </label>

                            <label className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${includePartners ? 'bg-amber-50/50 border-amber-300' : 'bg-stone-50 border-stone-200'}`}>
                                <input
                                    type="checkbox"
                                    checked={includePartners}
                                    onChange={() => toggleModule(includePartners, setIncludePartners)}
                                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                                />
                                <div>
                                    <p className="text-xs font-bold text-stone-900">Channel Partner &amp; Dealer Portals</p>
                                    <p className="text-[11px] text-stone-500">Scoped logins for external franchise / dealers</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Specification Summary & Action */}
                    <div className="p-4 bg-stone-900 text-white rounded-2xl space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Custom Deployment Summary</h4>
                                <p className="text-xs text-stone-300">
                                    {clientName || 'Partner'} · {companyName || 'Solar Business'} · {loginsTier === 'base' ? 'Base Foundation' : loginsTier === 'mid' ? 'Growth Edition' : 'Enterprise'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleCopySpec}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>{copied ? 'Copied' : 'Copy Spec'}</span>
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>Submit Inquiry</span>
                                </button>
                            </div>
                        </div>

                        {submitted && (
                            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Thank you {clientName}! Your tailored spec has been recorded and copied to your clipboard. An implementation engineer will reach out at {phone || 'your phone'}.</span>
                            </div>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
