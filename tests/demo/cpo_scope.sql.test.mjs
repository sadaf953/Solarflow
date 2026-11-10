// PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node --test tests/demo/cpo_scope.sql.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');

test('shared demo role entry binds office identities and keeps records, counts and writes scoped', async () => {
    const db = new PGlite();
    const uid = '11111111-1111-4111-8111-111111111111';
    const cpo = '22222222-2222-4222-8222-222222222222';
    const manager = '33333333-3333-4333-8333-333333333333';
    const dealer = '44444444-4444-4444-8444-444444444444';
    const other = '55555555-5555-4555-8555-555555555555';
    const otherDealer = '66666666-6666-4666-8666-666666666666';
    const admin = '77777777-7777-4777-8777-777777777777';
    try {
        await db.exec(`
          create role anon; create role authenticated;
          create schema auth;
          create function auth.uid() returns uuid language sql stable as $$
            select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
          grant usage on schema auth to authenticated;
          create table profiles(id uuid primary key,name text,email text,user_type text,role text,
            channel_partner text,status text,demo_profile_id uuid,cpo_profile_id uuid,updated_at timestamptz);
          create table demo_profiles(id uuid primary key,demo_profile_key text,name text,user_type text,
            channel_partner text,status text,parent_profile_id uuid,created_at timestamptz default now());
          create table admin(id uuid primary key default gen_random_uuid(),lead_creator_profile_id uuid,
            stage text,deleted_at timestamptz,payment_type text,loan_tag text,subsidy_tag text,
            channel_partner text,sub_channel_partner text);
          alter table admin enable row level security;
          create policy shared on admin to authenticated using(true) with check(true);
          grant select,insert,update,delete on profiles,demo_profiles,admin to authenticated;
          alter table demo_profiles enable row level security;
          insert into demo_profiles(id,demo_profile_key,name,user_type,channel_partner,status,parent_profile_id) values
          ('${cpo}','channel_partner_office','Aurora Office','channel_partner_office','Demo Aurora Solar','active',null),
          ('${manager}','office2','Manager','office2','Demo Aurora Solar','active',null),
          ('${dealer}','agent2','Dealer 1','agent2','Demo Aurora Solar','active',null),
          ('${other}','sample-cpo-cedar','Cedar Office','channel_partner_office','Demo Cedar Solar','active',null),
          ('${otherDealer}','sample-dealer-cedar','Cedar Dealer','agent2','Demo Cedar Solar','active','${other}'),
          ('${admin}','admin','Demo Admin','admin','Demo Aurora Solar','active',null);
          insert into profiles(id,name,user_type,channel_partner,status) values
          ('${uid}','Existing visitor','channel_partner_office','Demo Aurora Solar','active');
          insert into admin(lead_creator_profile_id,stage,payment_type,channel_partner,sub_channel_partner) values
          ('${cpo}','LEADS','Cash','Demo Aurora Solar',null),
          ('${dealer}','LOAN','Loan','Demo Aurora Solar','Dealer 1'),
          ('${other}','LEADS','Cash','Demo Cedar Solar',null),
          ('${otherDealer}','LOAN','Loan','Demo Cedar Solar','Cedar Dealer'),
          ('${admin}','LEADS','Cash','Demo Aurora Solar',null);
          insert into admin(lead_creator_profile_id,stage,deleted_at) values('${cpo}','LEADS',now());
        `);
        const base = await readFile(new URL('../../supabase-setup/01_solarflow_demo.sql', import.meta.url), 'utf8');
        await db.exec(base.slice(base.indexOf('create function public.get_dashboard_metrics_scoped'), base.indexOf('create function public.move_stage')));
        const migration = await readFile(new URL('../../supabase/migrations/20261031151828_repair_shared_cpo_ownership.sql', import.meta.url), 'utf8');
        await db.exec(migration);
        // Applying the repair again preserves valid identities and parent links.
        await db.exec(migration);
        await db.exec(`
          create function get_cpo_dashboard_metrics(p_dealer text default null)
          returns jsonb language plpgsql stable security invoker as $$begin
            if public.current_demo_cpo() is null then raise exception 'Office unavailable';end if;
            return public.get_dashboard_metrics_scoped(null,p_dealer);end$$;
          create view cpo_leads with(security_invoker=true) as select * from admin
          where current_demo_cpo() is not null and can_view_demo_lead(lead_creator_profile_id);
          grant select on cpo_leads to authenticated;
          create trigger assign_demo_lead_creator before insert or update of lead_creator_profile_id
            on admin for each row execute function assign_demo_lead_creator();
          set role authenticated;
          set request.jwt.claim.sub='${uid}';
        `);
        const query = async (sql, params) => (await db.query(sql, params)).rows;
        const enter = async role => (await query('select start_demo_session($1) p', [role]))[0].p;
        const counts = async () => (await query('select get_cpo_dashboard_metrics() m'))[0].m;
        assert.equal((await query('select demo_profile_id from profiles where id=auth.uid()'))[0].demo_profile_id, cpo, 'existing office session repaired');
        assert.equal((await counts()).totalProjects, 2);
        assert.equal((await query('select get_cpo_dashboard_metrics($1) m', ['Dealer 1']))[0].m.totalProjects, 1);
        assert.equal((await query('select get_cpo_dashboard_metrics($1) m', ['Cedar Dealer']))[0].m.totalProjects, 0);
        assert.equal((await query('select count(*)::int n from cpo_leads'))[0].n, 3, 'view includes only own office/dealer including trash');
        assert.equal((await enter('office2')).cpo_profile_id, cpo);
        assert.equal((await counts()).totalProjects, 2);
        const ownInsert = await query("insert into admin(stage) values('LEADS') returning lead_creator_profile_id,channel_partner");
        assert.equal(ownInsert[0].lead_creator_profile_id, cpo);
        assert.equal(ownInsert[0].channel_partner, 'Demo Aurora Solar');
        await assert.rejects(query('update admin set lead_creator_profile_id=$1 where lead_creator_profile_id=$2', [other, cpo]), /ownership can only be changed/);
        await query('update profiles set demo_profile_id=null,cpo_profile_id=null where id=auth.uid()');
        assert.equal((await query('select count(*)::int n from admin'))[0].n, 0, 'unassigned manager cannot read head-office data');
        await assert.rejects(counts(), /Office unavailable/);
        await assert.rejects(query("insert into admin(stage) values('LEADS')"), /Office assignment unavailable/);
        const restored = await enter('channel_partner_office');
        assert.equal(restored.demo_profile_id, cpo);
        assert.equal(restored.name, 'Existing visitor');
        await enter('admin');
        assert.equal((await query('select get_dashboard_metrics_scoped() m'))[0].m.totalProjects, 6);
        await enter('agent2');
        const dealerInsert = await query("insert into admin(stage) values('LEADS') returning lead_creator_profile_id,sub_channel_partner");
        assert.equal(dealerInsert[0].lead_creator_profile_id, dealer);
        assert.equal(dealerInsert[0].sub_channel_partner, 'Dealer 1');
        await query("update profiles set user_type='office2',demo_profile_id=$1 where id=auth.uid()", [manager]);
        await db.exec('reset role');
        await query("update demo_profiles set status='inactive' where id=$1", [cpo]);
        await db.exec('set role authenticated');
        assert.equal((await query('select count(*)::int n from admin'))[0].n, 0, 'inactive parent office fails closed');
        await assert.rejects(enter('office2'), /active parent office/);
        await db.exec("reset request.jwt.claim.sub");
        await assert.rejects(enter('admin'), /signInAnonymously/);
    } finally { await db.close(); }
});
