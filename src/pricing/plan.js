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
  { id: 'b1', label: 'Under ₹40k', min: 0, max: 40000 },
  { id: 'b2', label: '₹40k – ₹60k', min: 40000, max: 60000 },
  { id: 'b3', label: '₹60k – ₹80k', min: 60000, max: 80000 },
  { id: 'b4', label: '₹80k – ₹1.2L', min: 80000, max: 120000 },
  { id: 'b5', label: '₹1.2L and above', min: 120000, max: Infinity },
];

export const BASE = { id: 'core', label: 'Customer tracking & project stages', hint: 'Every customer from enquiry to subsidy, follow-ups, checklists and data export', price: 30000 };

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
export function autoPick(team, budgetId) {
  const budget = BUDGETS.find(b => b.id === budgetId);
  const picked = new Set();
  if (!budget || !PRIORITY[team]) return picked;
  let sum = includesBase(team) ? BASE.price : 0;
  for (const id of PRIORITY[team]) {
    const price = byId[id].price;
    if (sum + price <= budget.max) { picked.add(id); sum += price; }
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
