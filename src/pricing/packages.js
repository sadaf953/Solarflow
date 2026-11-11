// SolarFlow packages – one-time prices shown as ranges; the final price is set after a call.
// Edit prices / contents here only. The quote builder reads everything from this file.

// ── Launch offer ──
// Every price below is the FULL price. While LAUNCH_OFFER is set, the page charges
// (1 - LAUNCH_OFFER) of it, rounded to ₹500, and shows the full band struck through.
// Set to 0 to go back to full prices.
export const LAUNCH_OFFER = 0; // off – packages at full price
export const offer = n => (n == null ? n : Math.round(n * (1 - LAUNCH_OFFER) / 500) * 500);

// Plain words only for login types: Admin, Staff, Dealer, Installer, Godown, Branch.
// Four tiers, shown as ranges (the final price is set per client after a call).
// Lite is the simple 4-tab CRM; Standard, Pro and Complete are SolarFlow's stage-by-stage system.
// `price` = typical internal price, `range` = what the client sees, `floor` = never go below.
export const CARE_PLAN = { range: [12000, 18000], label: '₹12k – ₹18k a year from year 2 (hosting, backups, fixes, small changes)' };
export const PACKAGES = [
  {
    id: 'starter', name: 'Lite', price: 40000, range: [35000, 45000], floor: 33000, tagline: 'The simple 4-tab CRM for a smaller team',
    logins: 'Up to 15 users', maxUsers: 15,
    who: 'Admin + Staff, or Admin + Staff + Dealer', cards: ['simple'], docs: ['quotation', 'discom', 'feasibility'],
    highlights: ['4-tab customer card (old version) – 11 stages, payment and subsidy tags', 'Quotation maker in your format', 'DISCOM agreement + feasibility report', 'Checklists, Google Drive links, Excel export', 'Year 1 hosting and support included'],
    includes: [
      '4-tab customer card (old version): Overview · Finance & Bank · Checklist · Notes & History',
      'Quotation maker in your format',
      'Every customer’s stage, next follow-up and pending work on one dashboard',
      'DISCOM agreement and bank feasibility report – filled from the customer card',
      'Checklists per customer and a Google Drive link on every customer',
      'Your logo, your stage names, your fields · Excel export any time',
      'Setup + training call · year 1 hosting and WhatsApp support included',
    ],
  },
  {
    id: 'growth', name: 'Standard', price: 52000, range: [45000, 60000], floor: 43000, tagline: 'Every stage, dealers and money tracked', popular: true,
    logins: 'Up to 25 users', maxUsers: 25,
    who: 'Admin, Staff, Dealer', cards: ['stage'], docs: ['quotation', 'discom', 'feasibility'],
    highlights: ['Step-by-step customer card (new version) – 13 stages, lead to subsidy', 'Dealer logins – each dealer sees only their own leads', 'Invoice maker, payments, loan & subsidy tracking', 'Dealer commissions · staff management', 'Year 1 hosting and support included'],
    includes: [
      'Step-by-step customer card (new version) – a tab for every stage, each filled by the person who does it',
      'Dealer logins – each dealer sees only their own leads',
      'Dealer commission tracking',
      'Payment & loan tracking with pending-amount view',
      'Staff management – add, deactivate, see who did what',
      'Setup + training · year 1 hosting and WhatsApp support included',
    ],
  },
  {
    id: 'pro', name: 'Pro', price: 67000, range: [60000, 75000], floor: 57000, tagline: 'Godown, delivery and installation teams',
    logins: 'Up to 50 users', maxUsers: 50,
    who: 'Admin, Staff, Dealer, Installation team, Godown', cards: ['stage'], docs: ['quotation', 'discom', 'feasibility', 'bom', 'truck', 'gatepass'],
    highlights: ['Everything in Standard', 'Godown, delivery & BOM – stock, delivery batches, challan, gate pass, truck loading sheet', 'Installation team logins, jobs and payments', 'Year 1 hosting and support included'],
    includes: [
      'Everything in Standard',
      'Godown stock, BOM & material checklist',
      'Delivery challan, truck loading sheet & gate pass',
      'Installation team logins with job assignment and payments',
      'Setup + training · year 1 hosting and WhatsApp support included',
    ],
  },
  {
    id: 'complete', name: 'Complete', price: 82000, range: [75000, 90000], floor: 72000, tagline: 'Branches, commercial projects and the full operation',
    logins: 'Unlimited users', maxUsers: null,
    who: 'Admin, Staff, Dealer, Installation team, Godown, Branch', cards: ['stage'], docs: ['quotation', 'discom', 'feasibility', 'bom', 'truck', 'gatepass'],
    highlights: ['Everything in Pro', 'Branch office logins', 'Attendance and calendar', 'Commercial projects – launching soon', 'Unlimited users · priority support'],
    includes: [
      'Everything in Pro',
      'Branch office logins',
      'Staff attendance',
      'Calendar and reports',
      'Unlimited users · priority support · year 1 hosting included',
    ],
  },
];

// Asked first: starting fresh is the cheaper option.
export const DATA_OPTIONS = [
  { id: 'fresh', label: 'Start fresh', note: 'No extra cost – cheapest', price: 0 },
  { id: 'move', label: 'Move my existing data in', note: 'We import your Excel / Sheets', price: null },
];
export const CUSTOMER_COUNTS = ['Under 500', '500 – 2,000', '2,000 – 5,000', '5,000+'];
const MOVE_PRICE = { 'Under 500': 5000, '500 – 2,000': 10000, '2,000 – 5,000': 15000, '5,000+': 20000 };
export const moveDataPrice = customers => offer(MOVE_PRICE[customers] ?? 10000);

export const TEAM_SIZES = ['1–3', '4–6', '7–10', '11–25', '26–50', '50+'];
export const LIVE_COUNTS = ['Under 50', '50 – 200', '200 – 500', '500+'];

// The two customer cards. "simple" = the Lite product (4 tabs),
// "stage" = SolarFlow's stage-by-stage card (Standard, Pro and Complete).
export const CARDS = [
  {
    id: 'simple', name: '4-tab customer card', version: 'Old version', sub: 'Old version · everything on 4 tabs',
    tabs: ['Overview', 'Finance & Bank', 'Checklist', 'Notes & History'],
    bestFor: 'Fewer things to track · one office person updates everything',
    packages: ['starter'],
  },
  {
    id: 'stage', name: 'Step-by-step customer card', version: 'New version', sub: 'New version · a tab for each of the 13 stages',
    tabs: ['Lead', 'Registration', 'Loan / Cash', 'Material order', 'Integration', 'Delivery', 'Installation', 'Geo-tag photo', 'DISCOM submission', 'Meter', 'Inspection', 'Subsidy', 'Final review'],
    bestFor: 'Many things to track, different people per stage · any team size',
    packages: ['growth', 'pro', 'complete'],
  },
];

// What is different between the two cards – shown side by side.
export const CARD_COMPARISON = [
  { label: 'Layout', simple: '4 tabs – Overview, Finance & Bank, Checklist, Notes & History', stage: 'One tab per stage – lead to subsidy, 13 tabs' },
  { label: 'Fields', simple: 'About 30 fields – customer, project, links, finance, bank', stage: 'Full set for every stage (100+), turn off what you don’t use' },
  { label: 'Documents', simple: '22-point checklist (KYC → subsidy) + Google Drive & Maps links', stage: 'Checklist per stage, documents filled from the card' },
  { label: 'Moving a customer forward', simple: 'Pick the stage from one dropdown, plus a payment / subsidy tag', stage: 'Customer moves to the next stage when a tab is complete' },
  { label: 'Who fills it', simple: 'One office person updates everything', stage: 'Each stage owner fills their own tab (office, site, store, DISCOM)' },
  { label: 'Pending work', simple: 'Dashboard by status and follow-up date', stage: 'Dashboard per stage – see exactly where each customer is stuck' },
  { label: 'Learning time', simple: 'Ready in 1 day', stage: '2–3 days with training' },
];

// Sample customer for the Stage-by-stage card preview. Stages and fields are the real
// ones from the app (constants.js PRIMARY_STAGES + AgentStageDetails), demo data only.
// A customer goes through Loan OR Cash, so a customer sees 13 of these 14.
export const STAGE_CARD = {
  name: 'Ramesh Patel', current: 'Material Delivery', payment: 'Loan',
  stages: [
    { id: 'Leads', who: 'Office / dealer', fields: [['Customer Name', 'Ramesh Patel'], ['Phone Number', '90000 00001'], ['Email', 'demo.customer@example.com'], ['Consumer No', 'DEMO-244001'], ['Village / Address', 'Demo Village'], ['Sub Division', 'Demo Division'], ['Channel Partner', 'Demo Partner'], ['Dealer', 'Demo Dealer'], ['Module Brand', 'SolarFlow'], ['Module WP', '580'], ['No. of Modules', '6'], ['System Capacity', '3.48 kWp'], ['Payment Type', 'Loan']], needs: ['Customer Name', 'Phone Number'] },
    { id: 'Registration', who: 'Office', fields: [['Registration Date', '02 Oct 2026'], ['Registration By', 'Demo Staff'], ['Registration / Feasibility No.', 'REG-0001'], ['File No.', 'F-101'], ['Application Acknowledgment', 'Uploaded'], ['Feasibility Document', 'Uploaded'], ['Subsidy Token Photo', 'Uploaded']], needs: ['Registration Date', 'Payment Type (Loan or Cash)'] },
    { id: 'Loan', who: 'Accounts / bank', fields: [['Jansamarth Application No.', 'JS-000123'], ['Loan Status', 'Sanctioned'], ['Vendor Feasibility', 'Uploaded'], ['Site Feasibility', 'Uploaded'], ['Digital Certificate', 'Uploaded'], ['Loan Timeline', 'Inprocess → Sanctioned']], needs: ['Jansamarth Application No.'] },
    { id: 'Cash', who: 'Accounts', skip: true, fields: [['Total Amount', '–'], ['Payments', '–'], ['Total Received', '–'], ['Balance Remaining', '–']], needs: ['Payment Type'] },
    { id: 'Material Order', who: 'Store / purchase', fields: [['Roof / Shed', 'Roof'], ['DC Cable', '30 m'], ['AC Cable', '15 m'], ['Front Leg Height', '1 ft'], ['Rear Leg Height', '3 ft'], ['Invoice Value', '₹1,80,000'], ['Notes / Instructions', 'Deliver before 10 Oct']], needs: ['Roof / Shed', 'Invoice Value'] },
    { id: 'Material Integration', who: 'Store', fields: [['Inverter Make', 'DemoVolt'], ['Inverter Serial No.', 'INV-0001'], ['Panel Serial Numbers', 'PNL-0001 … PNL-0006'], ['Integration By', 'Demo Store']], needs: ['Inverter Make', 'Inverter Serial Number'] },
    { id: 'Material Delivery', who: 'Store / driver', fields: [['Installation team', 'Demo Installation Team'], ['Invoice No.', 'INV-2026-044'], ['Delivery Date', '12 Oct 2026'], ['Vehicle / Truck No.', 'XX 00 AB 0001'], ['Driver Name', 'Demo Driver'], ['Driver Phone Number', '90000 00002'], ['Delivery Status', 'Out for delivery']], needs: ['Installation Team Allotment', 'Delivery Date'] },
    { id: 'Installation Status', who: 'Installation team', fields: [['Installation Status', '–'], ['Installation Date', '–'], ['Assigned Installation team', 'Demo Installation Team'], ['Installation Note', '–']], needs: ['Installation Status must be Installed'] },
    { id: 'Geo Tag Photo', who: 'Installation team', fields: [['Geo Tag Status', '–'], ['Geo Tag Image', '–']], needs: ['Geo Tag Status must be Proceed'] },
    { id: 'DISCOM Submission', who: 'Office / DISCOM', fields: [['Submitted By', '–'], ['Submission Date', '–'], ['First Party', '–'], ['Second Party', '–'], ['Stamp Value', '–'], ['Agreement Execution Date', '–']], needs: ['Submitted By and Date'] },
    { id: 'Meter Installation', who: 'DISCOM', fields: [['Meter Installation', '–'], ['Meter Installation Date', '–'], ['Meter Installation Photo', '–']], needs: ['Meter Installation must be Yes', 'Installation Date'] },
    { id: 'DISCOM Inspection', who: 'DISCOM', fields: [['DISCOM Inspection', '–']], needs: ['DISCOM Inspection must be Yes'] },
    { id: 'Subsidy Status', who: 'Accounts', fields: [['Subsidy Status', '–'], ['Subsidy Amount', '₹78,000 expected'], ['Subsidy Timeline', '–']], needs: ['Subsidy Tag'] },
    { id: 'Final Review', who: 'Admin', fields: [['Warranty Card', '–'], ['Insurance Status', '–']], needs: ['Customer Name'] },
  ],
};

// Sample customer for the Simple card preview – same structure as the original basic CRM.
// Demo data only.
const ck = (labels, doneCount) => labels.map((label, i) => ({ label, done: i < doneCount }));
export const SIMPLE_CARD = {
  name: 'Ramesh Patel', stage: 'Pending Installation', tag: '2nd Payment',
  stages: ['Leads', 'Pending Loans', 'Material Procurement', 'Pending Installation', 'Post Installation Docs', 'DISCOM Submissions', 'Meter Installation', 'System Commissioning', 'Meter Flag', 'DISCOM Inspection', 'Completed'],
  tags: ['Subsidy Redeem Pending', 'Subsidy Disbursement Pending', '2nd Payment', '3rd Payment', 'Pending Cheque', 'Received Cheque'],
  overview: [
    { title: 'Customer Info', icon: 'User', fields: [['Phone', '90000 00001'], ['Email', 'demo.customer@example.com'], ['Aadhar', 'XXXX XXXX 0001'], ['POC', 'Demo Sales'], ['Branch', 'Head Office'], ['Location', 'Demo Village']] },
    { title: 'Project & Technical', icon: 'Zap', fields: [['Capacity (kWp)', '3.6'], ['Type', 'On-Grid'], ['Installation team', 'Demo Installation Team'], ['Meter Cat', 'LT-1 Domestic'], ['EB Number', 'DEMO-244001'], ['DTR Code', 'DTR-0001'], ['Sanctioned Load', '5 kW'], ['DISCOM Div', 'Demo Division']] },
    { title: 'Application Links', icon: 'FolderOpen', fields: [['Google Docs Link', 'drive.google.com/…'], ['Location Link', 'maps.google.com/…']] },
  ],
  finance: [
    { title: 'Financial Summary', icon: 'IndianRupee', fields: [['Quoted Amt', '₹1,80,000'], ['Received', '₹1,20,000'], ['Receivable', '₹60,000'], ['Discount', '₹0'], ['Pay Type', 'Loan']] },
    { title: 'Subsidy', icon: 'IndianRupee', fields: [['Subsidy status', 'Redeem pending'], ['Expected', '₹78,000']] },
    { title: 'Bank Information', icon: 'Landmark', fields: [['Account Name', 'Ramesh Patel'], ['Bank Name', 'Demo Bank'], ['Branch', 'Demo Branch'], ['Account #', 'DEMO-ACCOUNT-0001'], ['IFSC Code', 'DEMO0000001'], ['Loan App #', 'LN-0001']] },
  ],
  checklist: [
    { section: 'Pre-Installation', items: ck(['KYC docs, PM Surya Ghar portal docs and Jan Samarth approval', 'Docs sent to the bank'], 2) },
    { section: 'Post Installation Documentation', items: ck(['Serial numbers received', 'Agreement on Article-7 ₹100 stamp', 'Signed agreement', 'Self declaration', 'Work completion from PM Surya Ghar portal', 'Geo-tag photos of the site', 'DCR certificate', 'Panel and inverter warranty', 'Undertaking / self-declaration', 'Work completion report', 'Net-metering service request on DISCOM website', 'Estimate and demand charges paid on DISCOM website', 'Application form (Annexure-1 / net-meter form)'], 3) },
    { section: 'Post Net-Meter Application', items: ck(['Documents submitted at DISCOM', 'Net-meter installation', 'DISCOM inspection & commissioning', 'Subsidy redeem from customer’s login', 'Subsidy disbursed', 'All payments cleared', 'Warranty and service card'], 0) },
  ],
  notes: [
    { text: 'Material dispatched, installation fixed for Thursday.', by: 'Demo Office', date: '10 Oct' },
    { text: 'Loan sanctioned – 2nd payment expected after installation.', by: 'Demo Office', date: '6 Oct' },
    { text: 'Site visit done, roof OK for 3.6 kW.', by: 'Demo Sales', date: '1 Oct' },
  ],
};

export const TRACK_OPTIONS = ['Just the basics', 'Every stage separately', 'Not sure'];

// Fewer things to track or a small team → simple card.
const BIG = ['26–50', '50+'];
export function recommendCard({ track, team, live, operations, stock, branches }) {
  if (BIG.includes(team) || stock === 'Yes' || branches === 'Yes') return 'stage';
  if (track === 'Just the basics') return 'simple';
  if (track === 'Every stage separately' || operations === 'Yes') return 'stage';
  const small = ['1–3', '4–6'].includes(team) && ['Under 50', '50 – 200'].includes(live);
  return small ? 'simple' : 'stage';
}

// Package from the card + team answers.
export function recommendFor(a) {
  const card = recommendCard(a);
  const base = recommend(a);
  if (card === 'simple') return base;    // Lite if the answers fit it
  return base === 'starter' ? 'growth' : base; // the stage card starts at Standard
}

// ── Business questions (sub-tabs in step 1) ──
export const LOGIN_TYPES = [
  { id: 'admin', label: 'Admin', from: 'starter' },
  { id: 'staff', label: 'Staff', from: 'starter' },
  { id: 'dealer', label: 'Dealer', from: 'starter', dealers: true },
  { id: 'installer', label: 'Installation team', from: 'pro', stock: true },
  { id: 'godown', label: 'Godown', from: 'pro', stock: true },
  { id: 'branch', label: 'Branch', from: 'complete', branches: true },
];
export const loginFlags = ids => ({
  dealers: LOGIN_TYPES.some(t => t.dealers && ids.includes(t.id)) ? 'Yes' : 'No',
  stock: LOGIN_TYPES.some(t => t.stock && ids.includes(t.id)) ? 'Yes' : 'No',
  branches: LOGIN_TYPES.some(t => t.branches && ids.includes(t.id)) ? 'Yes' : 'No',
});

// File storage is NOT part of the CRM price – the client pays the provider directly.
// Prices copied from the providers' live pricing pages (India) on 14 Oct 2026. Check again before quoting.
export const STORAGE_PRICES_CHECKED = '14 Oct 2026';
export const STORAGE_OPTIONS = [
  {
    id: 'supabase', label: 'Inside the CRM', short: 'Inside the CRM (Supabase)', who: 'Paid to Supabase: $25 a month (about ₹2,200)',
    how: 'Upload and open files right inside SolarFlow, as in the demo. Stored on Supabase.',
    prices: ['Free – 1 GB (small trial use only)', 'Pro – $25 / month (about ₹2,200), 100 GB included', 'More space – $0.0213 per extra GB / month'],
    link: 'https://supabase.com/pricing', linkName: 'Supabase', recommended: true,
    tradeoff: 'Everything in one place, inside the CRM, with backups.',
  },
  {
    id: 'gdrive', label: 'Google Drive', short: 'Google Drive', who: 'Paid to Google (Google One)',
    how: 'Files stay in your Google Drive. Add a folder or file link on each customer – an Access button opens it.',
    prices: ['Free – 15 GB (every Google account)', 'Lite 30 GB – ₹59 / month', 'Basic 100 GB – ₹130 / month'],
    link: 'https://one.google.com/about/plans', linkName: 'Google One',
    tradeoff: 'Cheapest, but the files sit in one person’s Google account.',
  },
  {
    id: 'workspace', label: 'Google Workspace', short: 'Google Workspace', who: 'Paid to Google, per user',
    how: 'Business Google account with company email (you@yourcompany.in) and shared Drive. Same Access button on each customer.',
    prices: ['Base – ₹99 / user / month, 20 GB per user', 'Starter – ₹270 / user / month, 30 GB per user', 'Standard – ₹1,080 / user / month, 2 TB per user'],
    link: 'https://workspace.google.com/pricing', linkName: 'Google Workspace',
    tradeoff: 'Owned by the company, but you pay for every user.',
  },
  {
    id: 'none', label: 'Not needed', short: 'No file storage', who: 'No extra cost',
    how: 'Only checklists – tick each document when you receive it.',
    prices: ['₹0'],
    tradeoff: 'No files – only checklists.',
  },
];
// Rough sizing: a solar customer file (Aadhaar, bill, agreement, site photos) ≈ 20 MB.
export const STORAGE_GUIDE = '1 GB holds about 50 customers’ documents (≈ 20 MB each). 15 GB ≈ 750 customers, 100 GB ≈ 5,000.';

// Sample documents SolarFlow fills automatically. Files live in public/samples (demo data only).
export const SAMPLE_DOCS = [
  { id: 'quotation', name: 'Quotation', what: 'A 9-page solar proposal (10 with a loan): brand options, savings, payback, EMI, and an acceptance page the customer signs online.', file: 'quotation', pages: 9, from: 'starter' },
  { id: 'discom', name: 'DISCOM agreement', what: 'Consumer–vendor agreement (Annexure 2), filled from the customer card.', file: 'discom-agreement', pages: 4, from: 'starter' },
  { id: 'feasibility', name: 'Feasibility report', what: 'Bank / vendor feasibility format with loan declaration.', file: 'feasibility-report', pages: 3, from: 'starter' },
  { id: 'bom', name: 'BOM & material integration', what: 'Bill of materials, panel and inverter serial numbers per customer.', file: 'bom-material-integration', pages: 2, from: 'pro' },
  { id: 'truck', name: 'Truck loading sheet', what: 'Combined loading quantities for every customer on one truck.', file: 'truck-loading-sheet', pages: 3, from: 'pro' },
  { id: 'gatepass', name: 'Delivery gate pass', what: 'Vehicle, driver and drop-off list with recipient signatures.', file: 'delivery-gate-pass', pages: 1, from: 'pro' },
];
const RANK = { starter: 0, growth: 1, pro: 2, complete: 3 };
const BY_RANK = ['starter', 'growth', 'pro', 'complete'];
export const docIncluded = (doc, pkg) => RANK[pkg] >= RANK[doc.from];

// ── Package from what the client keeps ticked ──
// Every login type and document belongs to a package. The client starts with the
// suggested package's items ticked, can untick / tick, and the package follows.
const TEAM_RANK = { '1–15': 0, '16–25': 1, '1–10': 0, '1–3': 0, '4–6': 0, '7–10': 0, '11–25': 1, '26–50': 2, '50+': 3 };
export const teamRank = team => TEAM_RANK[team] ?? 0;
export function defaultsFor(pkgId) {
  const r = RANK[pkgId] ?? 0;
  return {
    logins: LOGIN_TYPES.filter(t => RANK[t.from] <= r).map(t => t.id),
    docs: SAMPLE_DOCS.filter(d => RANK[d.from] <= r).map(d => d.id),
  };
}
// Lowest package that holds everything ticked (ignores the card).
export function itemsRank({ team, logins = [], docs = [] }) {
  let r = teamRank(team);
  for (const t of LOGIN_TYPES) if (logins.includes(t.id)) r = Math.max(r, RANK[t.from]);
  for (const d of SAMPLE_DOCS) if (docs.includes(d.id)) r = Math.max(r, RANK[d.from]);
  return r;
}
export function computePackage({ team, card, logins, docs }) {
  let r = itemsRank({ team, logins, docs });
  if (card === 'stage') r = Math.max(r, RANK.growth); // the stage card starts at Standard
  return BY_RANK[r];
}
// The Simple card is the Lite product only.
export const simpleAllowed = sel => itemsRank(sel) <= RANK.starter;
export const packageFor = itemId => {
  const it = LOGIN_TYPES.find(t => t.id === itemId) || SAMPLE_DOCS.find(d => d.id === itemId);
  return it?.from;
};

export const FIELD_SETUP = [
  { id: 'sheet', label: 'Send us your Excel / Google Sheet', note: 'We copy your columns into the customer card. Paste a view link below, or send the file on WhatsApp.' },
  { id: 'form', label: 'Fill the setup form', note: 'Pick fields, stages and CRN format step by step.', link: 'https://clientform.mahvishsadaf.com/' },
  { id: 'standard', label: 'Start with standard fields', note: 'Change them later – renaming is free.' },
];

export const AFTER_CONFIRMATION = [
  { title: 'Email account', text: 'A new email ID and password for the backend setup and system configuration.' },
  { title: 'Your CRM changes', text: 'Fields to add or remove, stage changes, extras, and your Customer Relationship Number (CRN) format, if any.' },
  { title: 'Quotation design', text: 'Whether you send your own quotation design, or we design it as part of the project.' },
];

// Optional extras, shown with a short example so the client knows what "custom" means.
// Feature list – taken from Mahvish's own enquiry form (documents + other features) and the
// demo tour. `from` = the package that already includes it. Anything the chosen package lacks
// can be added; `price` is an ESTIMATE shown as "≈ ₹3k" (final price confirmed on WhatsApp).
// `custom: true` = priced after a call.
// Features are sold as BUNDLES (things that only make sense together) or STAND-ALONE.
// `from` = package that already includes it. `price` = estimate, shown as "≈ ₹5k".
// Commissions: pick dealers, installation team, or both (`exclusive` – one choice at a time).
export const ADDON_GROUPS = ['Included documents', 'Bundles', 'Stand-alone', 'Commissions', 'Extras', 'Custom'];
export const ADDONS = [
  { id: 'quotation_maker', group: 'Included documents', label: 'Quotation maker', from: 'starter', docs: ['quotation'] },
  { id: 'discom_doc', group: 'Included documents', label: 'DISCOM submission document', from: 'starter', docs: ['discom'] },
  { id: 'feasibility_doc', group: 'Included documents', label: 'Bank feasibility document', from: 'starter', docs: ['feasibility'] },

  { id: 'finance', group: 'Bundles', label: 'Invoices, payments & loan tracking', price: 5000, from: 'growth', hidden: true,
    example: 'Bill / invoice maker, payments received and pending, loan tags (1st, 2nd payment) and subsidy tags.' },
  { id: 'delivery', group: 'Bundles', label: 'Delivery, challan & BOM', price: 7000, from: 'pro', hidden: true,
    example: 'Delivery batches page, BOM maker, delivery challan, gate pass and truck loading sheet.', docs: ['bom', 'truck', 'gatepass'] },
  { id: 'installation', group: 'Bundles', label: 'Installation team logins', price: 5000, from: 'pro', hidden: true,
    example: 'Installation team logins with job assignment, installation view, geo-tag photos and installation team payments.' },
  { id: 'warranty', group: 'Bundles', label: 'Warranty package', custom: true, any: true,
    example: 'Technician logins, customer complaints closed with an OTP sent to the customer, and GPS tracking of technicians on warranty visits.' },

  { id: 'godown', group: 'Stand-alone', label: 'Godown stock', price: 5500, from: 'pro', hidden: true, example: 'Stock on hand, movements and daily godown report.' },
  { id: 'attendance', group: 'Stand-alone', label: 'Attendance', price: 4000, from: 'complete', example: 'Daily check-in for office and site staff.' },
  { id: 'calendar', group: 'Stand-alone', label: 'Calendar', price: 2000, from: 'complete', example: 'Team and installation team calendar.' },

  { id: 'commission_dealer', group: 'Commissions', label: 'For dealers', price: 4000, from: 'growth', exclusive: 'commission' },
  { id: 'commission_install', group: 'Commissions', label: 'For installation team', price: 3500, from: 'pro', exclusive: 'commission' },
  { id: 'commission_both', group: 'Commissions', label: 'Both', price: 6500, from: 'pro', exclusive: 'commission', hideIncluded: true },

  // Extras for every package, Lite included. `custom: true` = "price after a call" until prices are set.
  { id: 'otp', group: 'Extras', label: 'OTP login', custom: true, any: true, hidden: true, example: 'Staff and dealers log in with a one-time code sent to their phone. No passwords to share.' },
  { id: 'gps', group: 'Extras', label: 'GPS check-in for the installation team', custom: true, any: true, hidden: true, example: 'The team checks in at the site from their phone. You see who reached which site, and when.' },
  { id: 'esign', group: 'Extras', label: 'E-sign', custom: true, any: true, example: 'Customers sign the agreement and other documents on their phone. The signed copy stays on the customer card.' },

  { id: 'commercial', group: 'Custom', label: 'Commercial projects', soon: true, example: 'Commercial / industrial rooftop with your own stages.' },
];
export const approx = n => `≈ ₹${(Math.round(n / 500) * 500 / 1000).toString().replace(/\.0$/, '')}k`;
// Add-ons the chosen package doesn't already include.
const has = (a, pkgId) => a.from && RANK_OF[a.from] <= RANK_OF[pkgId];
export const addonsFor = pkgId => {
  // Lite is the simple product as it is (plus the Extras): anything more means Standard.
  if (pkgId === 'starter') return ADDONS.filter(a => a.any);
  const out = ADDONS.filter(a => !has(a, pkgId) && !a.soon);
  // "Both" only makes sense when neither commission is already included.
  return has(ADDONS.find(a => a.id === 'commission_dealer'), pkgId) ? out.filter(a => a.id !== 'commission_both') : out;
};
export const comingSoon = () => ADDONS.filter(a => a.soon);
export const includedFeatures = pkgId => ADDONS.filter(a => has(a, pkgId) && !a.hideIncluded);
const RANK_OF = RANK;
// Apply the launch offer once, keeping the full price for the struck-through display.
for (const p of PACKAGES) { p.fullPrice = p.price; p.fullRange = p.range; p.price = offer(p.price); p.range = p.range.map(offer); }
// If the picked add-ons from a higher package cost at least the jump to it, suggest that package.
export function upgradeHint(pkgId, picked) {
  for (const target of ['complete', 'pro', 'growth']) {
    if (RANK_OF[target] <= RANK_OF[pkgId]) continue;
    const from = PACKAGES.find(p => p.id === pkgId), to = PACKAGES.find(p => p.id === target);
    const cost = ADDONS.filter(a => picked.has(a.id) && a.from && RANK_OF[a.from] <= RANK_OF[target] && RANK_OF[a.from] > RANK_OF[pkgId]).reduce((n, a) => n + a.price, 0);
    if (cost && cost >= to.price - from.price) return { target, saving: cost - (to.price - from.price) };
  }
  return null;
}

// Included in every package – so the client knows they don't pay for these.
export const FREE_CUSTOMISATION = [
  'Rename stages and fields to match how you work',
  'Your logo and company details on every document',
  'Turn off tabs and fields you don’t use',
];

// Pick the package from 3 answers.
// operations = old name for stock/delivery (kept for older callers).
export function recommend({ team, dealers, operations, stock, branches }) {
  if (branches === 'Yes' || team === '50+') return 'complete';
  if (stock === 'Yes' || operations === 'Yes' || team === '26–50') return 'pro';
  void dealers; // dealer logins are in Lite (a 1–10 team with dealers stays in Lite)
  if (team === '11–25' || team === '16–25') return 'growth';
  return 'starter';
}

// User limits: Lite up to 15, Standard up to 25, Pro up to 50, Complete for more.
const TEAM_MAX = { '1–15': 15, '16–25': 25, '1–10': 10, '1–3': 3, '4–6': 6, '7–10': 10, '11–25': 25, '26–50': 50, '50+': Infinity, '25+': Infinity };
export function fitsTeam(pkgId, team) {
  const p = PACKAGES.find(x => x.id === pkgId);
  if (!p || !team || p.maxUsers == null) return true;
  return (TEAM_MAX[team] ?? 0) <= p.maxUsers;
}

const fmt = n => n >= 100000 ? `₹${(n / 100000).toFixed(2).replace(/\.?0+$/, '')}L` : `₹${Math.round(n / 1000)}k`;
export const money = n => '₹' + Number(n).toLocaleString('en-IN');

// Clients see a price band, not the exact list price (that stays internal).
const k = n => (n >= 100000 ? `₹${(n / 100000).toFixed(2).replace(/\.?0+$/, '')}L` : `₹${Math.round(n / 1000)}k`);
export function rangeLabel([lo, hi], add = 0) {
  if (lo == null) return `Under ${k(hi + add)}`;
  if (hi == null) return `${k(lo + add)}+`;
  return `${k(lo + add)} – ${k(hi + add)}`;
}
export const packageRange = pkgId => rangeLabel(PACKAGES.find(p => p.id === pkgId)?.range || [null, 0]);
export const fullPackageRange = pkgId => rangeLabel(PACKAGES.find(p => p.id === pkgId)?.fullRange || [null, 0]);

export function quote({ pkg, data, customers, addons, card }) {
  const p = PACKAGES.find(x => x.id === pkg);
  if (!p) return { total: 0, lines: [], label: '—' };
  const c = CARDS.find(x => x.id === card);
  const lines = [{ label: `${p.name} package${c ? ` – ${c.name}` : ''}`, amount: p.price }];
  if (data === 'move') lines.push({ label: `Transferring your data (${customers || 'size to confirm'})`, amount: moveDataPrice(customers) });
  for (const a of addonsFor(pkg)) if (addons.has(a.id)) lines.push({ label: a.exclusive === 'commission' ? `Commissions – ${a.label.toLowerCase()}` : a.label, amount: a.custom ? 0 : a.price, custom: !!a.custom });
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const extras = total - p.price;
  return {
    total, lines, label: p.from ? `From ${fmt(total)}` : money(total),
    range: rangeLabel(p.range, extras),
    // What the client sees: package as a band, extras at their price.
    publicLines: lines.map((l, i) => ({ label: l.label, amount: i === 0 ? rangeLabel(p.range) : l.custom ? 'price after a call' : approx(l.amount) })),
  };
}

// ── 2-tap helper on the package screen ──
export const HELP_TEAM = ['1–15', '16–25', '26–50', '50+'];
// Two pick-one-or-more questions under team size:
//   q: 'logins'   – "Who will log in?"
//   q: 'packages' – "Which add-on packages do you need?"
// The Warranty package is not asked here – it is offered on the Features page (ADDONS 'warranty').
// Team size sets the package (1–15 Lite, 16–25 Standard, 26–50 Pro, 50+ Complete).
// `addons` = extras pre-ticked in the estimate. `min` = lowest package that offers those extras
// (Lite only takes the any-package Extras, so these lift Lite to Standard).
export const HELP_MANAGE = [
  { id: 'admin', q: 'logins', label: 'Admin' },
  { id: 'staff', q: 'logins', label: 'Staff' },
  { id: 'dealers', q: 'logins', label: 'Channel partners' },          // dealer logins are in Lite
  { id: 'installers', q: 'logins', label: 'Installation team', addons: ['installation'], min: 'growth' },
  { id: 'stock', q: 'packages', label: 'Godown, delivery & BOM package', sub: 'Godown stock · delivery batches, challan, gate pass, truck loading sheet · BOM', addons: ['delivery', 'godown'], min: 'growth' },
  { id: 'branches', q: 'branches', label: 'Branches', min: 'complete' },     // branch logins are only in Complete
];
export const helpOptions = q => HELP_MANAGE.filter(m => m.q === q);
export function helpPick(team, manage = []) {
  let r = teamRank(team);
  for (const m of HELP_MANAGE) if (manage.includes(m.id) && m.min) r = Math.max(r, RANK[m.min]);
  return BY_RANK[r];
}
// Without a team size: lift a budget/link package to the lowest one that offers the ticked extras.
export function helpLift(pkgId, manage = []) {
  if (!pkgId) return pkgId;
  let r = RANK[pkgId] ?? 0;
  for (const m of HELP_MANAGE) if (manage.includes(m.id) && m.min) r = Math.max(r, RANK[m.min]);
  return BY_RANK[r];
}
// The new (step-by-step) card starts at Standard; the old 4-tab card is Lite only.
export const atLeast = (pkgId, min) => (pkgId && RANK[pkgId] < RANK[min] ? min : pkgId);
// Extras to pre-tick for the chosen package from the helper answers.
export const helpAddons = (manage = []) => HELP_MANAGE.filter(m => manage.includes(m.id)).flatMap(m => m.addons || []);

// ── Budget question (steers the suggestion, never sets the price) ──
// pkg = the package that usually fits that budget.
export const BUDGETS = [
  { id: 'u40', label: 'Under ₹40k', max: 40000, pkg: 'starter' },
  { id: '40-60', label: '₹40k – ₹60k', max: 60000, pkg: 'growth' },
  { id: '60-90', label: '₹60k – ₹90k', max: 90000, pkg: 'pro' },
  { id: '90+', label: '₹90k+', max: Infinity, pkg: 'complete' },
];
// 'fits' | 'over' (the package starts above the budget) | 'room' (budget well above it) | '' (no budget)
export function budgetFit(pkgId, budgetId) {
  const b = BUDGETS.find(x => x.id === budgetId), p = PACKAGES.find(x => x.id === pkgId);
  if (!b || !p) return '';
  if (p.range[0] >= b.max) return 'over';
  if (RANK[b.pkg] > RANK[pkgId] && p.range[1] < b.max) return 'room';
  return 'fits';
}

// ── Cold-email landing (#/plans?team=small | ?team=big) ──
// file  = the video on our own site: put the .mp4 in public/videos/ and write its name here.
// drive = a Google Drive share link ("Anyone with the link") – shown as a backup link, and
//         played inside the page when there is no file. youtube = optional, same idea.
// All empty = the video block is hidden.
export const TEAM_VIDEOS = {
  small: { file: 'solarflow-1min-vertical.mp4', drive: '', youtube: '', title: 'SolarFlow Lite in 1 minute', team: '1–15', for: 'Up to 15 people' },
  big: { file: 'solarflow-1min-vertical.mp4', drive: '', youtube: '', title: 'SolarFlow in 1 minute', team: '16–25', for: '15+ people' },
};
// youtube.com/shorts/ID, youtu.be/ID, youtube.com/watch?v=ID or a bare ID → embed URL ('' if none).
export function youtubeEmbed(url) {
  const m = String(url || '').trim().match(/(?:shorts\/|youtu\.be\/|[?&]v=|embed\/)([\w-]{11})|^([\w-]{11})$/);
  const id = m && (m[1] || m[2]);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=0` : '';
}
// drive.google.com/file/d/ID/view or open?id=ID → { view, embed } ('' if none).
export function driveLinks(url) {
  const m = String(url || '').trim().match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/);
  return m ? { view: `https://drive.google.com/file/d/${m[1]}/view`, embed: `https://drive.google.com/file/d/${m[1]}/preview` } : { view: '', embed: '' };
}
// What the page plays: our own file first, then Drive, then YouTube. null = no video.
export function teamVideo(team, base = '/') {
  const v = TEAM_VIDEOS[team];
  if (!v) return null;
  const drive = driveLinks(v.drive);
  const file = v.file ? `${base}videos/${v.file.replace(/^\/?(videos\/)?/, '')}` : '';
  const iframe = file ? '' : drive.embed || youtubeEmbed(v.youtube);
  if (!file && !iframe) return null;
  return { ...v, src: file, iframe, driveView: drive.view };
}
