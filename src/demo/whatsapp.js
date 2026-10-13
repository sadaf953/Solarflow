// "Ask for a quotation on WhatsApp" – one helper used everywhere so the
// number and message stay consistent. Opens WhatsApp (the app on phones)
// with a message already typed, including the visitor's name/company when known.
export const SALES_WHATSAPP = '917981980910';

const read = key => { try { return localStorage.getItem(key) || ''; } catch { return ''; } };

export function rememberVisitor({ name, company } = {}) {
  try {
    if (name) localStorage.setItem('solarflow_visitor_name', name);
    if (company) localStorage.setItem('solarflow_visitor_company', company);
  } catch { /* storage may be unavailable */ }
}

export function quoteWhatsAppLink({ name, company, context, details } = {}) {
  const who = (name || read('solarflow_visitor_name')).replace(/\s*\(.*\)\s*$/, '').trim();
  const org = (company || read('solarflow_visitor_company')).trim();
  const intro = who ? `Hi, I'm ${who}${org ? ` from ${org}` : ''}.` : 'Hi,';
  const lines = [`${intro} I'd like a quotation for SolarFlow CRM.`];
  if (context) lines.push(`(Sent from: ${context})`);
  if (details) lines.push(details);
  return `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`;
}
