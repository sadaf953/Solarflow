import test from 'node:test';
import assert from 'node:assert/strict';
import { partnerScope, DEMO_PARTNER, DEMO_DEALER } from '../../src/demo/partnerScope.js';

const visitor = extra => ({ name: 'Sunny Chauhan', email: 'anon.1a2b3c4d@solarflow.demo', channel_partner: 'Demo Aurora Solar', ...extra });

test('a demo visitor as Channel Partners sees the demo partner, not their typed name', () => {
    assert.deepEqual(partnerScope(visitor({ userType: 'agent' })), { name: DEMO_PARTNER, partner: DEMO_PARTNER });
});

test('a demo visitor as Dealer sees Demo Dealer under the demo partner', () => {
    assert.deepEqual(partnerScope(visitor({ userType: 'agent2' })), { name: DEMO_DEALER, partner: DEMO_PARTNER });
    assert.deepEqual(partnerScope(visitor({ userType: 'agent2', channel_partner: '' })), { name: DEMO_DEALER, partner: DEMO_PARTNER });
});

test('real partner and dealer accounts keep their own names', () => {
    const real = { name: 'Ravi Solar', email: 'ravi@example.com', channel_partner: 'Ravi Solar', userType: 'agent' };
    assert.deepEqual(partnerScope(real), { name: 'Ravi Solar', partner: 'Ravi Solar' });
    const dealer = { name: ' Amit ', email: 'amit@example.com', channel_partner: 'Ravi Solar', userType: 'agent2' };
    assert.deepEqual(partnerScope(dealer), { name: 'Amit', partner: 'Ravi Solar' });
});
