import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const extensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.html', '.json']);
const colorFamilies = [
  'stone', 'gray', 'slate', 'zinc', 'neutral',
  'amber', 'orange', 'yellow',
  'emerald', 'green', 'teal', 'cyan',
  'red', 'rose',
  'blue', 'sky', 'indigo', 'violet', 'purple',
  'pink', 'lime', 'white', 'black',
];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return extensions.has(path.extname(entry.name)) ? [fullPath] : [];
  });
}

function bump(map, key, file) {
  const item = map.get(key) || { count: 0, files: new Set() };
  item.count += 1;
  item.files.add(path.relative(root, file));
  map.set(key, item);
}

function sortedEntries(map) {
  return [...map.entries()].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]));
}

function escapeCell(value) {
  return String(value).replaceAll('|', '\\|');
}

function sources(files) {
  const all = [...files].sort();
  const shown = all.slice(0, 4).map((file) => `\`${file}\``).join(', ');
  return all.length > 4 ? `${shown} +${all.length - 4} more` : shown;
}

const files = walk(sourceRoot);
const hex = new Map();
const rgb = new Map();
const utility = new Map();
const familyShade = new Map();
const familyTotals = new Map();
const familyPattern = colorFamilies.join('|');
const utilityRegex = new RegExp(`(?:[a-z-]+:)*(?:bg|text|border|ring|outline|shadow|from|via|to|divide|placeholder|decoration|accent|caret|fill|stroke)-(${familyPattern})(?:-(950|900|800|700|600|500|400|300|200|100|50))?(?:\\/(?:[0-9]+|\\[[^\\]]+\\]))?(?![\\w-])`, 'g');

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');

  for (const match of content.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    bump(hex, match[0].toUpperCase(), file);
  }

  for (const match of content.matchAll(/rgba?\([^)]*\)/gi)) {
    bump(rgb, match[0].replace(/\s+/g, ' '), file);
  }

  for (const match of content.matchAll(utilityRegex)) {
    const full = match[0];
    const family = match[1];
    const shade = match[2] || 'base';
    bump(utility, full, file);
    bump(familyShade, `${family}-${shade}`, file);
    bump(familyTotals, family, file);
  }
}

const hexRows = sortedEntries(hex).map(([value, item]) =>
  `| \`${value}\` | ${item.count} | ${sources(item.files)} |`,
).join('\n');

const rgbRows = sortedEntries(rgb).map(([value, item]) =>
  `| \`${escapeCell(value)}\` | ${item.count} | ${sources(item.files)} |`,
).join('\n');

const familyRows = sortedEntries(familyTotals).map(([family, item]) => {
  const shades = sortedEntries(familyShade)
    .filter(([key]) => key.startsWith(`${family}-`))
    .map(([key]) => key.slice(family.length + 1))
    .sort((a, b) => (Number(a) || 9999) - (Number(b) || 9999))
    .join(', ');
  return `| ${family} | ${shades} | ${item.count} |`;
}).join('\n');

const utilityRows = sortedEntries(utility).map(([value, item]) =>
  `| \`${value}\` | ${item.count} |`,
).join('\n');

const report = `# SolarFlow color audit and cohesion plan

Generated on 2026-09-27 from all supported source files in \`src/\`.

## What the audit found

| Measure | Count |
| --- | ---: |
| Source files scanned | ${files.length} |
| Literal hex values | ${hex.size} |
| RGB/RGBA expressions | ${rgb.size} |
| Tailwind color utility variants | ${utility.size} |
| Tailwind color families | ${familyTotals.size} |

The app is visually fragmented because the same jobs are handled by several overlapping systems: Stone, Gray, and Slate all act as neutrals; Amber, Orange, and Yellow all act as solar accents or warnings; Emerald, Green, and Teal all act as success colors; Rose and Red both act as errors. Blue, Sky, Cyan, Indigo, Violet, and Purple add more categorical colors without one shared rule.

The quotation PDF is the one reasonable exception. Its navy and orange palette is a customer-facing document identity and can remain isolated from the admin interface.

## Palettes currently competing in the product

| Current palette | Main shades | Where it appears | Decision |
| --- | --- | --- | --- |
| Warm admin neutral | Stone 50–950, \`#FAFAF9\`, \`#F5F5F4\`, \`#E7E5E4\`, \`#78716C\`, \`#1C1917\` | Most admin pages | Keep as the neutral foundation |
| Amber action/warning | Amber 50–950, \`#F59E0B\`, \`#FBBF24\`, \`#FEF3C7\` | Buttons, focus, badges, stages | Split into bright orange actions and yellow warnings |
| Orange accent | Orange 50–900, \`#F97316\`, \`#FF8A00\`, \`#FFB000\` | Selected states and shortage actions | Standardize on bright \`#FF8A00\`; remove dark orange from prominent controls |
| Green success | Emerald 50–950, Green 50/500/700, \`#059669\`, \`#16A34A\` | Stock health, completion, primary actions | Merge into one Solar green scale |
| Red error | Rose 50–950 and Red 50–950 | Errors, destructive actions, shortages | Merge into one Red scale |
| Cool information | Blue, Sky, Cyan and literal blues | Links, info states, portals | Merge into one Info blue scale |
| Extra categorical | Indigo, Violet, Purple, Teal | Staff/attendance and isolated badges | Remove where possible; retain only for data series that need distinct categories |
| Legacy neutral | Gray and Slate plus one-off gray hex values | Older modals, quotations, isolated screens | Replace with the Stone neutral system |
| Quotation document | Navy \`#0C3882\`, \`#083884\`, \`#072D6B\`, \`#1E488F\` with orange \`#F89520\` | Quotation PDF/template | Keep as a separate named document palette |
| Print monochrome | Black, white, and gray | Gate pass, BOM, delivery printouts | Keep for legible, economical printing |

## Approved SolarFlow interface palette

These are the only colors proposed for the application interface. The palette is bright, clean, and mostly neutral. It avoids gradients and dark orange.

| Token | Value | Use |
| --- | --- | --- |
| Canvas | \`#FAFAF9\` | App background |
| Surface | \`#FFFFFF\` | Cards, modals, tables |
| Surface soft | \`#F5F5F4\` | Subtle sections and inactive rows |
| Ink | \`#1C1917\` | Main text and dark buttons |
| Ink secondary | \`#57534E\` | Secondary text |
| Muted | \`#78716C\` | Metadata and helper text |
| Border | \`#E7E5E4\` | Default borders and dividers |
| Border strong | \`#D6D3D1\` | Inputs and stronger separation |
| Solar orange | \`#FF8A00\` | Main solar accent and focused actions |
| Solar orange hover | \`#FFB000\` | Hover/active orange; use dark text |
| Solar orange soft | \`#FFF4E5\` | Orange badges and highlighted areas |
| Solar yellow | \`#FACC15\` | Pending, attention, focus ring |
| Solar yellow soft | \`#FEF9C3\` | Warning/pending backgrounds |
| Solar green | \`#22C55E\` | Success, available, complete |
| Solar green hover | \`#16A34A\` | Green hover state |
| Solar green soft | \`#DCFCE7\` | Success backgrounds |
| Info blue | \`#2563EB\` | Links and informational states |
| Info blue soft | \`#EFF6FF\` | Informational backgrounds |
| Error red | \`#EF4444\` | Errors and destructive actions |
| Error red dark | \`#B91C1C\` | Error text |
| Error red soft | \`#FEF2F2\` | Error backgrounds |

### Color rules

1. Neutral colors should occupy roughly 85% of every screen.
2. Use orange for the primary solar accent and high-value actions. Use \`#1C1917\` text on orange; do not use dark orange.
3. Use green only for success, availability, completion, and positive values.
4. Use yellow for pending, waiting, and warnings. It should not compete with the main action.
5. Use red only for errors, shortages that require intervention, and destructive actions.
6. Use blue only for links and neutral information.
7. One panel should have one accent color. Do not mix orange, green, and yellow decoratively in the same card.
8. Do not use gradients. Use surfaces, borders, spacing, typography, and one accent to create hierarchy.
9. Customer-facing printable documents may use a named document palette, kept separate from app tokens.

## Consolidation map

| Current families | Replace with |
| --- | --- |
| Stone + Gray + Slate + Zinc + Neutral | Stone-based neutral tokens |
| Amber + Orange | Solar orange for actions; Solar yellow for pending/warnings |
| Emerald + Green + Teal | Solar green |
| Rose + Red | Error red |
| Blue + Sky + Cyan | Info blue |
| Indigo + Violet + Purple + Pink | Remove, or map to Info blue unless a chart truly needs a separate series |
| Literal one-off grays | Neutral tokens |
| Literal one-off status colors | Semantic status tokens |

## Implementation plan

### 1. Lock the theme foundation

- Replace the current root variables with the approved tokens.
- Add semantic aliases such as \`--sf-action\`, \`--sf-success\`, \`--sf-warning\`, \`--sf-danger\`, and \`--sf-info\`.
- Add shared button, badge, input, table, card, and focus styles so pages stop rebuilding them independently.
- Add an automated color-audit check that flags new literal colors and unapproved Tailwind families.

### 2. Unify the product shell

- Apply the neutral canvas, surface, border, type, and selected-navigation treatment to the header, sidebar, mobile navigation, login, and dashboard.
- Use Solar orange for the active navigation marker and the one primary action on a page.
- Remove decorative color fills from summary cards; use a small icon tile or status badge instead.

### 3. Rebuild the operational core around shared components

- Inventory: one compact table system, green for healthy stock, yellow for low stock, red for shortage, orange only for the main receive/reorder action.
- Delivery: match Inventory card/table density and badge shapes; keep print layouts black, white, and document-safe.
- Projects and stages: use one stage badge component and one action hierarchy across every stage.
- Dashboard: neutral cards with consistent metric typography; color only the status indicator or trend.

### 4. Normalize forms, modals, and feedback

- Give every modal the same header, footer, spacing, radius, and button order.
- Replace Amber/Orange focus variants with the single yellow focus token.
- Replace Rose/Red duplication with one error system.
- Replace mixed toast colors with semantic success, warning, error, and info variants.

### 5. Separate app and document themes

- Keep quotation PDFs on the existing navy/orange document palette after checking contrast and print quality.
- Give invoices, BOMs, delivery summaries, DISCOM documents, and feasibility documents the same document tokens.
- Do not allow document navy to leak into the admin interface.

### 6. Verify screen by screen

- Review Dashboard, Inventory, Deliveries, Projects, Quotations, Staff, Login, and all modals at desktop and phone widths.
- Check text and control contrast, keyboard focus, hover/active/disabled states, and print output.
- Capture reference screenshots after each module so future changes can be checked against the agreed theme.

## Tailwind families and shades currently used

| Family | Shades found | Occurrences |
| --- | --- | ---: |
${familyRows}

## Complete literal hex inventory

This includes colors in application UI, print/PDF templates, demo CSS, and a few hash-like strings that the scanner found. Values such as \`#101\` and \`#102\` should be checked because they may be element identifiers rather than colors.

| Value | Occurrences | Example source files |
| --- | ---: | --- |
${hexRows}

## Complete RGB/RGBA inventory

| Value | Occurrences | Example source files |
| --- | ---: | --- |
${rgbRows}

## Complete Tailwind color utility inventory

| Utility | Occurrences |
| --- | ---: |
${utilityRows}
`;

fs.writeFileSync(path.join(root, 'THEME_COLOR_AUDIT.md'), report);
console.log(`Wrote THEME_COLOR_AUDIT.md from ${files.length} source files.`);
