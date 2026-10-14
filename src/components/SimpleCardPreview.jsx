import { useState } from 'react';
import { X, LayoutDashboard, IndianRupee, CheckSquare, History, MapPin, FolderOpen, User, Zap, Landmark, Check } from 'lucide-react';
import { SIMPLE_CARD } from '../pricing/packages';

// Read-only, clickable copy of the original basic CRM customer card
// (same 4 tabs, sections, fields and checklist), filled with demo data.
const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'finance', label: 'Finance & Bank', icon: IndianRupee },
  { id: 'checklist', label: 'Checklist', icon: CheckSquare },
  { id: 'history', label: 'Notes & History', icon: History },
];
const ICONS = { User, Zap, FolderOpen, IndianRupee, Landmark };

function Section({ s }) {
  const Icon = ICONS[s.icon] || User;
  return (
    <div className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-400"><Icon size={12}/> {s.title}</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {s.fields.map(([k, v]) => <div key={k}><dt className="text-[10px] font-semibold text-stone-400">{k}</dt><dd className="text-xs font-bold text-stone-800 break-words">{v}</dd></div>)}
      </dl>
    </div>
  );
}

export default function SimpleCardPreview({ onClose }) {
  const [tab, setTab] = useState('overview');
  const c = SIMPLE_CARD;
  const done = c.checklist.flatMap(s => s.items).filter(i => i.done).length;
  const total = c.checklist.flatMap(s => s.items).length;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-stone-950/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Simple customer card preview" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-[#FCFBFA] shadow-2xl sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="bg-stone-900 px-5 pt-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Simple card · sample customer</span>
              <h2 className="text-lg font-black">{c.name}</h2>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="rounded-lg bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">{c.stage}</span>
                <span className="rounded-lg bg-white/10 px-2 py-0.5 text-[10px] font-bold text-stone-200">{c.tag}</span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-2 py-0.5 text-[10px] font-bold"><MapPin size={10}/> View maps</span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-0.5 text-[10px] font-bold"><FolderOpen size={10}/> Google Drive</span>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-1 text-white/50 hover:text-white" aria-label="Close preview"><X size={22}/></button>
          </div>
          <div className="mt-3 flex gap-4 overflow-x-auto" role="tablist">
            {TABS.map(t => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-1.5 border-b-2 py-2.5 text-[10px] font-bold uppercase tracking-widest ${tab === t.id ? 'border-amber-400 text-amber-400' : 'border-transparent text-stone-400 hover:text-stone-200'}`}>
                <t.icon size={12}/> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {tab === 'overview' && (<>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-stone-400">Primary stage</span>
                <div className="mt-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-bold text-stone-800">{c.stage}</div>
                <p className="mt-1.5 text-[10px] text-stone-400">One dropdown – {c.stages.length} stages: {c.stages.join(' → ')}</p>
              </div>
              <div className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm">
                <span className="text-[10px] font-bold uppercase text-stone-400">Payment / subsidy tag</span>
                <div className="mt-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-bold text-stone-800">{c.tag}</div>
                <p className="mt-1.5 text-[10px] text-stone-400">{c.tags.join(' · ')}</p>
              </div>
            </div>
            {c.overview.map(s => <Section key={s.title} s={s}/>)}
          </>)}
          {tab === 'finance' && c.finance.map(s => <Section key={s.title} s={s}/>)}
          {tab === 'checklist' && (<>
            <div className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-sm font-bold text-stone-800"><span>Installation progress</span><span>{done}/{total}</span></div>
              <div className="mt-2 h-2 rounded-full bg-stone-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.round(done / total * 100)}%` }}/></div>
            </div>
            {c.checklist.map(s => (
              <div key={s.section} className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm">
                <h4 className="mb-2 border-b border-stone-50 pb-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">{s.section}</h4>
                <ul className="space-y-1.5">{s.items.map(i => (
                  <li key={i.label} className="flex gap-2 text-xs text-stone-700">
                    <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${i.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-stone-300'}`}>{i.done && <Check size={11}/>}</span>
                    <span className={i.done ? 'text-stone-400 line-through' : ''}>{i.label}</span>
                  </li>))}
                </ul>
              </div>
            ))}
          </>)}
          {tab === 'history' && (
            <div className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-stone-400">Activity notes</h3>
              <ol className="space-y-3">{c.notes.map(n => (
                <li key={n.text} className="border-l-2 border-amber-300 pl-3"><p className="text-xs text-stone-800">{n.text}</p><p className="text-[10px] text-stone-400">{n.by} · {n.date}</p></li>
              ))}</ol>
            </div>
          )}
        </div>
        <p className="border-t border-stone-100 bg-white px-5 py-2.5 text-center text-[11px] text-stone-500">Sample data. Fields, stages and checklist items are changed to match your business.</p>
      </div>
    </div>
  );
}
