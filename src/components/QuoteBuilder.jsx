import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ArrowRight, ArrowLeft, CheckCircle2, MessageCircle, Star, Eye, ExternalLink, Users, FileText, LayoutGrid } from 'lucide-react';
import { supabase } from '../supabase';
import { enquiryPayload, saveEnquiryStep } from '../enquiries/submit';
import {
  PACKAGES, ADDONS, CUSTOMER_COUNTS, LIVE_COUNTS, CARDS, CARD_COMPARISON,
  STORAGE_OPTIONS, STORAGE_GUIDE, STORAGE_PRICES_CHECKED, SAMPLE_DOCS, FIELD_SETUP, AFTER_CONFIRMATION, HELP_TEAM, HELP_MANAGE,
  fitsTeam, quote, money, helpPick, helpAddons, packageRange, fullPackageRange, addonsFor, includedFeatures, comingSoon, ADDON_GROUPS, LAUNCH_OFFER,
} from '../pricing/packages';
import { SALES_WHATSAPP } from '../demo/whatsapp';
import SimpleCardPreview from './SimpleCardPreview';

// ─────────────────────────────────────────────────────────────────────────────
// Quote flow, built to be finished in about a minute on a phone:
//   1 Choose a package  – 4 fixed packages; a 2-tap helper marks the right one.
//                         Logins, documents and customer card come WITH the
//                         package (nothing to tick, so nobody "selects all").
//   2 Your setup        – single-choice rows only (data, website, storage).
//   3 Send              – name / WhatsApp / company pre-filled from the link.
// Personal links: #/plans?name=…&company=…&phone=…&pkg=growth&ref=…
// ─────────────────────────────────────────────────────────────────────────────

const stored = key => { try { return localStorage.getItem(key) || ''; } catch { return ''; } };
const urlParam = key => {
  try {
    const qs = new URLSearchParams(window.location.search || (window.location.hash.split('?')[1] || ''));
    return (qs.get(key) || '').trim().slice(0, 80);
  } catch { return ''; }
};
const SOURCES = ['Excel / Google Sheets', 'Tally', 'Odoo', 'Zoho', 'Other'];
const sample = (file, ext) => `${import.meta.env.BASE_URL}samples/${file}.${ext}`;
const STEPS = ['Package', 'Your setup', 'Send'];
const PKG_IDS = PACKAGES.map(p => p.id);

const pill = on => `rounded-2xl border-2 px-3 py-2.5 text-sm min-h-11 text-left ${on ? 'border-orange-500 bg-orange-50 font-bold text-stone-900' : 'border-stone-200 bg-white text-stone-700 hover:border-orange-300'}`;

// Joined buttons in one rounded bar – reads as one question with one answer.
function Segmented({ options, value, onPick, label, multi = false }) {
  const isOn = id => (multi ? value.includes(id) : value === id);
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-stone-100 p-1 sm:grid-cols-4" role={multi ? 'group' : 'radiogroup'} aria-label={label}>
      {options.map(o => (
        <button key={o.id} type="button" {...(multi ? { 'aria-pressed': isOn(o.id) } : { role: 'radio', 'aria-checked': isOn(o.id) })} onClick={() => onPick(o.id)}
          className={`min-h-11 rounded-xl px-2 text-sm ${isOn(o.id) ? 'bg-white font-black text-stone-900 shadow ring-2 ring-orange-500' : 'font-semibold text-stone-600 hover:bg-white/60'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// important = a core question we need for the quote. Shown with a red tag until answered.
function Row({ label, hint, children, important = false, answered = true }) {
  const open = important && !answered;
  return (
    <div className={`border-t border-stone-100 py-4 first:border-0 first:pt-0 ${open ? 'rounded-2xl' : ''}`}>
      <p className="mb-2 text-sm font-black text-stone-900">
        {label}
        {important && (answered
          ? <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">Done</span>
          : <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">Important</span>)}
        {hint && <span className="font-normal text-stone-500"> {hint}</span>}
      </p>
      {children}
    </div>
  );
}

function Choice({ value, onPick, options, cols = 'grid-cols-2 sm:grid-cols-4' }) {
  return (
    <div className={`grid gap-2 ${cols}`} role="radiogroup">
      {options.map(o => {
        const v = typeof o === 'string' ? o : o.id;
        const l = typeof o === 'string' ? o : o.label;
        return (
          <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onPick(v)} className={pill(value === v)}>
            {l}{o.sub && <span className="block text-[11px] font-normal text-stone-500">{o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

// Answers stay filled in (like a Google Form) – one saved copy per personal link, on the client's device.
const draftKey = () => `solarflow_quote_${(urlParam('ref') || [urlParam('name'), urlParam('company')].filter(Boolean).join('|') || 'default').toLowerCase()}`;
const readDraft = () => { try { return JSON.parse(localStorage.getItem(draftKey()) || 'null'); } catch { return null; } };

export default function QuoteBuilder() {
  const [draft] = useState(readDraft);
  const d = draft || {};
  const [linkPkg] = useState(() => (PKG_IDS.includes(urlParam('pkg')) ? urlParam('pkg') : ''));
  const [ref] = useState(() => urlParam('ref'));
  const [step, setStep] = useState(1);
  const [help, setHelp] = useState(d.help || { team: '', manage: [] });
  const [pkg, setPkg] = useState(d.pkg || '');
  const [card, setCard] = useState(d.card || 'simple');
  const [s, setS] = useState({ data: '', customers: '', source: '', sourceOther: '', website: '', websiteUrl: '', storage: '', live: '', ...(d.s || {}) });
  const [addons, setAddons] = useState(new Set(d.addons || []));
  const [dropped, setDropped] = useState(new Set(d.dropped || [])); // included features the client doesn't want
  const [interested, setInterested] = useState(new Set(d.interested || [])); // 'launching soon' features they want to hear about
  const [preview, setPreview] = useState(false);
  const [name, setName] = useState(() => d.name || urlParam('name') || stored('solarflow_visitor_name').replace(/\s*\(.*\)\s*$/, ''));
  const [company, setCompany] = useState(() => d.company || urlParam('company') || stored('solarflow_visitor_company'));
  const [mobile, setMobile] = useState(() => d.mobile || (urlParam('phone') || urlParam('mobile')).replace(/\D/g, '').slice(-10));
  const [note, setNote] = useState(d.note || '');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [savedAt, setSavedAt] = useState(d.savedAt || '');
  const [saveState, setSaveState] = useState(''); // '', 'saving', 'saved', 'failed'
  const identity = useRef(d.identity || null);
  // Keep every answer on this device so the same link opens filled in.
  useEffect(() => {
    try {
      localStorage.setItem(draftKey(), JSON.stringify({ help, pkg, card, s, addons: [...addons], dropped: [...dropped], interested: [...interested], name, company, mobile, note, identity: identity.current, savedAt }));
    } catch { /* storage blocked – the form still works */ }
  }, [help, pkg, card, s, addons, dropped, interested, name, company, mobile, note, savedAt]);
  const top = useRef(null);

  const suggested = help.team ? helpPick(help.team, help.manage) : linkPkg;
  const helpExtras = (pkgId) => helpAddons(help.manage).filter(id => pkgId && addonsFor(pkgId).some(a => a.id === id));
  const P = PACKAGES.find(p => p.id === pkg);
  const usedCard = P ? (P.cards.length === 1 ? P.cards[0] : card) : card;
  const q = useMemo(() => quote({ pkg, data: s.data, customers: s.customers, addons, card: usedCard }), [pkg, s.data, s.customers, addons, usedCard]);
  const set = (k, v) => setS(x => ({ ...x, [k]: v }));
  const cardName = id => CARDS.find(c => c.id === id)?.name || '—';
  const pkgName = id => PACKAGES.find(p => p.id === id)?.name || '—';
  const scrollTop = () => setTimeout(() => top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  const go = n => { setStep(n); setError(''); scrollTop(); };
  const choose = id => { if (id !== pkg) { setPkg(id); setAddons(new Set(helpExtras(id))); setDropped(new Set()); } go(2); };
  const toggleDropped = id => setDropped(prev => { const x = new Set(prev); x.has(id) ? x.delete(id) : x.add(id); return x; });
  // Move up a package and keep only the add-ons the new package still lacks.
  const upgradeTo = id => { setPkg(id); setAddons(prev => new Set([...prev].filter(a => addonsFor(id).some(x => x.id === a)))); };
  const toggleAddon = id => setAddons(prev => {
    const x = new Set(prev);
    if (x.has(id)) { x.delete(id); return x; }
    const ex = ADDONS.find(a => a.id === id)?.exclusive; // e.g. commissions: dealers / installation team / both
    if (ex) ADDONS.filter(a => a.exclusive === ex).forEach(a => x.delete(a.id));
    x.add(id); return x;
  });

  const importantLeft = [s.data === 'fresh' || (s.data === 'move' && s.customers), s.live, s.website, s.storage].filter(x => !x).length;
  const sourceText = s.source === 'Other' ? (s.sourceOther.trim() || 'Other software') : s.source;

  const summaryLines = () => [
    ...(ref ? [`Ref: ${ref}`] : []),
    `Package: ${pkgName(pkg)}${suggested && pkg !== suggested ? ` (suggested ${pkgName(suggested)})` : ''}`,
    `Customer card: ${cardName(usedCard)}`,
    ...(help.team ? [`Team: ${help.team} · Manages: ${HELP_MANAGE.filter(m => help.manage.includes(m.id)).map(m => m.label).join(', ') || 'Just customers'}`] : []),
    `Data: ${s.data === 'move' ? `Transfer existing data (${(s.customers || '?').toLowerCase()} customers, from ${sourceText || '?'})` : s.data === 'fresh' ? 'Start fresh' : 'Not said'}`,
    `Live customers: ${s.live || 'Not said'}`,
    ...(interested.size ? [`Interested (launching soon): ${ADDONS.filter(a => interested.has(a.id)).map(a => a.label).join(', ')}`] : []),
    ...(dropped.size ? [`Not needed: ${ADDONS.filter(a => dropped.has(a.id)).map(a => a.label).join(', ')}`] : []),
    `Website: ${s.website === 'Yes' ? `Yes${s.websiteUrl.trim() ? ` (${s.websiteUrl.trim()})` : ''}` : s.website || 'Not said'}`,
    `File storage: ${STORAGE_OPTIONS.find(o => o.id === s.storage)?.short || 'Not said'}${s.storage && s.storage !== 'none' ? ' (paid by us to the provider, separate from CRM price)' : ''}`,
    ...(note.trim() ? [`Notes: ${note.trim()}`] : []),
    `${q.publicLines[0].label}: ${q.publicLines[0].amount}`,
    ...(q.publicLines.length > 1 ? [`Extras: ${q.publicLines.slice(1).map(l => l.label + (l.amount === 'price after a call' ? ' (price after a call)' : '')).join(', ')}`] : []),
    `Estimated total: ${q.range}`,
    ...(LAUNCH_OFFER > 0 ? [`Launch offer: ${Math.round(LAUNCH_OFFER * 100)}% off included`] : []),
  ];
  const waHref = () => {
    const who = name.trim(), org = company.trim();
    const text = `Hi${who ? `, I'm ${who}${org ? ` from ${org}` : ''}` : ''}. Here is my SolarFlow estimate – please send the final quotation.\n${summaryLines().join('\n')}`;
    return `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(text)}`;
  };

  const phoneOk = mobile.replace(/\D/g, '').length === 10;
  // Save name + phone + every answer to the backend (enquiries). Saving again later edits the same record.
  // Two writes: the first creates the contact, the second adds the full answers – the backend
  // emails both (when email is set up) and they appear under Admin access → Quote requests.
  async function saveToBackend() {
    const base = {
      name, mobile, company,
      modelType: ['pro', 'complete'].includes(pkg) ? 'advance' : 'basic',
      storeFiles: 'unspecified',
      interests: [`${pkgName(pkg)} package`, cardName(usedCard), ...addonsFor(pkg).filter(x => addons.has(x.id)).map(x => x.label)],
      selectedInterest: `Quote: ${pkgName(pkg)} ${q.range} (list ${q.label})${ref ? ` (ref ${ref})` : ''}`,
      businessDetails: { teamSize: help.team || 'Not said', software: [], dataStart: s.data === 'move' ? 'Transfer existing data' : 'Start fresh', channelPartners: pkg === 'starter' ? 'No' : 'Yes' },
    };
    const first = !identity.current;
    identity.current ||= { id: crypto.randomUUID(), editToken: crypto.randomUUID() };
    setSaveState('saving');
    try {
      if (first) await saveEnquiryStep(supabase, enquiryPayload({ ...base, remarks: '' }), identity.current, { contactOnly: true });
      await saveEnquiryStep(supabase, enquiryPayload({ ...base, remarks: summaryLines().join('\n') }), identity.current);
      setSaveState('saved'); setSavedAt(new Date().toISOString());
    } catch { setSaveState('failed'); }
  }

  // Main action: save, then open WhatsApp with every answer typed in.
  function sendOnWhatsApp(e) {
    if (!name.trim() || !phoneOk) { e.preventDefault(); setError(!name.trim() ? 'Please enter your name.' : 'Please enter your 10-digit mobile number.'); return; }
    setError('');
    saveToBackend();
    setDone(true);
    setTimeout(() => go(4), 300);
  }

  const box = 'rounded-3xl border border-stone-200 bg-white p-4 sm:p-6 shadow-sm';

  return (
    <section ref={top} className="scroll-mt-24 w-full space-y-3 pb-28 sm:pb-0" aria-label="Get your SolarFlow quotation">
      {step <= 3 && (
        <div>
          <div className="flex items-baseline justify-between text-xs font-bold text-stone-500">
            <span className="text-stone-900">Step {step} of 3 · {STEPS[step - 1]}</span>
            <span>About 1 minute</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-200"><div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${Math.round(step / 3 * 100)}%` }}/></div>
        </div>
      )}

      {draft && step === 1 && (draft.pkg || draft.savedAt) && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">
          <span><strong>Welcome back{name ? `, ${name.split(' ')[0]}` : ''}!</strong> Your answers are still filled in{draft.pkg ? ` (${pkgName(draft.pkg)})` : ''}. Change anything you like.</span>
          {pkg && <button type="button" onClick={() => go(3)} className="min-h-10 rounded-xl bg-emerald-700 px-3 text-sm font-bold text-white">Go to my estimate</button>}
        </div>
      )}

      {/* ── STEP 1: choose a package ───────────────────────────── */}
      {step === 1 && (<>
        <div className={box}>
          <p className="text-base font-black text-stone-900">Not sure which package? Answer two questions.</p>
          <div className="mt-4 grid gap-5 lg:grid-cols-2 lg:gap-8">
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-800"><span className="grid h-6 w-6 place-items-center rounded-full bg-stone-900 text-xs text-white">1</span> How many people will use it?</p>
              <Segmented options={HELP_TEAM.map(t => ({ id: t, label: t }))} value={help.team} onPick={v => setHelp(h => ({ ...h, team: v }))} label="People who will use it"/>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-800"><span className="grid h-6 w-6 place-items-center rounded-full bg-stone-900 text-xs text-white">2</span> Besides customers, what else do you manage?</p>
              <Segmented multi options={HELP_MANAGE} value={help.manage} onPick={v => setHelp(h => {
                const cur = h.manage;
                if (v === 'customers') return { ...h, manage: cur.includes('customers') ? [] : ['customers'] };
                const rest = cur.filter(x => x !== 'customers');
                return { ...h, manage: rest.includes(v) ? rest.filter(x => x !== v) : [...rest, v] };
              })} label="Besides customers, you also manage"/>
              <p className="mt-1.5 text-[11px] text-stone-500">Pick one or more.</p>
            </div>
          </div>
          {suggested
            ? <p className="mt-4 rounded-xl bg-orange-50 px-3 py-2 text-sm font-bold text-orange-900"><Star size={14} className="inline -mt-0.5"/> {pkgName(suggested)} fits you best – marked below.{helpExtras(suggested).length > 0 && <span className="block text-xs font-semibold text-orange-800">{helpExtras(suggested).map(id => ADDONS.find(a => a.id === id).label).join(' + ')} will be added as extras – included in the estimate.</span>}</p>
            : <p className="mt-4 text-xs text-stone-500">Or just pick a package below.</p>}
        </div>

        <div className="grid gap-3 pt-2 sm:grid-cols-2 xl:grid-cols-4">
          {PACKAGES.map(p => {
            const best = p.id === suggested;
            const sizeOk = fitsTeam(p.id, help.team);
            return (
              <article key={p.id} className={`relative flex flex-col rounded-3xl border-2 bg-white p-4 shadow-sm ${best ? 'border-orange-500 ring-4 ring-orange-100' : 'border-stone-200'} ${sizeOk ? '' : 'opacity-50'}`}>
                {best && <span className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-0.5 text-[11px] font-bold text-stone-950"><Star size={11}/> Best for you</span>}
                {!best && p.popular && !suggested && <span className="absolute -top-3 left-4 rounded-full bg-stone-900 px-2.5 py-0.5 text-[11px] font-bold text-white">Most chosen</span>}
                <h3 className="text-lg font-black text-stone-900">{p.name}</h3>
                {LAUNCH_OFFER > 0 && <p className="mt-1 flex items-center gap-2 text-xs"><span className="text-stone-400 line-through">{fullPackageRange(p.id)}</span><span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">{Math.round(LAUNCH_OFFER * 100)}% off</span></p>}
                <p className="text-3xl font-black text-stone-900">{packageRange(p.id)}</p>
                <p className="text-xs text-stone-500">one-time · {p.tagline}</p>

                <dl className="mt-3 space-y-2 rounded-2xl bg-stone-50 p-3 text-xs">
                  <div className="flex gap-2"><Users size={14} className="mt-0.5 shrink-0 text-stone-500"/><div><dt className="font-bold text-stone-900">{p.maxUsers ? `Up to ${p.maxUsers} users` : 'Unlimited users'}</dt><dd className="text-stone-600">{p.who}</dd></div></div>
                  <div className="flex gap-2"><LayoutGrid size={14} className="mt-0.5 shrink-0 text-stone-500"/><div><dt className="font-bold text-stone-900">Customer card</dt><dd className="text-stone-600">{p.cards.length > 1 ? 'Simple or Stage-by-stage – you choose' : p.cards[0] === 'simple' ? 'Simple – 4 tabs' : 'Stage-by-stage – 13 tabs'}</dd></div></div>
                  <div className="flex gap-2"><FileText size={14} className="mt-0.5 shrink-0 text-stone-500"/><div><dt className="font-bold text-stone-900">{p.docs.length} documents filled for you</dt><dd className="text-stone-600">{p.docs.map((id, i) => { const d = SAMPLE_DOCS.find(x => x.id === id); return <span key={id}>{i ? ', ' : ''}<a href={sample(d.file, 'pdf')} target="_blank" rel="noopener noreferrer" className="underline decoration-stone-300 hover:text-orange-700">{d.name}</a></span>; })}</dd></div></div>
                </dl>

                <ul className="mt-3 flex-1 space-y-1.5">{p.highlights.map(h => <li key={h} className="flex gap-1.5 text-xs text-stone-700"><Check size={14} className="mt-0.5 shrink-0 text-emerald-600"/>{h}</li>)}</ul>

                {sizeOk
                  ? <button type="button" onClick={() => choose(p.id)} className={`mt-4 min-h-12 w-full rounded-xl text-sm font-black ${best || (!suggested && p.popular) ? 'sf-btn-primary' : 'border-2 border-stone-900 text-stone-900 hover:bg-stone-50'}`}>Choose {p.name} <ArrowRight size={15} className="inline"/></button>
                  : <p className="mt-4 rounded-xl bg-stone-100 p-3 text-center text-xs font-bold text-stone-600">For up to {p.maxUsers} users</p>}
              </article>
            );
          })}
        </div>

        <div className={box}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-black text-stone-900">Two customer cards</p>
              <p className="text-xs text-stone-500">Simple = everything on 4 tabs. Stage-by-stage = a tab for every step, lead to subsidy.</p>
            </div>
            <button type="button" onClick={() => setPreview(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-stone-300 px-3 text-xs font-bold text-stone-800 hover:border-orange-400"><Eye size={14}/> See the Simple card</button>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-bold text-orange-800">Compare them</summary>
            <dl className="mt-2 divide-y divide-stone-100 text-xs">
              {CARD_COMPARISON.map(r => (
                <div key={r.label} className="grid gap-1 py-2 sm:grid-cols-[140px_1fr_1fr] sm:gap-3">
                  <dt className="font-bold text-stone-500">{r.label}</dt>
                  <dd className="text-stone-700"><span className="font-bold text-stone-900 sm:hidden">Simple: </span>{r.simple}</dd>
                  <dd className="text-stone-700"><span className="font-bold text-stone-900 sm:hidden">Stage: </span>{r.stage}</dd>
                </div>
              ))}
            </dl>
          </details>
          <p className="mt-3 text-xs text-stone-500">Free in every package: rename stages and fields, your logo on documents, hide what you don’t use. Prefer to talk? <a href={`https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(`Hi${name ? `, I'm ${name}` : ''}. I'd like help choosing a SolarFlow package.`)}`} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-700 underline">Ask on WhatsApp</a></p>
        </div>
      </>)}

      {/* ── STEP 2: setup – single choices only ────────────────── */}
      {step === 2 && P && (
        <div className={box}>
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-orange-50 p-3">
            <div><span className="text-[11px] font-bold uppercase tracking-wider text-orange-800">Your package</span><strong className="block text-lg font-black text-stone-900">{P.name} · {packageRange(P.id)}</strong>{LAUNCH_OFFER > 0 && <span className="text-xs font-bold text-emerald-700">Launch offer – {Math.round(LAUNCH_OFFER * 100)}% off (was {fullPackageRange(P.id)})</span>}</div>
            <button type="button" onClick={() => go(1)} className="min-h-10 px-2 text-xs font-bold text-orange-800 underline">Change</button>
          </div>

          {P.cards.length > 1 && (
            <Row label="Which customer card?" hint="(included – same price)" important answered={!!card}>
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
                {P.cards.map(id => { const c = CARDS.find(x => x.id === id); return (
                  <button key={id} type="button" role="radio" aria-checked={card === id} onClick={() => setCard(id)} className={pill(card === id)}>
                    <strong className="block">{c.name}</strong><span className="text-xs font-normal text-stone-500">{c.sub} · {id === 'simple' ? 'fewer things to track' : 'a tab for every stage'}</span>
                  </button>
                ); })}
              </div>
              <button type="button" onClick={() => setPreview(true)} className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs font-bold text-stone-600 underline"><Eye size={13}/> See the Simple card</button>
            </Row>
          )}

          <Row label="Your existing data" important answered={s.data === 'fresh' || (s.data === 'move' && !!s.customers)}>
            <Choice value={s.data} onPick={v => set('data', v)} cols="grid-cols-2" options={[{ id: 'fresh', label: 'Start fresh', sub: 'No extra cost' }, { id: 'move', label: 'Transfer my data', sub: 'Adds a little to the estimate' }]}/>
            {s.data === 'move' && (
              <div className="mt-3 rounded-2xl bg-stone-50 p-3">
                <p className="mb-1.5 text-xs font-bold text-stone-500">How many customers to transfer?</p>
                <Choice value={s.customers} onPick={v => set('customers', v)} options={CUSTOMER_COUNTS}/>
                <p className="mb-1.5 mt-3 text-xs font-bold text-stone-500">Where is it now?</p>
                <Choice value={s.source} onPick={v => set('source', v)} cols="grid-cols-2 sm:grid-cols-5" options={SOURCES}/>
                {s.source === 'Other' && <input className="sf-input mt-2" value={s.sourceOther} onChange={e => set('sourceOther', e.target.value)} placeholder="Which software? e.g. Busy, Marg" maxLength={60} aria-label="Other software name"/>}
              </div>
            )}
          </Row>

          <Row label="Live customers right now" hint="(work in progress)" important answered={!!s.live}>
            <Choice value={s.live} onPick={v => set('live', v)} options={LIVE_COUNTS}/>
          </Row>

          <Row label="Company website?" hint="(decides where your CRM is hosted)" important answered={!!s.website}>
            <Choice value={s.website} onPick={v => set('website', v)} cols="grid-cols-2" options={[{ id: 'Yes', label: 'Yes', sub: 'CRM on your domain' }, { id: 'No', label: 'No', sub: 'We host it for you' }]}/>
            {s.website === 'Yes' && <input className="sf-input mt-2" value={s.websiteUrl} onChange={e => set('websiteUrl', e.target.value)} placeholder="www.yoursolar.in (optional)" inputMode="url" aria-label="Website address"/>}
          </Row>

          <Row label="Where should customer files go?" hint="(extra cost, paid by you to the provider – not part of the CRM price)" important answered={!!s.storage}>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label="File storage">
              {STORAGE_OPTIONS.map(o => { const on = s.storage === o.id; return (
                <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => set('storage', o.id)} className={`flex flex-col rounded-2xl border-2 p-3 text-left ${on ? 'border-orange-500 bg-orange-50' : 'border-stone-200 hover:border-orange-300'}`}>
                  <strong className="text-sm text-stone-900">{o.label}</strong>
                  <span className="mt-0.5 text-[11px] font-bold text-orange-800">{o.who}</span>
                  <span className="mt-1.5 text-xs text-stone-600">{o.how}</span>
                  <ul className="mt-2 space-y-0.5 border-t border-stone-200/70 pt-2">{o.prices.map(x => <li key={x} className="text-xs font-semibold text-stone-800">{x}</li>)}</ul>
                </button>
              ); })}
            </div>
            <p className="mt-2 text-[11px] text-stone-500">{STORAGE_GUIDE} Prices from {['Google One', 'Google Workspace', 'Supabase'].map((n, i) => <span key={n}>{i ? ', ' : ''}<a className="underline" href={STORAGE_OPTIONS.filter(o => o.link)[i].link} target="_blank" rel="noopener noreferrer">{n}</a></span>)} on {STORAGE_PRICES_CHECKED}; they may change.</p>
          </Row>

          <Row label="Features" hint="(green = in your package – untick what you don’t need · tick more if you want, the estimate goes up a little)">
            {ADDON_GROUPS.map(g => {
              const inc = includedFeatures(pkg).filter(x => x.group === g);
              const more = addonsFor(pkg).filter(x => x.group === g);
              const soon = comingSoon().filter(x => x.group === g);
              if (!inc.length && !more.length && !soon.length) return null;
              return (
                <div key={g} className="mt-3 first:mt-0">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-400">{g}{g === 'Commissions' && more.length > 1 ? ' – pick one' : ''}</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {inc.map(x => { const on = !dropped.has(x.id); return (
                      <button key={x.id} type="button" aria-pressed={on} onClick={() => toggleDropped(x.id)} className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm ${on ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-stone-200 bg-white text-stone-400'}`}>
                        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-300'}`}>{on && <Check size={14}/>}</span>
                        <span className={on ? '' : 'line-through'}>{x.group === 'Commissions' ? `Commissions – ${x.label.toLowerCase()}` : x.label} <span className="text-[11px] font-bold">{on ? '· included' : '· not needed'}</span></span>
                      </button>
                    ); })}
                    {more.map(x => { const on = addons.has(x.id); return (
                      <button key={x.id} type="button" aria-pressed={on} onClick={() => toggleAddon(x.id)} className={`flex gap-3 rounded-xl border-2 px-3 py-2 text-left ${on ? 'border-orange-500 bg-orange-50' : 'border-stone-200 hover:border-orange-300'}`}>
                        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on ? 'border-orange-500 bg-orange-500 text-white' : 'border-stone-300'}`}>{on && <Check size={14}/>}</span>
                        <span><span className="block text-sm font-bold text-stone-900">{g === 'Commissions' ? `Commissions – ${x.label.toLowerCase()}` : x.label} {x.custom && <span className="font-semibold text-stone-500">· price after a call</span>}</span>{x.example && <span className="text-xs text-stone-500">{x.example}</span>}</span>
                      </button>
                    ); })}
                    {soon.map(x => { const on = interested.has(x.id); return (
                      <button key={x.id} type="button" aria-pressed={on} onClick={() => setInterested(prev => { const n = new Set(prev); n.has(x.id) ? n.delete(x.id) : n.add(x.id); return n; })}
                        className={`flex gap-3 rounded-xl border-2 border-dashed px-3 py-2 text-left ${on ? 'border-amber-400 bg-amber-50' : 'border-stone-200 hover:border-amber-300'}`}>
                        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on ? 'border-amber-500 bg-amber-500 text-white' : 'border-stone-300'}`}>{on && <Check size={14}/>}</span>
                        <span><span className="block text-sm font-bold text-stone-800">{x.label} <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Launching soon</span></span><span className="text-xs text-stone-500">{on ? 'Interested – we’ll tell you when it’s ready.' : `${x.example} Tick if you’re interested.`}</span></span>
                      </button>
                    ); })}
                  </div>
                </div>
              );
            })}
          </Row>

          <PriceBar q={q} back={() => go(1)} next={() => go(3)} hint={importantLeft ? `${importantLeft} important question${importantLeft > 1 ? 's' : ''} left – answer for a better estimate` : ''}/>
        </div>
      )}

      {/* ── STEP 3: send ───────────────────────────────────────── */}
      {step === 3 && P && (() => {
        const keep = includedFeatures(pkg).filter(x => !dropped.has(x.id));
        const extras = addonsFor(pkg).filter(x => addons.has(x.id));
        const rows = [
          ['Package', `${P.name} · ${cardName(usedCard)}`],
          ['Included', keep.map(x => x.group === 'Commissions' ? `Commissions – ${x.label.toLowerCase()}` : x.label).join(', ') || '—'],
          ...(extras.length ? [['Extras', extras.map(x => x.exclusive ? `Commissions – ${x.label.toLowerCase()}` : x.label).join(', ')]] : []),
          ...(s.data === 'move' ? [['Data', `Transfer existing data${s.customers ? ` (${s.customers.toLowerCase()} customers)` : ''}`]] : []),
          ...(dropped.size ? [['Not needed', ADDONS.filter(a => dropped.has(a.id)).map(a => a.label).join(', ')]] : []),
          ...(interested.size ? [['Interested', ADDONS.filter(a => interested.has(a.id)).map(a => `${a.label} (launching soon)`).join(', ')]] : []),
        ];
        return (
        <div className={box}>
          <h2 className="text-lg font-black text-stone-900">Your final estimate</h2>
          <div className="mt-3 rounded-2xl border-2 border-orange-200 bg-orange-50 p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800">Estimated total · one-time</span>
            <span className="block text-3xl font-black text-stone-900">{q.range}</span>
            <dl className="mt-3 space-y-1.5 text-sm">
              {rows.map(([k, v]) => <div key={k} className="grid grid-cols-[96px_1fr] gap-2"><dt className="font-bold text-stone-500">{k}</dt><dd className="text-stone-800">{v}</dd></div>)}
            </dl>
            <p className="mt-3 text-[11px] text-stone-500">File storage is paid to the provider and is not part of this estimate. We confirm the final price on WhatsApp.</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-stone-700">Your name *<input className="sf-input mt-1" value={name} onChange={e => setName(e.target.value)} autoComplete="name" required/></label>
            <label className="block text-xs font-bold text-stone-700">Company name<input className="sf-input mt-1" value={company} onChange={e => setCompany(e.target.value)} autoComplete="organization"/></label>
            <label className="block text-xs font-bold text-stone-700">Mobile number *<input className="sf-input mt-1" value={mobile} onChange={e => setMobile(e.target.value)} inputMode="numeric" autoComplete="tel-national" placeholder="10-digit mobile"/></label>
            <label className="block text-xs font-bold text-stone-700">Anything else? <span className="font-normal text-stone-500">(optional)</span><input className="sf-input mt-1" value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="e.g. two DISCOMs, start next month"/></label>
          </div>
          {error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}
          <div className="mt-5 grid grid-cols-[auto_1fr] gap-3">
            <button type="button" onClick={() => go(2)} className="inline-flex min-h-14 items-center gap-1.5 rounded-2xl border-2 border-stone-300 px-5 text-base font-bold text-stone-700 hover:bg-stone-50"><ArrowLeft size={18}/> Go back</button>
            <a href={waHref()} onClick={sendOnWhatsApp} target="_blank" rel="noopener noreferrer" className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 text-base font-black text-[#073B1C] shadow-sm hover:brightness-95"><MessageCircle size={20}/> Share on WhatsApp</a>
          </div>
          <p className="mt-2 text-center text-xs text-stone-500">Opens WhatsApp with your estimate typed in – just press send.</p>
        </div>
        );
      })()}

      {step === 4 && done && (
        <div className={`${box} text-center`}>
          <CheckCircle2 size={40} className="mx-auto text-emerald-600"/>
          <h2 className="mt-3 text-xl font-black text-stone-900">Thank you, {name.trim().split(' ')[0]}!</h2>
          <p className="mt-1 text-sm text-stone-600">Your {pkgName(pkg)} estimate ({q.range}) is ready in WhatsApp. Press send there and we’ll reply with your final quotation today.</p>
          <p className={`mt-2 text-xs font-bold ${saveState === 'failed' ? 'text-rose-700' : 'text-emerald-700'}`}>
            {saveState === 'saving' ? 'Saving your answers…' : saveState === 'failed' ? 'We couldn’t save online – your WhatsApp message still has everything.' : 'Your answers are saved. Open this same link any time to change them.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => go(2)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border-2 border-stone-300 px-4 font-bold text-stone-700"><ArrowLeft size={16}/> Edit my answers</button>
            <a href={waHref()} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#25D366] px-5 font-bold text-[#073B1C]"><MessageCircle size={18}/> Open WhatsApp again</a>
          </div>
          <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-left">
            <p className="text-sm font-bold text-stone-900">Next, we’ll need</p>
            <ol className="mt-2 space-y-1.5">
              {AFTER_CONFIRMATION.map((x, i) => <li key={x.title} className="flex gap-2 text-xs text-stone-700"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-stone-900 text-[10px] font-bold text-white">{i + 1}</span><span><strong>{x.title}:</strong> {x.text}</span></li>)}
            </ol>
            <a href={FIELD_SETUP.find(f => f.id === 'form').link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-orange-400 px-4 text-sm font-bold text-orange-800">Fill your setup form now <ExternalLink size={14}/></a>
          </div>
        </div>
      )}

      {preview && <SimpleCardPreview onClose={() => setPreview(false)}/>}
    </section>
  );
}

// Price + navigation. Fixed to the bottom on phones so Continue is always under the thumb.
function PriceBar({ q, back, next, disabled, hint }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-stone-900 p-3 text-white shadow-lg sm:sticky sm:bottom-3 sm:mt-6 sm:rounded-2xl sm:p-4" aria-live="polite">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-300">Estimated total · one-time</span>
          <strong className="text-xl sm:text-2xl">{q.range}</strong>
          {hint && <span className="block text-[11px] text-stone-300">{hint}</span>}
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={back} className="inline-flex min-h-11 items-center rounded-xl border border-white/20 px-3 text-stone-200" aria-label="Back"><ArrowLeft size={16}/></button>
          <button type="button" onClick={next} disabled={disabled} className="sf-btn-primary min-h-11 px-5 disabled:opacity-40">Continue <ArrowRight size={16} className="inline"/></button>
        </div>
      </div>
    </div>
  );
}
