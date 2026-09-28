import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreparedBrief, preparedBriefLink, readPreparedBrief} from '../../src/enquiries/brief.js';

test('prepared client link keeps only supported business answers and no contact details', () => {
 const draft={name:'Private Name',mobile:'9000000001',hasWebsite:'Yes',teamSize:'4–9',
  customerCount:'420',liveCustomerCount:'67',software:['Tally','Google Sheets','Unknown'],
  branches:'No',interests:['DISCOM submission document maker','Quotation maker','Unknown']};
 const link=preparedBriefLink('https://example.com/',draft);
 assert.ok(link.startsWith('https://example.com/#/plans?brief='));
 assert.doesNotMatch(link,/Private Name|9000000001/);
 assert.deepEqual(readPreparedBrief(new URL(link).hash),createPreparedBrief(draft));
 assert.deepEqual(readPreparedBrief(new URL(link).hash).software,['Tally','Google Sheets']);
 assert.deepEqual(readPreparedBrief(new URL(link).hash).interests,['DISCOM submission document maker','Quotation maker']);
});

test('malformed or unsupported prepared answers do not populate the client form', () => {
 assert.equal(readPreparedBrief('#/plans?brief=bad%'),null);
 assert.equal(readPreparedBrief('#/plans?brief=999'),null);
 const bogus=btoa(encodeURIComponent(JSON.stringify({software:'Tally',name:'private'})));
 assert.equal(readPreparedBrief(`#/plans?brief=${bogus}`),null);
 assert.throws(()=>preparedBriefLink('https://example.com',{}),/Choose at least one/);
});
