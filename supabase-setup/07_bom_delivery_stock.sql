-- SolarFlow SQL 07 — complete script with explicit function boundaries.
-- Replace the entire old SQL 07 editor contents with this file, then run all.
-- Run after 06. Reuses inventory tables; no new tables. No retrospective deductions.
begin;
alter table public.bom_items add column if not exists stock_quantity numeric(14,3) check(stock_quantity>=0);
alter table public.admin add column if not exists bom_stock_issued_at timestamptz;
alter table public.inventory_movements add column if not exists customer_id uuid;
create index if not exists inventory_movements_customer on public.inventory_movements(demo_session_id,customer_id);
create or replace function public.bom_stock_document(p_customer_id uuid)
returns jsonb language plpgsql stable security invoker set search_path='' as $bom_stock_document$
declare c public.admin; b public.bom; items jsonb; kind text;
begin
 select * into c from public.admin where id=p_customer_id and demo_session_id=auth.uid() and deleted_at is null;
 if not found then raise exception 'Project unavailable';end if;
 kind:=case when upper(c.roof_shed)='SHED' then 'SHED' else 'ROOF' end;
 if jsonb_typeof(c.bom_data->'items')='array' and coalesce(c.bom_data->'bom'->>'bom_type',c.bom_data->>'bom_type',kind)=kind then return c.bom_data;end if;
 select * into b from public.bom where admin_id=c.id and demo_session_id=auth.uid() and bom_type=kind;
 select coalesce(jsonb_agg(to_jsonb(i) order by sr_no,id),'[]'::jsonb) into items from public.bom_items i where bom_id=b.id and demo_session_id=auth.uid();
 return jsonb_build_object('bom',to_jsonb(b),'items',items);
end $bom_stock_document$;
create or replace function public.get_inventory_bom_lines()
returns jsonb language sql stable security invoker set search_path='' as $get_inventory_bom_lines$
 select coalesce(jsonb_agg(line || jsonb_build_object('customer_id',c.id,'customer_name',c.customer_name,
 'issued',c.bom_stock_issued_at is not null,'line_index',ordinality-1) order by c.customer_name,ordinality),'[]'::jsonb)
 from public.admin c cross join lateral jsonb_array_elements(public.bom_stock_document(c.id)->'items') with ordinality as l(line,ordinality)
 where c.demo_session_id=auth.uid() and c.deleted_at is null;
$get_inventory_bom_lines$;
create or replace function public.set_bom_stock_quantity(p_customer_id uuid,p_line_index integer,p_quantity numeric,p_expected_line jsonb)
returns void language plpgsql security invoker set search_path='' as $set_bom_stock_quantity$
declare c public.admin; doc jsonb; line jsonb;
begin
 if p_quantity is null or p_quantity<0 or p_quantity::text in ('NaN','Infinity','-Infinity') or p_quantity<>round(p_quantity,3) then raise exception 'Enter zero or a positive quantity with at most three decimal places';end if;
 select * into c from public.admin where id=p_customer_id and demo_session_id=auth.uid() and deleted_at is null for update;
 if not found then raise exception 'Project unavailable';end if;
 if c.bom_stock_issued_at is not null then raise exception 'Stock already issued. Record a separate stock adjustment if needed.';end if;
 doc:=public.bom_stock_document(c.id);line:=doc->'items'->p_line_index;
 if p_line_index<0 or line is null or line is distinct from p_expected_line then raise exception 'BOM changed. Refresh and review the current line.';end if;
 doc:=jsonb_set(doc,array['items',p_line_index::text,'stock_quantity'],to_jsonb(p_quantity));
 update public.admin set bom_data=doc where id=c.id;
end $set_bom_stock_quantity$;
create or replace function public.issue_delivered_bom_stock()
returns trigger language plpgsql security invoker set search_path='' as $issue_delivered_bom_stock$
declare
 doc jsonb;
 line jsonb;
 amount numeric;
 item public.inventory_items;
 r record;
 demands jsonb := '{}'::jsonb;
 raw text;
 bom_kind text;
begin
 if new.delivery_status is distinct from 'DELIVERED' or old.delivery_status is not distinct from 'DELIVERED' or old.bom_stock_issued_at is not null then return new;end if;
 if new.demo_session_id is distinct from auth.uid() then raise exception 'Project unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 doc:=public.bom_stock_document(new.id);
 bom_kind := 'ROOF';
 if upper(new.roof_shed) = 'SHED' then
  bom_kind := 'SHED';
 end if;
 if jsonb_typeof(new.bom_data->'items') = 'array'
    and coalesce(
      new.bom_data->'bom'->>'bom_type',
      new.bom_data->>'bom_type',
      bom_kind
    ) = bom_kind
 then
  doc := new.bom_data;
 end if;
 if jsonb_array_length(doc->'items')=0 then raise exception 'Create and save a BOM for % before marking Delivered',new.customer_name;end if;
 perform public.sync_inventory_catalog();
 for line in select jsonb_array_elements(doc->'items') loop
  raw:=coalesce(line->>'stock_quantity',line->>'quantity','');
  if trim(raw) !~ '^(\d+(\.\d+)?|\.\d+)$' then raise exception 'Quantity needed for %: %. Open Godown → BOM Quantities.',new.customer_name,line->>'product_name';end if;
  amount:=trim(raw)::numeric;
  if amount<>round(amount,3) then raise exception 'Use at most three decimal places for %',line->>'product_name';end if;
  if amount=0 then continue;end if;
  select * into item from public.inventory_items where demo_session_id=auth.uid() and item_key=public.inventory_item_key(line->>'product_name',line->>'uom');
  if not found then raise exception 'Add a unit and save the BOM for %',line->>'product_name';end if;
  demands:=jsonb_set(demands,array[item.id::text],to_jsonb(coalesce((demands->>item.id::text)::numeric,0)+amount));
 end loop;
 for r in select key,value from jsonb_each_text(demands) order by key loop
  select * into item from public.inventory_items where id=r.key::uuid and demo_session_id=auth.uid() for update;
  if item.stock_on_hand<r.value::numeric then raise exception 'Insufficient % for %: need %, available % %. Add quantity in Godown.',item.product_name,new.customer_name,r.value,item.stock_on_hand,item.uom;end if;
  perform public.record_inventory_movement(item.id,'issue',r.value::numeric,'BOM delivery: '||new.customer_name||' ('||new.id||')',gen_random_uuid());
  -- Link the movement to the project without changing the existing ledger schema design.
  update public.inventory_movements set customer_id=new.id where demo_session_id=auth.uid() and item_id=item.id and customer_id is null and note='BOM delivery: '||new.customer_name||' ('||new.id||')';
 end loop;
 new.bom_stock_issued_at:=now();
 return new;
end $issue_delivered_bom_stock$;
drop trigger if exists issue_delivered_bom_stock on public.admin;
create trigger issue_delivered_bom_stock before update of delivery_status on public.admin for each row execute function public.issue_delivered_bom_stock();
create or replace function public.update_delivery_batch_status_atomic(p_batch_id uuid,p_new_status text,p_project_ids uuid[])
returns jsonb language plpgsql security invoker set search_path='' as $update_delivery_batch_status_atomic$
declare b public.delivery_batches; n integer; expected integer;
begin
 if p_new_status not in ('PENDING','IN_TRANSIT','DELIVERED') or p_new_status is null then raise exception 'Invalid delivery status';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select * into b from public.delivery_batches where id=p_batch_id and demo_session_id=auth.uid() for update;
 if not found then raise exception 'Batch unavailable';end if;
 if array(select unnest(coalesce(p_project_ids,'{}'::uuid[])) order by 1) is distinct from array(select unnest(coalesce(b.project_ids,'{}'::uuid[])) order by 1) then raise exception 'Batch projects changed. Refresh and retry.';end if;
 expected:=coalesce(array_length(b.project_ids,1),0);
 update public.admin set delivery_status=p_new_status where id=any(b.project_ids) and demo_session_id=auth.uid() and deleted_at is null and delivery_batch_id=b.batch_no;
 get diagnostics n=row_count;
 if n<>expected then raise exception 'Some batch projects are unavailable or assigned elsewhere. Refresh and correct the batch.';end if;
 update public.delivery_batches set status=p_new_status where id=b.id;
 return jsonb_build_object('success',true,'projects_expected',expected,'projects_missing',0);
end $update_delivery_batch_status_atomic$;
revoke all on function public.bom_stock_document(uuid),public.get_inventory_bom_lines(),public.set_bom_stock_quantity(uuid,integer,numeric,jsonb),public.issue_delivered_bom_stock(),public.update_delivery_batch_status_atomic(uuid,text,uuid[]) from public,anon;
grant execute on function public.bom_stock_document(uuid),public.get_inventory_bom_lines(),public.set_bom_stock_quantity(uuid,integer,numeric,jsonb),public.update_delivery_batch_status_atomic(uuid,text,uuid[]) to authenticated;
commit;
