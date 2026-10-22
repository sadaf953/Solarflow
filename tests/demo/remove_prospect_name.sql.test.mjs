// Runs supabase-setup/25_remove_real_prospect_name.sql against a minimal schema.
// PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node tests/demo/remove_prospect_name.sql.test.mjs
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const script=await readFile(new URL('../../supabase-setup/25_remove_real_prospect_name.sql',import.meta.url),'utf8');
const home='42ebe5ac-457c-4ca8-8b1e-25d57c8292f9',quote='3fd41dd7-6c38-4e31-a15e-f04d1ff64b28',keep='11111111-1111-4111-8111-111111111111',visitor='22222222-2222-4222-8222-222222222222';
async function freshDb(){
 const db=new PGlite();
 await db.exec(`
  create table profiles(id uuid primary key,name text);
  create table demo_profiles(id uuid primary key,name text);
  create table admin(id uuid primary key,customer_name text,email_address text);
  create table quotations(id uuid primary key,customer_name text,source_lead_id uuid references admin(id) on delete set null,converted_lead_id uuid references admin(id) on delete set null);
  create table activity_log(id serial primary key,user_id uuid,customer_id uuid references admin(id) on delete set null,message text,old_value text,new_value text,details jsonb);
  create table documents(id serial primary key,customer_id uuid not null references admin(id) on delete cascade);
  create table bom(id serial primary key,admin_id uuid references admin(id) on delete cascade);
  create table delivery_batches(id serial primary key,project_ids uuid[] not null default '{}');
  create table team_chat_messages(id serial primary key,sender_name text,text text);
  create table inventory_movements(id serial primary key,reference text);
  create table enquiries(id serial primary key,name text);
  insert into profiles values('${visitor}','Jigar'),('${keep}','Admin 1');
  insert into admin values('${home}','Jigar Demo Home','jigar.demo@example.invalid'),('${quote}','Jigar Demo Quote',null),('${keep}','Demo Customer 7',null);
  insert into quotations values('${quote}','Jigar Demo Quote',null,'${quote}');
  insert into activity_log(user_id,customer_id,message) values('${visitor}','${home}','Jigar Demo Home: Stage changed'),('${visitor}',null,'DEMO-TRUCK-003 reordered'),('${keep}','${keep}','Demo Customer 7: saved');
  insert into documents(customer_id) values('${quote}'),('${keep}');
  insert into bom(admin_id) values('${home}');
  insert into delivery_batches(project_ids) values(array['${keep}','${home}']::uuid[]);
  insert into team_chat_messages(sender_name,text) values('Jigar','hello from jigar');
  insert into enquiries(name) values('Real prospect');`);
 return db;
}
const count=async(db,sql)=>(await db.query(sql)).rows[0].n;

const db=await freshDb();
await db.exec(script);
assert.equal(await count(db,"select count(*)::int n from admin where customer_name ilike '%jigar%'"),0);
assert.equal(await count(db,'select count(*)::int n from admin'),1);
assert.equal(await count(db,'select count(*)::int n from quotations'),0);
assert.equal(await count(db,'select count(*)::int n from documents'),1,'documents of removed leads cascade, others stay');
assert.equal(await count(db,'select count(*)::int n from bom'),0);
assert.equal(await count(db,"select count(*)::int n from activity_log where message ilike '%jigar%'"),0);
assert.equal(await count(db,'select count(*)::int n from activity_log'),2,'unrelated activity, including the visitor\'s, is kept');
assert.deepEqual((await db.query('select project_ids from delivery_batches')).rows[0].project_ids,[keep]);
assert.equal((await db.query(`select name from profiles where id='${visitor}'`)).rows[0].name,'Demo Visitor');
assert.equal((await db.query('select sender_name||\' | \'||text t from team_chat_messages')).rows[0].t,'Demo Visitor | hello from Demo Visitor');
assert.equal(await count(db,'select count(*)::int n from enquiries'),1,'enquiries are never touched');
await db.close();

// Guardrail: a broader match than expected changes nothing.
const wide=await freshDb();
await wide.exec("insert into admin values('33333333-3333-4333-8333-333333333333','Jigar Patel',null)");
await assert.rejects(wide.exec(script),/Cleanup cancelled/);
await wide.exec('rollback');
assert.equal(await count(wide,"select count(*)::int n from admin where customer_name ilike '%jigar%'"),3);
assert.equal(await count(wide,'select count(*)::int n from quotations'),1);
await wide.close();
console.log('PASS: removes the two leads, quotation, their documents/BOM/activity and batch links; renames profile and chat; keeps enquiries and other data; guardrail aborts on a wider match');
