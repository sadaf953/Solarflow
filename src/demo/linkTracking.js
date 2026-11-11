import { supabase, DEMO_ISOLATED } from '../supabase';

// Personal links carry a client code: ?c=a1b2c3d4e5 (in the query or after #/plans?).
// We remember it for this browser so the video play / demo / quote later in the
// visit count for the same client. Logging never blocks or breaks the page.
const KEY = 'solarflow_client_code';
const VALID = /^[a-f0-9]{10}$/;

export function readClientCode(loc = typeof window !== 'undefined' ? window.location : null) {
  if (!loc) return '';
  try {
    const qs = new URLSearchParams(loc.search || '');
    const hs = new URLSearchParams((loc.hash || '').split('?')[1] || '');
    const fromUrl = String(qs.get('c') || hs.get('c') || '').trim().toLowerCase();
    if (VALID.test(fromUrl)) { try { localStorage.setItem(KEY, fromUrl); } catch { /* private mode */ } return fromUrl; }
    const saved = (() => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } })();
    return VALID.test(saved) ? saved : '';
  } catch { return ''; }
}

export function logLinkEvent(event, page = '') {
  const code = readClientCode();
  if (!code || DEMO_ISOLATED) return;
  try {
    supabase.rpc('log_link_event', { p_code: code, p_event: event, p_page: page || null }).then(() => {}, () => {});
  } catch { /* never break the page */ }
}
