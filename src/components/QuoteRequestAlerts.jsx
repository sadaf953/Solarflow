import { useEffect, useRef, useState } from 'react';
import { Bell, MessageCircle, Phone, X } from 'lucide-react';
import { supabase } from '../supabase';
import { listAdminEnquiries } from '../enquiries/reopen';

// Admin: shows new quote requests from the pricing page and pops up when one arrives.
// Keep this page open (Admin access) – it checks every minute. Uses the same admin code
// as the saved-forms list below. Email alerts are sent separately by the backend if set up.
const SEEN_KEY = 'solarflow_seen_quote_requests';
const readSeen = () => { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); } };
const isQuote = item => item.kind === 'enquiry' && /Selected option: Quote:/.test(item.notes || '');
// Every client in one list: new quote form, old enquiry form, and old forms you prepared but they haven't sent yet.
const typeOf = item => item.kind === 'prepared' ? 'sent' : isQuote(item) ? 'new' : 'old';
const TYPES = { new: 'New form', old: 'Old form', sent: 'Sent – not opened yet' };
// New-form client who confirmed their details but hasn't shared the estimate yet.
const opened = item => isQuote(item) && !/Estimated total:/.test(item.notes || '');
const BADGE = { new: 'bg-emerald-100 text-emerald-800', old: 'bg-sky-100 text-sky-800', sent: 'bg-stone-100 text-stone-600' };
const TABS = [['all', 'All'], ['new', 'New form'], ['old', 'Old form'], ['sent', 'Sent, not filled']];
const when = iso => { try { return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }); } catch { return ''; } };
const estimate = notes => (notes || '').match(/Estimated total: ([^\n;]+)/)?.[1] || '';
const refOf = notes => (notes || '').match(/Ref:? (SF-[A-Z0-9-]+)/i)?.[1] || '';
const pkgOf = notes => (notes || '').match(/Selected option: Quote: (\w+)/)?.[1] || '';

export default function QuoteRequestAlerts({ adminCode, onLocked, refreshKey = 0 }) {
  const code = adminCode;
  const [on, setOn] = useState(false);
  const [items, setItems] = useState([]);
  const [popup, setPopup] = useState([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState('');
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(30);
  const seen = useRef(readSeen());
  const first = useRef(true);

  async function check(pin) {
    try {
      const raw = await listAdminEnquiries(supabase, pin);
      // A sent form disappears from "Sent" once that client opens it (same phone number).
      const answered = new Set(raw.filter(x => x.kind === 'enquiry').map(x => x.mobile));
      const all = raw.filter(x => x.kind !== 'prepared' || !answered.has(x.mobile));
      setItems(all); setError(''); setOn(true);
      const fresh = all.filter(x => x.kind === 'enquiry' && !seen.current.has(x.id));
      if (fresh.length && !first.current) {
        setPopup(fresh);
        try { if ('Notification' in window && Notification.permission === 'granted') new Notification(`New SolarFlow client: ${fresh[0].name}`, { body: `${fresh[0].company || ''} ${estimate(fresh[0].notes)}`.trim() }); } catch { /* ignore */ }
      }
      if (first.current) { all.forEach(x => seen.current.add(x.id)); first.current = false; }
      try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen.current].slice(-500))); } catch { /* ignore */ }
    } catch (e) {
      if (/code/i.test(e.message || '')) { onLocked?.(); return; }
      setError(e.message || 'Could not load quote requests.');
    }
  }

  useEffect(() => {
    if (!on) return undefined;
    const t = setInterval(() => check(code), 60000);
    return () => clearInterval(t);
  }, [on, code]);

  useEffect(() => { if (code) check(code); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = query.trim().toLowerCase();
  const shown = items.filter(x => (tab === 'all' || typeOf(x) === tab)
    && (!q || [x.name, x.company, x.mobile, refOf(x.notes)].some(v => (v || '').toLowerCase().includes(q))));

  const dismiss = () => { popup.forEach(x => seen.current.add(x.id)); try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen.current])); } catch { /* ignore */ } setPopup([]); };

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6" aria-label="All clients">
      <h2 className="flex items-center gap-2 text-lg font-black text-stone-900"><Bell size={18}/> All clients {on && <span className="text-sm font-semibold text-stone-500">({items.length})</span>}</h2>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">{error}</p>}
      {!on ? (
        <p className="mt-3 text-sm text-stone-500">Loading…</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-stone-500">Checks every minute while this page is open. A pop-up appears when a new request comes in. <button type="button" className="underline" onClick={() => { try { Notification?.requestPermission?.(); } catch { /* ignore */ } }}>Turn on desktop alerts</button></p>
          <div className="mt-3 flex flex-wrap gap-1.5" role="tablist">
            {TABS.map(([id, label]) => {
              const n = id === 'all' ? items.length : items.filter(x => typeOf(x) === id).length;
              return <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setLimit(30); }} className={`min-h-9 rounded-full border px-3 text-xs font-bold ${tab === id ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 text-stone-700'}`}>{label} ({n})</button>;
            })}
          </div>
          <input className="sf-input mt-2" value={query} onChange={e => { setQuery(e.target.value); setLimit(30); }} placeholder="Search name, company or phone" aria-label="Search clients"/>
          <ul className="mt-2 divide-y divide-stone-100">
            {shown.length === 0 && <li className="py-3 text-sm text-stone-500">No clients here yet.</li>}
            {shown.slice(0, limit).map(x => (
              <li key={x.id} className="py-2.5">
                <button type="button" onClick={() => setOpen(open === x.id ? '' : x.id)} className="flex w-full flex-wrap items-baseline justify-between gap-2 text-left">
                  <span><span className={`mr-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${BADGE[typeOf(x)]}`}>{TYPES[typeOf(x)]}</span><strong className="text-sm text-stone-900">{x.name || 'No name'}</strong> <span className="text-xs text-stone-500">{x.company || ''}</span></span>
                  <span className="text-xs text-stone-600">{opened(x) ? <strong className="text-amber-700">Opened – not sent yet · </strong> : null}{[refOf(x.notes), opened(x) ? '' : pkgOf(x.notes).replace(/^./, c => c.toUpperCase()), estimate(x.notes), when(x.draft_updated_at || x.created_at)].filter(Boolean).join(' · ')}</span>
                </button>
                {open === x.id && (
                  <div className="mt-2 rounded-xl bg-stone-50 p-3">
                    <div className="mb-2 flex flex-wrap gap-2">
                      {x.mobile && <a href={`tel:+91${x.mobile}`} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 text-xs font-bold"><Phone size={13}/> {x.mobile}</a>}
                      {x.mobile && <a href={`https://wa.me/91${x.mobile}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-[#25D366] px-3 text-xs font-bold text-[#073B1C]"><MessageCircle size={13}/> WhatsApp</a>}
                    </div>
                    {x.notes ? <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words font-sans text-xs text-stone-700">{x.notes}</pre>
                      : <p className="text-xs text-stone-600">{x.kind !== 'prepared' ? 'No answers yet.'
                        : x.draft_updated_at ? `Old form – the client started filling it (last change ${when(x.draft_updated_at)}). Open “Edit old forms” below to see every answer.`
                        : `Form sent – the client hasn’t opened it yet.${x.interests?.length ? ` Interested in: ${x.interests.join(', ')}.` : ''}`}</p>}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {shown.length > limit && <button type="button" onClick={() => setLimit(l => l + 30)} className="mt-2 min-h-10 w-full rounded-xl border border-stone-300 text-sm font-bold text-stone-700">Show more ({shown.length - limit} left)</button>}
        </>
      )}

      {popup.length > 0 && (
        <div className="fixed inset-x-3 top-3 z-[90] mx-auto max-w-md rounded-2xl bg-stone-900 p-4 text-white shadow-2xl sm:right-4 sm:left-auto" role="alertdialog" aria-label="New client">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">New client{popup.length > 1 ? `s (${popup.length})` : ''}</p>
              {popup.slice(0, 3).map(x => <p key={x.id} className="mt-1 text-sm"><strong>{x.name}</strong>{x.company ? ` · ${x.company}` : ''} · {estimate(x.notes)}</p>)}
            </div>
            <button type="button" onClick={dismiss} aria-label="Close" className="p-1 text-white/60 hover:text-white"><X size={18}/></button>
          </div>
          {popup[0].mobile && <a href={`https://wa.me/91${popup[0].mobile}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-sm font-bold text-[#073B1C]"><MessageCircle size={15}/> Reply on WhatsApp</a>}
        </div>
      )}
    </section>
  );
}
