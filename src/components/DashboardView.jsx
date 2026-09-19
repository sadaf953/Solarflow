import { useMemo, useState } from 'react';
// ─── DashboardView.jsx ────────────────────────────────────────────────────────
// Metrics overview: project counts, financial summary, stage pipeline bar chart.
// • "Total" = all non-deleted records
// • "Live"  = non-deleted AND stage !== 'Completed'
// • "Completed" = stage === 'Completed' (non-deleted)
// Numbers use Indian locale (₹1,00,000)
// ──────────────────────────────────────────────────────────────────────────────

import { FolderOpen, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { PRIMARY_STAGES } from '../constants';
import { formatINRCompact } from '../utils';
import CustomizationEnquiryForm from './CustomizationEnquiryForm';

const fmtLakh = formatINRCompact;

const MetricBox = ({ label, value, sub, icon: Icon, color }) => {
    const colorMap = {
        amber:   'bg-amber-50 text-amber-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        blue:    'bg-blue-50 text-blue-600',
        rose: 'bg-rose-50 text-rose-600',
    };
    return (
        <div className="bg-white p-6 rounded-[28px] border border-stone-100 shadow-sm">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colorMap[color]}`}>
                <Icon size={16} />
            </div>
            <p className="text-2xl font-bold text-stone-800 tracking-tight">{value}</p>
            {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
            <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">{label}</p>
        </div>
    );
};

export default function DashboardView({ metrics, loading, scoped = false }) {
    const [showEnquiryModal, setShowEnquiryModal] = useState(false);
    const {
        totalProjects = 0,
        completedCount = 0,
        liveProjects = 0,
        loanCount = 0,
        cashCount = 0,
        stageCounts = {}
    } = metrics || {};

    // Loan vs Cash (memoized)
    const { loanPerc, cashPerc } = useMemo(() => {
        const totalCategorized = loanCount + cashCount;
        const loanPerc = totalCategorized > 0 ? (loanCount / totalCategorized) * 100 : 0;
        const cashPerc = totalCategorized > 0 ? (cashCount / totalCategorized) * 100 : 0;
        return { loanPerc, cashPerc };
    }, [loanCount, cashCount]);

    if (!metrics) return (
        <div className="p-20 text-center text-stone-400 font-medium italic animate-pulse">
            Calculating solar metrics...
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Customization enquiry modal and banner commented out
            {showEnquiryModal && (
                <CustomizationEnquiryForm isModal={true} onClose={() => setShowEnquiryModal(false)} />
            )}

            <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black text-base flex-shrink-0 shadow-sm">
                        ☀️
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">Customized per your business workflow</h4>
                        <p className="text-xs text-stone-600 mt-0.5">
                            Available with a clean fresh database or full historical data migration. Basic &amp; Advance versions tailored to your needs.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setShowEnquiryModal(true)}
                        className="flex-shrink-0 bg-stone-900 hover:bg-stone-800 text-amber-400 hover:text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                        <span>Custom Setup / Enquiry →</span>
                    </button>
                    <a
                        href="mailto:enquiry@deeprootsystems.in"
                        className="flex-shrink-0 text-stone-500 hover:text-stone-800 text-xs font-semibold px-2 py-1 transition-all"
                    >
                        enquiry@deeprootsystems.in
                    </a>
                </div>
            </div>
            */}

            {/* Project counts */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <MetricBox label={scoped ? "My Office & Dealers" : "Total Database"} value={totalProjects}  icon={FolderOpen}   color="blue"    sub={`${liveProjects} active records`} />
                <MetricBox label="Live Projects"  value={liveProjects}   icon={Activity}     color="amber"   sub="Excluding completed and lost" />
                <MetricBox label="Completed"      value={completedCount} icon={CheckCircle2} color="emerald" sub="Fully commissioned" />
                <MetricBox label="Lost Projects" value={metrics.lostCount ?? stageCounts['LOST PROJECT'] ?? 0} icon={XCircle} color="rose" sub="Projects marked lost" />
            </div>

            {/* Financial Analytics */}
            <div className="bg-white rounded-[32px] p-8 border border-stone-100 shadow-sm">
                <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-6">Payment Breakdown</h3>
                <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>Loan ({loanCount})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span>Cash ({cashCount})</span>
                    </div>
                </div>
                <div className="h-4 bg-stone-100 rounded-full overflow-hidden flex">
                    {loanPerc > 0 && (
                        <div
                            className="h-full bg-emerald-500 transition-all duration-500 flex items-center justify-center text-[9px] font-bold text-white"
                            style={{ width: `${loanPerc}%` }}
                        >
                            {loanPerc > 15 ? `${loanPerc.toFixed(0)}%` : ''}
                        </div>
                    )}
                    {cashPerc > 0 && (
                        <div
                            className="h-full bg-amber-500 transition-all duration-500 flex items-center justify-center text-[9px] font-bold text-white"
                            style={{ width: `${cashPerc}%` }}
                        >
                            {cashPerc > 15 ? `${cashPerc.toFixed(0)}%` : ''}
                        </div>
                    )}
                </div>
            </div>

            {/* Stage pipeline bar chart */}
            <div className="bg-white rounded-[32px] p-8 border border-stone-100 shadow-sm">
                <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-8">Operational Density (Stage Breakdown)</h3>
                <div className="space-y-5">
                    {PRIMARY_STAGES.map(stage => {
                        const count = stageCounts[stage.id] || 0;
                        const perc  = totalProjects > 0 ? (count / totalProjects) * 100 : 0;
                        return (
                            <div key={stage.id} className="group">
                                <div className="flex justify-between text-[10px] font-bold text-stone-600 mb-1.5 uppercase tracking-tight">
                                    <span className="group-hover:text-amber-600 transition-colors">{stage.label}</span>
                                    <span className="text-stone-400">{count}</span>
                                </div>
                                <div className="h-1.5 bg-stone-50 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 rounded-full ${stage.id === 'COMPLETED' ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                        style={{ width: `${perc}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
