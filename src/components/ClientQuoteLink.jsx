import { useEffect, useState } from 'react';
import { Copy, Check, MessageCircle, Link2, Pencil } from 'lucide-react';
import { PACKAGES, CARDS, STORAGE_OPTIONS, PRESET_EXTRAS, PRESET_DROPS } from '../pricing/packages';
import { supabase } from '../supabase';
import { createSavedBrief } from '../enquiries/brief';

// Admin tool: make one personal quotation link per client.
// The link opens the pricing page with their name, company and number filled in,
// an optional suggested package, and a ref so the reply can be matched to the lead.
const BASE = 'https://solarflow.deeprootsystems.in/#/plans';

export function clientQuoteLink({ name, company, phone, pkg, ref, card = '', storage = '', extras = [], drop = [], stamp = '' }) {
  const qs = new URLSearchParams();
  if (name.trim()) qs.set('name', name.trim());
  if (company.trim()) qs.set('company', company.trim());
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (digits) qs.set('phone', digits);
  if (pkg) qs.set('pkg', pkg);
  if (ref.trim()) qs.set('ref', ref.trim());
  if (card) qs.set('card', card);
  if (storage) qs.set('storage', storage);
  if (extras.length) qs.set('extras', extras.join(','));
  if (drop.length) qs.set('drop', drop.join(','));
  // A fresh stamp on each sent link makes these ticks apply even if the client already started.
  if (stamp && (extras.length || drop.length)) qs.set('set', stamp);
  return `${BASE}?${qs.toString()}`;
}

// Short reference so each client's answers can be matched to their link (e.g. SF-4K7Q).
const newRef = () => 'SF-' + Math.random().toString(36).slice(2, 6).toUpperCase();
const newStamp = () => Date.now().toString(36);
const blank = () => ({ name: '', company: '', phone: '', pkg: '', ref: newRef(), card: '', storage: '', extras: [], drop: [], stamp: newStamp() });
// What you ticked for each client is remembered on this admin device (keyed by phone),
// so "Edit this client's form" opens with your last choices.
const chip = on => `min-h-10 rounded-xl border-2 px-3 text-sm ${on ? 'border-orange-500 bg-orange-50 font-bold' : 'border-stone-200'}`;
const commissionIds = PRESET_EXTRAS().filter(a => a.exclusive).map(a => a.id);
const PRESETS_KEY = 'solarflow_admin_client_presets';
const readPresets = () => { try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || '{}'); } catch { return {}; } };
const rememberPresets = f => {
  const key = f.phone.replace(/\D/g, '').slice(-10);
  if (!key) return;
  try { const all = readPresets(); all[key] = { pkg: f.pkg, ref: f.ref, card: f.card, storage: f.storage, extras: f.extras, drop: f.drop }; localStorage.setItem(PRESETS_KEY, JSON.stringify(all)); } catch { /* storage blocked */ }
};
function fromEntry(c) {
  const last = readPresets()[(c.mobile || '').replace(/\D/g, '').slice(-10)] || {};
  return { ...blank(), ...last, name: c.name, company: c.company, phone: c.mobile, ref: c.ref || last.ref || newRef(), stamp: newStamp() };
}

export default function ClientQuoteLink({ adminCode = '', onSaved, editing = null, onStopEditing }) {
  const [f, setF] = useState(blank);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(''); // '', 'saving', 'saved', 'failed', 'nophone'
  // "Edit this client's form" in All clients fills the tool with that client and what you set last time.
  useEffect(() => { if (editing) { setF(fromEntry(editing)); setCopied(false); setSaved(''); } }, [editing]);
  const set = (k, v) => { setF(x => ({ ...x, [k]: v })); setCopied(false); setSaved(''); };
  // Tick/untick in a list; commissions are one choice at a time.
  const flip = (k, id) => setF(x => {
    const has = x[k].includes(id);
    let next = has ? x[k].filter(i => i !== id) : [...x[k], id];
    if (!has && commissionIds.includes(id)) next = next.filter(i => i === id || !commissionIds.includes(i));
    setCopied(false); setSaved('');
    return { ...x, [k]: next };
  });
  // Record every form we send, so it shows in All clients as "Sent – not opened yet".
  async function record() {
    rememberPresets(f);
    // Editing a client already in All clients: just resend – don't add a second entry.
    if (editing) { setSaved('updated'); return; }
    if (saved === 'saved' || saved === 'saving') return;
    if (!/^\d{10}$/.test(digits) || !f.name.trim()) { setSaved('nophone'); return; }
    setSaved('saving');
    try {
      await createSavedBrief(supabase, { name: f.name.trim(), company: f.company.trim() || f.name.trim(), mobile: digits,
        customRequest: [`New quote form sent · Ref ${f.ref.trim()}`, f.pkg && `Suggested ${f.pkg}`, f.card && `Version ${CARDS.find(c => c.id === f.card)?.version}`, f.storage && `Storage ${STORAGE_OPTIONS.find(o => o.id === f.storage)?.short}`, f.extras.length && `Pre-ticked: ${f.extras.map(id => PRESET_EXTRAS().find(a => a.id === id)?.label).join(', ')}`, f.drop.length && `Not needed: ${f.drop.map(id => PRESET_DROPS().find(a => a.id === id)?.label).join(', ')}`].filter(Boolean).join(' · ') }, adminCode);
      setSaved('saved'); onSaved?.();
    } catch { setSaved('failed'); }
  }
  const ready = f.name.trim() || f.company.trim();
  const link = clientQuoteLink(f);
  const digits = f.phone.replace(/\D/g, '').slice(-10);
  const message = `Hi ${f.name.trim() || 'there'}, here is your personal SolarFlow quotation page${f.company.trim() ? ` for ${f.company.trim()}` : ''}. It takes about a minute – answer a few quick questions, pick a package and share it back on WhatsApp. You can open the same link again to change anything:\n${link}`;
  const copy = async () => { record(); try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); } };

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6" aria-label="Client quotation link">
      <h2 className="flex items-center gap-2 text-lg font-black text-stone-900"><Link2 size={18}/> Send a client their form</h2>
      {editing && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
          <span className="flex items-center gap-1.5"><Pencil size={14}/> <span>Editing <strong>{editing.name || 'this client'}</strong>’s form. Change anything below, then send the new link – your ticks apply even if they already started.</span></span>
          <button type="button" onClick={() => { setF(blank()); onStopEditing?.(); }} className="min-h-9 rounded-lg px-2 text-xs font-bold underline">Stop editing</button>
        </div>
      )}
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
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-xs font-bold text-stone-700">Version <span className="font-normal text-stone-500">(optional – preselected for them)</span></p>
          <div className="flex flex-wrap gap-2">
            {[{ id: '', label: 'Let them choose' }, ...CARDS.slice().reverse().map(c => ({ id: c.id, label: `${c.version} · ${c.name}` }))].map(o => (
              <button key={o.id || 'none'} type="button" aria-pressed={f.card === o.id} onClick={() => set('card', o.id)} className={chip(f.card === o.id)}>{o.label}</button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-xs font-bold text-stone-700">File storage <span className="font-normal text-stone-500">(optional – locks it to what you agreed)</span></p>
          <div className="flex flex-wrap gap-2">
            {[{ id: '', short: 'Let them choose' }, ...STORAGE_OPTIONS].map(o => (
              <button key={o.id || 'none'} type="button" aria-pressed={f.storage === o.id} onClick={() => set('storage', o.id)} className={chip(f.storage === o.id)}>{o.id === 'gdrive' ? 'Google Drive (personal)' : o.short}</button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-xs font-bold text-stone-700">Page 2 features to tick for them <span className="font-normal text-stone-500">(from your call – they can still change them; page 1 is left to them)</span></p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PRESET_EXTRAS().map(a => { const on = f.extras.includes(a.id); return (
              <button key={a.id} type="button" aria-pressed={on} onClick={() => flip('extras', a.id)} className={`flex items-start gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm ${on ? 'border-orange-500 bg-orange-50' : 'border-stone-200'}`}>
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on ? 'border-orange-500 bg-orange-500 text-white' : 'border-stone-300'}`}>{on && <Check size={13}/>}</span>
                <span><span className="font-bold text-stone-900">{a.exclusive ? `Commissions – ${a.label.toLowerCase()}` : a.label}</span>{a.custom && <span className="text-stone-500"> · price after a call</span>}</span>
              </button>
            ); })}
          </div>
          <p className="mt-3 mb-1.5 text-xs font-bold text-stone-700">Included documents they don’t need <span className="font-normal text-stone-500">(optional)</span></p>
          <div className="flex flex-wrap gap-2">
            {PRESET_DROPS().map(a => (
              <button key={a.id} type="button" aria-pressed={f.drop.includes(a.id)} onClick={() => flip('drop', a.id)} className={chip(f.drop.includes(a.id))}>{f.drop.includes(a.id) ? '✕ ' : ''}{a.label}</button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-stone-500">Features their package already includes, or can’t take, are skipped automatically on their page.</p>
        </div>
      </div>
      {ready && (
        <div className="mt-4 rounded-2xl bg-stone-50 p-3">
          <p className="break-all text-xs text-stone-700">{link}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 text-sm font-bold text-stone-800">{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? 'Copied' : 'Copy link'}</button>
            <a href={`https://wa.me/${digits ? `91${digits}` : ''}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" onClick={record} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-sm font-bold text-[#073B1C]"><MessageCircle size={15}/> Send on WhatsApp</a>
            <button type="button" onClick={() => { setF(blank()); setSaved(''); setCopied(false); onStopEditing?.(); }} className="inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-bold text-stone-500 underline">Next client</button>
          </div>
          {saved && <p role="status" className={`mt-2 text-xs font-semibold ${saved === 'saved' || saved === 'updated' ? 'text-emerald-700' : saved === 'saving' ? 'text-stone-500' : 'text-rose-700'}`}>{
            saved === 'updated' ? '✓ Updated link ready – send it to them. Your ticks are remembered for next time.'
            : saved === 'saved' ? '✓ Saved – it shows in All clients as “Sent – not opened yet”.'
            : saved === 'saving' ? 'Saving…'
            : saved === 'nophone' ? 'Add their name and 10-digit number so this form shows in All clients.'
            : 'Could not save it to All clients – the link still works. Try again.'}</p>}
        </div>
      )}
    </section>
  );
}
