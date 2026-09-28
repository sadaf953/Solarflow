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
  if (prepared.software?.includes('Other third-party software')) {
    const otherSoftware = String(draft.otherSoftware || '').trim().replace(/[\r\n]+/g, ' ').slice(0, 200).trim();
    if (otherSoftware) prepared.otherSoftware = otherSoftware;
  }
  return prepared;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function preparedBriefLink(baseUrl, id) {
  if (!UUID.test(id)) throw new Error('Invalid prepared form reference.');
  return `${baseUrl.replace(/\/$/, '')}/#/plans?brief=${id}`;
}

export function readPreparedBriefId(hash) {
  const id = new URLSearchParams(hash.split('?')[1] || '').get('brief');
  return id && UUID.test(id) ? id : null;
}

async function ensureSession(client) {
  const {data, error} = await client.auth.getSession();
  if (error) throw error;
  if (!data?.session) {
    const {error: signInError} = await client.auth.signInAnonymously();
    if (signInError) throw signInError;
  }
}

export async function createSavedBrief(client, draft) {
  const prepared = createPreparedBrief(draft);
  if (!Object.keys(prepared).length) throw new Error('Choose at least one answer to prepare for the client.');
  await ensureSession(client);
  const {data, error} = await client.rpc('create_prepared_brief', {p_answers:prepared});
  if (error) throw error;
  if (!data || !UUID.test(data.id) || !/^[0-9A-F]{12}$/.test(data.code)) throw new Error('The prepared form was not confirmed. Please try again.');
  return data;
}

export async function unlockSavedBrief(client, id, code) {
  if (!UUID.test(id)) throw new Error('This prepared form link is invalid.');
  await ensureSession(client);
  const {data, error} = await client.rpc('unlock_prepared_brief', {p_id:id, p_code:code});
  if (error) throw error;
  if (!data) throw new Error('That code is incorrect or the prepared form has expired.');
  const prepared = createPreparedBrief(data);
  if (!Object.keys(prepared).length) throw new Error('The prepared form has no usable answers.');
  return prepared;
}
