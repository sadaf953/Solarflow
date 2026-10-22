// Turns a saved quotation row into what the proposal pages print.
// The row keeps SolarFlow's three panel options; the proposal prices on the option
// the salesperson picked (form.proposal_option) and lists all three on the offer page.
// Pure data only, so node tests, the preview, the PDF and the customer's signing
// page all build the same document from the same row.
import { calculate, fromRow, PROPOSAL_FIELDS } from '../model.js';
import { INITIAL_QUOTATION } from '../template/data/initialData.js';
import { computeProposal, isLoanMethod, LOAN_METHODS } from './calc.js';

export const PAYMENT_METHODS = [PROPOSAL_FIELDS.payment_method, ...LOAN_METHODS];

// Demo defaults (fictional company, indicative tariffs). Values the salesperson can
// change live on the quotation form; everything else is fixed here.
export const PROPOSAL_DEFAULTS = {
    unitsPerKwMonth: 120,
    moduleModel: 'Mono PERC DCR',
    structure: 'Module Mounting Structure (GI), up to 8 ft from the roof',
    warranties: { modulePerf: 25, moduleProduct: 15, inverter: 10, structure: 10, workmanship: 5 },
    // 70% of a rooftop system is billed at 5% GST (HSN 8541) and 30% at 18% (HSN 9954).
    gstRate: 8.9,
    gstNote: 'GST is included: 70% of the system value at 5% (HSN 8541) and 30% at 18% (HSN 9954).',
    tariff: 6.5,
    escalationPct: 3,
    exportRate: 2.25,
    degradationPct: 0.5,
    years: 25,
    loanRatePct: 7,
    loanTenureYears: 7,
    downPaymentPct: 10,
    milestones: [
        { label: 'Advance payment', pct: 50, note: 'To confirm the order. Includes DISCOM registration charges of ₹2,000 per kW.' },
        { label: 'Balance payment', pct: 50, note: 'Before dispatch of materials to site.' },
    ],
};

const termsFor = (company) => [
    'Validity: This proposal is valid until {validTill}. Prices may change after that date due to market changes.',
    'Payment: As per the payment schedule in this proposal.',
    'Delivery: Material delivery within 10–15 working days from receipt of the advance payment.',
    'Installation: Supply, erection and commissioning generally take about one month, subject to site readiness.',
    'Rooftop area: About 10 sq m of shadow-free roof per kWp is to be provided by the customer.',
    'Operation & maintenance: Free operation and maintenance for 5 years. Regular panel cleaning is done by the customer.',
    `Warranty: Product warranties are from the respective manufacturers. ${company} will facilitate all claims.`,
    "Subsidy: The PM Surya Ghar subsidy is paid by the Government directly into the customer's bank account. It depends on DISCOM approval and on the name on the electricity bill matching the bank account name.",
    'Extra work: Any extra or additional material or work is billed at actual cost.',
    `Cancellation: If the order is cancelled after DISCOM registration, the advance is refunded after deducting the DISCOM registration charges, with a statement of account.`,
    `Force majeure: ${company} is not liable for delays due to natural calamities, strikes, government orders or supply disruptions.`,
    'Jurisdiction: Any disputes are subject to the courts at Sample City (fictional).',
];

const number = value => { const n = Number(value); return Number.isFinite(n) ? n : 0; };
const days = (from, to) => Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 86400000));
// Quotation dates are calendar dates; read them as local midnight, not UTC.
const localIso = date => (/^\d{4}-\d{2}-\d{2}$/.test(date || '') ? `${date}T00:00:00` : null);

// Village, taluka and district are often the same town, and the full address may already name it.
const addressOf = form => [form.full_address, form.village, form.taluka, form.district, form.pincode]
    .map(part => String(part || '').trim()).filter(Boolean)
    .reduce((parts, part) => parts.join(', ').toLowerCase().includes(part.toLowerCase()) ? parts : [...parts, part], [])
    .join(', ');

export function proposalOptionIndex(form) {
    const index = Number(form?.proposal_option);
    return Number.isInteger(index) && index >= 0 && index < (form?.options?.length || 0) ? index : 0;
}

/** Company block from the quotation's own template snapshot, so old quotations keep their details. */
export function proposalCompany(row) {
    const template = row.quotation_data?.template || INITIAL_QUOTATION;
    const company = template.company || INITIAL_QUOTATION.company;
    return {
        name: company.name || 'SOLARFLOW',
        tagline: company.tagline || '',
        gstin: company.gstNo || '',
        cin: company.cinNo || '',
        email: company.email || '',
        phone: '',
        address: template.footer?.corporateOffice || '',
        branch: template.footer?.branchOffice || '',
        logo: template.assets?.solarflowLogoUrl || company.logoUrl || null,
        about: [template.page1?.introParagraph1, template.page1?.introParagraph2].filter(Boolean),
        bank: template.page3?.bankDetails || null,
        notes: template.page2?.notes || [],
    };
}

/**
 * Everything ProposalPages needs: { inputs, number, createdAt, company }.
 * `row` is a quotations row, or the snapshot frozen when it was sent for signature.
 */
export function proposalSnapshot(row) {
    const form = fromRow(row);
    const company = proposalCompany(row);
    const options = calculate(form.options || []);
    const selectedOption = proposalOptionIndex(form);
    const chosen = options[selectedOption] || {};
    const kwp = number(form.capacity_kw);
    const price = number(chosen.netPayableAmount);
    const paymentMethod = PAYMENT_METHODS.includes(form.payment_method) ? form.payment_method : PAYMENT_METHODS[0];
    const downPayment = form.down_payment === '' || form.down_payment == null
        ? Math.round(price * PROPOSAL_DEFAULTS.downPaymentPct / 100)
        : Math.min(price, Math.max(0, number(form.down_payment)));
    const createdAt = localIso(form.quotation_date) || new Date().toISOString();
    const validTill = localIso(form.valid_until);
    const customNotes = (form.custom_notes || []).map(note => String(note || '').trim()).filter(Boolean);
    const inputs = {
        kwp,
        price,
        subsidy: number(chosen.subsidy),
        gstRate: PROPOSAL_DEFAULTS.gstRate,
        gstNote: PROPOSAL_DEFAULTS.gstNote,
        consumptionMode: 'units',
        monthlyUnits: number(form.monthly_units) > 0 ? number(form.monthly_units) : Math.round(kwp * PROPOSAL_DEFAULTS.unitsPerKwMonth),
        tariff: number(form.tariff) > 0 ? number(form.tariff) : PROPOSAL_DEFAULTS.tariff,
        escalationPct: PROPOSAL_DEFAULTS.escalationPct,
        exportRate: PROPOSAL_DEFAULTS.exportRate,
        degradationPct: PROPOSAL_DEFAULTS.degradationPct,
        years: PROPOSAL_DEFAULTS.years,
        unitsPerKwMonth: PROPOSAL_DEFAULTS.unitsPerKwMonth,
        paymentMethod,
        bank: isLoanMethod(paymentMethod) ? String(form.loan_bank || '').trim() : '',
        downPayment,
        loanAmount: Math.max(0, price - downPayment),
        loanRatePct: number(form.loan_rate_pct) > 0 ? number(form.loan_rate_pct) : PROPOSAL_DEFAULTS.loanRatePct,
        loanTenureYears: number(form.loan_tenure_years) > 0 ? number(form.loan_tenure_years) : PROPOSAL_DEFAULTS.loanTenureYears,
        moduleMake: chosen.brandName || form.solar_panel_make || '',
        moduleModel: PROPOSAL_DEFAULTS.moduleModel,
        moduleWp: number(form.panel_wattage),
        moduleQty: number(form.solar_panel_qty),
        inverterMake: form.inverter_brand || '',
        structure: PROPOSAL_DEFAULTS.structure,
        warranties: { ...PROPOSAL_DEFAULTS.warranties },
        milestones: PROPOSAL_DEFAULTS.milestones.map(step => ({ ...step })),
        terms: [...termsFor(company.name), ...customNotes].join('\n'),
        validityDays: validTill ? days(createdAt, validTill) : 15,
        validTill,
        projectType: form.project_type || 'Residential',
        gebGedaCharge: form.geb_geda_charge || 'Including',
        options,
        selectedOption,
        preparedBy: { name: form.owner_name_snapshot || '', phone: form.owner_phone_snapshot || '' },
        customer: {
            name: form.customer_name || '',
            address: addressOf(form),
            city: form.village || form.district || '',
            phone: String(form.customer_phone || '').replace(/\D/g, '').slice(-10),
            email: form.customer_email || '',
            discom: '',
            consumerNo: '',
            crn: '',
            type: form.project_type || 'Residential',
        },
    };
    return { inputs, number: row.quotation_no ? `Quote-${row.quotation_no}` : 'Quote-DRAFT', createdAt, company };
}

/** Headline figures for the signing page and the staff list. */
export function proposalTotals(snapshot) {
    const m = computeProposal(snapshot.inputs);
    return { kwp: m.kwp, price: m.price, subsidy: m.subsidy, effectiveCost: m.effectiveCost, emi: m.loan ? m.loan.emi : null };
}
