-- All fictional contact, notification and HTTP-request fixtures roll back.
begin;
select set_config('qa.enquiry_id',gen_random_uuid()::text,true),
       set_config('qa.edit_token',gen_random_uuid()::text,true),
       set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
select public.save_enquiry_details(current_setting('qa.enquiry_id')::uuid,
    current_setting('qa.edit_token')::uuid,'Email QA fixture','0000000852',null,'both',
    'Selected option: Tools only — no CRM');
select public.save_enquiry_details(current_setting('qa.enquiry_id')::uuid,
    current_setting('qa.edit_token')::uuid,'Email QA fixture','0000000852','Fictional QA company','both',
    'Selected option: Tools only — no CRM; Interested in: Quotation maker');
select public.save_enquiry_details(current_setting('qa.enquiry_id')::uuid,
    current_setting('qa.edit_token')::uuid,'Email QA fixture','0000000852','Fictional QA company','both',
    'Selected option: Tools only — no CRM; Interested in: Quotation maker');
do $$
begin
    begin
        perform count(*) from enquiry_private.email_outbox;
        raise exception 'FAIL: visitor can read the notification queue';
    exception when insufficient_privilege then null; end;
    begin
        perform count(*) from enquiry_private.email_settings;
        raise exception 'FAIL: visitor can read the worker authentication token';
    exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$
begin
    if (select count(*) from enquiry_private.email_outbox where enquiry_id=current_setting('qa.enquiry_id')::uuid) <> 1 then
        raise exception 'FAIL: expected only the initial contact email; optional updates must not create emails';
    end if;
    if not exists(select 1 from enquiry_private.email_outbox where enquiry_id=current_setting('qa.enquiry_id')::uuid
        and kind='new' and snapshot->>'mobile_number'='0000000852' and snapshot->>'selected_interest'='Tools only — no CRM') then
        raise exception 'FAIL: initial contact and selected interest not captured';
    end if;
    if exists(select 1 from enquiry_private.email_outbox where enquiry_id=current_setting('qa.enquiry_id')::uuid
        and (snapshot ? 'notes' or snapshot ? 'company_name')) then
        raise exception 'FAIL: optional private details included in email';
    end if;
end $$;
select 'PASS: only initial contact queued, optional updates and duplicate retry ignored, queue and worker token private' as verification;
rollback;
