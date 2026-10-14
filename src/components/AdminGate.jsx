import { useState } from 'react';
import { Lock } from 'lucide-react';
import { supabase } from '../supabase';
import { verifyPreparationPin } from '../enquiries/brief';

// Nothing on the admin page is shown until the admin code is checked by the server.
// The code itself is never in this website's code – only a hash of it is stored in Supabase.
const CODE_KEY = 'solarflow_admin_code';
export const readAdminCode = () => { try { return sessionStorage.getItem(CODE_KEY) || ''; } catch { return ''; } };
export const forgetAdminCode = () => { try { sessionStorage.removeItem(CODE_KEY); } catch { /* ignore */ } };

export default function AdminGate({ onUnlock }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      if (await verifyPreparationPin(supabase, code)) {
        try { sessionStorage.setItem(CODE_KEY, code); } catch { /* ignore */ }
        onUnlock(code);
      } else setError('Wrong code.');
    } catch { setError('Could not check the code. Try again.'); }
    setBusy(false);
  }
  return (
    <main className="mx-auto max-w-sm py-16 px-4">
      <form onSubmit={submit} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="flex items-center gap-2 text-xl font-black text-stone-900"><Lock size={18}/> Admin login</h1>
        <input type="password" autoComplete="current-password" maxLength={64} value={code} onChange={e => setCode(e.target.value)} placeholder="Admin code" aria-label="Admin code" className="sf-input mt-4" autoFocus/>
        {error && <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">{error}</p>}
        <button type="submit" disabled={busy || code.length < 8} className="sf-btn-primary mt-4 min-h-11 w-full disabled:opacity-50">{busy ? 'Checking…' : 'Log in'}</button>
        
      </form>
    </main>
  );
}
