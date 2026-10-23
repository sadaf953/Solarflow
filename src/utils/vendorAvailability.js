// src/utils/vendorAvailability.js
// "Not available" days and leave of installation teams on the shared calendar
// (calendar_events rows with kind 'unavailable' or 'leave', unless rejected), used to warn before a delivery is booked. They used to
// live in each browser's localStorage, so the office never saw an installer's days.
import { supabase } from '../supabase';
import { demoVendorTarget } from '../demo/vendors';

// ilike without wildcards: a case-insensitive exact match on the name.
const exactName = name => String(name || '').trim().replace(/[\\%_]/g, ch => `\\${ch}`);

/** Unavailable entries for `installerName` that overlap fromISO..toISO ('YYYY-MM-DD'), oldest first. */
export async function installerUnavailableInRange(installerName, fromISO, toISO = fromISO) {
    const name = exactName(demoVendorTarget(installerName) || installerName);
    const from = String(fromISO || '').slice(0, 10);
    const to = String(toISO || from).slice(0, 10);
    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(from)) return [];
    const { data, error } = await supabase
        .from('calendar_events')
        .select('id, title, notes, starts_on, ends_on, created_at, created_by_name, kind, status')
        .in('kind', ['unavailable', 'leave'])
        .neq('status', 'rejected')
        .ilike('person_name', name)
        .lte('starts_on', to)
        .or(`ends_on.gte.${from},and(ends_on.is.null,starts_on.gte.${from})`)
        .order('starts_on');
    if (error) throw error;
    return data || [];
}

/** { unavailable, reason, markedAt, markedBy } for one installer on one day. A failed lookup counts as available. */
export async function isVendorUnavailableOn(installerName, dateISO) {
    try {
        const [entry] = await installerUnavailableInRange(installerName, dateISO);
        if (!entry) return { unavailable: false, reason: '', markedAt: null, markedBy: null };
        const reason = entry.notes || (!['Not available', 'Leave'].includes(entry.title) ? entry.title : entry.title === 'Leave' ? 'on leave' : '');
        return { unavailable: true, reason, markedAt: entry.created_at, markedBy: entry.created_by_name || null };
    } catch (error) {
        console.error('Could not check installer availability:', error);
        return { unavailable: false, reason: '', markedAt: null, markedBy: null };
    }
}
