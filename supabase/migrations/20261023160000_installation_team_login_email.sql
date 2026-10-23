-- The installation team's demo login and directory emails (23 Oct 2026).
--
-- Run once in the SQL Editor of the demo project (qduonewmquwayrnwyzvc). Safe to re-run.
--
-- * vendor@solarflow.demo becomes installation@solarflow.demo: the Auth login, its
--   identity and its profile rows. The password does not change.
-- * The three installer directory rows (Operations, Installation teams) get
--   installer1/2/3@solarflow.example instead of vendor1@ / vendor.2@ / vendor.3@.
begin;

do $$
declare
  v_old constant text := 'vendor@solarflow.demo';
  v_new constant text := 'installation@solarflow.demo';
  v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = v_old;
  if v_id is not null then
    if exists (select 1 from auth.users where lower(email) = v_new and id <> v_id) then
      raise exception '% already belongs to another login. Rename or remove that login first.', v_new;
    end if;
    update auth.users
    set email = v_new,
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
          || jsonb_build_object('name', 'Installer 1', 'role', 'Installers'),
        updated_at = now()
    where id = v_id;
    -- Email identities keep the address in identity_data; older ones also used it as provider_id.
    update auth.identities
    set identity_data = identity_data || jsonb_build_object('email', v_new),
        provider_id = case when lower(provider_id) = v_old then v_new else provider_id end,
        updated_at = now()
    where user_id = v_id and provider = 'email';
  end if;

  update public.profiles set email = v_new where lower(email) = v_old;
  if to_regclass('public.demo_profiles') is not null then
    execute 'update public.demo_profiles set email = $1 where lower(email) = $2' using v_new, v_old;
  end if;
end $$;

update public.vendors
set email = 'installer' || substr(name, 11) || '@solarflow.example'
where name in ('Installer 1', 'Installer 2', 'Installer 3')
  and (email is null or email ilike '%vendor%');

commit;
