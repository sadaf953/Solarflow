import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDashboardMetrics } from '../../src/dashboard/metrics.js';

test('office and manager failures never request company-wide totals', async () => {
    const calls = [];
    const error = { message: 'Office ownership unavailable' };
    const client = { rpc: async (name, args) => { calls.push([name, args]); return { data: null, error }; } };
    assert.deepEqual(await loadDashboardMetrics(client, { restricted: true, partner: 'Other Office', dealer: 'Dealer 1' }), { data: null, error });
    assert.deepEqual(calls, [['get_cpo_dashboard_metrics', { p_dealer: 'Dealer 1' }]]);
});

test('office metrics preserve the database ownership scope and dealer filter', async () => {
    const client = { rpc: async (name, args) => {
        assert.equal(name, 'get_cpo_dashboard_metrics');
        assert.deepEqual(args, { p_dealer: null });
        return { data: { totalProjects: 2 }, error: null };
    } };
    assert.equal((await loadDashboardMetrics(client, { restricted: true })).data.totalProjects, 2);
});

test('head office retains its deployment fallback and selected partner', async () => {
    const calls = [];
    const client = { rpc: async (name, args) => {
        calls.push([name, args]);
        return name === 'get_dashboard_metrics_scoped'
            ? { error: { code: 'PGRST202' }, data: null }
            : { error: null, data: { totalProjects: 4 } };
    } };
    assert.equal((await loadDashboardMetrics(client, { restricted: false, partner: 'Office A' })).data.totalProjects, 4);
    assert.deepEqual(calls, [
        ['get_dashboard_metrics_scoped', { p_channel_partner: 'Office A', p_dealer: null }],
        ['get_dashboard_metrics', { p_channel_partner: 'Office A' }],
    ]);
});
