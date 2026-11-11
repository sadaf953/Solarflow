// What a channel partner or dealer earns on their customers.
//
// There is no saved partner commission or paid/unpaid field in the schema, so
// every project uses defaultCommission(kWp) - the same figure as the
// "Commission (₹)" column of the channel partner export. A project is:
//   - not counted while it is still a lead, or once it is a lost project;
//   - earned once the panels are installed (Geo Tag Photo stage onwards);
//   - pending for every stage in between (registration to installation).
import { PRIMARY_STAGES, STAGE_IDS, defaultCommission } from '../constants.js';

const stageIndex = id => PRIMARY_STAGES.findIndex(s => s.id === id);
const EARNED_FROM = stageIndex(STAGE_IDS.GEO_TAG_PHOTO);

export const commissionStatus = stage => {
    if (!stage || stage === STAGE_IDS.LEADS || stage === STAGE_IDS.LOST_PROJECT) return null;
    const index = stageIndex(stage);
    if (index === -1) return null;
    return index >= EARNED_FROM ? 'earned' : 'pending';
};

export const stageLabel = stage => PRIMARY_STAGES.find(s => s.id === stage)?.label || stage || 'Unknown stage';

// rows: customers with stage, system_capacity_kwp, customer_name, sub_channel_partner.
export function summarizeCommission(rows = []) {
    const projects = [];
    let earned = 0, pending = 0, earnedCount = 0, kwp = 0;
    for (const row of rows || []) {
        const status = commissionStatus(row?.stage);
        if (!status) continue;
        const amount = defaultCommission(row.system_capacity_kwp);
        projects.push({
            id: row.id,
            name: String(row.customer_name || '').trim() || 'Unnamed customer',
            dealer: String(row.sub_channel_partner || '').trim(),
            stage: row.stage,
            stageLabel: stageLabel(row.stage),
            kwp: Number(row.system_capacity_kwp) || 0,
            amount,
            status,
            record: row,
        });
        kwp += Number(row.system_capacity_kwp) || 0;
        if (status === 'earned') { earned += amount; earnedCount += 1; } else pending += amount;
    }
    // Pending first (what is still to come); within each group the rows keep
    // the order they came in (the portal loads most recently updated first).
    projects.sort((a, b) => (a.status === b.status ? 0 : a.status === 'pending' ? -1 : 1));
    return {
        total: earned + pending,
        earned,
        pending,
        count: projects.length,
        earnedCount,
        pendingCount: projects.length - earnedCount,
        kwp: Math.round(kwp * 100) / 100,
        projects,
    };
}

// Commission per dealer for a partner office; customers without a dealer are
// the office's own sales.
export function commissionByDealer(rows = [], ownLabel = 'Office (direct)') {
    const groups = new Map();
    for (const p of summarizeCommission(rows).projects) {
        const key = p.dealer || ownLabel;
        const g = groups.get(key) || { name: key, total: 0, earned: 0, pending: 0, count: 0 };
        g.total += p.amount; g.count += 1;
        if (p.status === 'earned') g.earned += p.amount; else g.pending += p.amount;
        groups.set(key, g);
    }
    return [...groups.values()].sort((a, b) => b.total - a.total);
}

export const formatRupees = n => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
