// Builds the daily "who clicked your link" email. Pure function, so it can be tested.
export const DIGEST_RECIPIENT = 'enquiry@deeprootsystems.in';
const LABEL = { open: 'Opened the link', video_play: 'Played the video', demo_enter: 'Entered the demo', quote_sent: 'Sent a quote' };
const ORDER = ['quote_sent', 'demo_enter', 'video_play', 'open'];
const clean = v => String(v ?? '').replace(/[\r\n]+/g, ' ').trim();

// rows: [{code, company, name, phone, email, channel, event, first_at, times}]
export function digestMessage(rows, day, senderEmail, senderName = 'SolarFlow link tracker') {
    const people = new Map();
    for (const r of rows) {
        const p = people.get(r.code) || { ...r, events: {} };
        p.events[r.event] = { first_at: r.first_at, times: Number(r.times) || 1 };
        people.set(r.code, p);
    }
    // Warmest first: quote > demo > video > open.
    const rank = p => Math.min(...Object.keys(p.events).map(e => ORDER.indexOf(e)));
    const list = [...people.values()].sort((a, b) => rank(a) - rank(b));
    const time = iso => new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' });
    const lines = list.map((p, i) => {
        const who = [clean(p.name), clean(p.company)].filter(Boolean).join(', ') || `Code ${p.code}`;
        const did = [...ORDER].reverse().filter(e => p.events[e]).map(e => `${LABEL[e]} (${time(p.events[e].first_at)}${p.events[e].times > 1 ? `, ${p.events[e].times} times` : ''})`);
        const contact = [clean(p.phone) && `Phone ${clean(p.phone)}`, clean(p.email) && `Email ${clean(p.email)}`, clean(p.channel) && `Sent by ${clean(p.channel)}`].filter(Boolean).join(' · ');
        return `${i + 1}. ${who}\n   ${did.join(' → ')}${contact ? `\n   ${contact}` : ''}`;
    });
    const n = list.length;
    return {
        sender: { email: senderEmail, name: senderName },
        to: [{ email: DIGEST_RECIPIENT }],
        subject: n ? `${n} ${n === 1 ? 'person' : 'people'} clicked your SolarFlow link today (${day})` : `Nobody clicked your SolarFlow link today (${day})`,
        textContent: n
            ? `People who opened their personal SolarFlow link in the last 24 hours, warmest first:\n\n${lines.join('\n\n')}\n\nAsk them: "Saw you had a look at SolarFlow. Want a quick quote or a 10-minute demo?"`
            : 'No one opened a personal SolarFlow link in the last 24 hours.',
        headers: { idempotencyKey: `link-digest-${day}` },
    };
}
