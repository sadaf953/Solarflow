import { useState } from 'react';
import { Copy, Check, MessageCircle, Link2 } from 'lucide-react';
import { PACKAGES } from '../pricing/packages';
import { supabase } from '../supabase';
import { createSavedBrief } from '../enquiries/brief';

// Admin tool: make one personal quotation link per client.
// The link opens the pricing page with their name, company and number filled in,
// an optional suggested package, and a ref so the reply can be matched to the lead.
const BASE = 'https://solarflow.deeprootsystems.in/#/plans';

export function clientQuoteLink({ name, company, phone, pkg, ref }) {
  const qs = new URLSearchParams();
  if (name.trim()) qs.set('name', name.trim());
  if (company.trim()) qs.set('company', company.trim());
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (digits) qs.set('phone', digits);
  if (pkg) qs.set('pkg', pkg);
  if (ref.trim()) qs.set('ref', ref.trim());
  return `${BASE}?${qs.toString()}`;
}

// Short reference so each client's answers can be matched to their link (e.g. SF-4K7Q).
const newRef = () => 'SF-' + Math.random().toString(36).slice(2, 6).toUpperCase();

export default function ClientQuoteLink({ adminCode = '', onSaved }) {
  const [f, setF] = useState(() => ({ name: '', company: '', phone: '', pkg: '', ref: newRef() }));
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(''); // '', 'saving', 'saved', 'failed', 'nophone'
  const set = (k, v) => { setF(x => ({ ...x, [k]: v })); setCopied(false); setSaved(''); };
  // Record every form we send, so it shows in All clients as "Sent – not opened yet".
  async function record() {
    if (saved === 'saved' || saved === 'saving') return;
    if (!/^\d{10}$/.test(digits) || !f.name.trim()) { setSaved('nophone'); return; }
    setSaved('saving');
    try {
      await createSavedBrief(supabase, { name: f.name.trim(), company: f.company.trim() || f.name.trim(), mobile: digits,
        customRequest: `New quote form sent · Ref ${f.ref.trim()}${f.pkg ? ` · Suggested ${f.pkg}` : ''}` }, adminCode);
      setSaved('saved'); onSaved?.();
    } catch { setSaved('failed'); }
  }
  const ready = f.name.trim() || f.company.trim();
  const link = clientQuoteLink(f);
  const digits = f.phone.replace(/\D/g, '').slice(-10);
  const message = `Hi ${f.name.trim() || 'there'}, here is your personal SolarFlow quotation page${f.company.trim() ? ` for ${f.company.trim()}` : ''}. It takes about a minute – pick a package, answer a few taps and share it back on WhatsApp. You can open the same link again to change anything:\n${link}`;
  const copy = async () => { record(); try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); } };

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6" aria-label="Client quotation link">
      <h2 className="flex items-center gap-2 text-lg font-black text-stone-900"><Link2 size={18}/> Send a client their form</h2>
      <p className="mt-1 text-sm text-stone-500">Fill in their details and send the link. It opens with their name, company and phone already filled. They can come back to the same link to edit – each change updates the same request. At the end they share it with you on WhatsApp.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-bold text-stone-700">Client name<input className="sf-input mt-1" value={f.name} onChange={e => set('name', e.target.value)} placeholder="Sunny Chauhan"/></label>
        <label className="block text-xs font-bold text-stone-700">Company<input className="sf-input mt-1" value={f.company} onChange={e => set('company', e.target.value)} placeholder="Raj Electricals"/></label>
        <label className="block text-xs font-bold text-stone-700">WhatsApp number<input className="sf-input mt-1" value={f.phone} onChange={e => set('phone', e.target.value)} inputMode="numeric" placeholder="10-digit mobile"/></label>
        <label className="block text-xs font-bold text-stone-700">Ref <span className="font-normal text-stone-500">(made for you – change if you like)</span><input className="sf-input mt-1" value={f.ref} onChange={e => set('ref', e.target.value)} placeholder="SF-0142"/></label>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-xs font-bold text-stone-700">Suggest a package <span className="font-normal text-stone-500">(optional – shown as “Best for you”)</span></p>
          <div className="flex flex-wrap gap-2">
            {[{ id: '', name: 'None' }, ...PACKAGES].map(p => (
              <button key={p.id || 'none'} type="button" aria-pressed={f.pkg === p.id} onClick={() => set('pkg', p.id)} className={`min-h-10 rounded-xl border-2 px-3 text-sm ${f.pkg === p.id ? 'border-orange-500 bg-orange-50 font-bold' : 'border-stone-200'}`}>{p.name}</button>
            ))}
          </div>
        </div>
      </div>
      {ready && (
        <div className="mt-4 rounded-2xl bg-stone-50 p-3">
          <p className="break-all text-xs text-stone-700">{link}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 text-sm font-bold text-stone-800">{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? 'Copied' : 'Copy link'}</button>
            <a href={`https://wa.me/${digits ? `91${digits}` : ''}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" onClick={record} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-sm font-bold text-[#073B1C]"><MessageCircle size={15}/> Send on WhatsApp</a>
            <button type="button" onClick={() => { setF({ name: '', company: '', phone: '', pkg: '', ref: newRef() }); setSaved(''); setCopied(false); }} className="inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-bold text-stone-500 underline">Next client</button>
          </div>
          {saved && <p role="status" className={`mt-2 text-xs font-semibold ${saved === 'saved' ? 'text-emerald-700' : saved === 'saving' ? 'text-stone-500' : 'text-rose-700'}`}>{
            saved === 'saved' ? '✓ Saved – it shows in All clients as “Sent – not opened yet”.'
            : saved === 'saving' ? 'Saving…'
            : saved === 'nophone' ? 'Add their name and 10-digit number so this form shows in All clients.'
            : 'Could not save it to All clients – the link still works. Try again.'}</p>}
        </div>
      )}
    </section>
  );
}
