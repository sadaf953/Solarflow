-- Quotation signature links (22 Oct 2026).
-- Staff send a quotation for signature; the customer opens #/sign/<token> without
-- signing in, reads the proposal and accepts it by signing on screen or uploading a
-- photo of their signature.
--
-- Run once in the SQL Editor of the demo project (qduonewmquwayrnwyzvc). Safe to re-run.
--
-- * quotation_sign_link(id)  staff only. Makes a new link (the old one stops working),
--   freezes the quotation as sent in sign_snapshot so the customer signs exactly what
--   they were shown, and marks a draft as issued.
-- * quotation_sign_request(token) and submit_quotation_signature(token, png, method)
--   are the only things the public page can call. They need the secret token and
--   return nothing else about the quotation table.
begin;

alter table public.quotations
    add column if not exists sign_token text,
    add column if not exists sign_snapshot jsonb,
    add column if not exists sign_sent_at timestamptz,
    add column if not exists sign_expires_at timestamptz,
    add column if not exists signed_at timestamptz,
    add column if not exists signature_png text,
    add column if not exists signature_method text;

create unique index if not exists quotations_sign_token_key on public.quotations(sign_token) where sign_token is not null;
alter table public.quotations drop constraint if exists quotations_signature_method_check;
alter table public.quotations add constraint quotations_signature_method_check
    check (signature_method is null or signature_method in ('drawn', 'photo'));

create or replace function public.quotation_sign_link(p_quotation_id uuid) returns jsonb
language plpgsql volatile security invoker set search_path = '' as $$
declare
    q public.quotations;
    v_now timestamptz := now();
    v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    v_expires timestamptz;
begin
    if auth.uid() is null then raise exception 'Sign in to send a quotation for signature.'; end if;
    select * into q from public.quotations where id = p_quotation_id for update;
    if not found then raise exception 'Quotation not found.'; end if;
    if q.signed_at is not null then raise exception 'The customer has already signed this quotation.'; end if;
    if q.status in ('lost', 'converted') then raise exception 'Reopen this quotation before sending it for signature.'; end if;
    if q.valid_until is not null and q.valid_until < (v_now at time zone 'Asia/Kolkata')::date then
        raise exception 'This quotation is past its valid-until date. Update the date before sending it.';
    end if;
    -- The link works until the end of the quotation's valid-until day (India time).
    v_expires := coalesce(((q.valid_until + 1)::timestamp at time zone 'Asia/Kolkata'), v_now + interval '15 days');

    update public.quotations set
        sign_token = v_token,
        sign_sent_at = v_now,
        sign_expires_at = v_expires,
        sign_snapshot = (to_jsonb(q) - array['sign_token', 'sign_snapshot', 'sign_sent_at', 'sign_expires_at', 'signed_at',
                                             'signature_png', 'signature_method', 'demo_session_id', 'owner_id', 'lost_reason', 'lost_remark'])
                        || jsonb_build_object('quotation_data', coalesce(q.quotation_data, '{}'::jsonb) - array['activity', 'issued_versions']),
        status = case when q.status = 'draft' then 'issued' else q.status end,
        issued_at = coalesce(q.issued_at, v_now),
        quotation_data = jsonb_set(coalesce(q.quotation_data, '{}'::jsonb), '{activity}',
            coalesce(q.quotation_data -> 'activity', '[]'::jsonb)
            || jsonb_build_array(jsonb_build_object('type', 'sent_for_signature', 'actor_id', auth.uid(), 'at', v_now, 'expires_at', v_expires)))
    where id = q.id;
    return jsonb_build_object('token', v_token, 'expires_at', v_expires);
end $$;

-- What the public page may show: the customer's first name, the link state and the
-- quotation as it was sent. Unknown or replaced links return null.
create or replace function public.quotation_sign_request(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
    q public.quotations;
begin
    if p_token is null or length(p_token) < 30 then return null; end if;
    select * into q from public.quotations where sign_token = p_token;
    if not found then return null; end if;
    return jsonb_build_object(
        'first_name', split_part(trim(coalesce(q.customer_name, '')), ' ', 1),
        'status', case when q.signed_at is not null then 'signed' when q.sign_expires_at < now() then 'expired' else 'open' end,
        'expires_at', q.sign_expires_at,
        'snapshot', q.sign_snapshot,
        'signed_at', q.signed_at,
        'signature_png', q.signature_png,
        'signature_method', q.signature_method);
end $$;

-- Saves the customer's signature once. Refuses unknown, used or expired links.
create or replace function public.submit_quotation_signature(p_token text, p_png text, p_method text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
    q public.quotations;
    v_now timestamptz := now();
begin
    if p_token is null or length(p_token) < 30 or p_png is null or p_png not like 'data:image/png;base64,%'
       or length(p_png) > 400000 or p_method is null or p_method not in ('drawn', 'photo') then
        raise exception 'Invalid signature';
    end if;
    select * into q from public.quotations where sign_token = p_token for update;
    if not found then raise exception 'Unknown link'; end if;
    if q.signed_at is not null then raise exception 'Already signed'; end if;
    if q.sign_expires_at < v_now then raise exception 'Link expired'; end if;
    update public.quotations set
        signed_at = v_now,
        signature_png = p_png,
        signature_method = p_method,
        quotation_data = jsonb_set(coalesce(q.quotation_data, '{}'::jsonb), '{activity}',
            coalesce(q.quotation_data -> 'activity', '[]'::jsonb)
            || jsonb_build_array(jsonb_build_object('type', 'customer_signed', 'at', v_now, 'method', p_method)))
    where id = q.id;
    return jsonb_build_object('signed_at', v_now);
end $$;

revoke all on function public.quotation_sign_link(uuid) from public, anon;
revoke all on function public.quotation_sign_request(text) from public;
revoke all on function public.submit_quotation_signature(text, text, text) from public;
grant execute on function public.quotation_sign_link(uuid) to authenticated;
grant execute on function public.quotation_sign_request(text) to anon, authenticated;
grant execute on function public.submit_quotation_signature(text, text, text) to anon, authenticated;

commit;
