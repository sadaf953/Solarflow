import test from 'node:test';
import assert from 'node:assert/strict';
import {logFieldLabel,readableLogText} from '../../src/constants.js';

test('vendor columns are logged with installation-team labels',()=>{
 assert.equal(logFieldLabel('vendor_quote'),'INSTALLATION TEAM QUOTE');
 assert.equal(logFieldLabel('vendor'),'INSTALLATION TEAM');
 assert.equal(logFieldLabel('module_wp'),'MODULE WP');
});

test('older log rows lose the vendor wording when shown',()=>{
 assert.equal(readableLogText('Ravi: Assigned vendor to Vendor 2'),'Ravi: Assigned installation team to Installer 2');
 assert.equal(readableLogText('VENDOR QUOTE: None → 5000 | VENDOR PAYMENT STATUS: Pending → Paid'),'INSTALLATION TEAM QUOTE: None → 5000 | INSTALLATION TEAM PAYMENT STATUS: Pending → Paid');
 assert.equal(readableLogText('VENDOR: Demo Vendor 1 → Installer 3'),'INSTALLATION TEAM: Installer 1 → Installer 3');
 assert.equal(readableLogText('VENDOR GIVE UP APPROVED: false → true'),'INSTALLATION TEAM GIVE UP APPROVED: false → true');
});

test('official terms and other text stay as they are',()=>{
 assert.equal(readableLogText('VENDOR FEASIBILITY: false → true'),'VENDOR FEASIBILITY: false → true');
 assert.equal(readableLogText('Uploaded Vendor Feasibility'),'Uploaded Vendor Feasibility');
 assert.equal(readableLogText(null),null);
});

test('unchanged fields in older entries are hidden',async()=>{
 const {withoutUnchangedFields,logDetailText}=await import('../../src/constants.js');
 assert.equal(withoutUnchangedFields('Ketan Sharma: MODULE WP: 580 → 580 | NO OF MODULES: 5 → 5'),null);
 assert.equal(withoutUnchangedFields('Ketan Sharma: MODULE WP: 580 → 580 | DC CABLE: None → 40'),'Ketan Sharma: DC CABLE: None → 40');
 assert.equal(withoutUnchangedFields('Ketan Sharma: INVOICE VALUE: 2,29,000 → 229000'),null);
 assert.equal(withoutUnchangedFields('Ketan Sharma: AC CABLE: None → 20 | DC CABLE: None → 40'),'Ketan Sharma: AC CABLE: None → 20 | DC CABLE: None → 40');
 assert.equal(withoutUnchangedFields('Ketan Sharma: Stage changed'),'Ketan Sharma: Stage changed');
 assert.equal(logDetailText('Stage: LOAN → MATERIAL ORDER'),'Stage: LOAN → MATERIAL ORDER');
 assert.equal(logDetailText('8b161de7-e6a7-46e3-9df3-5794e2ee5377'),'');
});
