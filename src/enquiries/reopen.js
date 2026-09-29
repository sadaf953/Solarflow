import { INTEREST_OPTIONS, SOFTWARE_OPTIONS } from './brief.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOTE_FIELDS = {
  'Selected option':'selectedInterest', 'Preferred call date':'callDate',
  'Preferred call time (Asia/Kolkata)':'callTime', 'Website':'hasWebsite',
  'Employees':'teamSize', 'Total customers':'customerCount',
  'Live customers':'liveCustomerCount', 'Other software':'otherSoftware',
  'Existing data':'dataStart', 'Branches':'branches',
  'Channel partner offices':'partnerOffices', 'Channel partners':'channelPartners',
  'Third-party or multiple installation teams':'installationTeams',
  'Stamp staff login':'stampStaffLogin', 'Technician logins':'technicianLogin',
  'Preferred storage provider':'storageProvider', 'Custom request':'remarks'
};

export function parseSubmittedEnquiryNotes(notes = '') {
  const fields = {interests:[], software:[], extraLines:[]};
  for (const line of String(notes).split('\n')) {
    if (!line.trim()) continue;
    const colon = line.indexOf(': ');
    if (colon < 0) { fields.extraLines.push(line); continue; }
    const label = line.slice(0, colon), value = line.slice(colon + 2);
    if (label === 'Interested in') {
      fields.interests = value.split(', ').filter(item => INTEREST_OPTIONS.includes(item));
    } else if (label === 'Current software') {
      fields.software = value.split(', ').filter(item => SOFTWARE_OPTIONS.includes(item));
    } else if (label === 'File storage') {
      fields.fileStorage = value.startsWith('Yes') ? 'Yes' : value.startsWith('No') ? 'No' : '';
    } else if (NOTE_FIELDS[label]) {
      fields[NOTE_FIELDS[label]] = value;
    } else {
      fields.extraLines.push(line);
    }
  }
  return fields;
}

export async function findSubmittedEnquiries(client, phoneSuffix) {
  if (!/^\d{4}$/.test(phoneSuffix)) throw new Error('Enter the last four digits of the client phone number.');
  const {data, error} = await client.rpc('find_submitted_enquiries', {p_phone_suffix:phoneSuffix});
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Submitted enquiries could not be loaded.');
  return data.filter(item => item && UUID.test(item.id) && typeof item.name === 'string'
    && typeof item.mobile === 'string' && item.mobile.endsWith(phoneSuffix))
    .map(item => ({...item, kind:'enquiry'}));
}

export async function updateSubmittedEnquiry(client, enquiry, payload, extraLines = []) {
  if (!UUID.test(enquiry?.id) || !/^\d{4}$/.test(enquiry?.suffix)) throw new Error('This saved enquiry cannot be updated.');
  const notes = [payload.notes, ...extraLines].filter(Boolean).join('\n');
  const {data, error} = await client.rpc('update_submitted_enquiry', {
    p_id:enquiry.id, p_phone_suffix:enquiry.suffix,
    p_company:payload.company_name, p_version:payload.version_type, p_notes:notes
  });
  if (error) throw error;
  if (data !== enquiry.id) throw new Error('The enquiry update was not confirmed.');
}
