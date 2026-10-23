-- Reserved stock, truck loading, the shared calendar and installer names (23 Oct 2026).
--
-- Run once in the SQL Editor of the demo project (qduonewmquwayrnwyzvc). Safe to re-run.
--
-- * get_inventory_reservations()  BOM quantities of projects that have a saved BOM and
--   whose materials have not left the godown yet (Material Integration or Material
--   Delivery, or already on a delivery batch). Inventory shows them as Reserved.
-- * mark_delivery_batch_loaded(batch, projects)  the "Loading done" button on a started
--   trip. Issues every project's BOM stock in one transaction, writes who loaded it and
--   why on each stock movement, fills Material Loaded By / Date in Material Integration
--   and ticks the loaded BOM lines.
-- * delivery_batches remembers who added the batch, who started the trip and who
--   loaded it. A batch can be marked Delivered only after Loading done, and a loaded
--   truck keeps its projects. Saving a batch keeps each project's installer.
-- * calendar_events  the shared calendar (installer "not available" days, leaves,
--   holidays, meetings, site visits). Staff and installation teams request leave;
--   admin approves or rejects it. Replaces the per-browser vendor availability.
-- * The three demo vendors become Installer 1, 2 and 3 everywhere they are named, and
--   new installer logins start as Installer 1 with the role title Installers.
begin;

-- ═══ Columns ═══════════════════════════════════════════════════════════════

alter table public.delivery_batches
    add column if not exists created_by_name text,
    add column if not exists started_by_name text,
    add column if not exists started_at timestamptz,
    add column if not exists loaded_by_name text,
    add column if not exists loaded_at timestamptz;

alter table public.bom
    add column if not exists material_loaded_at timestamptz,
    add column if not exists loaded_batch_no text;

alter table public.bom_items add column if not exists loaded_at timestamptz;

alter table public.inventory_movements add column if not exists delivery_batch_id uuid;
create index if not exists inventory_movements_batch on public.inventory_movements(delivery_batch_id);

-- ═══ Helpers ═══════════════════════════════════════════════════════════════

-- The signed-in person's name, as shown across the app.
create or replace function public.current_actor_name()
returns text language sql stable security invoker set search_path = '' as $$
  select coalesce((select nullif(trim(name), '') from public.profiles where id = auth.uid()), 'Team member');
$$;

-- The quantity a BOM line moves: its reviewed stock quantity, else its BOM quantity.
create or replace function public.bom_line_raw(p_line jsonb)
returns text language sql immutable set search_path = '' as $$
  select trim(coalesce(nullif(trim(p_line->>'stock_quantity'), ''), p_line->>'quantity', ''));
$$;

-- Reference BOMs hold numbers or simple sums and products such as 12*4 or 5+2, the
-- same values the delivery material sheet totals. Anything else returns null.
create or replace function public.bom_line_quantity(p_raw text)
returns numeric language plpgsql immutable set search_path = '' as $$
declare
  src text := regexp_replace(coalesce(p_raw, ''), '\s+', '', 'g');
  term text;
  factor text;
  product numeric;
  total numeric := 0;
begin
  if src !~ '^(\d+(\.\d+)?|\.\d+)([+*](\d+(\.\d+)?|\.\d+))*$' then
    return null;
  end if;
  foreach term in array string_to_array(src, '+') loop
    product := 1;
    foreach factor in array string_to_array(term, '*') loop
      product := product * factor::numeric;
    end loop;
    total := total + product;
  end loop;
  return total;
end;
$$;

-- Stock each inventory item needs for one BOM document. Blank lines are not loaded.
create or replace function public.bom_stock_demands(p_doc jsonb, p_customer_name text)
returns table(item_id uuid, quantity numeric)
language plpgsql stable security invoker set search_path = '' as $$
declare
  line jsonb;
  raw text;
  amount numeric;
  found_item uuid;
  demands jsonb := '{}'::jsonb;
begin
  if jsonb_typeof(p_doc->'items') is distinct from 'array' or jsonb_array_length(p_doc->'items') = 0 then
    raise exception 'Save the BOM for % in Material Integration first.', p_customer_name;
  end if;
  for line in select jsonb_array_elements(p_doc->'items') loop
    if line->>'product_name' = 'SolarFlow Demo Panel' then
      continue;
    end if;
    raw := public.bom_line_raw(line);
    if raw = '' then
      continue;
    end if;
    amount := public.bom_line_quantity(raw);
    if amount is null then
      raise exception 'Quantity for % (%) is "%". Enter a number in Material Integration → Bill of Materials.',
        line->>'product_name', p_customer_name, raw;
    end if;
    if amount <> round(amount, 3) then
      raise exception 'Use at most three decimal places for % (%).', line->>'product_name', p_customer_name;
    end if;
    if amount = 0 then
      continue;
    end if;
    select i.id into found_item
    from public.inventory_items i
    where i.item_key = public.inventory_item_key(line->>'product_name', line->>'uom');
    if not found then
      raise exception '% (unit "%") is not in Inventory. Add it in Inventory or fix the unit in the BOM for %.',
        line->>'product_name', coalesce(line->>'uom', ''), p_customer_name;
    end if;
    demands := jsonb_set(demands, array[found_item::text],
      to_jsonb(coalesce((demands->>found_item::text)::numeric, 0) + amount));
  end loop;
  return query select key::uuid, value::numeric from jsonb_each_text(demands) order by key;
end;
$$;

-- Issues one project's BOM stock and links each movement to the project and batch.
-- Callers hold the inventory_stock_lock advisory lock and record bom_stock_issued_at.
create or replace function public.issue_bom_stock(
  p_customer_id uuid,
  p_customer_name text,
  p_doc jsonb,
  p_note text,
  p_batch_id uuid default null
)
returns integer language plpgsql security invoker set search_path = '' as $$
declare
  r record;
  item public.inventory_items;
  request uuid;
  n integer := 0;
begin
  for r in select * from public.bom_stock_demands(p_doc, p_customer_name) loop
    select * into item from public.inventory_items where id = r.item_id for update;
    if item.stock_on_hand < r.quantity then
      raise exception 'Not enough % for %: need % %, only % in stock. Receive more in Inventory first.',
        item.product_name, p_customer_name, r.quantity, item.uom, item.stock_on_hand;
    end if;
    request := gen_random_uuid();
    perform public.record_inventory_movement(item.id, 'issue', r.quantity, p_note, request);
    update public.inventory_movements
    set customer_id = p_customer_id, delivery_batch_id = p_batch_id
    where request_id = request;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ═══ Reserved stock ════════════════════════════════════════════════════════

-- One row per inventory item and project still waiting for its materials.
create or replace function public.get_inventory_reservations()
returns table(item_id uuid, customer_id uuid, customer_name text, stage text, delivery_batch_id text, quantity numeric)
language sql stable security invoker set search_path = '' as $$
  select i.id, c.id, c.customer_name, c.stage, nullif(c.delivery_batch_id, ''), sum(q.amount)
  from public.admin c
  cross join lateral (select public.bom_stock_document(c.id) as doc) d
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(d.doc->'items') = 'array' then d.doc->'items' else '[]'::jsonb end
  ) as l(line)
  cross join lateral (select public.bom_line_quantity(public.bom_line_raw(l.line)) as amount) q
  join public.inventory_items i
    on i.item_key = public.inventory_item_key(l.line->>'product_name', l.line->>'uom')
  where c.deleted_at is null
    and c.bom_stock_issued_at is null
    and c.delivery_status is distinct from 'DELIVERED'
    and (c.stage in ('MATERIAL INTEGRATION', 'MATERIAL DELIVERY') or nullif(c.delivery_batch_id, '') is not null)
    and q.amount > 0
  group by i.id, c.id, c.customer_name, c.stage, c.delivery_batch_id;
$$;

-- ═══ Who added, started and loaded a batch ═════════════════════════════════

create or replace function public.stamp_delivery_batch_people()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by_name := coalesce(nullif(trim(new.created_by_name), ''), public.current_actor_name());
    new.loaded_at := null;
    new.loaded_by_name := null;
  end if;
  if new.status = 'IN_TRANSIT' and new.started_at is null
    and (tg_op = 'INSERT' or old.status is distinct from 'IN_TRANSIT')
  then
    new.started_by_name := public.current_actor_name();
    new.started_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists stamp_delivery_batch_people on public.delivery_batches;
create trigger stamp_delivery_batch_people
before insert or update of status on public.delivery_batches
for each row execute function public.stamp_delivery_batch_people();

-- ═══ Loading done ══════════════════════════════════════════════════════════

create or replace function public.mark_delivery_batch_loaded(p_batch_id uuid, p_project_ids uuid[])
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  b public.delivery_batches;
  c public.admin;
  pid uuid;
  actor text;
  loaded_day text := to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD');
  kind text;
  why text;
  movements integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  actor := public.current_actor_name();
  perform pg_advisory_xact_lock(hashtextextended('delivery_batches_lock', 0));
  perform pg_advisory_xact_lock(hashtextextended('inventory_stock_lock', 0));

  select * into b from public.delivery_batches where id = p_batch_id for update;
  if not found then
    raise exception 'Batch unavailable. Refresh and retry.';
  end if;
  if b.loaded_at is not null then
    return jsonb_build_object('success', true, 'already_loaded', true,
      'loaded_by', b.loaded_by_name, 'loaded_at', b.loaded_at);
  end if;
  if b.status is distinct from 'IN_TRANSIT' then
    raise exception 'Start the trip before marking loading done.';
  end if;
  if coalesce(cardinality(b.project_ids), 0) = 0 then
    raise exception 'This batch has no projects.';
  end if;
  if array(select unnest(coalesce(p_project_ids, '{}'::uuid[])) order by 1)
     is distinct from array(select unnest(b.project_ids) order by 1)
  then
    raise exception 'Batch projects changed. Refresh and retry.';
  end if;

  why := concat_ws('; ',
    'batch added by ' || nullif(b.created_by_name, ''),
    'trip started by ' || nullif(coalesce(b.started_by_name, b.created_by_name), ''));
  perform public.sync_inventory_catalog();

  foreach pid in array b.project_ids loop
    select * into c from public.admin
    where id = pid and deleted_at is null and delivery_batch_id = b.batch_no
    for update;
    if not found then
      raise exception 'A project in this batch is unavailable or assigned elsewhere. Refresh and correct the batch.';
    end if;
    kind := case when upper(c.roof_shed) = 'SHED' then 'SHED' else 'ROOF' end;

    if c.bom_stock_issued_at is null then
      movements := movements + public.issue_bom_stock(
        c.id, c.customer_name, public.bom_stock_document(c.id),
        format('Loaded on truck %s for %s%s · by %s', b.batch_no, c.customer_name,
          case when why <> '' then ' (' || why || ')' else '' end, actor),
        b.id);
      update public.admin set bom_stock_issued_at = now() where id = c.id;
    end if;

    -- Material Integration: Material Loaded By / Date, and a tick on every loaded line.
    update public.bom
    set material_loaded_by = actor, material_loaded_date = loaded_day,
        material_loaded_at = now(), loaded_batch_no = b.batch_no
    where admin_id = c.id and bom_type = kind;
    update public.bom_items i
    set loaded_at = now()
    from public.bom bo
    where i.bom_id = bo.id and bo.admin_id = c.id and bo.bom_type = kind
      and coalesce(public.bom_line_quantity(public.bom_line_raw(to_jsonb(i))), 0) > 0;

    if jsonb_typeof(c.bom_data->'items') = 'array'
      and coalesce(c.bom_data->'bom'->>'bom_type', c.bom_data->>'bom_type', kind) = kind
    then
      update public.admin set bom_data = jsonb_set(
        jsonb_set(c.bom_data, '{items}', (
          select coalesce(jsonb_agg(
            case when coalesce(public.bom_line_quantity(public.bom_line_raw(e)), 0) > 0
              then e || jsonb_build_object('loaded_at', now()) else e end
            order by o), '[]'::jsonb)
          from jsonb_array_elements(c.bom_data->'items') with ordinality as x(e, o))),
        '{bom}',
        coalesce(c.bom_data->'bom', '{}'::jsonb) || jsonb_build_object(
          'material_loaded_by', actor, 'material_loaded_date', loaded_day,
          'material_loaded_at', now(), 'loaded_batch_no', b.batch_no))
      where id = c.id;
    end if;
  end loop;

  update public.delivery_batches
  set loaded_at = now(), loaded_by_name = actor, updated_at = now()
  where id = b.id;

  return jsonb_build_object('success', true, 'already_loaded', false, 'loaded_by', actor,
    'projects', cardinality(b.project_ids), 'movements', movements);
end;
$$;

-- Driver, vehicle and notes of a loaded truck can still be edited, but its projects
-- cannot change. Saving a batch no longer clears each project's installer when the
-- batch has none.
create or replace function public.save_delivery_batch_atomic(p_batch jsonb, p_selected_project_ids uuid[], p_removed_project_ids uuid[])
returns jsonb language plpgsql security invoker set search_path='' as $save_batch$
declare
  u uuid := auth.uid();
  b public.delivery_batches;
  bid uuid := (p_batch->>'id')::uuid;
  selected uuid[] := coalesce(p_selected_project_ids, '{}');
  removed uuid[] := coalesce(p_removed_project_ids, '{}');
  expected_removed uuid[];
  batch_number text := nullif(trim(p_batch->>'batch_no'), '');
  is_loaded boolean := false;
  n integer;
begin
  if u is null then raise exception 'Sign in first'; end if;
  perform pg_advisory_xact_lock(hashtextextended('delivery_batches_lock', 0));
  if bid is null or batch_number is null then raise exception 'Batch ID and number are required'; end if;
  if cardinality(selected) = 0 or cardinality(selected) <> (select count(distinct id) from unnest(selected) id) then
    raise exception 'Choose at least one distinct project';
  end if;

  select * into b from public.delivery_batches where id = bid for update;
  if found then
    if b.batch_no <> batch_number then raise exception 'Batch number cannot change'; end if;
    if b.status = 'DELIVERED' then raise exception 'Delivered batches cannot be edited'; end if;
    is_loaded := b.loaded_at is not null;
    if is_loaded and array(select unnest(selected) order by 1) is distinct from array(select unnest(b.project_ids) order by 1) then
      raise exception 'This truck is already loaded, so its projects cannot change.';
    end if;
    select coalesce(array_agg(id order by id), '{}') into expected_removed
    from unnest(b.project_ids) id where not(id = any(selected));
  else
    expected_removed := '{}';
  end if;

  if expected_removed is distinct from array(select id from unnest(removed) id order by id) then
    raise exception 'Batch projects changed. Refresh and retry.';
  end if;

  if coalesce(p_batch->>'status', 'IN_TRANSIT') not in ('PENDING', 'IN_TRANSIT') then
    raise exception 'Save the batch before marking it Delivered';
  end if;

  perform id from public.admin where id = any(selected || removed) for update;
  select count(*) into n from public.admin
  where id = any(selected) and deleted_at is null
    and (nullif(delivery_batch_id, '') is null or delivery_batch_id = batch_number)
    and (bom_stock_issued_at is null or (is_loaded and delivery_batch_id = batch_number))
    and delivery_status is distinct from 'DELIVERED';
  if n <> cardinality(selected) then
    raise exception 'A project is unavailable, assigned elsewhere, or already delivered. Refresh the project list.';
  end if;

  select count(*) into n from public.admin
  where id = any(removed) and deleted_at is null
    and delivery_batch_id = batch_number and bom_stock_issued_at is null;
  if n <> cardinality(removed) then
    raise exception 'A removed project changed. Refresh and retry.';
  end if;

  insert into public.delivery_batches(
    id, batch_no, dispatch_date, driver_name, driver_phone, vehicle_number,
    rent_amount, car_rent_paid, vendor, notes, status, project_ids
  )
  values(
    bid, batch_number, p_batch->>'dispatch_date', p_batch->>'driver_name',
    p_batch->>'driver_phone', p_batch->>'vehicle_number', p_batch->>'rent_amount',
    coalesce(p_batch->>'car_rent_paid', 'No'), p_batch->>'vendor', p_batch->>'notes',
    coalesce(p_batch->>'status', 'IN_TRANSIT'), selected
  )
  on conflict(id) do update set
    dispatch_date = excluded.dispatch_date,
    driver_name = excluded.driver_name,
    driver_phone = excluded.driver_phone,
    vehicle_number = excluded.vehicle_number,
    rent_amount = excluded.rent_amount,
    car_rent_paid = excluded.car_rent_paid,
    vendor = excluded.vendor,
    notes = excluded.notes,
    status = excluded.status,
    project_ids = excluded.project_ids,
    updated_at = now();

  update public.admin set
    delivery_batch_id = batch_number,
    material_delivery_date = p_batch->>'dispatch_date',
    driver_name = p_batch->>'driver_name',
    driver_phone_number = p_batch->>'driver_phone',
    vehicle_number = p_batch->>'vehicle_number',
    vendor = coalesce(nullif(trim(p_batch->>'vendor'), ''), vendor),
    delivery_status = coalesce(p_batch->>'status', 'IN_TRANSIT'),
    updated_at = now()
  where id = any(selected);

  update public.admin set
    delivery_batch_id = null,
    delivery_status = 'PENDING',
    updated_at = now()
  where id = any(removed) and delivery_batch_id = batch_number;

  return jsonb_build_object('success', true);
end $save_batch$;

-- Delivered needs Loading done first, so loaded materials always leave stock.
create or replace function public.update_delivery_batch_status_atomic(p_batch_id uuid, p_new_status text, p_project_ids uuid[])
returns jsonb language plpgsql security invoker set search_path = '' as $update_delivery_batch_status_atomic$
declare
  b public.delivery_batches;
  n integer;
  expected integer;
begin
  if p_new_status not in ('PENDING', 'IN_TRANSIT', 'DELIVERED') or p_new_status is null then
    raise exception 'Invalid delivery status';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('delivery_batches_lock', 0));
  select * into b from public.delivery_batches where id = p_batch_id for update;
  if not found then raise exception 'Batch unavailable'; end if;
  if array(select unnest(coalesce(p_project_ids, '{}'::uuid[])) order by 1) is distinct from array(select unnest(b.project_ids) order by 1) then
    raise exception 'Batch projects changed. Refresh and retry.';
  end if;
  if p_new_status = 'DELIVERED' and b.status is distinct from 'DELIVERED' and b.loaded_at is null then
    raise exception 'Press Loading done first, so the loaded materials leave stock before delivery.';
  end if;
  expected := coalesce(array_length(b.project_ids, 1), 0);

  update public.admin set
    delivery_status = p_new_status,
    updated_at = now()
  where id = any(b.project_ids) and deleted_at is null and delivery_batch_id = b.batch_no;
  get diagnostics n = row_count;
  if n <> expected then
    raise exception 'Some batch projects are unavailable or assigned elsewhere. Refresh and correct the batch.';
  end if;

  update public.delivery_batches set
    status = p_new_status,
    updated_at = now()
  where id = b.id;
  return jsonb_build_object('success', true, 'projects_expected', expected, 'projects_missing', 0);
end $update_delivery_batch_status_atomic$;

-- A project marked Delivered on its own (not through Loading done) still issues its
-- stock, now with the same quantity rules as loading.
create or replace function public.issue_delivered_bom_stock()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  doc jsonb;
  bom_kind text;
begin
  if new.delivery_status is distinct from 'DELIVERED'
    or old.delivery_status is not distinct from 'DELIVERED'
    or old.bom_stock_issued_at is not null
  then
    return new;
  end if;
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('inventory_stock_lock', 0));
  doc := public.bom_stock_document(new.id);
  bom_kind := case when upper(new.roof_shed) = 'SHED' then 'SHED' else 'ROOF' end;
  if jsonb_typeof(new.bom_data->'items') = 'array'
    and coalesce(new.bom_data->'bom'->>'bom_type', new.bom_data->>'bom_type', bom_kind) = bom_kind
  then
    doc := new.bom_data;
  end if;

  perform public.sync_inventory_catalog();
  perform public.issue_bom_stock(new.id, new.customer_name, doc,
    'BOM delivery: ' || new.customer_name || ' (' || new.id || ')', null);
  new.bom_stock_issued_at := now();
  return new;
end;
$$;

drop trigger if exists issue_delivered_bom_stock on public.admin;
create trigger issue_delivered_bom_stock
before update of delivery_status on public.admin
for each row execute function public.issue_delivered_bom_stock();

revoke all on function public.current_actor_name(),
  public.bom_line_raw(jsonb),
  public.bom_line_quantity(text),
  public.bom_stock_demands(jsonb, text),
  public.issue_bom_stock(uuid, text, jsonb, text, uuid),
  public.get_inventory_reservations(),
  public.stamp_delivery_batch_people(),
  public.mark_delivery_batch_loaded(uuid, uuid[]),
  public.update_delivery_batch_status_atomic(uuid, text, uuid[]),
  public.save_delivery_batch_atomic(jsonb, uuid[], uuid[]),
  public.issue_delivered_bom_stock()
from public, anon;

grant execute on function public.current_actor_name(),
  public.bom_line_raw(jsonb),
  public.bom_line_quantity(text),
  public.bom_stock_demands(jsonb, text),
  public.issue_bom_stock(uuid, text, jsonb, text, uuid),
  public.get_inventory_reservations(),
  public.mark_delivery_batch_loaded(uuid, uuid[]),
  public.update_delivery_batch_status_atomic(uuid, text, uuid[]),
  public.save_delivery_batch_atomic(jsonb, uuid[], uuid[])
to authenticated;

-- ═══ Shared calendar ═══════════════════════════════════════════════════════

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  kind text not null default 'event'
    check (kind in ('event', 'site_visit', 'meeting', 'follow_up', 'leave', 'holiday', 'unavailable')),
  starts_on date not null,
  ends_on date check (ends_on is null or ends_on >= starts_on),
  start_time time,
  end_time time,
  notes text,
  customer_id uuid references public.admin(id) on delete set null,
  -- Whose leave it is, or which installer is not available.
  person_name text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Leave anyone other than admin adds is a request until admin approves it.
alter table public.calendar_events
  add column if not exists status text not null default 'approved',
  add column if not exists decided_by_name text,
  add column if not exists decided_at timestamptz;
alter table public.calendar_events drop constraint if exists calendar_events_status_check;
alter table public.calendar_events add constraint calendar_events_status_check
  check (status in ('requested', 'approved', 'rejected'));

create index if not exists calendar_events_starts_idx on public.calendar_events(starts_on);
create index if not exists calendar_events_customer_idx on public.calendar_events(customer_id);

alter table public.calendar_events enable row level security;
revoke all on public.calendar_events from anon;
grant select, insert, update, delete on public.calendar_events to authenticated;
drop policy if exists shared_select on public.calendar_events;
drop policy if exists shared_insert on public.calendar_events;
drop policy if exists shared_update on public.calendar_events;
drop policy if exists shared_delete on public.calendar_events;
create policy shared_select on public.calendar_events for select to authenticated using (true);
create policy shared_insert on public.calendar_events for insert to authenticated with check (true);
create policy shared_update on public.calendar_events for update to authenticated using (true) with check (true);
create policy shared_delete on public.calendar_events for delete to authenticated using (true);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'calendar_events')
  then
    alter publication supabase_realtime add table public.calendar_events;
  end if;
end $$;

-- A few sample entries for an empty calendar.
insert into public.calendar_events(title, kind, starts_on, ends_on, start_time, person_name, notes, created_by, created_by_name)
select v.title, v.kind, v.starts_on::date, v.ends_on::date, v.start_time::time, v.person_name, v.notes, null, 'SolarFlow demo'
from (values
  ('Not available', 'unavailable', '2026-10-27', null, null, 'Installer 2', 'Crew booked at another site'),
  ('Not available', 'unavailable', '2026-10-29', '2026-10-30', null, 'Installer 3', 'Vehicle maintenance'),
  ('Not available', 'unavailable', '2026-11-05', null, null, 'Installer 1', ''),
  ('Leave', 'leave', '2026-10-26', null, null, 'Demo Loader', 'Personal leave'),
  ('Monthly review', 'meeting', '2026-10-31', null, '10:30', null, 'Pipeline and pending subsidies'),
  ('Diwali', 'holiday', '2026-11-08', null, null, null, 'Office closed'),
  ('Christmas', 'holiday', '2026-12-25', null, null, null, 'Office closed')
) as v(title, kind, starts_on, ends_on, start_time, person_name, notes)
where not exists (select 1 from public.calendar_events);

-- ═══ Vendors are now called installers ═════════════════════════════════════

do $$
declare
  n integer;
  new_name text;
  old_names text[];
begin
  for n in 1..3 loop
    new_name := 'Installer ' || n;
    old_names := array['Vendor ' || n, 'Demo Vendor ' || n]
      || case when n = 1 then array['Vendor', 'Demo Vendor'] else '{}'::text[] end;

    update public.admin set vendor = new_name where vendor = any(old_names);
    update public.delivery_batches set vendor = new_name where vendor = any(old_names);
    update public.calendar_events set person_name = new_name where person_name = any(old_names);
    update public.profiles set name = new_name where user_type = 'vendor' and name = any(old_names);
    if to_regclass('public.demo_profiles') is not null then
      execute 'update public.demo_profiles set name = $1 where user_type = ''vendor'' and name = any($2)'
      using new_name, old_names;
    end if;

    -- Keep one directory row under the new name; drop the old duplicates.
    if not exists (select 1 from public.vendors where name = new_name) then
      update public.vendors set name = new_name
      where id = (select id from public.vendors where name = any(old_names)
                  order by (name = 'Vendor ' || n) desc limit 1);
    end if;
    delete from public.vendors where name = any(old_names);
  end loop;
end $$;

-- New installer logins: the same function as SQL 19 with the installer names.
create or replace function public.start_demo_session(p_role text default 'admin', p_name text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  u uuid := auth.uid();
  p public.profiles;
  v_role_title text;
  v_num integer;
  v_assigned_name text;
  v_clean_name text;
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

  return to_jsonb(p);
end $$;

grant execute on function public.start_demo_session(text, text) to authenticated;

update public.profiles set role = 'Installers' where user_type = 'vendor' and role = 'Vendors';
do $$
begin
  if to_regclass('public.demo_roles') is not null then
    update public.demo_roles set label = 'Installer', role = 'Installers' where user_type = 'vendor';
  end if;
end $$;

commit;

notify pgrst, 'reload schema';
