import test from 'node:test';
import assert from 'node:assert/strict';
import { recommend, quote, offer, rangeLabel as rl } from '../src/pricing/packages.js';
test('small team without dealers gets Lite at its typical price when starting fresh', () => {
  const pkg = recommend({ team: '1–3', dealers: 'No', operations: 'No' });
  assert.equal(pkg, 'starter');
  assert.equal(quote({ pkg, data: 'fresh', customers: 'Under 500', addons: new Set() }).total, offer(38000));
});
test('dealers stay in Lite, 11–25 → Standard, stock or 26–50 → Pro, branches or 50+ → Complete', () => {
  assert.equal(recommend({ team: '4–6', dealers: 'Yes', operations: 'No' }), 'starter');
  assert.equal(recommend({ team: '4–6', dealers: 'No', operations: 'Yes' }), 'pro');
  assert.equal(recommend({ team: '11–25', dealers: 'No', operations: 'No' }), 'growth');
  assert.equal(recommend({ team: '26–50', dealers: 'No', operations: 'No' }), 'pro');
  assert.equal(recommend({ team: '50+', dealers: 'No', operations: 'No' }), 'complete');
  assert.equal(recommend({ team: '4–6', dealers: 'No', stock: 'No', branches: 'Yes' }), 'complete');
});
test('moving data costs more than starting fresh', () => {
  const fresh = quote({ pkg: 'growth', data: 'fresh', customers: '500 – 2,000', addons: new Set() }).total;
  const move = quote({ pkg: 'growth', data: 'move', customers: '500 – 2,000', addons: new Set() }).total;
  assert.ok(move > fresh);
});
test('an extra the package does not sell is ignored', () => {
  assert.equal(quote({ pkg: 'growth', data: 'fresh', customers: '', addons: new Set(['quotation']) }).total, offer(58000));
});

import { recommendCard, recommendFor } from '../src/pricing/packages.js';
test('fewer things to track suggests the simple card and Lite', () => {
  const a = { team: '1–3', dealers: 'No', operations: 'No', live: 'Under 50', track: 'Just the basics' };
  assert.equal(recommendCard(a), 'simple');
  assert.equal(recommendFor(a), 'starter');
});
test('every stage suggests the stage card and never Lite', () => {
  const a = { team: '1–3', dealers: 'No', operations: 'No', live: 'Under 50', track: 'Every stage separately' };
  assert.equal(recommendCard(a), 'stage');
  assert.equal(recommendFor(a), 'growth');
  assert.equal(recommendCard({ ...a, track: 'Not sure', team: '11–25', live: '200 – 500' }), 'stage');
  assert.equal(recommendCard({ ...a, track: 'Not sure' }), 'simple');
});

import { fitsTeam } from '../src/pricing/packages.js';
test('user limits: Lite 10, Standard 25, Pro 50, Complete unlimited', () => {
  assert.equal(fitsTeam('starter', '7–10'), true);
  assert.equal(fitsTeam('starter', '11–25'), false);
  assert.equal(fitsTeam('growth', '11–25'), true);
  assert.equal(fitsTeam('growth', '26–50'), false);
  assert.equal(fitsTeam('pro', '26–50'), true);
  assert.equal(fitsTeam('pro', '50+'), false);
  assert.equal(fitsTeam('complete', '50+'), true);
  assert.equal(recommend({ team: '7–10', dealers: 'No', operations: 'No' }), 'starter');
  assert.equal(recommendFor({ team: '50+', dealers: 'No', operations: 'No', track: 'Just the basics', live: 'Under 50' }), 'complete');
  assert.equal(recommendFor({ team: '26–50', dealers: 'No', operations: 'No', track: 'Just the basics', live: 'Under 50' }), 'pro');
  assert.equal(recommendFor({ team: '11–25', dealers: 'No', operations: 'No', track: 'Just the basics', live: 'Under 50' }), 'growth');
});

import { defaultsFor, computePackage, simpleAllowed } from '../src/pricing/packages.js';
import { PACKAGES as PK } from '../src/pricing/packages.js';
test('four tiers: Lite uses the simple card, the others the stage card', () => {
  assert.deepEqual(PK.map(p => p.name), ['Lite', 'Standard', 'Pro', 'Complete']);
  assert.deepEqual(PK.find(p => p.id === 'starter').cards, ['simple']);
  assert.deepEqual(PK.find(p => p.id === 'growth').cards, ['stage']);
  assert.ok(PK.every(p => p.floor < p.range[0]), 'the floor is below the range shown');
});

test('ticked logins and documents decide the package', () => {
  const d = defaultsFor('starter');
  assert.deepEqual(d.logins, ['admin', 'staff', 'dealer']);
  assert.deepEqual(d.docs, ['quotation', 'discom', 'feasibility']);
  assert.equal(computePackage({ team: '4–6', card: 'simple', ...d }), 'starter');
  assert.equal(computePackage({ team: '11–25', card: 'simple', ...d }), 'growth');
  assert.equal(computePackage({ team: '4–6', card: 'stage', ...d }), 'growth'); // the stage card starts at Standard
  assert.equal(computePackage({ team: '4–6', card: 'stage', logins: d.logins, docs: ['bom'] }), 'pro');
  assert.equal(computePackage({ team: '4–6', card: 'stage', logins: ['branch'], docs: [] }), 'complete');
  assert.equal(computePackage({ team: '26–50', card: 'stage', logins: ['admin'], docs: [] }), 'pro');
  assert.equal(simpleAllowed({ team: '4–6', logins: ['installer'], docs: [] }), false);
  assert.equal(simpleAllowed({ team: '4–6', logins: ['dealer'], docs: [] }), true);
  assert.equal(simpleAllowed({ team: '11–25', logins: ['dealer'], docs: [] }), false);
});

import { helpPick, helpAddons } from '../src/pricing/packages.js';
test('helper: team size sets the package; godown & delivery → Pro; branches → Complete', () => {
  assert.equal(helpPick('1–10', ['customers']), 'starter');
  assert.equal(helpPick('1–10', ['dealers']), 'starter');           // dealer logins are in Lite
  assert.equal(helpPick('1–10', ['dealers', 'stock']), 'pro');      // godown & delivery are in Pro
  assert.deepEqual(helpAddons(['dealers', 'stock']), []);
  assert.equal(helpPick('11–25', []), 'growth');
  assert.equal(helpPick('26–50', ['dealers']), 'pro');
  assert.equal(helpPick('1–10', ['branches']), 'complete');
  assert.equal(helpPick('50+', ['customers']), 'complete');
});

import { rangeLabel, packageRange } from '../src/pricing/packages.js';
test('clients see price ranges, not exact prices', () => {
  assert.equal(packageRange('starter'), '₹30k – ₹45k');
  assert.equal(packageRange('growth'), '₹50k – ₹65k');
  assert.equal(packageRange('pro'), '₹65k – ₹85k');
  assert.equal(packageRange('complete'), '₹90k – ₹1.3L');
  assert.equal(rangeLabel([40000, 60000], 10000), '₹50k – ₹70k');
  const q = quote({ pkg: 'growth', data: 'move', customers: '500 – 2,000', addons: new Set(), card: 'stage' });
  assert.equal(q.range, rl([offer(50000), offer(65000)], offer(10000)));
  assert.equal(q.publicLines[0].amount, '₹50k – ₹65k');
});

import { addonsFor, includedFeatures } from '../src/pricing/packages.js';
test('extras: Lite is sold as it is, Standard and Pro can add what the next tier has', () => {
  const ids = id => addonsFor(id).map(a => a.id);
  assert.deepEqual(ids('starter'), []);
  assert.deepEqual(ids('growth'), ['delivery', 'installation', 'godown', 'attendance', 'calendar', 'commission_install']);
  assert.deepEqual(ids('pro'), ['attendance', 'calendar']);
  assert.deepEqual(ids('complete'), []);
  assert.ok(includedFeatures('pro').some(a => a.id === 'delivery'));
  assert.ok(!includedFeatures('complete').some(a => a.id === 'commission_both'));
  assert.equal(quote({ pkg: 'starter', data: 'fresh', customers: '', addons: new Set(['godown']), card: 'simple' }).total, 38000);
  assert.equal(quote({ pkg: 'growth', data: 'fresh', customers: '', addons: new Set(['calendar']), card: 'stage' }).total, 60000);
  assert.equal(quote({ pkg: 'complete', data: 'fresh', customers: '', addons: new Set(['commercial']), card: 'stage' }).total, 105000); // launching soon – not sellable
});
