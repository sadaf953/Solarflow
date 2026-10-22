// Runs supabase/migrations/20261022120000_quotation_signature_links.sql in PGlite.
// PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node tests/quotations/signing.sql.test.mjs
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const migration=await readFile(new URL('../../supabase/migrations/20261022120000_quotation_signature_links.sql',import.meta.url),'utf8');
const staff='11111111-1111-4111-8111-111111111111',quote='22222222-2222-4222-8222-222222222222';
const png='data:image/png;base64,iVBORw0KGgo=';
const db=new PGlite();
await db.exec(`
 create role anon; create role authenticated;
 create schema auth; create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('qa.uid',true),'')::uuid$$;
 grant usage on schema auth to anon, authenticated;
 create table public.quotations(
  id uuid primary key, demo_session_id uuid, owner_id uuid, quotation_no bigint, customer_name text, valid_until date,
  status text not null default 'draft' check(status in ('draft','issued','lost','converted')), issued_at timestamptz,
  lost_reason text, lost_remark text, schema_version integer not null default 1, quotation_data jsonb not null default '{}',
  updated_at timestamptz not null default now());
 alter table public.quotations enable row level security;
 create policy shared_select on public.quotations for select to authenticated using (true);
 create policy shared_update on public.quotations for update to authenticated using (true) with check (true);
 grant select, update on public.quotations to authenticated;`);
await db.exec(migration);
await db.exec(migration); // safe to re-run
const reset=async(valid="current_date + 10")=>{
 await db.exec(`reset role; delete from public.quotations; insert into public.quotations(id,demo_session_id,owner_id,quotation_no,customer_name,valid_until,quotation_data)
  values('${quote}','${staff}','${staff}',3255,'Asha Demo Patel',${valid},'{"form":{"customer_name":"Asha Demo Patel"},"template":{"company":{"name":"SOLARFLOW"}},"activity":[{"type":"created"}],"issued_versions":[{"at":"x"}]}')`);
};
const as=async(role,uid='')=>db.exec(`reset role; set qa.uid='${uid}'; set role ${role};`);
const link=async()=>(await db.query('select public.quotation_sign_link($1) j',[quote])).rows[0].j;
const request=async token=>(await db.query('select public.quotation_sign_request($1) j',[token])).rows[0].j;
const submit=(token,image=png,method='drawn')=>db.query('select public.submit_quotation_signature($1,$2,$3) j',[token,image,method]);
const row=async()=>{await db.exec('reset role');return (await db.query(`select * from public.quotations where id='${quote}'`)).rows[0];};

await reset();
await as('anon');
await assert.rejects(link(),/permission denied/,'the public cannot make links');
await assert.rejects(db.query('select * from public.quotations'),/permission denied/,'the public cannot read quotations');
await as('authenticated',staff);
const first=await link();
assert.equal(first.token.length,64);
let saved=await row();
assert.equal(saved.status,'issued'); assert.ok(saved.issued_at); assert.equal(saved.sign_token,first.token);
assert.equal(saved.sign_snapshot.customer_name,'Asha Demo Patel');
assert.equal(saved.sign_snapshot.quotation_data.form.customer_name,'Asha Demo Patel');
for (const hidden of ['owner_id','demo_session_id','sign_token']) assert.equal(hidden in saved.sign_snapshot,false,`${hidden} stays private`);
assert.equal('activity' in saved.sign_snapshot.quotation_data,false);
assert.equal('issued_versions' in saved.sign_snapshot.quotation_data,false);
assert.deepEqual(saved.quotation_data.activity.map(a=>a.type),['created','sent_for_signature']);

// A new link replaces the old one.
const second=await link();
await as('anon');
assert.equal(await request(first.token),null);
await assert.rejects(submit(first.token),/Unknown link/);
const open=await request(second.token);
assert.equal(open.status,'open'); assert.equal(open.first_name,'Asha'); assert.equal(open.snapshot.quotation_no,3255); assert.equal(open.signature_png,null);
assert.equal(await request('short'),null);
await assert.rejects(submit(second.token,'data:image/jpeg;base64,abc'),/Invalid signature/);
await assert.rejects(submit(second.token,png,'typed'),/Invalid signature/);
await assert.rejects(submit(second.token,'data:image/png;base64,'+'A'.repeat(400000)),/Invalid signature/);
await submit(second.token,png,'photo');
const signed=await request(second.token);
assert.equal(signed.status,'signed'); assert.equal(signed.signature_png,png); assert.equal(signed.signature_method,'photo'); assert.ok(signed.signed_at);
await assert.rejects(submit(second.token),/Already signed/);
await as('authenticated',staff);
await assert.rejects(link(),/already signed/);
saved=await row();
assert.equal(saved.quotation_data.activity.at(-1).type,'customer_signed');

// Expired links can be read but not signed.
await reset();
await as('authenticated',staff);
const late=await link();
await db.exec(`reset role; update public.quotations set sign_expires_at=now()-interval '1 minute'`);
await as('anon');
assert.equal((await request(late.token)).status,'expired');
await assert.rejects(submit(late.token),/Link expired/);

// Links are not made for out-of-date, lost or anonymous requests.
await reset('current_date - 1');
await as('authenticated',staff);
await assert.rejects(link(),/valid-until/);
await reset();
await db.exec(`update public.quotations set status='lost'`);
await as('authenticated',staff);
await assert.rejects(link(),/Reopen/);
await reset();
await as('authenticated','');
await assert.rejects(link(),/Sign in/);
await db.close();
console.log('PASS: staff-only links, snapshot hides internals, replaced/short/unknown links refused, PNG/method/size checks, one signature only, expiry, validity/lost/anonymous guards, re-runnable');
