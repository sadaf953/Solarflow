import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeCommission, commissionStatus, commissionByDealer, formatRupees } from '../../src/commission/partnerCommission.js';
import { defaultCommission } from '../../src/constants.js';

test('leads and lost projects earn nothing; installed projects are earned', () => {
    assert.equal(commissionStatus('LEADS'), null);
    assert.equal(commissionStatus('LOST PROJECT'), null);
    assert.equal(commissionStatus(undefined), null);
    assert.equal(commissionStatus('REGISTRATION'), 'pending');
    assert.equal(commissionStatus('INSTALLATION STATUS'), 'pending');
    assert.equal(commissionStatus('GEO TAG PHOTO'), 'earned');
    assert.equal(commissionStatus('COMPLETED'), 'earned');
});

test('summary uses the same commission as the channel partner export', () => {
    const rows = [
        { id: 1, customer_name: 'A', stage: 'REGISTRATION', system_capacity_kwp: 3 },
        { id: 2, customer_name: 'B', stage: 'COMPLETED', system_capacity_kwp: 5 },
        { id: 3, customer_name: 'C', stage: 'LEADS', system_capacity_kwp: 10 },
        { id: 4, customer_name: 'D', stage: 'LOST PROJECT', system_capacity_kwp: 10 },
        { id: 5, customer_name: '', stage: 'METER INSTALLATION', system_capacity_kwp: null },
    ];
    const s = summarizeCommission(rows);
    assert.equal(s.count, 3);
    assert.equal(s.pending, defaultCommission(3));
    assert.equal(s.earned, defaultCommission(5) + defaultCommission(null));
    assert.equal(s.total, s.earned + s.pending);
    assert.equal(s.earnedCount, 2);
    assert.equal(s.pendingCount, 1);
    assert.equal(s.projects[0].status, 'pending');
    assert.ok(s.projects.some(p => p.name === 'Unnamed customer'));
});

test('empty or missing data gives zeros, not a crash', () => {
    for (const input of [[], null, undefined]) {
        const s = summarizeCommission(input);
        assert.equal(s.total, 0); assert.equal(s.count, 0); assert.deepEqual(s.projects, []);
    }
});

test('partner office totals split by dealer, with direct sales grouped', () => {
    const rows = [
        { stage: 'COMPLETED', system_capacity_kwp: 4, sub_channel_partner: 'Ravi' },
        { stage: 'REGISTRATION', system_capacity_kwp: 2, sub_channel_partner: ' Ravi ' },
        { stage: 'COMPLETED', system_capacity_kwp: 3, sub_channel_partner: '' },
    ];
    const groups = commissionByDealer(rows);
    assert.equal(groups[0].name, 'Ravi');
    assert.equal(groups[0].count, 2);
    assert.equal(groups[0].earned, defaultCommission(4));
    assert.equal(groups[1].name, 'Office (direct)');
});

test('rupees are shown with Indian grouping', () => {
    assert.equal(formatRupees(1234567), '₹12,34,567');
});
