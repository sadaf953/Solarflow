-- Residential or Commercial customers (24 Oct 2026).
--
-- Run once in the SQL Editor of the demo project (qduonewmquwayrnwyzvc). Safe to re-run.
-- Run it BEFORE deploying the app version that sends project_type, or adding a lead fails.
--
-- * admin.project_type: Residential (default for every existing customer) or Commercial.
--   Quotations already use the same two values, and a converted quotation carries it over.
begin;

alter table public.admin
    add column if not exists project_type text not null default 'Residential';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'admin_project_type_check') then
    alter table public.admin
      add constraint admin_project_type_check check (project_type in ('Residential', 'Commercial'));
  end if;
end $$;

commit;

notify pgrst, 'reload schema';
