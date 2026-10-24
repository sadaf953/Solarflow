// CSV downloads for the list pages (delivery batches, installations, installer
// commissions). Excel opens them directly; the BOM keeps ₹ and Hindi names intact.
import { downloadFileWithSaveAs } from '../utils';

// Quoted, with formula injection blocked (a cell starting = + - @ runs in Excel).
const cell = value => {
    if (value === null || value === undefined) return '""';
    let text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
};

export const csvText = (columns, rows) => '﻿' + [
    columns.map(([header]) => cell(header)).join(','),
    ...rows.map(row => columns.map(([, read]) => cell(read(row))).join(',')),
].join('\r\n');

// columns: [['Header', row => value], ...]
export function downloadCsv(fileName, columns, rows) {
    const url = URL.createObjectURL(new Blob([csvText(columns, rows)], { type: 'text/csv;charset=utf-8;' }));
    return downloadFileWithSaveAs(url, fileName).finally(() => setTimeout(() => URL.revokeObjectURL(url), 2000));
}

// The API returns at most 1,000 rows per request, so a whole-table export pages
// until a short page comes back. makeQuery() must return a fresh, ordered query.
export async function fetchAllPages(makeQuery, pageSize = 1000) {
    const rows = [];
    for (let from = 0; ; from += pageSize) {
        const { data, error } = await makeQuery().range(from, from + pageSize - 1);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < pageSize) return rows;
    }
}

export const exportDate = () => new Date().toISOString().slice(0, 10);
