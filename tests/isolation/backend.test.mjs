import test from 'node:test';
import assert from 'node:assert/strict';

test('auth, database, storage and functions never contact the network', async () => {
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { calls++; throw new Error('Unexpected network request'); };
  try {
    const { supabase } = await import('../../src/supabase.js');
    const session = await supabase.auth.getSession();
    assert.equal(session.data.session, null);
    for (const result of await Promise.all([
      supabase.auth.signInWithPassword({ email: 'demo@example.invalid', password: 'test-only' }),
      supabase.auth.resetPasswordForEmail('demo@example.invalid'),
      supabase.from('admin').select('*'),
      supabase.from('admin').insert({ name: 'Synthetic test' }),
      supabase.storage.from('documents').upload('test.txt', new Blob(['test'])),
      supabase.functions.invoke('send-lead-to-vendor', { body: {} }),
    ])) assert.ok(result.error);
    assert.throws(() => supabase.channel('isolation-test').subscribe(), /demo is isolated/i);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = originalFetch; }
});
