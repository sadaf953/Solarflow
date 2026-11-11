import postgres from 'npm:postgres@3.4.7';
import { digestMessage } from './digest.mjs';

// Daily "who clicked" email. Woken by pg_cron (link_private.kick_digest) at 7 pm IST
// with the same private worker token as send-enquiry-email. Sends once per day.
const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10 });

function sameToken(a: string | null, b: string | null) {
    if (!a || !b || a.length !== b.length) return false;
    let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return d === 0;
}

Deno.serve(async req => {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const [{ worker_token }] = await sql`select worker_token from enquiry_private.email_settings where singleton`;
    if (!sameToken(req.headers.get('x-enquiry-worker-token'), worker_token)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const apiKey = Deno.env.get('BREVO_API_KEY'), sender = Deno.env.get('BREVO_SENDER_EMAIL');
    if (!apiKey || !sender) return Response.json({ error: 'Email sender is not configured' }, { status: 503 });

    const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const done = await sql`select 1 from link_private.digest_log where day = ${day}::date and sent_at is not null`;
    if (done.length) return Response.json({ skipped: 'already sent today' });

    const rows = await sql`
        select e.code, c.company, c.name, c.phone, c.email, c.channel, e.event,
               min(e.created_at) as first_at, count(*)::int as times
        from link_private.events e join link_private.contacts c using (code)
        -- Everything since the last email that went out (or the last 24 hours).
        where e.created_at > coalesce((select max(sent_at) from link_private.digest_log where day < ${day}::date),
                                      now() - interval '24 hours')
        group by e.code, c.company, c.name, c.phone, c.email, c.channel, e.event`;

    const message = digestMessage(rows, day, sender);
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST', headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(message), signal: AbortSignal.timeout(15000),
    });
    const result = await res.json().catch(() => ({}));
    const ok = res.ok && result.messageId || result.code === 'duplicate_parameter';
    await sql`insert into link_private.digest_log(day, sent_at, provider_id, last_error)
              values (${day}::date, ${ok ? new Date() : null}, ${result.messageId ?? null}, ${ok ? null : `http_${res.status}`})
              on conflict (day) do update set sent_at = excluded.sent_at, provider_id = excluded.provider_id, last_error = excluded.last_error`;
    return Response.json({ sent: !!ok, people: new Set(rows.map(r => r.code)).size }, { status: ok ? 200 : 502 });
});
