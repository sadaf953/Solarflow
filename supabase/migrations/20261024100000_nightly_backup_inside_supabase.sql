-- Nightly backup inside Supabase at 2:00 AM India time, keeping 7 days (24 Oct 2026).
--
-- Run once in the SQL Editor of the demo project (qduonewmquwayrnwyzvc). Safe to re-run.
--
-- * Every night pg_cron copies every table in the public schema into a schema named
--   for that day, e.g. backup_20261024.admin. Snapshots older than 7 days are dropped.
-- * backup_admin.runs logs each run: tables copied, total rows, or the error.
-- * The backup schemas are not reachable from the app or the API.
-- * This guards against bad edits and deletions. It lives in the same database, so
--   it does not replace an off-site copy (the GitHub backup, once its secrets are set).
--
-- Restore one table from a day, for example:
--   insert into public.admin select * from backup_20261024.admin where id = '<id>';
-- Check the runs:
--   select * from backup_admin.runs order by id desc limit 10;
begin;

create extension if not exists pg_cron;

create schema if not exists backup_admin;
revoke all on schema backup_admin from public, anon, authenticated;

create table if not exists backup_admin.runs (
    id bigserial primary key,
    snapshot text not null,
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    tables integer,
    total_rows bigint,
    error text
);

create or replace function backup_admin.run_nightly()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_snapshot text := 'backup_' || to_char((now() at time zone 'Asia/Kolkata')::date, 'YYYYMMDD');
  v_oldest text := 'backup_' || to_char((now() at time zone 'Asia/Kolkata')::date - 6, 'YYYYMMDD');
  v_run bigint;
  v_rows bigint;
  v_total bigint := 0;
  v_tables integer := 0;
  t record;
begin
  insert into backup_admin.runs(snapshot) values (v_snapshot) returning id into v_run;
  begin
    -- A second run on the same day replaces that day's snapshot.
    execute format('drop schema if exists %I cascade', v_snapshot);
    execute format('create schema %I', v_snapshot);
    execute format('revoke all on schema %I from public, anon, authenticated', v_snapshot);
    for t in
      select c.relname
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'p')
      order by c.relname
    loop
      execute format('create table %I.%I as table public.%I', v_snapshot, t.relname, t.relname);
      get diagnostics v_rows = row_count;
      v_total := v_total + v_rows;
      v_tables := v_tables + 1;
    end loop;
    -- Keep today and the 6 days before it.
    for t in
      select nspname from pg_catalog.pg_namespace
      where nspname ~ '^backup_[0-9]{8}$' and nspname < v_oldest
    loop
      execute format('drop schema %I cascade', t.nspname);
    end loop;
    update backup_admin.runs set finished_at = now(), tables = v_tables, total_rows = v_total where id = v_run;
    return format('%s: %s tables, %s rows', v_snapshot, v_tables, v_total);
  exception when others then
    -- The copy is rolled back; the run row stays with the reason.
    update backup_admin.runs set finished_at = now(), error = sqlerrm where id = v_run;
    raise warning 'Nightly backup % failed: %', v_snapshot, sqlerrm;
    return format('%s failed: %s', v_snapshot, sqlerrm);
  end;
end;
$$;

revoke all on function backup_admin.run_nightly() from public, anon, authenticated;

-- 20:30 UTC is 2:00 AM India time. Re-running replaces the job instead of adding a second one.
select cron.unschedule(jobid) from cron.job where jobname = 'solarflow-nightly-backup';
select cron.schedule('solarflow-nightly-backup', '30 20 * * *', 'select backup_admin.run_nightly()');

commit;

-- Take the first backup now, so you can see it worked.
select backup_admin.run_nightly();
