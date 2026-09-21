export function enquiryPayload({name, company, mobile, modelType, storeFiles, remarks}) {
 const phone = mobile.trim().replace(/[\s()-]/g, '').replace(/^\+91/, '');
 if (!/^\d{10}$/.test(phone)) throw new Error('Please enter a valid 10-digit mobile number.');
 return {
  name: name.trim() || 'Prospective Client', company_name: company.trim() || null,
  mobile_number: phone, version_type: modelType,
  notes: [`File storage: ${storeFiles === 'yes' ? 'Yes' : 'No'}`, remarks.trim()].filter(Boolean).join('\n'),
  status: 'new'
 };
}
export async function submitEnquiry(client, payload) {
 const result = await client.from('enquiries').insert([payload]);
 if (result?.error) throw result.error;
 if (!result || result.status < 200 || result.status >= 300 || !Number.isInteger(result.status)) {
  throw new Error('Save confirmation was not received.');
 }
}
