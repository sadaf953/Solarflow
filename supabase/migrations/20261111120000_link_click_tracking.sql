begin;
-- Personal link tracking. Every client we email or WhatsApp gets a code (?c=…).
-- The site logs when that link is opened / the video is played / a quote is sent.
-- A daily email lists who clicked. Visitors can only add events for codes we
-- registered; nobody can read the tables through the API.
create schema if not exists link_private;
revoke all on schema link_private from public, anon, authenticated;

create table if not exists link_private.settings (
    singleton boolean primary key default true check (singleton),
    register_token text not null default encode(extensions.gen_random_bytes(24), 'hex')
);
insert into link_private.settings(singleton) values (true) on conflict do nothing;

create table if not exists link_private.contacts (
    code text primary key check (code ~ '^[a-f0-9]{10}$'),
    company text, name text, email text, phone text,
    channel text, list_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists link_private.events (
    id bigserial primary key,
    code text not null references link_private.contacts(code) on delete cascade,
    event text not null check (event in ('open','video_play','quote_sent','demo_enter')),
    page text,
    created_at timestamptz not null default now()
);
create index if not exists link_events_time on link_private.events(created_at);
create index if not exists link_events_code on link_private.events(code, event, created_at);

create table if not exists link_private.digest_log (
    day date primary key,
    sent_at timestamptz, provider_id text, last_error text
);
alter table link_private.settings enable row level security;
alter table link_private.contacts enable row level security;
alter table link_private.events enable row level security;
alter table link_private.digest_log enable row level security;
revoke all on all tables in schema link_private from public, anon, authenticated;

-- Website: log one event. Unknown codes are ignored; the same event from the
-- same code within 30 minutes counts once.
create or replace function public.log_link_event(p_code text, p_event text, p_page text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
    p_code := lower(trim(coalesce(p_code, '')));
    if p_code !~ '^[a-f0-9]{10}$' or p_event not in ('open','video_play','quote_sent','demo_enter') then return; end if;
    if not exists (select 1 from link_private.contacts c where c.code = p_code) then return; end if;
    if exists (select 1 from link_private.events e where e.code = p_code and e.event = p_event
               and e.created_at > now() - interval '30 minutes') then return; end if;
    insert into link_private.events(code, event, page) values (p_code, p_event, left(p_page, 60));
end;
$$;
revoke all on function public.log_link_event(text, text, text) from public;
grant execute on function public.log_link_event(text, text, text) to anon, authenticated;

-- Google Sheet (Apps Script): register who each code belongs to. Needs the
-- register token (Script property LINK_TOKEN). p_rows = [{code,company,name,email,phone,channel,list_name}]
create or replace function public.register_link_contacts(p_token text, p_rows jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
    if p_token is null or not exists (select 1 from link_private.settings s where s.register_token = p_token) then
        raise exception 'not allowed';
    end if;
    if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 1000 then raise exception 'bad rows'; end if;
    insert into link_private.contacts as c(code, company, name, email, phone, channel, list_name)
    select lower(r->>'code'), left(r->>'company',120), left(r->>'name',80), left(r->>'email',120),
           left(r->>'phone',20), left(r->>'channel',20), left(r->>'list_name',60)
    from jsonb_array_elements(p_rows) r
    where lower(r->>'code') ~ '^[a-f0-9]{10}$'
    on conflict (code) do update set
        company = coalesce(excluded.company, c.company), name = coalesce(excluded.name, c.name),
        email = coalesce(excluded.email, c.email), phone = coalesce(excluded.phone, c.phone),
        channel = coalesce(excluded.channel, c.channel), list_name = coalesce(excluded.list_name, c.list_name),
        updated_at = now();
    get diagnostics n = row_count;
    return n;
end;
$$;
revoke all on function public.register_link_contacts(text, jsonb) from public;
grant execute on function public.register_link_contacts(text, jsonb) to anon, authenticated;

-- Daily email at 7 pm India time: wake the digest function (same private token
-- as the enquiry email worker).
create or replace function link_private.kick_digest() returns void
language plpgsql security definer set search_path = '' as $$
declare worker_token text;
begin
    select s.worker_token into worker_token from enquiry_private.email_settings s where singleton;
    if worker_token is null then return; end if;
    perform net.http_post(
        url := 'https://qduonewmquwayrnwyzvc.supabase.co/functions/v1/send-link-digest',
        body := '{}'::jsonb,
        headers := jsonb_build_object('Content-Type','application/json','x-enquiry-worker-token',worker_token),
        timeout_milliseconds := 30000
    );
end;
$$;
revoke all on function link_private.kick_digest() from public, anon, authenticated;
select cron.schedule('solarflow-link-digest', '30 13 * * *', 'select link_private.kick_digest();');
commit;
