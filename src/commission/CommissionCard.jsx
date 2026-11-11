import { useEffect, useMemo, useState } from 'react';
import { IndianRupee, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';
import { COMMISSION_PER_KWP } from '../constants';
import { summarizeCommission, commissionByDealer, formatRupees } from './partnerCommission';

const PAGE = 20;

function StatusDot({ status }) {
    return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${status === 'earned' ? 'bg-emerald-500' : 'bg-amber-400'}`} aria-hidden />;
}

// "My commission" card: total, earned vs pending, and a per-customer list.
// `rows` are the customers already loaded for this login.
export function CommissionCard({ rows, loading = false, title = 'My commission', onOpenCustomer, showDealer = false, dealerGroups = null, className = '' }) {
    const summary = useMemo(() => summarizeCommission(rows), [rows]);
    const [open, setOpen] = useState(false);
    const [shown, setShown] = useState(PAGE);
    const earnedShare = summary.total ? Math.round((summary.earned / summary.total) * 100) : 0;

    return (
        <section className={`rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm ${className}`} aria-label={title}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="flex items-center gap-2 text-xs font-black text-stone-900">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><IndianRupee size={14} /></span>
                        {title}
                    </p>
                    <p className="mt-3 text-3xl font-black tracking-tight text-stone-900" data-testid="commission-total">
                        {loading ? '…' : formatRupees(summary.total)}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-stone-500">
                        {summary.count} project{summary.count === 1 ? '' : 's'} · {summary.kwp} kWp
                    </p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Earned</p>
                    <p className="mt-0.5 text-lg font-black text-emerald-800">{formatRupees(summary.earned)}</p>
                    <p className="text-[10px] font-semibold text-emerald-700/80">{summary.earnedCount} installed</p>
                </div>
                <div className="rounded-xl bg-amber-50 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Pending</p>
                    <p className="mt-0.5 text-lg font-black text-amber-800">{formatRupees(summary.pending)}</p>
                    <p className="text-[10px] font-semibold text-amber-700/80">{summary.pendingCount} in progress</p>
                </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-amber-100" role="img" aria-label={`${earnedShare}% earned`}>
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${earnedShare}%` }} />
            </div>
            <p className="mt-2 text-[10px] font-medium leading-relaxed text-stone-400">
                {formatRupees(COMMISSION_PER_KWP)} per kWp. Earned once panels are installed; leads and lost projects are not counted.
            </p>

            {dealerGroups && dealerGroups.length > 0 && (
                <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">By dealer</p>
                    {dealerGroups.slice(0, 8).map(g => (
                        <div key={g.name} className="flex items-center justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2 text-xs">
                            <span className="min-w-0 truncate font-bold text-stone-700">{g.name} <span className="font-semibold text-stone-400">· {g.count}</span></span>
                            <span className="shrink-0 font-black text-stone-900">{formatRupees(g.total)}</span>
                        </div>
                    ))}
                </div>
            )}

            {summary.count > 0 && (
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    aria-expanded={open}
                    className="mt-3 flex w-full items-center justify-between rounded-xl border border-stone-200 px-3 py-2.5 text-xs font-black text-stone-800 transition hover:border-stone-300 hover:bg-stone-50 cursor-pointer"
                >
                    Commission per customer ({summary.count})
                    {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
            )}

            {open && (
                <ul className="mt-2 divide-y divide-stone-100" data-testid="commission-list">
                    {summary.projects.slice(0, shown).map(p => {
                        const Row = onOpenCustomer ? 'button' : 'div';
                        return (
                            <li key={p.id ?? `${p.name}-${p.stage}`}>
                                <Row
                                    {...(onOpenCustomer ? { type: 'button', onClick: () => onOpenCustomer(p.record) } : {})}
                                    className={`flex w-full items-center gap-3 py-2.5 text-left ${onOpenCustomer ? 'cursor-pointer hover:bg-stone-50' : ''}`}
                                >
                                    <StatusDot status={p.status} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-xs font-black text-stone-900">{p.name}</span>
                                        <span className="mt-0.5 block truncate text-[10px] font-semibold text-stone-400">
                                            {p.stageLabel} · {p.kwp || 3.5} kWp{showDealer && p.dealer ? ` · ${p.dealer}` : ''}
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-right">
                                        <span className="block text-xs font-black text-stone-900">{formatRupees(p.amount)}</span>
                                        <span className={`block text-[9px] font-bold uppercase ${p.status === 'earned' ? 'text-emerald-600' : 'text-amber-600'}`}>{p.status}</span>
                                    </span>
                                    {onOpenCustomer && <ChevronRight size={14} className="shrink-0 text-stone-300" />}
                                </Row>
                            </li>
                        );
                    })}
                    {shown < summary.count && (
                        <li className="pt-2">
                            <button type="button" onClick={() => setShown(n => n + PAGE * 5)} className="w-full rounded-xl bg-stone-100 py-2 text-[11px] font-bold text-stone-600 hover:bg-stone-200 cursor-pointer">
                                Show more ({summary.count - shown} left)
                            </button>
                        </li>
                    )}
                </ul>
            )}
        </section>
    );
}

// Partner office dashboard: loads its own customers (office + dealers) and
// shows the same card, split by dealer. The scoped cpo_leads view comes first;
// when it has nothing (customers not linked to the office's login tree, as in
// the shared demo) it falls back to the partner-name match the partner portal
// uses: channel_partner = office name covers the office and all its dealers.
const COMMISSION_COLUMNS = 'id, customer_name, stage, system_capacity_kwp, sub_channel_partner, channel_partner';

async function loadAll(buildQuery) {
    let all = [];
    for (let from = 0; ; from += 1000) {
        const { data, error } = await buildQuery().range(from, from + 999);
        if (error) { console.error('Commission load failed:', error); break; }
        all = all.concat(data || []);
        if (!data || data.length < 1000) break;
    }
    return all;
}

export function PartnerOfficeCommission({ partnerName = '', dealerFilter = '', onOpenCustomer }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            const dealer = dealerFilter.trim();
            const scoped = table => {
                let q = supabase.from(table).select(COMMISSION_COLUMNS).is('deleted_at', null);
                if (dealer) q = q.ilike('sub_channel_partner', dealer);
                return q;
            };
            let all = await loadAll(() => scoped('cpo_leads'));
            if (all.length === 0 && partnerName.trim()) {
                all = await loadAll(() => scoped('admin').ilike('channel_partner', partnerName.trim()));
            }
            if (!cancelled) { setRows(all); setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, [dealerFilter, partnerName]);

    const groups = useMemo(() => (dealerFilter.trim() ? null : commissionByDealer(rows)), [rows, dealerFilter]);
    return (
        <CommissionCard
            rows={rows}
            loading={loading}
            title={dealerFilter.trim() ? `Commission · ${dealerFilter.trim()}` : 'Office & dealer commission'}
            showDealer
            dealerGroups={groups}
            onOpenCustomer={onOpenCustomer}
            className="mb-4"
        />
    );
}
