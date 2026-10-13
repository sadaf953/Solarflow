import test from 'node:test';
import assert from 'node:assert/strict';
import { autoPick, estimate, total, budgetStatus, BUDGETS } from '../src/pricing/plan.js';

test('auto-pick never exceeds the chosen budget', () => {
  for (const team of ['small', 'growing', 'large', 'tools'])
    for (const b of BUDGETS.slice(0, 4)) assert.ok(total(team, autoPick(team, b.id)) <= b.max, `${team} ${b.id}`);
});
test('small team at 40–60k gets the starter tools', () => {
  const s = autoPick('small', 'b2');
  for (const id of ['quotation', 'discom', 'bom']) assert.ok(s.has(id));
  assert.equal(budgetStatus('small', s, 'b2'), 'within');
});
test('estimate is a rounded range, not the exact total', () => {
  const e = estimate('small', autoPick('small', 'b2'));
  assert.ok(e.low <= e.total && e.high >= e.total);
  assert.equal(e.low % 5000, 0); assert.equal(e.high % 5000, 0);
});
test('adding beyond budget is flagged', () => {
  const s = autoPick('small', 'b1'); s.add('dealers'); s.add('branches');
  assert.equal(budgetStatus('small', s, 'b1'), 'over');
});
