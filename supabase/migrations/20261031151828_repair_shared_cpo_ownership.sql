-- Repair role identities lost by the shared-demo conversion (SQL 19 / installer update).
-- This additive repair is for the shared SolarFlow DEMO, not the former sandbox schema.
-- Do not rerun SQL 09: it references the removed demo_session_id columns.
begin;
do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public'
    and table_name='profiles' and column_name='demo_session_id') then
    raise exception 'This repair requires the shared-demo schema (SQL 19)';
  end if;
end $$;

-- SQL 19 dropped the old directory policy with demo_session_id, leaving an empty
-- role directory for authenticated visitors. Its fictional people are shared
-- demo metadata, just like the profiles already shown by User Management.
alter table public.demo_profiles enable row level security;
drop policy if exists shared_demo_directory_select on public.demo_profiles;
create policy shared_demo_directory_select on public.demo_profiles for select to authenticated using (true);
-- Repair missing parents only for built-in sample managers/dealers. Custom
-- assignments and existing parent links stay unchanged; no client write policy.
update public.demo_profiles d set parent_profile_id = (
  select c.id from public.demo_profiles c
  where c.user_type='channel_partner_office' and c.status='active'
    and c.demo_profile_key='channel_partner_office' and c.channel_partner=d.channel_partner
  order by c.created_at,c.id limit 1
) where d.parent_profile_id is null and d.status='active'
  and d.user_type in ('office2','agent2') and d.demo_profile_key=d.user_type;
create or replace function public.start_demo_session(p_role text default 'admin', p_name text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  u uuid := auth.uid();
  p public.profiles;
  v_role_title text;
  v_num integer;
  v_assigned_name text;
  v_clean_name text;
  persona public.demo_profiles;
  office_id uuid;
begin
  if u is null then raise exception 'Call signInAnonymously() first'; end if;
  
  v_clean_name := nullif(trim(coalesce(p_name, '')), '');

  -- Assign name: use entered name if provided, otherwise assign sequential Admin 1, Admin 2...
  if p_role = 'admin' then
    v_role_title := 'Admin';
    if v_clean_name is null then
      select count(*) + 1 into v_num 
      from public.profiles 
      where user_type = 'admin' and name ~ '^Admin( [0-9]+)?$';
      v_assigned_name := 'Admin ' || v_num;
    else
      v_assigned_name := v_clean_name;
    end if;
  elsif p_role = 'sales' or p_role = 'office' then
    v_role_title := 'Office';
    if v_clean_name is null then
      select count(*) + 1 into v_num 
      from public.profiles 
      where user_type = 'sales' and name ~ '^Office( [0-9]+)?$';
      v_assigned_name := 'Office ' || v_num;
    else
      v_assigned_name := v_clean_name;
    end if;
  elsif p_role = 'channel_partner_office' then
    v_role_title := 'Channel Partner Office';
    v_assigned_name := coalesce(v_clean_name, 'Demo Aurora Solar (CPO)');
  elsif p_role = 'office2' then
    v_role_title := 'Channel Partner Manager';
    v_assigned_name := coalesce(v_clean_name, 'Demo Manager');
  elsif p_role = 'agent2' then
    v_role_title := 'Channel Partner';
    v_assigned_name := coalesce(v_clean_name, 'Demo Dealer');
  elsif p_role = 'agent' then
    v_role_title := 'Channel Partners';
    v_assigned_name := coalesce(v_clean_name, 'Demo Partner');
  elsif p_role = 'vendor' then
    v_role_title := 'Installers';
    v_assigned_name := coalesce(v_clean_name, 'Installer 1');
  elsif p_role = 'stamp' then
    v_role_title := 'Stamp';
    v_assigned_name := coalesce(v_clean_name, 'Demo Stamp');
  else
    v_role_title := 'Admin';
    v_assigned_name := coalesce(v_clean_name, 'Admin 1');
  end if;

  insert into public.profiles (
    id, name, email, user_type, role, channel_partner, status
  )
  values (
    u,
    v_assigned_name,
    'anon.' || substr(u::text, 1, 8) || '@solarflow.demo',
    coalesce(p_role, 'admin'),
    v_role_title,
    'Demo Aurora Solar',
    'active'
  )
  on conflict (id) do update set
    name = coalesce(v_clean_name, profiles.name, excluded.name),
    user_type = coalesce(excluded.user_type, profiles.user_type),
    role = coalesce(excluded.role, profiles.role),
    status = 'active',
    updated_at = now()
  returning * into p;

  -- Resolve a stable directory identity; the Auth ID still identifies the visitor.
  -- Keep an existing valid identity, otherwise choose the seeded persona deterministically.
  select * into persona from public.demo_profiles d
  where d.user_type = p.user_type and d.status = 'active'
    and d.channel_partner = p.channel_partner
  order by (d.id = p.demo_profile_id) desc nulls last,
           (d.demo_profile_key = p.user_type) desc, d.created_at, d.id
  limit 1;

  if p.user_type in ('channel_partner_office', 'office2', 'agent2') then
    if persona.id is null then
      raise exception 'This demo role has no active directory assignment';
    end if;
    if p.user_type = 'channel_partner_office' then
      office_id := persona.id;
    else
      office_id := persona.parent_profile_id;
      if not exists(select 1 from public.demo_profiles
        where id = office_id and user_type = 'channel_partner_office'
          and status = 'active' and channel_partner = persona.channel_partner) then
        raise exception 'This demo role needs an active parent office assignment';
      end if;
    end if;
  end if;
  update public.profiles set demo_profile_id = persona.id,
    cpo_profile_id = case when p.user_type in ('channel_partner_office', 'office2') then office_id else null end
  where id = u returning * into p;

  return to_jsonb(p);
end $$;

grant execute on function public.start_demo_session(text, text) to authenticated;


-- An unassigned office/manager must fail closed, rather than inherit Admin access.
create or replace function public.current_demo_cpo()
returns uuid language sql stable security definer set search_path='' as $$
 select c.id from public.profiles p
 join public.demo_profiles d on d.id=p.demo_profile_id and d.user_type=p.user_type and d.status='active'
 join public.demo_profiles c on c.id=case when p.user_type='channel_partner_office' then d.id else d.parent_profile_id end
   and c.user_type='channel_partner_office' and c.status='active' and c.channel_partner=d.channel_partner
 where p.id=auth.uid() and p.status='active' and p.channel_partner=d.channel_partner
   and p.user_type in ('channel_partner_office','office2');
$$;
create or replace function public.can_view_demo_lead(p_creator uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select case when p.user_type in ('channel_partner_office','office2') then
   coalesce(p_creator=public.current_demo_cpo(),false) or exists(
     select 1 from public.demo_profiles d where d.id=p_creator and d.user_type='agent2'
       and d.status='active' and d.parent_profile_id=public.current_demo_cpo())
   else true end from public.profiles p where p.id=auth.uid() and p.status='active'),false);
$$;
drop policy if exists cpo_lead_scope on public.admin;
create policy cpo_lead_scope on public.admin as restrictive for all to authenticated
 using(public.can_view_demo_lead(lead_creator_profile_id))
 with check(public.can_view_demo_lead(lead_creator_profile_id));

-- The INSERT trigger must also use the shared schema, not SQL 09's removed columns.
create or replace function public.assign_demo_lead_creator()
returns trigger language plpgsql security invoker set search_path='' as $$
declare p public.profiles; d public.demo_profiles; office_id uuid;
begin
 select * into p from public.profiles where id=auth.uid();
 if tg_op='UPDATE' then
   if p.user_type not in ('admin','sales') and new.lead_creator_profile_id is distinct from old.lead_creator_profile_id then
     raise exception 'Lead ownership can only be changed by head office';
   end if;
   return new;
 end if;
 if p.user_type in ('channel_partner_office','office2') then
   office_id:=public.current_demo_cpo();
   select * into d from public.demo_profiles where id=office_id;
   if d.id is null then raise exception 'Office assignment unavailable'; end if;
   new.lead_creator_profile_id:=d.id;new.channel_partner:=d.channel_partner;new.sub_channel_partner:=null;
 elsif p.user_type='agent2' then
   select * into d from public.demo_profiles where id=p.demo_profile_id and user_type='agent2' and status='active';
   if d.id is null or d.parent_profile_id is null then raise exception 'Dealer assignment unavailable';end if;
   new.lead_creator_profile_id:=d.id;new.channel_partner:=d.channel_partner;new.sub_channel_partner:=d.name;
 else
   new.lead_creator_profile_id:=coalesce(new.lead_creator_profile_id,p.demo_profile_id);
 end if;
 return new;
end $$;

-- Rebind existing office sessions as well as future entries, preserving visitor names.
do $$ declare p record; previous_uid text:=current_setting('request.jwt.claim.sub',true);begin
 for p in select id,user_type,name from public.profiles where user_type in ('channel_partner_office','office2') loop
   perform set_config('request.jwt.claim.sub',p.id::text,true);
   perform public.start_demo_session(p.user_type,p.name);
 end loop;
 perform set_config('request.jwt.claim.sub',coalesce(previous_uid,''),true);
end $$;

revoke all on function public.current_demo_cpo(),public.can_view_demo_lead(uuid),
 public.start_demo_session(text,text),public.assign_demo_lead_creator() from public,anon;
grant execute on function public.current_demo_cpo(),public.can_view_demo_lead(uuid),
 public.start_demo_session(text,text) to authenticated;
notify pgrst, 'reload schema';
commit;
