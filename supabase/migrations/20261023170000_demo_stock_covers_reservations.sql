-- Demo stock that covers the sample projects' BOMs (23 Oct 2026).
--
-- Run once in the SQL Editor of the demo project (qduonewmquwayrnwyzvc). Safe to re-run.
--
-- The sample projects at Material Integration and Material Delivery reserve their BOMs,
-- which is more than the opening stock: Inventory showed Solar PV Modules at -472 free.
-- Each item that falls short gets one "receipt" movement, so its free stock is
-- the larger of twice its reorder level, a quarter of what is reserved, or 10.
-- Items that already have enough are left alone.
begin;

with reserved as (
  select item_id, sum(quantity) as quantity
  from public.get_inventory_reservations()
  group by item_id
), plan as (
  select i.id,
         ceil(coalesce(r.quantity, 0)
              + greatest(i.reorder_level * 2, ceil(coalesce(r.quantity, 0) * 0.25), 10)
              - i.stock_on_hand) as receive
  from public.inventory_items i
  left join reserved r on r.item_id = i.id
), stocked as (
  update public.inventory_items i
  set stock_on_hand = i.stock_on_hand + p.receive
  from plan p
  where p.id = i.id and p.receive > 0
  returning i.id, i.demo_session_id, p.receive
)
insert into public.inventory_movements(demo_session_id, item_id, request_id, kind, quantity, note)
select demo_session_id, id, gen_random_uuid(), 'receipt', receive,
       'Stock received for the demo projects (23 Oct 2026)'
from stocked;

commit;
