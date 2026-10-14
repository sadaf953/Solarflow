-- Lock admin access (14 Oct 2026)
-- 1. Replaces the hard-coded admin code '0905' (which was visible in the page and its JavaScript)
--    with a secret code stored only as a hash in the database.
-- 2. Stops anyone from looking up clients by the last 4 digits of their phone number.
--
-- AFTER RUNNING THIS FILE, set your own admin code (at least 8 characters) by running:
--   select enquiry_private.set_admin_code('YOUR-NEW-CODE');
-- Until you do, nobody (including you) can open Admin access.
begin;

create schema if not exists enquiry_private;
revoke all on schema enquiry_private from public;
grant usage on schema enquiry_private to authenticated;

create table if not exists enquiry_private.admin_access (
    singleton boolean primary key default true check (singleton),
    code_hash text not null,
    updated_at timestamptz not null default now()
);
alter table enquiry_private.admin_access enable row level security;
revoke all on enquiry_private.admin_access from public, anon, authenticated;

create or replace function enquiry_private.is_admin_code(p_code text) returns boolean
language sql stable security definer set search_path = '' as $$
    select p_code is not null and length(p_code) >= 8 and exists (
        select 1 from enquiry_private.admin_access a
        where a.code_hash = encode(sha256(convert_to(p_code, 'UTF8')), 'hex'));
$$;
revoke all on function enquiry_private.is_admin_code(text) from public, anon, authenticated;

-- Run from the Supabase SQL editor only (not callable from the website).
create or replace function enquiry_private.set_admin_code(p_code text) returns text
language plpgsql security definer set search_path = '' as $$
begin
    if p_code is null or length(p_code) < 8 then
        raise exception 'Use at least 8 characters.';
    end if;
    insert into enquiry_private.admin_access(singleton, code_hash, updated_at)
    values (true, encode(sha256(convert_to(p_code, 'UTF8')), 'hex'), now())
    on conflict (singleton) do update set code_hash = excluded.code_hash, updated_at = now();
    return 'Admin code updated';
end;
$$;
revoke all on function enquiry_private.set_admin_code(text) from public, anon, authenticated;

-- The website's code check (was a plain comparison with '0905').
create or replace function public.verify_preparation_pin(p_pin text)
returns boolean language sql security definer set search_path = '' as $$
    select auth.uid() is not null and enquiry_private.is_admin_code(p_pin);
$$;
revoke all on function public.verify_preparation_pin(text) from public, anon;
grant execute on function public.verify_preparation_pin(text) to authenticated;

-- Swap every '0905' check inside existing functions for the stored-code check.
do $$
declare f record; def text; changed int := 0;
begin
    for f in
        select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('enquiry_private', 'public') and p.prokind = 'f'
          and pg_get_functiondef(p.oid) like '%''0905''%'
    loop
        def := pg_get_functiondef(f.oid);
        def := regexp_replace(def, '([A-Za-z_][A-Za-z0-9_.]*) is distinct from ''0905''', 'not enquiry_private.is_admin_code(\1)', 'g');
        def := regexp_replace(def, '([A-Za-z_][A-Za-z0-9_.]*) = ''0905''', 'enquiry_private.is_admin_code(\1)', 'g');
        if def like '%''0905''%' then
            raise exception 'Could not update a 0905 check in function %', f.oid::regprocedure;
        end if;
        execute def;
        changed := changed + 1;
    end loop;
    raise notice 'Admin code checks updated in % functions', changed;
end $$;

-- Close the public "find clients by last 4 phone digits" lookups.
do $$
declare fn text;
begin
    foreach fn in array array[
        'public.find_submitted_enquiries(text)', 'enquiry_private.find_submitted_enquiries(text)',
        'public.find_owned_prepared_briefs(text)', 'enquiry_private.find_owned_prepared_briefs(text)']
    loop
        if to_regprocedure(fn) is not null then
            execute format('revoke all on function %s from public, anon, authenticated', fn);
        end if;
    end loop;
end $$;

commit;

-- Status: tells you whether the client-list backend is installed in this project.
select case
  when to_regprocedure('public.admin_enquiry_catalog(text)') is null
    then 'LOCK DONE - but the client list backend is missing in this project'
  else 'LOCK DONE - all good' end as result;
