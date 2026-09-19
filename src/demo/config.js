// Explicitly supplied NEW demo project. Never fall back to another backend.
export const DEMO_PROJECT_REF = 'qduonewmquwayrnwyzvc';
export const DEMO_URL = `https://${DEMO_PROJECT_REF}.supabase.co`;
export function isDemoPublicKey(key) {
  if (typeof key !== 'string') return false;
  if (key.startsWith('sb_publishable_')) return true;
  try {
    const claims = JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    return claims.role === 'anon' && claims.ref === DEMO_PROJECT_REF;
  } catch { return false; }
}
