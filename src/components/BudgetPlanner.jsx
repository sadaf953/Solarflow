import { useMemo, useRef, useState } from 'react';
import { Check, ArrowRight, ArrowLeft, LoaderCircle, CheckCircle2, MessageCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { enquiryPayload, saveEnquiryStep } from '../enquiries/submit';
import { TEAM_TYPES, BUDGETS, BASE, featuresFor, includesBase, autoPick, estimate, budgetStatus, summaryLines } from '../pricing/plan';

import { SALES_WHATSAPP as WHATSAPP } from '../demo/whatsapp';
const storedName = () => { try { return localStorage.getItem('solarflow_visitor_name') || ''; } catch { return ''; } };
const storedCompany = () => { try { return localStorage.getItem('solarflow_visitor_company') || ''; } catch { return ''; } };

// Choose team → choose budget → features are pre-selected to fit → adjust → send.
// Only a rounded total range is ever shown, never a per-item price.
export default function BudgetPlanner() {
  const [step, setStep] = useState(1);
  const [team, setTeam] = useState('');
  const [budgetId, setBudgetId] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);
  const identity = useRef(null);
  const top = useRef(null);

  const est = useMemo(() => estimate(team, selected, budgetId), [team, selected, budgetId]);
  const status = budgetStatus(team, selected, budgetId);
  const groups = useMemo(() => {
    const g = {};
    for (const f of featuresFor(team)) (g[f.group] ||= []).push(f);
    return Object.entries(g);
  }, [team]);

  const go = n => { setStep(n); setError(''); setTimeout(() => top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0); };
  const chooseTeam = id => { setTeam(id); if (budgetId) setSelected(autoPick(id, budgetId)); go(2); };
  const chooseBudget = id => { setBudgetId(id); setSelected(autoPick(team, id)); go(3); };
  const toggle = id => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  async function send(e) {
    e.preventDefault();
    if (sending) return;
    if (!name.trim()) { setError('Please enter your name.'); return; }
    const sum = summaryLines({ team, budgetId, selected });
    let payload;
    try {
      payload = enquiryPayload({
        name, mobile, company, modelType: TEAM_TYPES.find(t => t.id === team)?.version || 'both',
        storeFiles: selected.has('uploads') ? 'yes' : 'unspecified', remarks: sum.remarks,
        interests: sum.features, selectedInterest: `Budget planner: ${sum.teamLabel}, ${sum.budget}`
      });
    } catch (err) { setError(err.message); return; }
    identity.current ||= { id: crypto.randomUUID(), editToken: crypto.randomUUID() };
    setSending(true); setError('');
    try {
      await saveEnquiryStep(supabase, payload, identity.current, { contactOnly: true });
      setDone(sum); go(5);
    } catch {
      setError('We could not send this right now. Please try again, or send it to us on WhatsApp.');
    } finally { setSending(false); }
  }

  const waText = () => {
    const s = summaryLines({ team, budgetId, selected });
    const who = name.trim() || storedName(), org = company.trim() || storedCompany();
    return encodeURIComponent(`Hi${who ? `, I'm ${who}${org ? ` from ${org}` : ''}` : ''}. I'd like a SolarFlow quotation.\nTeam: ${s.teamLabel}\nBudget: ${s.budget}\nEstimated range: ${s.estimate}\nFeatures: ${s.features.join(', ')}`);
  };

  const card = 'rounded-3xl border border-stone-200 bg-white p-4 sm:p-6 shadow-sm';
  const pill = on => `rounded-2xl border-2 p-4 text-left transition-colors min-h-[72px] ${on ? 'border-orange-500 bg-orange-50' : 'border-stone-200 bg-white hover:border-orange-300'}`;

  return (
    <section ref={top} className="scroll-mt-24 max-w-4xl mx-auto w-full space-y-4" aria-label="Build your SolarFlow plan">
      <ol className="flex gap-2 text-[11px] font-bold text-stone-500" aria-label="Steps">
        {['Team', 'Budget', 'Features', 'Send'].map((t, i) => (
          <li key={t} className={`flex-1 rounded-full px-3 py-1.5 text-center ${step > i ? 'bg-orange-500 text-stone-950' : 'bg-stone-100'}`}>{i + 1}. {t}</li>
        ))}
      </ol>

      {step === 1 && (
        <div className={card}>
          <h2 className="text-xl font-black text-stone-900">What best describes your business?</h2>
          <p className="mt-1 text-sm text-stone-500">We’ll suggest the right features for a team like yours.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {TEAM_TYPES.map(t => (
              <button key={t.id} type="button" onClick={() => chooseTeam(t.id)} className={pill(team === t.id)}>
                <strong className="block text-sm text-stone-900">{t.label}</strong>
                <span className="text-xs text-stone-500">{t.sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={card}>
          <h2 className="text-xl font-black text-stone-900">What budget do you have in mind?</h2>
          <p className="mt-1 text-sm text-stone-500">One-time licence, no monthly fee. Pick a range – we’ll fit the features to it.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BUDGETS.map(b => (
              <button key={b.id} type="button" onClick={() => chooseBudget(b.id)} className={pill(budgetId === b.id)}>
                <strong className="block text-base text-stone-900">{b.label}</strong>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => go(1)} className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-800"><ArrowLeft size={14}/> Back</button>
        </div>
      )}

      {step === 3 && (
        <div className={card}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-stone-900">Features that fit your budget</h2>
              <p className="mt-1 text-sm text-stone-500">We’ve ticked what fits {BUDGETS.find(b => b.id === budgetId)?.label}. Add or remove anything.</p>
            </div>
            <button type="button" onClick={() => go(2)} className="text-xs font-bold text-orange-700 underline">Change budget</button>
          </div>

          {includesBase(team) && (
            <div className="mt-5 flex gap-3 rounded-2xl bg-stone-50 p-3">
              <CheckCircle2 size={20} className="shrink-0 text-emerald-600"/>
              <div><strong className="block text-sm text-stone-900">{BASE.label} <span className="text-[11px] font-bold text-emerald-700">· always included</span></strong><span className="text-xs text-stone-500">{BASE.hint}</span></div>
            </div>
          )}

          {groups.map(([group, items]) => (
            <fieldset key={group} className="mt-5">
              <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">{group}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map(f => {
                  const on = selected.has(f.id);
                  return (
                    <label key={f.id} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm ${on ? 'border-orange-400 bg-orange-50 font-semibold text-stone-900' : 'border-stone-200 text-stone-700'}`}>
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(f.id)}/>
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on ? 'border-orange-500 bg-orange-500 text-white' : 'border-stone-300'}`}>{on && <Check size={14}/>}</span>
                      {f.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <div className={`sticky bottom-3 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 shadow-lg ${status === 'over' ? 'bg-amber-50 border border-amber-300' : 'bg-stone-900 text-white'}`} aria-live="polite">
            <div>
              <span className={`block text-[11px] font-bold uppercase tracking-wider ${status === 'over' ? 'text-amber-700' : 'text-amber-300'}`}>Estimated range</span>
              <strong className="text-lg">{est.label}</strong>
              <span className={`block text-xs ${status === 'over' ? 'text-amber-800' : 'text-stone-300'}`}>{status === 'over' ? 'This is above your budget. Remove a feature, or send it anyway and we’ll discuss.' : 'Fits your budget. Final price is confirmed in your quotation.'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={`https://wa.me/${WHATSAPP}?text=${waText()}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-[#073B1C]"><MessageCircle size={16}/> Send on WhatsApp</a>
              <button type="button" onClick={() => go(4)} className="sf-btn-primary min-h-11 px-5">Continue <ArrowRight size={16} className="inline"/></button>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <form onSubmit={send} className={card} noValidate>
          <h2 className="text-xl font-black text-stone-900">Where should we send your quotation?</h2>
          <p className="mt-1 text-sm text-stone-500">{TEAM_TYPES.find(t => t.id === team)?.label} · {BUDGETS.find(b => b.id === budgetId)?.label} · estimate {est.label} · {selected.size + (includesBase(team) ? 1 : 0)} features</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-stone-700">Your name *<input className="sf-input mt-1" value={name} onChange={e => setName(e.target.value)} autoComplete="name" required/></label>
            <label className="block text-xs font-bold text-stone-700">WhatsApp number *<input className="sf-input mt-1" value={mobile} onChange={e => setMobile(e.target.value)} inputMode="numeric" autoComplete="tel-national" placeholder="10-digit mobile" required/></label>
            <label className="block text-xs font-bold text-stone-700 sm:col-span-2">Company name<input className="sf-input mt-1" value={company} onChange={e => setCompany(e.target.value)} autoComplete="organization"/></label>
          </div>
          {error && <div role="alert" className="mt-3 text-sm font-semibold text-rose-700">{error}{' '}
            {name.trim() && <a href={`https://wa.me/${WHATSAPP}?text=${waText()}`} target="_blank" rel="noopener noreferrer" className="underline text-emerald-700">Send on WhatsApp</a>}</div>}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => go(3)} className="inline-flex items-center gap-1 text-xs font-bold text-stone-500"><ArrowLeft size={14}/> Back</button>
            <button type="submit" disabled={sending} className="sf-btn-primary min-h-11 flex-1 sm:flex-none px-6">
              {sending ? <LoaderCircle size={16} className="animate-spin inline"/> : null} {sending ? 'Sending…' : 'Get my quotation'}
            </button>
          </div>
        </form>
      )}

      {step === 5 && done && (
        <div className={`${card} text-center`}>
          <CheckCircle2 size={40} className="mx-auto text-emerald-600"/>
          <h2 className="mt-3 text-xl font-black text-stone-900">Thank you, {name.trim().split(' ')[0]}!</h2>
          <p className="mt-1 text-sm text-stone-600">We’ve received your plan ({done.budget}, estimate {done.estimate}). We’ll send your quotation on WhatsApp shortly.</p>
          <a href={`https://wa.me/${WHATSAPP}?text=${waText()}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#25D366] px-5 font-bold text-[#073B1C]"><MessageCircle size={18}/> Chat with us on WhatsApp</a>
        </div>
      )}
    </section>
  );
}
