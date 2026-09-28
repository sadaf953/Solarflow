export const DOCUMENT_OPTIONS = [
  'Quotation maker', 'Bill / invoice maker', 'BOM maker', 'Delivery challan maker',
  'Gate pass maker', 'DISCOM submission document maker', 'DISCOM submission auto print',
  'Feasibility document maker', 'MIS upload auto updater'
];
export const SOFTWARE_OPTIONS = ['Tally', 'Google Sheets', 'Microsoft Excel', 'Zoho', 'Odoo', 'Other third-party software'];
export const TEAM_SIZE_OPTIONS = ['1–3', '4–9', '10–29', '30–49', '50+', 'Not sure'];
export const YES_NO_OPTIONS = ['Yes', 'No', 'Not sure'];
export const INTEREST_OPTIONS = [
  'Option 1: Small team setup', 'Option 2: Detailed operations', 'A mix of both options', 'Tools only — no CRM',
  'Customer tracking', ...DOCUMENT_OPTIONS, 'Inventory', 'Warranty tracking',
  'Vendor login', 'Stamp staff login', 'Technician login', 'Dealers',
  'Channel partner offices (CPOs)', 'Branches', 'Staff management',
  'Installation view', 'Installation commission view', 'Vendor commission page',
  'Channel partner commission view', 'Operations page', 'Dealer-based filtering',
  'Finance', 'Attendance', 'Checklists', 'Document uploads'
];

const SINGLE_FIELDS = ['hasWebsite', 'teamSize', 'customerCount', 'liveCustomerCount', 'branches', 'partnerOffices', 'channelPartners'];
const CHOICES = {hasWebsite:YES_NO_OPTIONS, teamSize:TEAM_SIZE_OPTIONS, branches:YES_NO_OPTIONS,
  partnerOffices:YES_NO_OPTIONS, channelPartners:YES_NO_OPTIONS};

export function createPreparedBrief(draft) {
  const prepared = {};
  for (const key of SINGLE_FIELDS) {
    const value = String(draft[key] || '').trim();
    if (!value) continue;
    if (CHOICES[key] ? CHOICES[key].includes(value) : /^\d{1,8}$/.test(value)) prepared[key] = value;
  }
  for (const [key, allowed] of [['software', SOFTWARE_OPTIONS], ['interests', INTEREST_OPTIONS]]) {
    const values = [...new Set((Array.isArray(draft[key]) ? draft[key] : []).filter(value => allowed.includes(value)))];
    if (values.length) prepared[key] = values;
  }
  return prepared;
}

export function preparedBriefLink(baseUrl, draft) {
  const prepared = createPreparedBrief(draft);
  if (!Object.keys(prepared).length) throw new Error('Choose at least one answer to prepare for the client.');
  const token = btoa(encodeURIComponent(JSON.stringify(prepared))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${baseUrl.replace(/\/$/, '')}/#/plans?brief=${token}`;
}

export function readPreparedBrief(hash) {
  const token = new URLSearchParams(hash.split('?')[1] || '').get('brief');
  if (!token || token.length > 5000 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(atob(token.replace(/-/g, '+').replace(/_/g, '/'))));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const clean = createPreparedBrief(parsed);
    return Object.keys(clean).length ? clean : null;
  } catch { return null; }
}
