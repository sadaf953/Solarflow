import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSubmittedEnquiryNotes} from '../../src/enquiries/reopen.js';

test('saved enquiry notes restore form selections and retain unfamiliar lines', () => {
  const fields = parseSubmittedEnquiryNotes([
    'Selected option: Option 1: Small team setup',
    'File storage: Yes',
    'Preferred storage provider: Google personal account',
    'Preferred call date: 2026-09-29',
    'Website: Yes',
    'Current software: Tally, Other third-party software',
    'Other software: Example ERP',
    'Interested in: Quotation maker, BOM maker',
    'Custom request: Need a call after lunch',
    'Legacy answer: keep this answer'
  ].join('\n'));
  assert.equal(fields.selectedInterest, 'Option 1: Small team setup');
  assert.equal(fields.fileStorage, 'Yes');
  assert.equal(fields.storageProvider, 'Google personal account');
  assert.equal(fields.callDate, '2026-09-29');
  assert.equal(fields.hasWebsite, 'Yes');
  assert.deepEqual(fields.software, ['Tally', 'Other third-party software']);
  assert.deepEqual(fields.interests, ['Quotation maker', 'BOM maker']);
  assert.equal(fields.otherSoftware, 'Example ERP');
  assert.equal(fields.remarks, 'Need a call after lunch');
  assert.deepEqual(fields.extraLines, ['Legacy answer: keep this answer']);
});
