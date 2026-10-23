import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
    CalendarDays, ChevronLeft, ChevronRight, Clock, Pencil, Plus, Trash2, User, X,
    Wrench, Truck, UserX, Users, PartyPopper, AlertCircle
} from 'lucide-react';
import { supabase } from '../supabase';
import { stockDay } from '../inventory/model';
import { getAttendanceRecords, ATTENDANCE_STATUSES } from '../utils/staffAttendance';
import { demoVendorTarget } from '../demo/vendors';
import { containDialogFocus } from '../utils/dialogFocus';
import { useGlobalPopup } from './GlobalPopup';

// Entries people add. Installations, delivery trucks and attendance are read
// from their own records and shown alongside, never copied into this table.
const ENTRY_KINDS = [
    { value: 'event', label: 'Event', chip: 'bg-stone-100 text-stone-800 border-stone-300', dot: 'bg-stone-500' },
    { value: 'site_visit', label: 'Site visit', chip: 'bg-orange-100 text-orange-900 border-orange-300', dot: 'bg-orange-500' },
    { value: 'meeting', label: 'Meeting', chip: 'bg-blue-100 text-blue-900 border-blue-300', dot: 'bg-blue-500' },
    { value: 'follow_up', label: 'Follow-up', chip: 'bg-yellow-100 text-yellow-900 border-yellow-300', dot: 'bg-yellow-500' },
    { value: 'leave', label: 'Leave', chip: 'bg-purple-100 text-purple-900 border-purple-300', dot: 'bg-purple-500' },
    { value: 'holiday', label: 'Holiday', chip: 'bg-teal-100 text-teal-900 border-teal-300', dot: 'bg-teal-500' },
    { value: 'unavailable', label: 'Installation team not available', chip: 'bg-red-100 text-red-900 border-red-300', dot: 'bg-red-500' },
];
const KIND = Object.fromEntries(ENTRY_KINDS.map(kind => [kind.value, kind]));
const kindOf = value => KIND[value] || KIND.event;
const LAYERS = [
    { id: 'installations', label: 'Installations', icon: Wrench, dot: 'bg-emerald-500' },
    { id: 'deliveries', label: 'Delivery trucks', icon: Truck, dot: 'bg-amber-500' },
    { id: 'attendance', label: 'Leave & attendance', icon: UserX, dot: 'bg-purple-500' },
    { id: 'entries', label: 'Calendar entries', icon: CalendarDays, dot: 'bg-stone-500' },
];
// Attendance statuses that mean someone is away or out of the office.
const AWAY = ['leave', 'absent', 'half_day', 'holiday', 'holiday_request', 'on_duty'];
const NAMED_KINDS = ['leave', 'unavailable'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HEAD_OFFICE = ['admin', 'sales'];
const MAX_CHIPS = 3;

// Calendar days as 'YYYY-MM-DD' strings, counted in UTC so the device timezone never shifts them.
const dayDate = iso => new Date(`${iso}T00:00:00Z`);
const addDays = (iso, n) => {
    const date = dayDate(iso);
    date.setUTCDate(date.getUTCDate() + n);
    return date.toISOString().slice(0, 10);
};
const shiftMonth = (month, n) => {
    const [y, m] = month.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};
const formatDay = (iso, style = 'short') => new Intl.DateTimeFormat('en-IN', style === 'long'
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
    : { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(dayDate(iso));
const monthTitle = month => new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(dayDate(`${month}-01`));
const endOf = entry => entry.ends_on || entry.starts_on;
const isoDay = value => /^\d{4}-\d{2}-\d{2}/.test(String(value || '')) ? String(value).slice(0, 10) : null;

function formatTime(value) {
    if (!value) return '';
    const [h, m] = String(value).split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
}
const timeRange = entry => !entry.start_time ? 'All day'
    : entry.end_time ? `${formatTime(entry.start_time)} – ${formatTime(entry.end_time)}` : formatTime(entry.start_time);
const dateRange = entry => entry.ends_on && entry.ends_on !== entry.starts_on
    ? `${formatDay(entry.starts_on)} – ${formatDay(entry.ends_on)}` : formatDay(entry.starts_on);
const STATUS_NOTE = { requested: ' (requested)', rejected: ' (rejected)' };
const entryTitle = entry => `${NAMED_KINDS.includes(entry.kind) && entry.person_name
    ? `${entry.person_name}: ${entry.title}` : entry.title}${STATUS_NOTE[entry.status] || ''}`;
const INSTALLER_KINDS = ['unavailable', 'leave', 'site_visit', 'event'];

// Every spelling an installer's projects can be saved under ("Installer 2", legacy "Vendor 2").
function installerAliases(name) {
    const target = demoVendorTarget(name);
    if (!target) return [String(name || '').trim()].filter(Boolean);
    const n = target.split(' ')[1];
    return [target, `Demo Installer ${n}`, `Vendor ${n}`, `Demo Vendor ${n}`];
}

const blankForm = (date, installerName) => ({
    id: null, title: '', kind: installerName ? 'unavailable' : 'event', starts_on: date, ends_on: '',
    start_time: '', end_time: '', notes: '', customer: null, customer_id: null, person_name: installerName || '',
});
const formFromEntry = entry => ({
    id: entry.id, title: entry.title || '', kind: entry.kind || 'event', starts_on: entry.starts_on,
    ends_on: entry.ends_on && entry.ends_on !== entry.starts_on ? entry.ends_on : '',
    start_time: (entry.start_time || '').slice(0, 5), end_time: (entry.end_time || '').slice(0, 5),
    notes: entry.notes || '', customer: entry.customer?.id ? entry.customer : null,
    customer_id: entry.customer_id || entry.customer?.id || null, person_name: entry.person_name || '',
});

function formProblem(form) {
    if (!form.starts_on) return 'Pick a date.';
    if (form.kind === 'unavailable' && !form.person_name.trim()) return 'Pick the installation team who is not available.';
    if (form.kind === 'leave' && !form.person_name.trim()) return 'Add whose leave it is.';
    if (form.ends_on && form.ends_on < form.starts_on) return 'The end date must be on or after the start date.';
    if (form.end_time && !form.start_time) return 'Add a start time, or clear the end time.';
    if (form.start_time && form.end_time && !form.ends_on && form.end_time < form.start_time) return 'The end time must be after the start time.';
    return '';
}

function Dialog({ title, onClose, busy, footer, children, wide }) {
    const ref = useRef(null);
    useEffect(() => {
        const previous = document.activeElement;
        (ref.current?.querySelector('[data-autofocus]') || ref.current?.querySelector('button'))?.focus();
        return () => { if (previous?.isConnected) previous.focus(); };
    }, []);
    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-stone-950/40 p-0 sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
            <section ref={ref} role="dialog" aria-modal="true" aria-label={title}
                onKeyDown={event => { if (event.key === 'Escape' && !busy) onClose(); containDialogFocus(event); }}
                className={`flex max-h-[92dvh] w-full flex-col rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl ${wide ? 'sm:max-w-xl' : 'sm:max-w-md'}`}>
                <header className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-4">
                    <h3 className="text-sm font-black text-stone-900">{title}</h3>
                    <button type="button" onClick={onClose} disabled={busy} aria-label="Close"
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-900">
                        <X size={18} />
                    </button>
                </header>
                <div className="overflow-y-auto px-5 py-4">{children}</div>
                {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-stone-100 px-5 py-3">{footer}</footer>}
            </section>
        </div>
    );
}

const inputClass = 'w-full min-h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100';
const primaryButton = 'inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-stone-900 px-4 text-xs font-bold text-white hover:bg-stone-800 disabled:opacity-60';
const secondaryButton = 'inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-60';

function Field({ label, htmlFor, hint, children }) {
    return (
        <div className="space-y-1">
            <label htmlFor={htmlFor} className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">{label}</label>
            {children}
            {hint && <p className="text-[11px] text-stone-500">{hint}</p>}
        </div>
    );
}

function CustomerPicker({ value, linkedId, onChange, idPrefix }) {
    const [term, setTerm] = useState('');
    const [results, setResults] = useState([]);
    useEffect(() => {
        const text = term.replace(/[,()%]/g, ' ').trim();
        if (!text) { setResults([]); return; }
        let cancelled = false;
        const timer = setTimeout(() => {
            supabase.from('admin').select('id, customer_name, consumer_no, phone_number').is('deleted_at', null)
                .or(`customer_name.ilike.%${text}%,consumer_no.ilike.%${text}%,phone_number.ilike.%${text}%`)
                .order('customer_name').limit(8)
                .then(({ data, error }) => {
                    if (error) console.error('Customer search failed:', error);
                    if (!cancelled) setResults(data || []);
                });
        }, 250);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [term]);

    if (value || linkedId) {
        return (
            <div className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50 pl-3">
                <span className="truncate text-sm font-semibold text-stone-900">{value?.customer_name || 'Linked customer'}</span>
                <button type="button" onClick={() => onChange(null)} aria-label="Remove linked customer"
                    className="flex h-11 w-11 shrink-0 items-center justify-center text-stone-500 hover:text-stone-900"><X size={16} /></button>
            </div>
        );
    }
    return (
        <div className="space-y-2">
            <input id={`${idPrefix}-customer`} value={term} onChange={event => setTerm(event.target.value)} className={inputClass}
                placeholder="Search name, consumer no, phone…" aria-label="Search customers" />
            {results.length > 0 && (
                <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
                    {results.map(customer => (
                        <li key={customer.id}>
                            <button type="button" onClick={() => { onChange(customer); setTerm(''); }}
                                className="flex min-h-11 w-full flex-col items-start px-3 py-2 text-left hover:bg-amber-50">
                                <span className="text-sm font-semibold text-stone-900">{customer.customer_name || 'Unnamed customer'}</span>
                                <span className="text-[11px] text-stone-500">{[customer.consumer_no, customer.phone_number].filter(Boolean).join(' · ')}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function EntryForm({ form, setForm, installerName, selfName, isAdmin, installers, staff, error, idPrefix }) {
    const set = key => event => setForm(prev => ({ ...prev, [key]: event.target.value }));
    const id = name => `${idPrefix}-${name}`;
    const kinds = installerName ? ENTRY_KINDS.filter(kind => INSTALLER_KINDS.includes(kind.value)) : ENTRY_KINDS;
    // Picking Leave or Not available fills in the person: an installer is always themself,
    // and staff asking for leave usually ask for their own.
    const personFor = (kind, previous) => installerName && NAMED_KINDS.includes(kind) ? installerName
        : kind === 'leave' && !previous && !isAdmin ? selfName || '' : previous;
    return (
        <div className="space-y-4">
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">{error}</p>}
            <fieldset>
                <legend className="mb-1 text-[11px] font-bold uppercase tracking-wider text-stone-500">What kind of entry?</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {kinds.map(kind => (
                        <button key={kind.value} type="button" aria-pressed={form.kind === kind.value}
                            onClick={() => setForm(prev => ({ ...prev, kind: kind.value, person_name: personFor(kind.value, prev.person_name) }))}
                            className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-left text-xs font-bold ${form.kind === kind.value ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'}`}>
                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${kind.dot}`} aria-hidden="true" />{kind.label}
                        </button>
                    ))}
                </div>
            </fieldset>
            {form.kind === 'unavailable' && (installerName ? (
                <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                    The office will see that <strong>{installerName}</strong> cannot take deliveries or installations on these days.
                </p>
            ) : (
                <Field label="Installation team" htmlFor={id('installer')} hint="The office is warned when this installation team gets a delivery on these days.">
                    <select id={id('installer')} value={form.person_name} onChange={set('person_name')} className={inputClass}>
                        <option value="">Select…</option>
                        {form.person_name && !installers.includes(form.person_name) && <option value={form.person_name}>{form.person_name}</option>}
                        {installers.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                </Field>
            ))}
            {form.kind === 'leave' && !isAdmin && (
                <p className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900">
                    This is a leave request. It shows as requested until admin approves it.
                </p>
            )}
            {form.kind === 'leave' && !installerName && (
                <Field label="Whose leave?" htmlFor={id('person')} hint="Staff or an installation team.">
                    <input id={id('person')} list={id('staff')} value={form.person_name} onChange={set('person_name')} className={inputClass} maxLength={80} placeholder="Team member" />
                    <datalist id={id('staff')}>{[...staff, ...installers].map(name => <option key={name} value={name} />)}</datalist>
                </Field>
            )}
            <Field label={form.kind === 'holiday' ? 'Holiday name' : 'Title'} htmlFor={id('title')}
                hint={NAMED_KINDS.includes(form.kind) ? `Leave blank to show "${form.kind === 'leave' ? 'Leave' : 'Not available'}".` : undefined}>
                <input id={id('title')} value={form.title} onChange={set('title')} maxLength={120} className={inputClass} data-autofocus />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Date" htmlFor={id('start')}>
                    <input id={id('start')} type="date" value={form.starts_on} onChange={set('starts_on')} required className={inputClass} />
                </Field>
                <Field label="Until (optional)" htmlFor={id('end')} hint="For entries that run over several days.">
                    <input id={id('end')} type="date" value={form.ends_on} min={form.starts_on || undefined} onChange={set('ends_on')} className={inputClass} />
                </Field>
                <Field label="Start time (optional)" htmlFor={id('start-time')} hint="Leave blank for all day.">
                    <input id={id('start-time')} type="time" value={form.start_time} onChange={set('start_time')} className={inputClass} />
                </Field>
                <Field label="End time (optional)" htmlFor={id('end-time')}>
                    <input id={id('end-time')} type="time" value={form.end_time} onChange={set('end_time')} className={inputClass} />
                </Field>
            </div>
            {!installerName && (
                <Field label="Customer (optional)" htmlFor={`${idPrefix}-customer`}>
                    <CustomerPicker value={form.customer} linkedId={form.customer_id} idPrefix={idPrefix}
                        onChange={customer => setForm(prev => ({ ...prev, customer, customer_id: customer?.id || null }))} />
                </Field>
            )}
            <Field label="Notes (optional)" htmlFor={id('notes')}>
                <textarea id={id('notes')} value={form.notes} onChange={set('notes')} maxLength={1000} rows={3} className={`${inputClass} py-2`} />
            </Field>
        </div>
    );
}

// One calendar item: an entry, an installation, a truck, or someone away.
function Chip({ item, onOpen }) {
    return (
        <button type="button" onClick={() => onOpen(item)} title={item.label}
            className={`flex w-full min-w-0 items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-left text-[11px] font-semibold ${item.chip}`}>
            {item.time && <span className="shrink-0 font-bold">{item.time}</span>}
            <span className="truncate">{item.label}</span>
        </button>
    );
}

function ItemCard({ item, canEdit, onEdit, onDelete, onOpenCustomer, onDecide }) {
    const entry = item.entry;
    const decided = entry?.decided_by_name ? ` by ${entry.decided_by_name}` : '';
    return (
        <article className="rounded-xl border border-stone-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-bold text-stone-900">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.dot}`} aria-hidden="true" />
                        <span className="min-w-0 break-words">{item.label}</span>
                    </p>
                    <p className="mt-1 text-xs font-semibold text-stone-600">{item.kindLabel}</p>
                </div>
                {entry && canEdit && (
                    <div className="flex shrink-0">
                        <button type="button" onClick={() => onEdit(entry)} aria-label={`Edit ${entry.title}`}
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-900"><Pencil size={15} /></button>
                        <button type="button" onClick={() => onDelete(entry)} aria-label={`Delete ${entry.title}`}
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 hover:bg-red-50 hover:text-red-700"><Trash2 size={15} /></button>
                    </div>
                )}
            </div>
            {entry ? (
                <dl className="mt-2 space-y-1 text-xs text-stone-600">
                    <div className="flex items-center gap-1.5"><dt className="sr-only">When</dt><CalendarDays size={13} aria-hidden="true" /><dd>{dateRange(entry)}</dd></div>
                    <div className="flex items-center gap-1.5"><dt className="sr-only">Time</dt><Clock size={13} aria-hidden="true" /><dd>{timeRange(entry)}</dd></div>
                    {entry.customer?.customer_name && <div className="flex items-center gap-1.5"><dt className="sr-only">Customer</dt><User size={13} aria-hidden="true" /><dd className="truncate">{entry.customer.customer_name}</dd></div>}
                </dl>
            ) : item.detail && <p className="mt-2 text-xs text-stone-600">{item.detail}</p>}
            {entry?.notes && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-stone-700">{entry.notes}</p>}
            {entry?.created_by_name && <p className="mt-2 text-[11px] text-stone-500">{entry.status === 'requested' ? 'Requested' : 'Added'} by {entry.created_by_name}</p>}
            {entry?.kind === 'leave' && entry.status === 'requested' && !onDecide && <p className="mt-1 text-[11px] font-bold text-purple-700">Waiting for admin approval</p>}
            {entry?.kind === 'leave' && entry.status === 'approved' && decided && <p className="mt-1 text-[11px] font-bold text-emerald-700">Approved{decided}</p>}
            {entry?.status === 'rejected' && <p className="mt-1 text-[11px] font-bold text-red-700">Rejected{decided}</p>}
            {entry?.status === 'requested' && onDecide && (
                <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => onDecide(entry, 'approved')} className="inline-flex min-h-9 items-center rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700">Approve</button>
                    <button type="button" onClick={() => onDecide(entry, 'rejected')} className="inline-flex min-h-9 items-center rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-700 hover:bg-red-50">Reject</button>
                </div>
            )}
            {item.customerId && onOpenCustomer && (
                <button type="button" onClick={() => onOpenCustomer(item.customerId)} className="mt-2 text-xs font-bold text-amber-700 hover:underline">Open project</button>
            )}
        </article>
    );
}

/**
 * Shared calendar. Shows installations, delivery trucks, leave and attendance next to the
 * entries anyone adds (installer not available, leave, holidays, meetings, site visits).
 * Head office can change any entry; others change the entries they added.
 */
export default function CalendarView({ currentUser, onOpenCustomer }) {
    const { showConfirm } = useGlobalPopup();
    const idPrefix = useId();
    const today = stockDay(Date.now());
    const userType = currentUser?.userType || currentUser?.user_type;
    const isHeadOffice = HEAD_OFFICE.includes(userType);
    const isAdmin = userType === 'admin';
    const installerName = userType === 'vendor' ? (demoVendorTarget(currentUser?.name) || currentUser?.name || 'Installer') : null;

    const [month, setMonth] = useState(today.slice(0, 7));
    const [layers, setLayers] = useState(() => new Set(LAYERS.map(layer => layer.id)));
    const [entries, setEntries] = useState([]);
    const [requests, setRequests] = useState([]);
    const [installs, setInstalls] = useState([]);
    const [trucks, setTrucks] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [problems, setProblems] = useState([]);
    const [entriesReady, setEntriesReady] = useState(true);
    const [dayOpen, setDayOpen] = useState(null);
    const [form, setForm] = useState(null);
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [installers, setInstallers] = useState([]);
    const [staff, setStaff] = useState([]);
    const requestRef = useRef(0);

    useEffect(() => {
        if (installerName) return;
        let cancelled = false;
        supabase.from('vendors').select('name').order('name').then(({ data, error }) => {
            if (error) console.error('Could not load installers:', error);
            if (!cancelled) setInstallers([...new Set((data || []).map(row => row.name).filter(Boolean))]);
        });
        supabase.from('profiles').select('name, user_type').neq('user_type', 'vendor').order('name').then(({ data }) => {
            if (!cancelled) setStaff([...new Set((data || []).map(row => row.name).filter(Boolean))]);
        });
        return () => { cancelled = true; };
    }, [installerName]);

    const grid = useMemo(() => {
        const first = `${month}-01`;
        const start = addDays(first, -dayDate(first).getUTCDay());
        const next = `${shiftMonth(month, 1)}-01`;
        const cells = Math.ceil((dayDate(next) - dayDate(start)) / 864e5 / 7) * 7;
        const days = Array.from({ length: cells }, (_, i) => addDays(start, i));
        return { start, end: days[days.length - 1], days };
    }, [month]);

    const loadEntries = useCallback(async () => {
        const { data, error } = await supabase.from('calendar_events')
            .select('*, customer:admin(id, customer_name)')
            .lte('starts_on', grid.end)
            .or(`ends_on.gte.${grid.start},and(ends_on.is.null,starts_on.gte.${grid.start})`)
            .order('starts_on').order('start_time', { ascending: true, nullsFirst: true });
        if (error) {
            const missing = ['PGRST205', '42P01', 'PGRST200'].includes(error.code);
            setEntriesReady(!missing);
            console.error('Could not load calendar entries:', error);
            return missing ? 'Calendar entries appear once the demo owner runs the 23 Oct SQL update.' : 'Calendar entries could not be loaded.';
        }
        setEntriesReady(true);
        setEntries(data || []);
        if (isAdmin) {
            const pending = await supabase.from('calendar_events').select('*').eq('status', 'requested')
                .order('starts_on').limit(50);
            if (!pending.error) setRequests(pending.data || []);
        }
        return '';
    }, [grid, isAdmin]);

    const load = useCallback(async () => {
        const request = ++requestRef.current;
        const { start, end } = grid;
        let installQuery = supabase.from('admin')
            .select('id, customer_name, installation_date, installation_status, vendor, villages')
            .is('deleted_at', null).gte('installation_date', start).lte('installation_date', end);
        if (installerName) installQuery = installQuery.in('vendor', installerAliases(currentUser?.name));
        const [entryProblem, installResult, truckResult, attendanceRecords] = await Promise.all([
            loadEntries(),
            installQuery,
            installerName ? Promise.resolve({ data: [] }) : supabase.from('delivery_batches')
                .select('id, batch_no, dispatch_date, status, project_ids, loaded_at, loaded_by_name, vehicle_number, driver_name')
                .gte('dispatch_date', start).lte('dispatch_date', end),
            installerName ? Promise.resolve({}) : getAttendanceRecords(start, end).catch(() => ({})),
        ]);
        if (request !== requestRef.current) return;
        const next = [entryProblem].filter(Boolean);
        if (installResult.error) { console.error('Could not load installations:', installResult.error); next.push('Installations could not be loaded.'); }
        if (truckResult.error) { console.error('Could not load delivery trucks:', truckResult.error); next.push('Delivery trucks could not be loaded.'); }
        setInstalls(installResult.data || []);
        setTrucks(truckResult.data || []);
        setAttendance(Object.entries(attendanceRecords || {}).map(([key, record]) => {
            const cut = key.lastIndexOf('_');
            return { name: key.slice(0, cut), date: key.slice(cut + 1), ...record };
        }).filter(record => record.date >= start && record.date <= end));
        setProblems(next);
        setLoading(false);
    }, [grid, loadEntries, installerName, currentUser?.name]);

    useEffect(() => { setLoading(true); load(); }, [load]);

    useEffect(() => {
        const channel = supabase.channel(`calendar-events-${idPrefix}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, () => loadEntries())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [loadEntries, idPrefix]);

    // Everything shown on each day, as chips.
    const byDay = useMemo(() => {
        const map = {};
        const add = (day, item) => { if (day >= grid.start && day <= grid.end) (map[day] ||= []).push({ ...item, day }); };
        if (layers.has('installations')) for (const project of installs) {
            const day = isoDay(project.installation_date);
            if (!day) continue;
            const done = ['Installed', 'Yes', 'Completed'].includes(project.installation_status);
            add(day, {
                key: `install-${project.id}`, layer: 'installations', label: `${done ? 'Installed' : 'Install'} · ${project.customer_name || 'Customer'}`,
                chip: 'bg-emerald-100 text-emerald-900 border-emerald-300', dot: 'bg-emerald-500',
                kindLabel: done ? 'Installation done' : 'Installation scheduled',
                detail: [project.vendor && `Installation team: ${project.vendor}`, project.villages].filter(Boolean).join(' · '), customerId: project.id,
            });
        }
        if (layers.has('deliveries')) for (const batch of trucks) {
            const day = isoDay(batch.dispatch_date);
            if (!day) continue;
            const sites = (batch.project_ids || []).length;
            add(day, {
                key: `truck-${batch.id}`, layer: 'deliveries', label: `Truck ${batch.batch_no} · ${sites} ${sites === 1 ? 'site' : 'sites'}`,
                chip: 'bg-amber-100 text-amber-900 border-amber-300', dot: 'bg-amber-500',
                kindLabel: batch.status === 'DELIVERED' ? 'Delivered' : batch.loaded_at ? `Loaded${batch.loaded_by_name ? ` by ${batch.loaded_by_name}` : ''}, on the way` : 'Trip started, loading not done',
                detail: [batch.vehicle_number, batch.driver_name && `Driver: ${batch.driver_name}`].filter(Boolean).join(' · '),
            });
        }
        if (layers.has('attendance')) for (const record of attendance) {
            if (!AWAY.includes(record.status)) continue;
            const status = ATTENDANCE_STATUSES[record.status];
            add(record.date, {
                key: `att-${record.name}-${record.date}`, layer: 'attendance', label: `${record.name}: ${status?.label || record.status}`,
                chip: record.status === 'absent' ? 'bg-rose-100 text-rose-900 border-rose-300' : record.status === 'on_duty' ? 'bg-orange-50 text-orange-900 border-orange-200' : 'bg-purple-100 text-purple-900 border-purple-300',
                dot: record.status === 'absent' ? 'bg-rose-500' : 'bg-purple-500', kindLabel: 'Attendance', detail: record.notes || '',
            });
        }
        if (layers.has('entries')) for (const entry of entries) {
            if (entry.status === 'rejected' && !isAdmin && entry.created_by !== currentUser?.id) continue;
            const kind = kindOf(entry.kind);
            const from = entry.starts_on > grid.start ? entry.starts_on : grid.start;
            const to = endOf(entry) < grid.end ? endOf(entry) : grid.end;
            for (let day = from; day <= to; day = addDays(day, 1)) add(day, {
                key: `entry-${entry.id}-${day}`, layer: 'entries', label: entryTitle(entry),
                chip: entry.status && entry.status !== 'approved' ? `${kind.chip} border-dashed opacity-75` : kind.chip, dot: kind.dot,
                kindLabel: kind.label, time: entry.start_time ? formatTime(entry.start_time) : '', entry,
                customerId: entry.customer_id || null,
            });
        }
        return map;
    }, [installs, trucks, attendance, entries, layers, grid, isAdmin, currentUser?.id]);

    const presentToday = attendance.filter(record => record.date === today && ['present', 'pending_present'].includes(record.status)).length;
    const todayItems = byDay[today] || [];
    const todayIn = layer => todayItems.filter(item => item.layer === layer);
    const awayToday = [...todayIn('attendance'), ...todayIn('entries').filter(item => NAMED_KINDS.includes(item.entry.kind) && (item.entry.status || 'approved') === 'approved')];
    const otherToday = todayIn('entries').filter(item => !NAMED_KINDS.includes(item.entry.kind));
    const showToday = today >= grid.start && today <= grid.end;

    const canEdit = entry => entriesReady && (isHeadOffice || (entry.created_by && entry.created_by === currentUser?.id));
    const openNew = date => { setDayOpen(null); setFormError(''); setForm(blankForm(date || today, installerName)); };
    const openEdit = entry => { setDayOpen(null); setFormError(''); setForm(formFromEntry(entry)); };
    const openItem = item => (item.entry && canEdit(item.entry) ? openEdit(item.entry) : setDayOpen(item.day));
    const openCustomer = onOpenCustomer && !installerName ? async id => {
        const { data, error } = await supabase.from('admin').select('*').eq('id', id).maybeSingle();
        if (error || !data) { setProblems(previous => [...previous, 'That project could not be opened.']); return; }
        setDayOpen(null);
        onOpenCustomer(data);
    } : null;

    async function save() {
        const problem = formProblem(form);
        if (problem) { setFormError(problem); return; }
        const title = form.title.trim() || (form.kind === 'leave' ? 'Leave' : form.kind === 'unavailable' ? 'Not available' : '');
        if (!title) { setFormError('Give the entry a title.'); return; }
        const row = {
            title, kind: form.kind, starts_on: form.starts_on,
            ends_on: form.ends_on && form.ends_on !== form.starts_on ? form.ends_on : null,
            start_time: form.start_time || null, end_time: form.start_time ? form.end_time || null : null,
            notes: form.notes.trim() || null, customer_id: form.customer_id,
            person_name: installerName && NAMED_KINDS.includes(form.kind) ? installerName
                : NAMED_KINDS.includes(form.kind) ? form.person_name.trim() || null : null,
            // Leave from anyone but admin waits for admin's approval, also after an edit.
            status: form.kind === 'leave' && !isAdmin ? 'requested' : 'approved',
            ...(form.kind === 'leave' && !isAdmin ? { decided_by_name: null, decided_at: null } : {}),
            updated_at: new Date().toISOString(),
        };
        setSaving(true);
        setFormError('');
        const { data, error } = form.id
            ? await supabase.from('calendar_events').update(row).eq('id', form.id).select('id')
            : await supabase.from('calendar_events').insert({ ...row, created_by_name: currentUser?.name || null }).select('id');
        setSaving(false);
        if (error) { setFormError(error.message); return; }
        if (!data?.length) { setFormError('Only the person who added this entry, or head office, can change it.'); return; }
        setForm(null);
        loadEntries();
    }

    async function remove(entry) {
        if (!await showConfirm(`Delete "${entry.title}" from the calendar?`, { title: 'Delete entry', confirmLabel: 'Delete', type: 'danger' })) return;
        const { data, error } = await supabase.from('calendar_events').delete().eq('id', entry.id).select('id');
        if (error || !data?.length) {
            const message = error?.message || 'Only the person who added this entry, or head office, can delete it.';
            if (form) setFormError(message); else setProblems(previous => [...previous, message]);
            return;
        }
        setForm(null);
        loadEntries();
    }

    async function decide(entry, status) {
        const { data, error } = await supabase.from('calendar_events')
            .update({ status, decided_by_name: currentUser?.name || 'Admin', decided_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', entry.id).eq('status', 'requested').select('id');
        if (error || !data?.length) {
            setProblems(previous => [...previous, error?.message || 'That request was already decided. Refresh to see it.']);
        }
        loadEntries();
    }
    const onDecide = isAdmin ? decide : null;

    const toggleLayer = id => setLayers(previous => {
        const next = new Set(previous);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const visibleLayers = installerName ? LAYERS.filter(layer => ['installations', 'entries'].includes(layer.id)) : LAYERS;
    const monthDays = grid.days.filter(day => day.startsWith(month) && byDay[day]?.length);
    const dayItems = dayOpen ? byDay[dayOpen] || [] : [];

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-col gap-3 rounded-3xl border border-stone-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="rounded-2xl bg-amber-500 p-2.5 text-white shadow-md shadow-amber-500/20"><CalendarDays size={22} /></div>
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-wide text-stone-900">Calendar</h1>
                        <p className="text-xs font-medium text-stone-500">
                            {installerName ? 'Your installations, your leave and the days you are not available.' : 'Installations, delivery trucks, leave, holidays and attendance in one place.'}
                        </p>
                    </div>
                </div>
                {entriesReady && (
                    <button type="button" onClick={() => openNew(month === today.slice(0, 7) ? today : `${month}-01`)} className={`${primaryButton} self-start sm:self-auto`}>
                        <Plus size={16} aria-hidden="true" /> {installerName ? 'Mark not available' : 'Add to calendar'}
                    </button>
                )}
            </div>

            {problems.length > 0 && (
                <div role="alert" className="flex items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                    <span className="flex items-start gap-2"><AlertCircle size={15} className="mt-0.5 shrink-0" />{[...new Set(problems)].join(' ')}</span>
                    <button type="button" onClick={() => { setProblems([]); load(); }} className="shrink-0 font-bold underline">Retry</button>
                </div>
            )}

            {isAdmin && requests.length > 0 && (
                <section aria-label="Leave requests" className="space-y-2 rounded-2xl border border-purple-200 bg-purple-50/60 p-4">
                    <h2 className="text-xs font-black uppercase tracking-wider text-purple-900">Leave requests waiting for you ({requests.length})</h2>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {requests.map(entry => (
                            <ItemCard key={entry.id} onDecide={decide} canEdit={false}
                                item={{ key: entry.id, entry, label: entryTitle(entry), dot: kindOf(entry.kind).dot, kindLabel: dateRange(entry) }} />
                        ))}
                    </div>
                </section>
            )}

            {showToday && !loading && (
                <section aria-label="Today" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        { id: 'installations', title: 'Installations today', icon: Wrench, tone: 'text-emerald-600', items: todayIn('installations') },
                        !installerName && { id: 'deliveries', title: 'Trucks today', icon: Truck, tone: 'text-amber-600', items: todayIn('deliveries') },
                        !installerName && { id: 'away', title: 'Away today', icon: UserX, tone: 'text-purple-600', items: awayToday, note: `${presentToday} marked present` },
                        { id: 'other', title: installerName ? 'Your entries today' : 'Holidays & events today', icon: installerName ? CalendarDays : PartyPopper, tone: 'text-teal-600', items: installerName ? todayIn('entries') : otherToday },
                    ].filter(Boolean).map(card => (
                        <div key={card.id} className="space-y-2 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs">
                            <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-500"><card.icon size={14} className={card.tone} />{card.title}</span>
                                <strong className="text-xl font-black text-stone-900">{card.items.length}</strong>
                            </div>
                            {card.items.length === 0
                                ? <p className="text-xs text-stone-400">{card.id === 'away' ? 'Everyone is in.' : 'Nothing today.'}</p>
                                : <ul className="space-y-1">{card.items.slice(0, 4).map(item => <li key={item.key}><Chip item={item} onOpen={item.customerId && openCustomer && !item.entry ? () => openCustomer(item.customerId) : openItem} /></li>)}
                                    {card.items.length > 4 && <li><button type="button" onClick={() => setDayOpen(today)} className="text-[11px] font-bold text-stone-600 hover:text-stone-900">+{card.items.length - 4} more</button></li>}</ul>}
                            {card.note && <p className="flex items-center gap-1 text-[11px] font-semibold text-stone-500"><Users size={12} />{card.note}</p>}
                        </div>
                    ))}
                </section>
            )}

            <div className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month" className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"><ChevronLeft size={18} /></button>
                    <h2 className="min-w-40 text-center text-base font-bold text-stone-900" aria-live="polite">{monthTitle(month)}</h2>
                    <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month" className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"><ChevronRight size={18} /></button>
                    {month !== today.slice(0, 7) && <button type="button" onClick={() => setMonth(today.slice(0, 7))} className={`${secondaryButton} ml-1`}>Today</button>}
                </div>
                <div className="flex flex-wrap gap-2" aria-label="Show on the calendar">
                    {visibleLayers.map(layer => (
                        <button key={layer.id} type="button" aria-pressed={layers.has(layer.id)} onClick={() => toggleLayer(layer.id)}
                            className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 text-[11px] font-bold ${layers.has(layer.id) ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'}`}>
                            <span className={`h-2 w-2 rounded-full ${layer.dot}`} aria-hidden="true" />{layer.label}
                        </button>
                    ))}
                </div>
            </div>

            {layers.has('entries') && (
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-stone-600" aria-label="Colour key for calendar entries">
                    {(installerName ? ENTRY_KINDS.filter(kind => INSTALLER_KINDS.includes(kind.value)) : ENTRY_KINDS).map(kind => (
                        <li key={kind.value} className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${kind.dot}`} aria-hidden="true" />{kind.label}</li>
                    ))}
                </ul>
            )}

            {loading ? (
                <div className="py-16 text-center text-stone-400" role="status">
                    <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
                    <p className="text-xs font-bold">Loading calendar…</p>
                </div>
            ) : (
                <>
                    <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white sm:block">
                        <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50">
                            {WEEKDAYS.map(day => <div key={day} className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-stone-500">{day}</div>)}
                        </div>
                        <div className="grid grid-cols-7">
                            {grid.days.map(day => {
                                const list = byDay[day] || [];
                                const inMonth = day.startsWith(month);
                                return (
                                    <div key={day} className={`min-h-28 min-w-0 border-b border-r border-stone-100 p-1.5 [&:nth-child(7n)]:border-r-0 ${inMonth ? 'bg-white' : 'bg-stone-50/70'}`}>
                                        <button type="button" onClick={() => setDayOpen(day)} aria-label={`${formatDay(day, 'long')}, ${list.length} ${list.length === 1 ? 'item' : 'items'}`}
                                            className={`mb-1 flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-bold hover:bg-amber-100 ${day === today ? 'bg-amber-500 text-stone-950' : inMonth ? 'text-stone-800' : 'text-stone-400'}`}>
                                            {Number(day.slice(8))}
                                        </button>
                                        <div className="space-y-1">
                                            {list.slice(0, MAX_CHIPS).map(item => <Chip key={item.key} item={item} onOpen={openItem} />)}
                                            {list.length > MAX_CHIPS && (
                                                <button type="button" onClick={() => setDayOpen(day)} className="px-1.5 text-[11px] font-bold text-stone-600 hover:text-stone-900">+{list.length - MAX_CHIPS} more</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-4 sm:hidden">
                        {monthDays.length === 0 ? (
                            <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
                                <CalendarDays size={24} className="mx-auto text-amber-600" />
                                <p className="mt-2 text-sm font-bold text-stone-800">Nothing on the calendar this month</p>
                                {entriesReady && <p className="text-xs text-stone-500">Tap “{installerName ? 'Mark not available' : 'Add to calendar'}” to add a day.</p>}
                            </div>
                        ) : monthDays.map(day => (
                            <section key={day} aria-label={formatDay(day, 'long')}>
                                <h3 className={`mb-2 text-xs font-bold uppercase tracking-wider ${day === today ? 'text-amber-700' : 'text-stone-500'}`}>
                                    {day === today ? 'Today · ' : ''}{new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'UTC' }).format(dayDate(day))} {formatDay(day)}
                                </h3>
                                <div className="space-y-2">
                                    {byDay[day].map(item => <ItemCard key={item.key} item={item} canEdit={item.entry && canEdit(item.entry)} onEdit={openEdit} onDelete={remove} onOpenCustomer={openCustomer} onDecide={onDecide} />)}
                                </div>
                            </section>
                        ))}
                    </div>
                </>
            )}

            {dayOpen && (
                <Dialog title={formatDay(dayOpen, 'long')} onClose={() => setDayOpen(null)} wide
                    footer={entriesReady && <button type="button" onClick={() => openNew(dayOpen)} className={primaryButton}><Plus size={16} aria-hidden="true" /> Add on this day</button>}>
                    {dayItems.length === 0
                        ? <p className="py-4 text-center text-sm text-stone-500">Nothing on this day yet.</p>
                        : <div className="space-y-2">{dayItems.map(item => <ItemCard key={item.key} item={item} canEdit={item.entry && canEdit(item.entry)} onEdit={openEdit} onDelete={remove} onOpenCustomer={openCustomer} onDecide={onDecide} />)}</div>}
                    {!installerName && dayOpen === today && <p className="mt-3 text-xs font-semibold text-stone-500">{presentToday} marked present today.</p>}
                </Dialog>
            )}

            {form && (
                <Dialog title={form.id ? 'Edit calendar entry' : installerName ? 'Mark not available' : 'Add to calendar'} onClose={() => setForm(null)} busy={saving} wide
                    footer={(
                        <>
                            {form.id && (
                                <button type="button" onClick={() => remove({ id: form.id, title: form.title || kindOf(form.kind).label })} disabled={saving}
                                    className={`${secondaryButton} mr-auto text-red-700`}><Trash2 size={16} aria-hidden="true" /> Delete</button>
                            )}
                            <button type="button" onClick={() => setForm(null)} disabled={saving} className={secondaryButton}>Cancel</button>
                            <button type="button" onClick={save} disabled={saving} className={primaryButton}>{saving ? 'Saving…' : form.id ? 'Save changes' : 'Add'}</button>
                        </>
                    )}>
                    <EntryForm form={form} setForm={setForm} installerName={installerName} selfName={currentUser?.name} isAdmin={isAdmin} installers={installers} staff={staff} error={formError} idPrefix={idPrefix} />
                </Dialog>
            )}
        </div>
    );
}
