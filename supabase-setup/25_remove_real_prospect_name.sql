-- 25_remove_real_prospect_name.sql
--
-- On 2026-09-27 a real prospect tried the shared demo under his own name.
-- That left his name on two leads, one quotation (Quote-6259), activity
-- entries and his visitor profile, where every demo visitor and every screen
-- recording can see it. This removes those records and renames anything left
-- that still carries the name to "Demo Visitor".
--
-- Enquiries are NOT touched: an enquiry is a real sales lead. They are only
-- counted at the end so you can review them yourself.
--
-- Run once in the Supabase SQL Editor of the demo project (qduonewmquwayrnwyzvc).
-- Guardrail: it stops without changing anything if it would remove more than
-- the two known leads and one known quotation.
--
-- Afterwards, in Storage → customer-documents, delete the two folders named
-- after the lead IDs below (they hold only the built-in sample light bill).

begin;

create temporary table doomed_leads on commit drop as
select id from public.admin
where id in ('42ebe5ac-457c-4ca8-8b1e-25d57c8292f9', '3fd41dd7-6c38-4e31-a15e-f04d1ff64b28')
   or customer_name ilike '%jigar%'
   or email_address ilike '%jigar%';

create temporary table doomed_quotes on commit drop as
select id from public.quotations
where id = '3fd41dd7-6c38-4e31-a15e-f04d1ff64b28'
   or customer_name ilike '%jigar%'
   or source_lead_id in (select id from doomed_leads)
   or converted_lead_id in (select id from doomed_leads);

do $$
declare
  lead_count integer;
  quote_count integer;
begin
  select count(*) into lead_count from doomed_leads;
  select count(*) into quote_count from doomed_quotes;
  if lead_count > 2 or quote_count > 1 then
    raise exception
      'Cleanup cancelled: expected at most 2 leads and 1 quotation, found % leads and % quotations.',
      lead_count, quote_count;
  end if;
  raise notice 'Removing % lead(s) and % quotation(s).', lead_count, quote_count;
end
$$;

-- Delivery batches store project IDs in an array rather than a foreign key.
update public.delivery_batches
set project_ids = array(select p from unnest(project_ids) as p where p not in (select id from doomed_leads))
where project_ids && array(select id from doomed_leads);

delete from public.activity_log
where customer_id in (select id from doomed_leads)
   or message ilike '%jigar%'
   or old_value ilike '%jigar%'
   or new_value ilike '%jigar%'
   or details::text ilike '%jigar%';

delete from public.quotations where id in (select id from doomed_quotes);

-- Documents and BOM rows cascade with the lead.
delete from public.admin where id in (select id from doomed_leads);

-- His visitor login stays (it owns activity history), but without his name.
update public.profiles set name = 'Demo Visitor' where name ilike '%jigar%';
update public.demo_profiles set name = 'Demo Visitor' where name ilike '%jigar%';
update public.team_chat_messages set sender_name = 'Demo Visitor' where sender_name ilike '%jigar%';
update public.team_chat_messages
set text = regexp_replace(text, 'jigar(\s+raj)?', 'Demo Visitor', 'gi')
where text ilike '%jigar%';

commit;

-- Every count except enquiries should be 0.
select 'leads' as what, count(*) from public.admin where customer_name ilike '%jigar%' or email_address ilike '%jigar%'
union all select 'quotations', count(*) from public.quotations where customer_name ilike '%jigar%'
union all select 'activity entries', count(*) from public.activity_log where message ilike '%jigar%' or new_value ilike '%jigar%' or old_value ilike '%jigar%'
union all select 'profiles', count(*) from public.profiles where name ilike '%jigar%'
union all select 'team chat', count(*) from public.team_chat_messages where sender_name ilike '%jigar%' or text ilike '%jigar%'
union all select 'inventory movements', count(*) from public.inventory_movements where to_jsonb(inventory_movements)::text ilike '%jigar%'
union all select 'enquiries (review only)', count(*) from public.enquiries where to_jsonb(enquiries)::text ilike '%jigar%';
