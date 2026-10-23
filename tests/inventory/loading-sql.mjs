// Checks supabase/migrations/20261023120000_reserved_stock_truck_loading_calendar.sql
// against the shared-database inventory functions (SQL 22) in PGlite.
// Run: PGLITE_MODULE=<path to @electric-sql/pglite/dist/index.js> node tests/inventory/loading-sql.mjs
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const strip=sql=>sql.replace(/^begin;$/m,'').replace(/^commit;$/m,'').replace(/^notify pgrst.*$/m,'');
const db=new PGlite();
const asha='11111111-1111-4111-8111-111111111111',ravi='22222222-2222-4222-8222-222222222222';
const p1='33333333-3333-4333-8333-333333333333',p2='44444444-4444-4444-8444-444444444444',
 p3='55555555-5555-4555-8555-555555555555',p4='66666666-6666-4666-8666-666666666666',p5='77777777-7777-4777-8777-777777777777';
const batch1='88888888-8888-4888-8888-888888888888',batch2='99999999-9999-4999-8999-999999999999';

await db.exec(`
create role anon; create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('qa.uid',true),'')::uuid$$;
grant usage on schema auth to authenticated;
create table public.profiles(id uuid primary key,name text not null,email text,user_type text,role text,channel_partner text,status text,updated_at timestamptz default now());
create table public.demo_roles(user_type text primary key,label text,role text);
create table public.demo_profiles(id uuid primary key default gen_random_uuid(),name text,user_type text);
create table public.vendors(id uuid primary key default gen_random_uuid(),name text unique,email text,phone text);
create table public.admin(id uuid primary key,customer_name text,stage text,roof_shed text,bom_data jsonb,
 bom_stock_issued_at timestamptz,delivery_status text default 'PENDING',delivery_batch_id text,deleted_at timestamptz,
 vendor text,material_delivery_date text,driver_name text,driver_phone_number text,vehicle_number text,updated_at timestamptz default now());
create table public.bom(id uuid primary key default gen_random_uuid(),admin_id uuid not null,bom_type text not null default 'ROOF',
 paper_prepared_by text,paper_prepared_date text,material_loaded_by text,material_loaded_date text,created_at timestamptz not null default now());
create table public.bom_items(id uuid primary key default gen_random_uuid(),bom_id uuid not null,product_name text not null,sr_no integer,
 quantity text,uom text,integration_by text,note text,stock_quantity numeric(14,3),created_at timestamptz not null default now());
create table public.delivery_batches(id uuid primary key default gen_random_uuid(),batch_no text not null unique,dispatch_date text,
 driver_name text,driver_phone text,vehicle_number text,rent_amount text,car_rent_paid text default 'No',car_rent_paid_by text,
 car_rent_paid_at text,vendor text,notes text,status text not null default 'PENDING',project_ids uuid[] not null default '{}',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.inventory_items(id uuid primary key default gen_random_uuid(),item_key text not null unique,sku text not null unique,
 product_name text not null,uom text not null,stock_on_hand numeric(14,3) not null default 0 check(stock_on_hand>=0),
 reorder_level numeric(14,3) not null default 0,created_at timestamptz not null default now(),category text default 'General',archived_at timestamptz);
create table public.inventory_movements(id uuid primary key default gen_random_uuid(),item_id uuid not null references public.inventory_items(id),
 request_id uuid not null,kind text not null,quantity numeric(14,3) not null check(quantity>0),note text not null,
 created_at timestamptz not null default now(),customer_id uuid);
`);
const sql04=await read('../../supabase-setup/04_inventory_and_reference_boms.sql');
await db.exec(sql04.slice(sql04.indexOf('create or replace function public.inventory_item_key'),sql04.indexOf('create or replace function public.sync_inventory_catalog()')));
await db.exec(strip(await read('../../supabase-setup/22_fix_shared_inventory_functions.sql')));

// Old vendor names, renamed by the migration.
await db.exec(`insert into profiles(id,name,user_type,role) values ('${asha}','Asha','admin','Admin'),('${ravi}','Ravi','sales','Office'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Vendor 1','vendor','Vendors');
insert into demo_roles values ('vendor','Vendor','Vendors');
insert into demo_profiles(name,user_type) values ('Vendor 2','vendor');
insert into vendors(name) values ('Vendor 1'),('Vendor 2'),('Demo Vendor 3');
insert into admin(id,customer_name,stage,vendor) values ('${p4}','Deleted Doe','MATERIAL DELIVERY','Vendor 2');`);

const migration=strip(await read('../../supabase/migrations/20261023120000_reserved_stock_truck_loading_calendar.sql'));
await db.exec(migration);
await db.exec(migration); // safe to re-run

assert.deepEqual((await db.query('select name from vendors order by name')).rows.map(r=>r.name),['Installer 1','Installer 2','Installer 3']);
assert.equal((await db.query(`select vendor from admin where id='${p4}'`)).rows[0].vendor,'Installer 2');
assert.equal((await db.query(`select name,role from profiles where user_type='vendor'`)).rows[0].name,'Installer 1');
assert.equal((await db.query(`select role from profiles where user_type='vendor'`)).rows[0].role,'Installers');
assert.equal((await db.query(`select name from demo_profiles`)).rows[0].name,'Installer 2');
assert.equal((await db.query(`select label from demo_roles`)).rows[0].label,'Installer');
assert.equal((await db.query('select count(*)::int n from calendar_events')).rows[0].n,7,'samples are added once');

const q=async(text,params)=>(await db.query(text,params)).rows;
for(const [raw,want] of [['12*4',48],['5+2',7],['.50',0.5],['3 + 1',4],['abc',null],['',null],['2*',null]]){
 const got=(await q('select bom_line_quantity($1) v',[raw]))[0].v;
 assert.equal(got===null?null:Number(got),want,`bom_line_quantity(${raw})`);
}

await db.exec(`
grant select,insert,update,delete on all tables in schema public to authenticated;
insert into inventory_items(item_key,sku,product_name,uom,stock_on_hand) values
 (inventory_item_key('Solar Panel','Nos'),'PANEL','Solar Panel','Nos',20),
 (inventory_item_key('Dc Cable','MTR'),'DC','Dc Cable','MTR',100),
 (inventory_item_key('40*40 Pipe Perlin','Feet'),'PIPE','40*40 Pipe Perlin','Feet',100);
insert into admin(id,customer_name,stage,roof_shed,delivery_batch_id,bom_data) values
 ('${p1}','Inline Ina','MATERIAL INTEGRATION','ROOF',null,'{"bom":{"bom_type":"ROOF"},"items":[
   {"product_name":"Solar Panel","quantity":"6","uom":"Nos"},
   {"product_name":"Dc Cable","quantity":"60","uom":"MTR"},
   {"product_name":"40*40 Pipe Perlin","quantity":"12*4","uom":"Feet"},
   {"product_name":"Earthing Kit","quantity":"","uom":"No."}]}'),
 ('${p2}','Table Tom','MATERIAL DELIVERY','ROOF',null,null),
 ('${p3}','Done Dan','INSTALLATION STATUS','ROOF',null,'{"items":[{"product_name":"Solar Panel","quantity":"4","uom":"Nos"}]}'),
 ('${p5}','Solo Sam','MATERIAL DELIVERY','ROOF',null,'{"items":[{"product_name":"40*40 Pipe Perlin","quantity":"5+2","uom":"Feet"}]}');
update admin set deleted_at=now(),bom_data='{"items":[{"product_name":"Solar Panel","quantity":"9","uom":"Nos"}]}' where id='${p4}';
insert into bom(id,admin_id,bom_type) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','${p1}','ROOF'),('cccccccc-cccc-4ccc-8ccc-cccccccccccc','${p2}','ROOF');
insert into bom_items(bom_id,sr_no,product_name,quantity,uom,stock_quantity) values
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',1,'Solar Panel','6','Nos',null),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',2,'Earthing Kit','','No.',null),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',1,'Solar Panel','8','Nos',null),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',2,'Dc Cable','30','MTR',25);
set role authenticated; set qa.uid='${asha}';
`);

const reserved=async()=>Object.fromEntries((await q(`select i.sku,r.customer_name,r.quantity::float q from get_inventory_reservations() r join inventory_items i on i.id=r.item_id order by 1,2`)).map(r=>[`${r.sku}:${r.customer_name}`,r.q]));
assert.deepEqual(await reserved(),{'DC:Inline Ina':60,'DC:Table Tom':25,'PANEL:Inline Ina':6,'PANEL:Table Tom':8,'PIPE:Inline Ina':48,'PIPE:Solo Sam':7},
 'saved BOMs in Material Integration/Delivery reserve stock; later stages and deleted projects do not');

// Asha adds and starts the trip.
await db.exec(`insert into delivery_batches(id,batch_no,status,project_ids) values ('${batch1}','QA-1','IN_TRANSIT','{${p1},${p2}}');
update admin set delivery_batch_id='QA-1' where id in ('${p1}','${p2}');`);
let b=(await q(`select * from delivery_batches where id='${batch1}'`))[0];
assert.equal(b.created_by_name,'Asha');assert.equal(b.started_by_name,'Asha');assert.ok(b.started_at);

const load=(id,ids)=>db.query('select mark_delivery_batch_loaded($1,$2::uuid[]) r',[id,ids]);
await assert.rejects(load(batch1,[p1]),/changed/);
await db.exec(`reset role; update inventory_items set stock_on_hand=10 where sku='PANEL'; set role authenticated;`);
await assert.rejects(load(batch1,[p1,p2]),/Not enough Solar Panel for Table Tom: need 8/);
assert.equal((await q('select count(*)::int n from inventory_movements'))[0].n,0,'a failed load changes nothing');
assert.equal((await q(`select count(*)::int n from admin where bom_stock_issued_at is not null`))[0].n,0);
await db.exec(`reset role; update inventory_items set stock_on_hand=20 where sku='PANEL'; set role authenticated;`);

// Ravi presses Loading done.
await db.exec(`set qa.uid='${ravi}'`);
const result=(await load(batch1,[p1,p2])).rows[0].r;
assert.equal(result.success,true);assert.equal(result.loaded_by,'Ravi');assert.equal(result.movements,5);
const stock=Object.fromEntries((await q(`select sku,stock_on_hand::float s from inventory_items where sku not like 'BOM-%'`)).map(r=>[r.sku,r.s]));
assert.deepEqual(stock,{PANEL:6,DC:15,PIPE:52});
const moves=await q(`select m.note,m.customer_id,m.delivery_batch_id,i.sku from inventory_movements m join inventory_items i on i.id=m.item_id order by i.sku,m.note`);
assert.equal(moves.length,5);
assert.ok(moves.every(m=>m.delivery_batch_id===batch1));
assert.equal(moves.find(m=>m.sku==='PIPE').note,'Loaded on truck QA-1 for Inline Ina (batch added by Asha; trip started by Asha) · by Ravi');
assert.equal(moves.find(m=>m.sku==='PIPE').customer_id,p1);
b=(await q(`select * from delivery_batches where id='${batch1}'`))[0];
assert.equal(b.loaded_by_name,'Ravi');assert.ok(b.loaded_at);
assert.deepEqual(await reserved(),{'PIPE:Solo Sam':7},'loaded projects no longer reserve stock');

// Material Integration shows who loaded it, and ticks loaded lines only.
const boms=await q(`select admin_id,material_loaded_by,loaded_batch_no,material_loaded_date from bom order by admin_id`);
assert.ok(boms.every(r=>r.material_loaded_by==='Ravi'&&r.loaded_batch_no==='QA-1'&&/^\d{4}-\d{2}-\d{2}$/.test(r.material_loaded_date)));
const ticks=await q(`select product_name,loaded_at is not null t from bom_items order by bom_id,sr_no`);
assert.deepEqual(ticks.map(r=>[r.product_name,r.t]),[['Solar Panel',true],['Earthing Kit',false],['Solar Panel',true],['Dc Cable',true]]);
const doc=(await q(`select bom_data from admin where id='${p1}'`))[0].bom_data;
assert.equal(doc.bom.material_loaded_by,'Ravi');assert.equal(doc.bom.loaded_batch_no,'QA-1');assert.equal(doc.bom.bom_type,'ROOF');
assert.deepEqual(doc.items.map(i=>Boolean(i.loaded_at)),[true,true,true,false]);

// Pressing it again is harmless.
const again=(await load(batch1,[p1,p2])).rows[0].r;
assert.equal(again.already_loaded,true);assert.equal((await q('select count(*)::int n from inventory_movements'))[0].n,5);

// Delivered after loading; a batch that was not loaded cannot be delivered.
await db.query('select update_delivery_batch_status_atomic($1,$2,$3::uuid[])',[batch1,'DELIVERED',[p1,p2]]);
assert.equal((await q('select count(*)::int n from inventory_movements'))[0].n,5,'delivery does not issue stock twice');
await db.exec(`insert into delivery_batches(id,batch_no,status,project_ids) values ('${batch2}','QA-2','PENDING','{${p5}}'); update admin set delivery_batch_id='QA-2' where id='${p5}';`);
b=(await q(`select * from delivery_batches where id='${batch2}'`))[0];
assert.equal(b.created_by_name,'Ravi');assert.equal(b.started_at,null,'a pending batch has not started');
await assert.rejects(load(batch2,[p5]),/Start the trip/);
await assert.rejects(db.query('select update_delivery_batch_status_atomic($1,$2,$3::uuid[])',[batch2,'DELIVERED',[p5]]),/Loading done first/);
await db.exec(`set qa.uid='${asha}'`);
await db.query('select update_delivery_batch_status_atomic($1,$2,$3::uuid[])',[batch2,'IN_TRANSIT',[p5]]);
assert.equal((await q(`select started_by_name from delivery_batches where id='${batch2}'`))[0].started_by_name,'Asha');

// A loaded truck keeps its projects, but its details can change, and saving keeps installers.
const p6='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',batch3='ffffffff-ffff-4fff-8fff-ffffffffffff';
await db.exec(`reset role; insert into admin(id,customer_name,stage,roof_shed,vendor,bom_data) values ('${p6}','Late Lee','MATERIAL DELIVERY','ROOF','Installer 3','{"items":[{"product_name":"Dc Cable","quantity":"5","uom":"MTR"}]}'); set role authenticated;`);
const saveBatch=(batch,selected,removed=[])=>db.query('select save_delivery_batch_atomic($1::jsonb,$2::uuid[],$3::uuid[])',[JSON.stringify(batch),selected,removed]);
await saveBatch({id:batch3,batch_no:'QA-3',status:'IN_TRANSIT',driver_name:'Old'},[p6]);
assert.equal((await q(`select vendor from admin where id='${p6}'`))[0].vendor,'Installer 3','a batch without an installer keeps the project installer');
await load(batch3,[p6]);
await saveBatch({id:batch3,batch_no:'QA-3',status:'IN_TRANSIT',driver_name:'New'},[p6]);
assert.equal((await q(`select driver_name from delivery_batches where id='${batch3}'`))[0].driver_name,'New');
await assert.rejects(saveBatch({id:batch3,batch_no:'QA-3',status:'IN_TRANSIT'},[p6,p5]),/already loaded/);
assert.equal((await q(`select loaded_by_name from delivery_batches where id='${batch3}'`))[0].loaded_by_name,'Asha','saving keeps who loaded it');

// A single project marked Delivered directly still issues stock, expressions included.
await db.exec(`update admin set delivery_status='DELIVERED' where id='${p5}'`);
assert.equal((await q(`select stock_on_hand::float s from inventory_items where sku='PIPE'`))[0].s,45);

// The calendar is shared and remembers who added an entry.
await db.exec(`insert into calendar_events(title,kind,starts_on,person_name) values ('Leave','leave','2026-11-02','Asha')`);
assert.equal((await q(`select created_by from calendar_events where person_name='Asha'`))[0].created_by,asha);
await assert.rejects(db.exec(`insert into calendar_events(title,kind,starts_on) values ('x','party','2026-11-02')`),/check/);
await db.exec(`insert into calendar_events(title,kind,starts_on,person_name,status) values ('Leave','leave','2026-11-03','Installer 2','requested')`);
await db.exec(`update calendar_events set status='approved',decided_by_name='Asha',decided_at=now() where person_name='Installer 2' and starts_on='2026-11-03'`);
await assert.rejects(db.exec(`update calendar_events set status='maybe'`),/check/);

// A new installer login is named and titled as an installer.
await db.exec(`reset role; grant execute on function start_demo_session(text,text) to authenticated; set role authenticated; set qa.uid='dddddddd-dddd-4ddd-8ddd-dddddddddddd'`);
const installer=(await q(`select start_demo_session('vendor') p`))[0].p;
assert.equal(installer.name,'Installer 1');assert.equal(installer.role,'Installers');

console.log('PASS: installer rename, re-run safety, quantity expressions, reservations, batch people, failed load rollback, Loading done stock + notes + BOM ticks, repeat press, delivered guard, loaded batch edits, direct delivery, calendar, installer login');
await db.close();
