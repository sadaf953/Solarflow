// Budget-based SolarFlow plan builder.
// Item prices are internal weights used only to pick features and to show a
// rounded total RANGE. They are never shown per item.

export const TEAM_TYPES = [
  { id: 'small', label: 'Small team', sub: '4–9 people', version: 'basic' },
  { id: 'growing', label: 'Growing team', sub: '10–29 people', version: 'both' },
  { id: 'large', label: 'Large team', sub: '30+ people, branches or dealers', version: 'advance' },
  { id: 'tools', label: 'Just the tools', sub: 'Quotations, BOM, documents – no CRM', version: 'both' },
];

export const BUDGETS = [
  { id: 'b1', label: 'Under ₹60k', min: 0, max: 60000 },
  { id: 'b2', label: '₹60k – ₹85k', min: 60000, max: 85000 },
  { id: 'b3', label: '₹85k – ₹1.2L', min: 85000, max: 120000 },
  { id: 'b4', label: '₹1.2L – ₹1.75L', min: 120000, max: 175000 },
  { id: 'b5', label: '₹1.75L and above', min: 175000, max: Infinity },
];

export const BASE = { id: 'core', label: 'Customer tracking & project stages', hint: 'Every customer from enquiry to subsidy, follow-ups, checklists and data export', price: 45000 };

export const FEATURES = [
  { id: 'quotation', group: 'Documents', label: 'Quotation maker', price: 8000 },
  { id: 'discom', group: 'Documents', label: 'DISCOM submission documents', price: 8000 },
  { id: 'bom', group: 'Documents', label: 'BOM maker', price: 6000 },
  { id: 'feasibility', group: 'Documents', label: 'Bank feasibility documents', price: 6000 },
  { id: 'invoice', group: 'Documents', label: 'Bill / invoice maker', price: 6000 },
  { id: 'challan', group: 'Documents', label: 'Delivery challan & gate pass', price: 6000 },
  { id: 'tally', group: 'Documents', label: 'Delivery truck tally checklist', price: 4000 },
  { id: 'inventory', group: 'Operations', label: 'Inventory & stock', price: 12000 },
  { id: 'installation', group: 'Operations', label: 'Installation tracking & photos', price: 8000 },
  { id: 'finance', group: 'Operations', label: 'Payments & loan tracking', price: 8000 },
  { id: 'uploads', group: 'Operations', label: 'Customer document uploads', price: 6000 },
  { id: 'attendance', group: 'Operations', label: 'Staff attendance', price: 8000 },
  { id: 'calendar', group: 'Operations', label: 'Calendar', price: 4000 },
  { id: 'vendors', group: 'Team & partners', label: 'Vendor logins', price: 10000 },
  { id: 'technicians', group: 'Team & partners', label: 'Technician logins', price: 6000 },
  { id: 'dealers', group: 'Team & partners', label: 'Dealers & channel partner offices', price: 15000 },
  { id: 'branches', group: 'Team & partners', label: 'Branches', price: 12000 },
  { id: 'commission', group: 'Team & partners', label: 'Commission views', price: 10000 },
  { id: 'staff', group: 'Team & partners', label: 'Staff management', price: 5000 },
];

const PRIORITY = {
  small: ['quotation', 'discom', 'bom', 'feasibility', 'uploads', 'calendar', 'finance', 'invoice', 'installation', 'inventory', 'technicians', 'attendance', 'challan', 'tally', 'staff', 'vendors', 'commission', 'dealers', 'branches'],
  growing: ['quotation', 'discom', 'bom', 'installation', 'inventory', 'feasibility', 'finance', 'vendors', 'invoice', 'uploads', 'challan', 'technicians', 'attendance', 'commission', 'staff', 'calendar', 'dealers', 'tally', 'branches'],
  large: ['quotation', 'discom', 'bom', 'inventory', 'installation', 'dealers', 'branches', 'vendors', 'commission', 'finance', 'challan', 'feasibility', 'invoice', 'technicians', 'staff', 'attendance', 'uploads', 'tally', 'calendar'],
  tools: ['quotation', 'bom', 'discom', 'feasibility', 'invoice', 'challan', 'tally'],
};

export const featuresFor = team => team === 'tools' ? FEATURES.filter(f => f.group === 'Documents') : FEATURES;
export const includesBase = team => team !== 'tools';
const byId = Object.fromEntries(FEATURES.map(f => [f.id, f]));

export function total(team, selected) {
  return (includesBase(team) ? BASE.price : 0) + [...selected].reduce((sum, id) => sum + (byId[id]?.price || 0), 0);
}

// Pick features in priority order while the total stays inside the budget.
export function autoPick(team, budgetId, reserve = 0) {
  const budget = BUDGETS.find(b => b.id === budgetId);
  const picked = new Set();
  if (!budget || !PRIORITY[team]) return picked;
  let sum = includesBase(team) ? BASE.price : 0;
  for (const id of PRIORITY[team]) {
    const price = byId[id].price;
    if (sum + price + reserve <= budget.max) { picked.add(id); sum += price; }
  }
  return picked;
}

const floor5k = n => Math.max(5000, Math.floor(n / 5000) * 5000);
const ceil5k = n => Math.ceil(n / 5000) * 5000;
const fmt = n => n >= 100000 ? `₹${(n / 100000).toFixed(2).replace(/\.?0+$/, '')}L` : `₹${Math.round(n / 1000)}k`;

// Rounded range shown to the visitor, never an exact amount. When the
// selection fits the chosen budget, the range is kept inside that budget.
export function estimate(team, selected, budgetId) {
  const t = total(team, selected);
  if (!t) return { low: 0, high: 0, label: '—', total: 0 };
  let low = floor5k(t * 0.95), high = ceil5k(t * 1.05);
  const budget = BUDGETS.find(b => b.id === budgetId);
  if (budget && t <= budget.max) {
    if (Number.isFinite(budget.max)) high = Math.min(high, budget.max);
    if (t >= budget.min) low = Math.max(low, budget.min);
  }
  if (high <= low) high = low + 5000;
  return { low, high, total: t, label: `${fmt(low)} – ${fmt(high)}` };
}

export function budgetStatus(team, selected, budgetId) {
  const budget = BUDGETS.find(b => b.id === budgetId);
  if (!budget) return 'none';
  const t = total(team, selected);
  return t > budget.max ? 'over' : 'within';
}

export function summaryLines({ team, budgetId, selected }) {
  const teamLabel = TEAM_TYPES.find(t => t.id === team)?.label || team;
  const budget = BUDGETS.find(b => b.id === budgetId)?.label || 'Not chosen';
  const est = estimate(team, selected, budgetId);
  const names = [...(includesBase(team) ? [BASE.label] : []), ...FEATURES.filter(f => selected.has(f.id)).map(f => f.label)];
  return {
    teamLabel, budget, estimate: est.label, features: names,
    remarks: `Budget planner – Team: ${teamLabel}; Budget: ${budget}; Estimated range: ${est.label}; ${budgetStatus(team, selected, budgetId) === 'over' ? 'Selection is ABOVE their budget' : 'Selection fits their budget'}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Two versions. Essentials = the simpler, cheaper CRM (the "basic version").
// Paste Google Drive preview links (images / PDFs / short videos) in PREVIEWS;
// a "See example" button appears automatically wherever a link is filled in.
// Essentials list price, with a founding price until FOUNDING_UNTIL (switches automatically).
export const ESSENTIALS_LIST = 45000;
export const ESSENTIALS_FOUNDING = 40000;
export const FOUNDING_UNTIL = '2026-10-31';
export const foundingActive = (now = new Date()) => now <= new Date(`${FOUNDING_UNTIL}T23:59:59+05:30`);
export const ESSENTIALS_BASE = foundingActive() ? ESSENTIALS_FOUNDING : ESSENTIALS_LIST;

// What a typical per-user CRM subscription costs, for the comparison line.
// Zoho CRM India lists ₹800–₹1,400 per user/month (Standard–Professional), Oct 2026.
export const SUBSCRIPTION_PER_USER_MONTH = [800, 1400];
export function subscriptionCost(users, years = 3) {
  return SUBSCRIPTION_PER_USER_MONTH.map(p => p * users * 12 * years);
}
export const fmtINR = n => fmt(n);

export const PREVIEWS = {
  essentials: '',   // e.g. screenshot of the 4-tab customer card
  complete: '',     // e.g. screenshot of the stage-wise customer card
  discom: '',       // sample DISCOM submission document
  feasibility: '',  // sample bank feasibility document
  quotation: '',    // sample quotation
  checklists: '',
  drive: '',
};

export const VERSIONS = [
  { id: 'essentials', name: 'SolarFlow Essentials', from: foundingActive() ? 'From ₹40k (founding price, then ₹45k)' : 'From ₹45k', who: 'Up to 8 people · one office · simple tracking',
    points: ['Customer card with 4 tabs – everything on one screen', 'Choose your own fields to track', 'Checklists instead of file uploads', 'Google Drive folder link on every customer'],
    not: 'No dealer/CPO logins or staff hierarchy' },
  { id: 'complete', name: 'SolarFlow Complete', from: 'Most teams ₹85k – ₹1.2L', who: 'Bigger teams · stage-by-stage work · dealers & branches',
    points: ['A tab for every stage of the project', 'Inventory, BOM, delivery & installation', 'Dealer, CPO, vendor & staff logins', 'Commissions, attendance and reports'] },
  { id: 'tools', name: 'Just the tools', from: 'Pay only for the tools you pick', who: 'No CRM – only the document makers',
    points: ['Quotation, BOM and invoice makers', 'DISCOM & bank feasibility documents', 'Delivery challan & truck checklist'] },
];


export const ESSENTIALS_INCLUDES = [
  { label: 'Customer card with 4 tabs', hint: 'All of one customer’s details, documents, payments and progress on one screen – no stage-by-stage tabs to fill.' },
  { label: 'Fields you choose', hint: 'Add, rename or hide the details you track (consumer no., kW, DISCOM, loan bank…). No developer needed.', preview: 'essentials' },
  { label: 'Checklists', hint: 'Tick off documents and steps for each customer instead of uploading every file.', preview: 'checklists' },
  { label: 'Google Drive links', hint: 'Paste each customer’s Drive folder link and open it in one tap. Files stay in your own Drive.', preview: 'drive' },
  { label: 'Search, filters & Excel export', hint: 'Find any customer fast and download everything whenever you want.' },
];
export const ESSENTIALS_ADDONS = [
  { id: 'discom', label: 'DISCOM submission document', hint: 'Fill the customer once and print the DISCOM file in the right format.', price: 8000, preview: 'discom' },
  { id: 'feasibility', label: 'Bank feasibility document', hint: 'Ready-to-print feasibility report for loan customers.', price: 6000, preview: 'feasibility' },
  { id: 'quotation', label: 'Quotation maker', hint: 'Branded quotations from the customer card.', price: 8000, preview: 'quotation' },
];

export const TEAM_SIZES = ['1–3', '4–9', '10–29', '30–49', '50+', 'Not sure'];
export const CUSTOMER_COUNTS = ['Under 200', '200 – 1,000', '1,000 – 5,000', '5,000+'];
export const LIVE_COUNTS = ['Under 50', '50 – 200', '200 – 500', '500+'];
export const SOFTWARE = ['Excel / Google Sheets', 'WhatsApp / notebook', 'Tally', 'Zoho', 'Odoo', 'Other software', 'Nothing yet'];
export const DATA_TRANSFER = ['Yes, bring my existing data', 'No, start fresh', 'Not sure'];

const TRANSFER_PRICE = { 'Under 200': 3000, '200 – 1,000': 6000, '1,000 – 5,000': 10000, '5,000+': 15000 };
export const transferPrice = (answer, customers) => answer?.startsWith('Yes') ? (TRANSFER_PRICE[customers] ?? 6000) : 0;

// Which bucket of the feature planner a team size maps to.
export const teamBucket = size => ({ '1–3': 'small', '4–9': 'small', '10–29': 'growing', '30–49': 'large', '50+': 'large' })[size] || 'growing';

// Suggest a version from the answers (visitor can still switch).
export function recommend({ team, live }) {
  if (['1–3', '4–9'].includes(team) && live !== '500+') return 'essentials';
  return 'complete';
}

export function rangeLabel(total) {
  if (!total) return '—';
  let low = floor5k(total * 0.95), high = ceil5k(total * 1.05);
  if (high <= low) high = low + 5000;
  return `${fmt(low)} – ${fmt(high)}`;
}
export function essentialsTotal(addons, transfer) {
  return ESSENTIALS_BASE + [...addons].reduce((s, id) => s + (ESSENTIALS_ADDONS.find(a => a.id === id)?.price || 0), 0) + transfer;
}
// Essentials never shows below its ₹40k starting price.
export function essentialsRange(total) {
  const low = Math.max(ESSENTIALS_BASE, floor5k(total));
  let high = ceil5k(total * 1.1);
  if (high <= low) high = low + 5000;
  return `${fmt(low)} – ${fmt(high)}`;
}
// Range for any total, kept inside the chosen budget when it fits.
export function budgetRange(t, budgetId) {
  if (!t) return '—';
  let low = floor5k(t * 0.95), high = ceil5k(t * 1.05);
  const budget = BUDGETS.find(b => b.id === budgetId);
  if (budget && t <= budget.max) {
    if (Number.isFinite(budget.max)) high = Math.min(high, budget.max);
    if (t >= budget.min) low = Math.max(low, budget.min);
  }
  if (high <= low) high = low + 5000;
  return `${fmt(low)} – ${fmt(high)}`;
}

const USERS_FOR_TEAM = { '1–3': 3, '4–9': 8, '10–29': 20, '30–49': 40, '50+': 50 };
// "A per-user CRM for N people costs ₹A – ₹B over 3 years" (null if team unknown).
export function subscriptionLine(team) {
  const users = USERS_FOR_TEAM[team];
  if (!users) return null;
  const [lo, hi] = subscriptionCost(users);
  return { users, label: `${fmt(lo)} – ${fmt(hi)}` };
}
