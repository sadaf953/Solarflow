import { X, ExternalLink } from 'lucide-react';
import { SAMPLE_DOCS } from '../pricing/packages';

const base = import.meta.env.BASE_URL;
// Shows the sample pages of one or more documents (demo data) with Keep / Remove.
export default function DocPreview({ title, docIds, included, onKeep, onRemove, onClose }) {
  const docs = docIds.map(id => SAMPLE_DOCS.find(d => d.id === id)).filter(Boolean);
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-stone-950/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`${title} sample`} onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-stone-100 shadow-2xl sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 bg-white px-5 py-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-700">Sample · demo data</span>
            <h2 className="text-lg font-black text-stone-900">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-stone-400 hover:text-stone-900" aria-label="Close"><X size={22}/></button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-3 sm:p-5">
          {docs.map(d => (
            <section key={d.id}>
              {docs.length > 1 && <h3 className="mb-1 text-sm font-black text-stone-900">{d.name}</h3>}
              <p className="mb-2 text-xs text-stone-600">{d.what} <a href={`${base}samples/${d.file}.pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-bold text-orange-700 underline">Open PDF <ExternalLink size={11}/></a></p>
              <div className="space-y-2">
                {Array.from({ length: d.pages || 1 }, (_, i) => (
                  <img key={i} src={`${base}samples/pages/${d.file}-${i + 1}.jpg`} alt={`${d.name} – page ${i + 1}`} loading="lazy" className="w-full rounded-lg border border-stone-200 bg-white shadow-sm"/>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-stone-200 bg-white p-3">
          <button type="button" onClick={() => { onRemove(); onClose(); }} className={`min-h-12 rounded-xl border-2 text-sm font-black ${included ? 'border-stone-300 text-stone-700' : 'border-stone-900 bg-stone-900 text-white'}`}>{included ? 'Remove it' : 'Not needed ✓'}</button>
          <button type="button" onClick={() => { onKeep(); onClose(); }} className={`min-h-12 rounded-xl text-sm font-black ${included ? 'bg-emerald-600 text-white' : 'sf-btn-primary'}`}>{included ? 'Keep it ✓' : 'Add it'}</button>
        </div>
      </div>
    </div>
  );
}
