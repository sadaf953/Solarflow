// Signature links for quotations.
// Staff make a link; the customer opens #/sign/<token>, reads the proposal and signs.
// The database functions live in supabase/migrations/20261022120000_quotation_signature_links.sql.

const SETUP_FILE = 'supabase/migrations/20261022120000_quotation_signature_links.sql';
const notSetUp = error => error?.code === 'PGRST202' || error?.code === '42883' || /could not find the function|does not exist/i.test(error?.message || '');

function friendly(error) {
    if (notSetUp(error)) return new Error(`Signature links are not set up on this database yet. Run ${SETUP_FILE} in the Supabase SQL Editor, then try again.`);
    return new Error(error?.message || 'The signature link could not be loaded. Please try again.');
}

export const signLinkUrl = token => `${window.location.origin}${window.location.pathname}#/sign/${token}`;
export const readSignToken = hash => (/^#\/sign\/([a-f0-9]{30,128})$/i.exec(hash || '') || [])[1] || null;

/** none | sent | expired | signed, from a quotations row (list or full). */
export function signState(row, now = Date.now()) {
    if (row?.signed_at) return 'signed';
    if (!row?.sign_sent_at) return 'none';
    return Date.parse(row.sign_expires_at) < now ? 'expired' : 'sent';
}

export async function createSignLink(client, quotationId) {
    const { data, error } = await client.rpc('quotation_sign_link', { p_quotation_id: quotationId });
    if (error) throw friendly(error);
    return { token: data.token, expiresAt: data.expires_at, url: signLinkUrl(data.token) };
}

export async function getSignRequest(client, token) {
    const { data, error } = await client.rpc('quotation_sign_request', { p_token: token });
    // Customers never need the setup details; staff see them when sending the link.
    if (error) throw new Error(notSetUp(error) ? 'This proposal link is not ready yet. Please ask your salesperson to send it again.' : friendly(error).message);
    return data || null;
}

/** Throws an error with code used / expired / unknown when the link can no longer be signed. */
export async function submitSignature(client, token, png, method) {
    const { error } = await client.rpc('submit_quotation_signature', { p_token: token, p_png: png, p_method: method });
    if (!error) return;
    const message = error.message || '';
    const code = /already signed/i.test(message) ? 'used' : /expired/i.test(message) ? 'expired' : /unknown link/i.test(message) ? 'unknown' : null;
    const failure = code ? new Error(message) : friendly(error);
    failure.code = code;
    throw failure;
}

export function signWhatsAppLink({ phone, customerName, companyName, kwp, number, url }) {
    const digits = String(phone || '').replace(/\D/g, '').slice(-10);
    const first = String(customerName || '').trim().split(/\s+/)[0] || 'there';
    const text = `Namaste ${first}, here is your ${companyName} solar proposal ${number} for ${kwp} kW. Please read it and accept it by signing here: ${url}`;
    return { href: `https://wa.me/${digits.length === 10 ? '91' + digits : ''}?text=${encodeURIComponent(text)}`, text };
}
