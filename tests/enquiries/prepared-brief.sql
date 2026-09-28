-- The fictional draft and code are rolled back; no real enquiry is created.
begin;
select set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
set local role authenticated;
with created as (
    select public.create_prepared_brief(jsonb_build_object(
        'hasWebsite','Yes','teamSize','4–9','software',jsonb_build_array('Tally'),
        'interests',jsonb_build_array('DISCOM submission document maker'))) as result
)
select set_config('qa.brief_id',result->>'id',true),
       set_config('qa.brief_code',result->>'code',true) from created;

do $$
begin
    if public.unlock_prepared_brief(current_setting('qa.brief_id')::uuid, 'WRONG-CODE') is not null then
        raise exception 'FAIL: wrong code opened prepared form';
    end if;
    if public.unlock_prepared_brief(current_setting('qa.brief_id')::uuid,
        current_setting('qa.brief_code'))->>'hasWebsite' <> 'Yes' then
        raise exception 'FAIL: correct code did not restore prepared answers';
    end if;
    begin
        perform count(*) from enquiry_private.prepared_briefs;
        raise exception 'FAIL: signed-in visitor could read private drafts';
    exception when insufficient_privilege then null; end;
end $$;

set local role anon;
do $$
begin
    begin
        perform public.unlock_prepared_brief(current_setting('qa.brief_id')::uuid,
            current_setting('qa.brief_code'));
        raise exception 'FAIL: unauthenticated visitor could open a draft';
    exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$
begin
    if exists(select 1 from enquiry_private.prepared_briefs
        where id=current_setting('qa.brief_id')::uuid
          and code_hash=current_setting('qa.brief_code')) then
        raise exception 'FAIL: access code stored in plaintext';
    end if;
end $$;
update enquiry_private.prepared_briefs set expires_at=now()-interval '1 minute'
    where id=current_setting('qa.brief_id')::uuid;
set local role authenticated;
do $$
begin
    if public.unlock_prepared_brief(current_setting('qa.brief_id')::uuid,
        current_setting('qa.brief_code')) is not null then
        raise exception 'FAIL: expired draft still opens';
    end if;
end $$;
reset role;
select 'PASS: link and separate code restore answers; wrong code, direct reads, anonymous access and expiry are denied' as verification;
rollback;
