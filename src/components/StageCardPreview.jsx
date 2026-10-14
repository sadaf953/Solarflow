import { useEffect, useRef, useState } from 'react';
import { X, Check, ChevronDown } from 'lucide-react';
import { STAGE_CARD } from '../pricing/packages';

// Read-only copy of the Stage-by-stage customer card: every stage of one customer
// in one scroll, the current stage open. Real stages and fields from the app, demo data.
export default function StageCardPreview({ onClose }) {
  const c = STAGE_CARD;
  const stages = c.stages;
  const currentIdx = stages.findIndex(s => s.id === c.current);
  const [open, setOpen] = useState(c.current);
  const refs = useRef({});
  const jump = id => { setOpen(id); setTimeout(() => refs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0); };
  useEffect(() => { const t = setTimeout(() => refs.current[c.current]?.scrollIntoView({ block: 'start' }), 50); return () => clearTimeout(t); }, [c]);
  const state = (s, i) => s.skip ? 'skip' : i < currentIdx ? 'done' : i === currentIdx ? 'now' : 'next';
  const shown = stages.filter(s => !s.skip).length;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-stone-950/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Stage-by-stage card preview" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-[#FCFBFA] shadow-2xl sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="bg-stone-900 px-5 pb-3 pt-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Stage-by-stage card · sample customer</span>
              <h2 className="text-lg font-black">{c.name}</h2>
              <p className="mt-0.5 text-xs text-stone-300">Now at <strong className="text-amber-300">{c.current}</strong> · stage {stages.filter(s => !s.skip).findIndex(s => s.id === c.current) + 1} of {shown} · {c.payment} customer</p>
            </div>
            <button type="button" onClick={onClose} className="p-1 text-white/50 hover:text-white" aria-label="Close preview"><X size={22}/></button>
          </div>
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" aria-label="Stages">
            {stages.map((s, i) => { const st = state(s, i); if (st === 'skip') return null; return (
              <button key={s.id} type="button" onClick={() => jump(s.id)} className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${open === s.id ? 'bg-amber-400 text-stone-950' : st === 'done' ? 'bg-emerald-500/20 text-emerald-300' : st === 'now' ? 'bg-white/15 text-amber-300' : 'bg-white/5 text-stone-400'}`}>
                {st === 'done' && <Check size={11}/>}{s.id}
              </button>
            ); })}
          </div>
        </div>

        <ol className="flex-1 space-y-2 overflow-y-auto p-4 sm:p-5">
          {stages.map((s, i) => {
            const st = state(s, i); const isOpen = open === s.id;
            return (
              <li key={s.id} ref={el => { refs.current[s.id] = el; }} className={`scroll-mt-2 rounded-2xl border bg-white shadow-sm ${st === 'now' ? 'border-amber-400' : 'border-stone-100'} ${st === 'skip' ? 'opacity-60' : ''}`}>
                <button type="button" onClick={() => setOpen(isOpen ? '' : s.id)} aria-expanded={isOpen} className="flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left">
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-black ${st === 'done' ? 'bg-emerald-500 text-white' : st === 'now' ? 'bg-amber-400 text-stone-950' : 'bg-stone-100 text-stone-500'}`}>{st === 'done' ? <Check size={13}/> : st === 'skip' ? '–' : stages.slice(0, i + 1).filter(x => !x.skip).length}</span>
                  <span className="flex-1">
                    <strong className="block text-sm text-stone-900">{s.id}</strong>
                    <span className="text-[11px] text-stone-500">{st === 'skip' ? 'Only for cash customers – skipped for this loan customer' : `Filled by ${s.who}`}{st === 'now' ? ' · in progress' : st === 'done' ? ' · done' : ''}</span>
                  </span>
                  <ChevronDown size={16} className={`shrink-0 text-stone-400 transition ${isOpen ? 'rotate-180' : ''}`}/>
                </button>
                {isOpen && (
                  <div className="border-t border-stone-100 px-4 pb-4 pt-3">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                      {s.fields.map(([k, v]) => <div key={k}><dt className="text-[10px] font-semibold text-stone-400">{k}</dt><dd className="break-words text-xs font-bold text-stone-800">{v}</dd></div>)}
                    </dl>
                    <p className="mt-3 rounded-xl bg-stone-50 px-3 py-2 text-[11px] text-stone-600"><strong className="text-stone-800">To move to the next stage:</strong> {s.needs.join(' · ')}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <p className="border-t border-stone-100 bg-white px-5 py-2.5 text-center text-[11px] text-stone-500">Sample data. Stage names, fields and who fills them are changed to match your business.</p>
      </div>
    </div>
  );
}
