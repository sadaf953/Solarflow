# SolarFlow color audit and cohesion plan

Generated on 2026-09-27 from all supported source files in `src/`.

## What the audit found

| Measure | Count |
| --- | ---: |
| Source files scanned | 129 |
| Literal hex values | 80 |
| RGB/RGBA expressions | 31 |
| Tailwind color utility variants | 510 |
| Tailwind color families | 19 |

The app is visually fragmented because the same jobs are handled by several overlapping systems: Stone, Gray, and Slate all act as neutrals; Amber, Orange, and Yellow all act as solar accents or warnings; Emerald, Green, and Teal all act as success colors; Rose and Red both act as errors. Blue, Sky, Cyan, Indigo, Violet, and Purple add more categorical colors without one shared rule.

The quotation PDF is the one reasonable exception. Its navy and orange palette is a customer-facing document identity and can remain isolated from the admin interface.

## Palettes currently competing in the product

| Current palette | Main shades | Where it appears | Decision |
| --- | --- | --- | --- |
| Warm admin neutral | Stone 50–950, `#FAFAF9`, `#F5F5F4`, `#E7E5E4`, `#78716C`, `#1C1917` | Most admin pages | Keep as the neutral foundation |
| Amber action/warning | Amber 50–950, `#F59E0B`, `#FBBF24`, `#FEF3C7` | Buttons, focus, badges, stages | Split into bright orange actions and yellow warnings |
| Orange accent | Orange 50–900, `#F97316`, `#FF8A00`, `#FFB000` | Selected states and shortage actions | Standardize on bright `#FF8A00`; remove dark orange from prominent controls |
| Green success | Emerald 50–950, Green 50/500/700, `#059669`, `#16A34A` | Stock health, completion, primary actions | Merge into one Solar green scale |
| Red error | Rose 50–950 and Red 50–950 | Errors, destructive actions, shortages | Merge into one Red scale |
| Cool information | Blue, Sky, Cyan and literal blues | Links, info states, portals | Merge into one Info blue scale |
| Extra categorical | Indigo, Violet, Purple, Teal | Staff/attendance and isolated badges | Remove where possible; retain only for data series that need distinct categories |
| Legacy neutral | Gray and Slate plus one-off gray hex values | Older modals, quotations, isolated screens | Replace with the Stone neutral system |
| Quotation document | Navy `#0C3882`, `#083884`, `#072D6B`, `#1E488F` with orange `#F89520` | Quotation PDF/template | Keep as a separate named document palette |
| Print monochrome | Black, white, and gray | Gate pass, BOM, delivery printouts | Keep for legible, economical printing |

## Approved SolarFlow interface palette

These are the only colors proposed for the application interface. The palette is bright, clean, and mostly neutral. It avoids gradients and dark orange.

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#FAFAF9` | App background |
| Surface | `#FFFFFF` | Cards, modals, tables |
| Surface soft | `#F5F5F4` | Subtle sections and inactive rows |
| Ink | `#1C1917` | Main text and dark buttons |
| Ink secondary | `#57534E` | Secondary text |
| Muted | `#78716C` | Metadata and helper text |
| Border | `#E7E5E4` | Default borders and dividers |
| Border strong | `#D6D3D1` | Inputs and stronger separation |
| Solar orange | `#FF8A00` | Main solar accent and focused actions |
| Solar orange hover | `#FFB000` | Hover/active orange; use dark text |
| Solar orange soft | `#FFF4E5` | Orange badges and highlighted areas |
| Solar yellow | `#FACC15` | Pending, attention, focus ring |
| Solar yellow soft | `#FEF9C3` | Warning/pending backgrounds |
| Solar green | `#22C55E` | Success, available, complete |
| Solar green hover | `#16A34A` | Green hover state |
| Solar green soft | `#DCFCE7` | Success backgrounds |
| Info blue | `#2563EB` | Links and informational states |
| Info blue soft | `#EFF6FF` | Informational backgrounds |
| Error red | `#EF4444` | Errors and destructive actions |
| Error red dark | `#B91C1C` | Error text |
| Error red soft | `#FEF2F2` | Error backgrounds |

### Color rules

1. Neutral colors should occupy roughly 85% of every screen.
2. Use orange for the primary solar accent and high-value actions. Use `#1C1917` text on orange; do not use dark orange.
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
- Add semantic aliases such as `--sf-action`, `--sf-success`, `--sf-warning`, `--sf-danger`, and `--sf-info`.
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
| stone | 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950 | 3911 |
| amber | 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950 | 1197 |
| white | base | 833 |
| emerald | 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950 | 602 |
| rose | 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950 | 247 |
| red | 50, 100, 200, 300, 400, 500, 600, 700, 800, 950 | 141 |
| blue | 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950 | 104 |
| black | base | 100 |
| gray | 50, 100, 200, 800, 900, 950 | 66 |
| slate | 200, 300, 400, 500, 700, 800, 900, 950 | 51 |
| indigo | 50, 100, 200, 300, 400, 500, 600, 700, 800, 900 | 44 |
| sky | 50, 100, 200, 300, 400, 500, 600, 700, 800, 900 | 41 |
| teal | 50, 100, 200, 300, 400, 500, 600, 700, 800, 900 | 39 |
| purple | 50, 100, 200, 300, 400, 500, 600, 700, 800, 900 | 34 |
| orange | 50, 100, 200, 300, 500, 600, 700, 900 | 19 |
| yellow | 50, 100, 300, 700, 900 | 7 |
| cyan | 50, 200, 500, 700 | 4 |
| violet | 50, 200, 500, 700 | 4 |
| green | 50, 500, 700 | 3 |

## Complete literal hex inventory

This includes colors in application UI, print/PDF templates, demo CSS, and a few hash-like strings that the scanner found. Values such as `#101` and `#102` should be checked because they may be element identifiers rather than colors.

| Value | Occurrences | Example source files |
| --- | ---: | --- |
| `#1C1917` | 52 | `src/demo/demo.css`, `src/index.css`, `src/inventory/inventory.css`, `src/quotations/quotation.css` |
| `#78716C` | 34 | `src/components/modal-tabs/MaterialDeliveryTab.jsx`, `src/demo/demo.css`, `src/index.css`, `src/inventory/InventoryView.jsx` +2 more |
| `#F59E0B` | 34 | `src/components/modal-tabs/shared.jsx`, `src/demo/demo.css`, `src/index.css`, `src/inventory/inventory.css` +2 more |
| `#E7E5E4` | 31 | `src/demo/demo.css`, `src/index.css`, `src/inventory/inventory.css`, `src/quotations/quotation.css` |
| `#FFFFFF` | 22 | `src/components/BomPrintModal.jsx`, `src/components/DeliveryBatchesView.jsx`, `src/components/VendorPortal.jsx`, `src/components/agreement/AgreementPreview.jsx` +6 more |
| `#F97316` | 21 | `src/demo/demo.css`, `src/index.css`, `src/inventory/inventory.css`, `src/quotations/quotation.css` +1 more |
| `#059669` | 19 | `src/components/modal-tabs/shared.jsx`, `src/demo/demo.css`, `src/inventory/inventory.css`, `src/quotations/quotation.css` +1 more |
| `#0C3882` | 19 | `src/quotations/template/components/DocumentFooter.tsx`, `src/quotations/template/components/DocumentHeader.tsx`, `src/quotations/template/components/pages/Page2.tsx`, `src/quotations/template/components/pages/Page3.tsx` |
| `#FFF` | 16 | `src/components/DeliveryBatchesView.jsx`, `src/inventory/inventory.css`, `src/quotations/quotation.css` |
| `#F5F5F4` | 14 | `src/demo/demo.css`, `src/index.css`, `src/inventory/inventory.css`, `src/quotations/quotation.css` |
| `#57534E` | 13 | `src/demo/demo.css`, `src/inventory/inventory.css`, `src/quotations/quotation.css` |
| `#FCFBFA` | 10 | `src/components/AgentPortal.jsx`, `src/components/CustomerDetailModal.jsx`, `src/components/Dashboard.jsx`, `src/components/StampPortal.jsx` +3 more |
| `#000000` | 9 | `src/components/BomPrintModal.jsx`, `src/components/DeliveryBatchesView.jsx`, `src/components/VendorPortal.jsx`, `src/components/modal-tabs/MaterialDeliveryTab.jsx` +1 more |
| `#A8A29E` | 9 | `src/components/modal-tabs/MaterialDeliveryTab.jsx`, `src/demo/demo.css`, `src/index.css`, `src/inventory/inventory.css` |
| `#FEF3C7` | 9 | `src/components/modal-tabs/shared.jsx`, `src/demo/demo.css`, `src/index.css`, `src/quotations/QuotationForm.jsx` +1 more |
| `#44403C` | 7 | `src/demo/demo.css`, `src/inventory/inventory.css`, `src/quotations/quotation.css` |
| `#D6D3D1` | 7 | `src/components/modal-tabs/MaterialDeliveryTab.jsx`, `src/demo/demo.css`, `src/index.css`, `src/inventory/inventory.css` +1 more |
| `#FAFAF9` | 7 | `src/demo/demo.css`, `src/index.css`, `src/inventory/inventory.css` |
| `#047857` | 6 | `src/demo/demo.css`, `src/inventory/inventory.css`, `src/quotations/quotation.css` |
| `#FDE68A` | 6 | `src/demo/demo.css`, `src/quotations/quotation.css` |
| `#FEF08A` | 6 | `src/components/AgentPortal.jsx`, `src/components/CustomerDetailModal.jsx`, `src/components/agreement/Page4.jsx`, `src/components/modal-tabs/DiscomSubmissionTab.jsx` |
| `#FFFDFA` | 5 | `src/demo/demo.css` |
| `#4B5563` | 4 | `src/components/modal-tabs/shared.jsx`, `src/quotations/template/components/pages/Page1.tsx` |
| `#92400E` | 4 | `src/components/modal-tabs/shared.jsx`, `src/demo/demo.css`, `src/quotations/QuotationForm.jsx`, `src/quotations/quotation.css` |
| `#9F1239` | 4 | `src/demo/demo.css`, `src/inventory/inventory.css`, `src/quotations/quotation.css` |
| `#FFF1F2` | 4 | `src/demo/demo.css`, `src/inventory/inventory.css`, `src/quotations/quotation.css` |
| `#000` | 3 | `src/components/DeliveryBatchesView.jsx` |
| `#292524` | 3 | `src/demo/demo.css`, `src/inventory/inventory.css` |
| `#ECFDF5` | 3 | `src/demo/demo.css`, `src/inventory/inventory.css`, `src/quotations/quotation.css` |
| `#FACC15` | 3 | `src/index.css`, `src/inventory/inventory.css` |
| `#FBBF24` | 3 | `src/components/modal-tabs/shared.jsx`, `src/demo/demo.css`, `src/index.css` |
| `#FECDD3` | 3 | `src/demo/demo.css`, `src/inventory/inventory.css`, `src/quotations/quotation.css` |
| `#FFFBEB` | 3 | `src/components/modal-tabs/shared.jsx`, `src/index.css` |
| `#0284C7` | 2 | `src/inventory/inventory.css`, `src/utils/staffAttendance.js` |
| `#065F46` | 2 | `src/demo/demo.css`, `src/quotations/quotation.css` |
| `#15803D` | 2 | `src/index.css`, `src/inventory/inventory.css` |
| `#1E293B` | 2 | `src/components/agreement/AgreementPreview.jsx`, `src/index.css` |
| `#68788B` | 2 | `src/quotations/quotation.css` |
| `#E5E7EB` | 2 | `src/components/modal-tabs/shared.jsx` |
| `#FF8A00` | 2 | `src/inventory/inventory.css` |
| `#FFB000` | 2 | `src/inventory/inventory.css` |
| `#072D6B` | 1 | `src/quotations/template/components/DocumentFooter.tsx` |
| `#083884` | 1 | `src/quotations/template/components/DocumentFooter.tsx` |
| `#0C0A09` | 1 | `src/demo/demo.css` |
| `#0D9488` | 1 | `src/utils/staffAttendance.js` |
| `#101` | 1 | `src/components/BrevoModal.jsx` |
| `#102` | 1 | `src/components/BrevoModal.jsx` |
| `#10283C70` | 1 | `src/quotations/quotation.css` |
| `#10B981` | 1 | `src/inventory/inventory.css` |
| `#111827` | 1 | `src/components/modal-tabs/shared.jsx` |
| `#16A34A` | 1 | `src/index.css` |
| `#1E40AF` | 1 | `src/quotations/quotation.css` |
| `#1E488F` | 1 | `src/quotations/template/components/DocumentHeader.tsx` |
| `#1F2937` | 1 | `src/components/modal-tabs/shared.jsx` |
| `#4F46E5` | 1 | `src/utils/staffAttendance.js` |
| `#555` | 1 | `src/components/DeliveryBatchesView.jsx` |
| `#555555` | 1 | `src/components/DeliveryBatchesView.jsx` |
| `#6B7280` | 1 | `src/components/modal-tabs/shared.jsx` |
| `#9333EA` | 1 | `src/utils/staffAttendance.js` |
| `#9CA3AF` | 1 | `src/components/modal-tabs/shared.jsx` |
| `#A7F3D0` | 1 | `src/demo/demo.css` |
| `#B45309` | 1 | `src/components/modal-tabs/shared.jsx` |
| `#B91C1C` | 1 | `src/inventory/inventory.css` |
| `#CBD5E1` | 1 | `src/demo/demo.css` |
| `#DC2626` | 1 | `src/inventory/inventory.css` |
| `#DFE5EE` | 1 | `src/quotations/quotation.css` |
| `#E11D48` | 1 | `src/utils/staffAttendance.js` |
| `#EEF1F5` | 1 | `src/quotations/quotation.css` |
| `#EF4444` | 1 | `src/inventory/inventory.css` |
| `#EFF6FF` | 1 | `src/quotations/quotation.css` |
| `#F3F4F6` | 1 | `src/components/modal-tabs/shared.jsx` |
| `#F6F7F9` | 1 | `src/quotations/QuotationModule.jsx` |
| `#F6F7F9F5` | 1 | `src/quotations/quotation.css` |
| `#F89520` | 1 | `src/quotations/template/components/DocumentFooter.tsx` |
| `#F9FAFB` | 1 | `src/components/modal-tabs/shared.jsx` |
| `#FED7AA` | 1 | `src/inventory/inventory.css` |
| `#FEF2F2` | 1 | `src/inventory/inventory.css` |
| `#FEF9C3` | 1 | `src/inventory/inventory.css` |
| `#FEFCE8` | 1 | `src/inventory/inventory.css` |
| `#FFFFFFED` | 1 | `src/quotations/quotation.css` |

## Complete RGB/RGBA inventory

| Value | Occurrences | Example source files |
| --- | ---: | --- |
| `rgb(1, .94, .55)` | 2 | `src/feasibilityReport.js` |
| `rgba(245,158,11,0.08)` | 2 | `src/demo/demo.css` |
| `rgba(245,158,11,0.25)` | 2 | `src/demo/demo.css` |
| `rgb(.4, .4, .4)` | 1 | `src/feasibilityReport.js` |
| `rgb(0.08, 0.08, 0.08)` | 1 | `src/feasibilityReport.js` |
| `rgb(1, 0.94, 0.55)` | 1 | `src/feasibilityReport.js` |
| `rgb(28 25 23 / 60%)` | 1 | `src/index.css` |
| `rgba(0, 0, 0, 0.06)` | 1 | `src/index.css` |
| `rgba(0, 0, 0, 0.08)` | 1 | `src/index.css` |
| `rgba(0, 0, 0, 0.4)` | 1 | `src/index.css` |
| `rgba(0,0,0,0.03)` | 1 | `src/quotations/quotation.css` |
| `rgba(0,0,0,0.06)` | 1 | `src/demo/demo.css` |
| `rgba(0,0,0,0.18)` | 1 | `src/demo/demo.css` |
| `rgba(0,0,0,0.22)` | 1 | `src/demo/demo.css` |
| `rgba(0,0,0,0.32)` | 1 | `src/demo/demo.css` |
| `rgba(0,0,0,0.55)` | 1 | `src/components/ImageCropModal.jsx` |
| `rgba(14,35,50,0.45)` | 1 | `src/demo/demo.css` |
| `rgba(15,35,50,0.15)` | 1 | `src/demo/demo.css` |
| `rgba(15,35,50,0.18)` | 1 | `src/demo/demo.css` |
| `rgba(21, 128, 61, .18)` | 1 | `src/index.css` |
| `rgba(245, 158, 11, .18)` | 1 | `src/index.css` |
| `rgba(245,158,11,0.22)` | 1 | `src/quotations/quotation.css` |
| `rgba(245,158,11,0.3)` | 1 | `src/demo/demo.css` |
| `rgba(255,255,255,0.12)` | 1 | `src/demo/demo.css` |
| `rgba(28, 25, 23, .04)` | 1 | `src/inventory/inventory.css` |
| `rgba(28,25,23,.03)` | 1 | `src/inventory/inventory.css` |
| `rgba(28,25,23,.08)` | 1 | `src/inventory/inventory.css` |
| `rgba(28,25,23,.18)` | 1 | `src/inventory/inventory.css` |
| `rgba(28,25,23,.55)` | 1 | `src/inventory/inventory.css` |
| `rgba(28,25,23,0.03)` | 1 | `src/demo/demo.css` |
| `rgba(5,150,105,0.25)` | 1 | `src/demo/demo.css` |

## Complete Tailwind color utility inventory

| Utility | Occurrences |
| --- | ---: |
| `text-stone-400` | 666 |
| `bg-white` | 465 |
| `border-stone-200` | 428 |
| `text-stone-600` | 296 |
| `text-stone-900` | 291 |
| `text-white` | 279 |
| `text-stone-500` | 274 |
| `text-stone-700` | 260 |
| `bg-stone-50` | 209 |
| `border-stone-100` | 201 |
| `text-stone-800` | 198 |
| `border-stone-300` | 119 |
| `bg-stone-100` | 115 |
| `bg-stone-900` | 99 |
| `bg-amber-500` | 72 |
| `text-amber-600` | 71 |
| `text-amber-700` | 70 |
| `focus:ring-amber-500` | 69 |
| `border-black` | 68 |
| `text-emerald-700` | 67 |
| `bg-amber-50` | 66 |
| `bg-emerald-600` | 65 |
| `bg-emerald-50` | 63 |
| `text-emerald-600` | 60 |
| `focus:ring-amber-300` | 58 |
| `border-emerald-200` | 55 |
| `text-amber-500` | 54 |
| `hover:bg-stone-800` | 53 |
| `hover:bg-stone-100` | 49 |
| `border-amber-200` | 47 |
| `text-amber-800` | 47 |
| `text-stone-300` | 45 |
| `hover:bg-emerald-700` | 44 |
| `text-gray-900` | 42 |
| `text-emerald-800` | 41 |
| `text-amber-900` | 39 |
| `border-stone-400` | 37 |
| `focus:border-amber-400` | 35 |
| `hover:bg-stone-50` | 35 |
| `bg-amber-100` | 34 |
| `focus:ring-amber-400` | 34 |
| `text-rose-700` | 34 |
| `bg-stone-50/80` | 32 |
| `border-rose-200` | 32 |
| `text-red-500` | 32 |
| `border-amber-300` | 31 |
| `text-amber-400` | 31 |
| `hover:bg-stone-200` | 29 |
| `bg-rose-50` | 26 |
| `divide-stone-200/50` | 26 |
| `bg-emerald-100` | 25 |
| `shadow-emerald-600/10` | 25 |
| `border-amber-500` | 24 |
| `border-stone-200/80` | 24 |
| `hover:border-stone-300` | 24 |
| `hover:text-white` | 24 |
| `text-stone-950` | 24 |
| `hover:bg-amber-600` | 23 |
| `hover:text-amber-600` | 23 |
| `text-rose-600` | 23 |
| `group-hover:text-amber-600` | 22 |
| `border-amber-200/80` | 20 |
| `focus:border-amber-500` | 20 |
| `hover:text-stone-800` | 20 |
| `bg-stone-200` | 19 |
| `disabled:bg-stone-100` | 19 |
| `hover:text-stone-700` | 19 |
| `disabled:text-stone-500` | 18 |
| `hover:text-stone-600` | 18 |
| `border-stone-900` | 17 |
| `bg-red-50` | 16 |
| `bg-rose-600` | 16 |
| `bg-rose-100` | 15 |
| `border-stone-200/70` | 15 |
| `hover:bg-amber-50` | 15 |
| `bg-blue-50` | 13 |
| `bg-stone-50/50` | 13 |
| `bg-stone-50/70` | 13 |
| `border-red-200` | 13 |
| `border-stone-200/60` | 13 |
| `shadow-amber-500/20` | 13 |
| `text-gray-800` | 13 |
| `bg-emerald-500` | 12 |
| `text-blue-700` | 12 |
| `text-emerald-500` | 12 |
| `text-rose-800` | 12 |
| `bg-amber-50/60` | 11 |
| `hover:bg-amber-100` | 11 |
| `hover:bg-stone-50/50` | 11 |
| `text-amber-950` | 11 |
| `text-red-700` | 11 |
| `bg-amber-600` | 10 |
| `bg-stone-300` | 10 |
| `border-emerald-600` | 10 |
| `hover:border-amber-300` | 10 |
| `hover:text-stone-900` | 10 |
| `text-blue-600` | 10 |
| `text-red-600` | 10 |
| `bg-amber-400` | 9 |
| `bg-black/60` | 9 |
| `border-slate-800` | 9 |
| `divide-stone-100` | 9 |
| `shadow-amber-500/10` | 9 |
| `text-black` | 9 |
| `text-slate-400` | 9 |
| `bg-amber-50/80` | 8 |
| `bg-emerald-400` | 8 |
| `bg-teal-50` | 8 |
| `border-emerald-100` | 8 |
| `border-teal-200` | 8 |
| `border-white/60` | 8 |
| `group-hover:bg-amber-100/70` | 8 |
| `hover:bg-stone-300` | 8 |
| `hover:border-amber-400` | 8 |
| `hover:text-emerald-700` | 8 |
| `text-amber-300` | 8 |
| `text-emerald-900` | 8 |
| `text-rose-900` | 8 |
| `bg-black/50` | 7 |
| `bg-indigo-50` | 7 |
| `bg-red-100` | 7 |
| `bg-slate-900` | 7 |
| `bg-white/10` | 7 |
| `border-blue-200` | 7 |
| `border-emerald-300` | 7 |
| `border-indigo-200` | 7 |
| `border-stone-500` | 7 |
| `focus:bg-white` | 7 |
| `hover:bg-amber-400` | 7 |
| `hover:bg-red-50` | 7 |
| `hover:bg-rose-700` | 7 |
| `hover:text-amber-800` | 7 |
| `hover:text-red-500` | 7 |
| `placeholder-stone-400` | 7 |
| `placeholder:text-stone-400` | 7 |
| `ring-amber-500` | 7 |
| `text-emerald-400` | 7 |
| `text-red-800` | 7 |
| `text-teal-700` | 7 |
| `bg-amber-500/10` | 6 |
| `bg-rose-400` | 6 |
| `bg-rose-500` | 6 |
| `bg-sky-100` | 6 |
| `bg-stone-900/60` | 6 |
| `border-amber-200/60` | 6 |
| `group-hover:text-amber-700` | 6 |
| `hover:text-amber-700` | 6 |
| `shadow-stone-900/10` | 6 |
| `text-amber-100` | 6 |
| `text-blue-500` | 6 |
| `text-indigo-700` | 6 |
| `text-purple-700` | 6 |
| `bg-amber-50/50` | 5 |
| `bg-amber-50/70` | 5 |
| `bg-amber-500/20` | 5 |
| `bg-red-600` | 5 |
| `bg-sky-600` | 5 |
| `bg-stone-50/60` | 5 |
| `bg-stone-900/50` | 5 |
| `bg-stone-900/70` | 5 |
| `bg-teal-400` | 5 |
| `bg-white/20` | 5 |
| `border-amber-400` | 5 |
| `border-purple-200` | 5 |
| `border-rose-600` | 5 |
| `border-stone-800` | 5 |
| `divide-stone-200` | 5 |
| `focus:ring-emerald-500` | 5 |
| `hover:bg-rose-50` | 5 |
| `hover:text-red-600` | 5 |
| `hover:text-rose-700` | 5 |
| `text-purple-600` | 5 |
| `text-sky-600` | 5 |
| `bg-amber-100/70` | 4 |
| `bg-blue-100` | 4 |
| `bg-blue-400` | 4 |
| `bg-emerald-50/70` | 4 |
| `bg-indigo-400` | 4 |
| `bg-orange-50` | 4 |
| `bg-purple-100` | 4 |
| `bg-purple-50` | 4 |
| `bg-stone-200/70` | 4 |
| `bg-stone-950/60` | 4 |
| `border-amber-200/70` | 4 |
| `border-amber-500/30` | 4 |
| `border-amber-600` | 4 |
| `border-gray-200` | 4 |
| `border-rose-100` | 4 |
| `border-rose-300` | 4 |
| `border-stone-200/50` | 4 |
| `border-white/10` | 4 |
| `disabled:bg-stone-100/50` | 4 |
| `disabled:bg-stone-300` | 4 |
| `focus:ring-indigo-500` | 4 |
| `from-stone-900` | 4 |
| `hover:bg-amber-50/40` | 4 |
| `hover:bg-amber-700` | 4 |
| `hover:bg-blue-50` | 4 |
| `hover:bg-emerald-100` | 4 |
| `hover:bg-emerald-50` | 4 |
| `hover:bg-rose-100` | 4 |
| `hover:bg-sky-700` | 4 |
| `hover:bg-slate-800` | 4 |
| `hover:text-amber-900` | 4 |
| `hover:text-slate-200` | 4 |
| `text-blue-800` | 4 |
| `text-orange-600` | 4 |
| `text-red-400` | 4 |
| `text-sky-800` | 4 |
| `text-slate-900` | 4 |
| `text-stone-200` | 4 |
| `bg-blue-50/50` | 3 |
| `bg-emerald-50/50` | 3 |
| `bg-indigo-100` | 3 |
| `bg-rose-50/70` | 3 |
| `bg-sky-50` | 3 |
| `bg-slate-800` | 3 |
| `bg-stone-400` | 3 |
| `bg-stone-50/40` | 3 |
| `bg-stone-700` | 3 |
| `bg-teal-500` | 3 |
| `border-amber-100` | 3 |
| `border-emerald-500` | 3 |
| `border-red-600` | 3 |
| `border-white` | 3 |
| `disabled:bg-stone-100/80` | 3 |
| `focus:ring-rose-400` | 3 |
| `hover:bg-white/20` | 3 |
| `hover:border-amber-200` | 3 |
| `hover:text-blue-700` | 3 |
| `hover:text-blue-800` | 3 |
| `hover:text-rose-600` | 3 |
| `ring-stone-900` | 3 |
| `shadow-emerald-600/20` | 3 |
| `shadow-red-600/10` | 3 |
| `shadow-rose-600/10` | 3 |
| `text-blue-400` | 3 |
| `text-emerald-950` | 3 |
| `text-gray-950` | 3 |
| `text-purple-800` | 3 |
| `text-slate-200` | 3 |
| `text-white/60` | 3 |
| `bg-amber-100/90` | 2 |
| `bg-amber-400/15` | 2 |
| `bg-amber-400/20` | 2 |
| `bg-amber-50/30` | 2 |
| `bg-amber-50/90` | 2 |
| `bg-amber-500/15` | 2 |
| `bg-black/40` | 2 |
| `bg-blue-50/80` | 2 |
| `bg-emerald-500/10` | 2 |
| `bg-emerald-950/70` | 2 |
| `bg-indigo-500` | 2 |
| `bg-indigo-600` | 2 |
| `bg-orange-500` | 2 |
| `bg-purple-500` | 2 |
| `bg-slate-950` | 2 |
| `bg-stone-100/50` | 2 |
| `bg-stone-100/60` | 2 |
| `bg-stone-100/80` | 2 |
| `bg-stone-800` | 2 |
| `bg-stone-900/40` | 2 |
| `bg-stone-950` | 2 |
| `bg-teal-600` | 2 |
| `bg-white/80` | 2 |
| `bg-white/95` | 2 |
| `bg-yellow-50` | 2 |
| `border-blue-100` | 2 |
| `border-blue-200/80` | 2 |
| `border-emerald-200/80` | 2 |
| `border-emerald-700/60` | 2 |
| `border-orange-200` | 2 |
| `border-red-100` | 2 |
| `border-red-300` | 2 |
| `border-sky-200` | 2 |
| `border-stone-50` | 2 |
| `border-stone-700` | 2 |
| `focus:ring-blue-400` | 2 |
| `focus:ring-sky-400` | 2 |
| `from-amber-500` | 2 |
| `from-amber-500/15` | 2 |
| `group-hover:bg-amber-100` | 2 |
| `hover:bg-amber-200` | 2 |
| `hover:bg-amber-50/20` | 2 |
| `hover:bg-blue-100` | 2 |
| `hover:bg-emerald-900/80` | 2 |
| `hover:bg-white/15` | 2 |
| `hover:border-emerald-500` | 2 |
| `hover:text-amber-400` | 2 |
| `hover:text-emerald-900` | 2 |
| `ring-amber-400` | 2 |
| `ring-white` | 2 |
| `shadow-emerald-600/15` | 2 |
| `shadow-sky-600/15` | 2 |
| `text-amber-50` | 2 |
| `text-blue-950` | 2 |
| `text-emerald-100` | 2 |
| `text-emerald-300` | 2 |
| `text-indigo-600` | 2 |
| `text-indigo-800` | 2 |
| `text-orange-700` | 2 |
| `text-red-300` | 2 |
| `text-rose-500` | 2 |
| `text-rose-950` | 2 |
| `text-sky-700` | 2 |
| `text-slate-500` | 2 |
| `text-white/30` | 2 |
| `text-white/90` | 2 |
| `text-yellow-700` | 2 |
| `to-orange-500` | 2 |
| `to-stone-800` | 2 |
| `to-white` | 2 |
| `via-amber-500` | 2 |
| `via-amber-500/5` | 2 |
| `accent-amber-500` | 1 |
| `active:bg-amber-700` | 1 |
| `bg-amber-100/50` | 1 |
| `bg-amber-100/80` | 1 |
| `bg-amber-200` | 1 |
| `bg-amber-200/60` | 1 |
| `bg-amber-200/80` | 1 |
| `bg-amber-400/10` | 1 |
| `bg-black/20` | 1 |
| `bg-black/70` | 1 |
| `bg-black/75` | 1 |
| `bg-blue-50/20` | 1 |
| `bg-blue-50/60` | 1 |
| `bg-blue-500` | 1 |
| `bg-blue-950` | 1 |
| `bg-blue-950/70` | 1 |
| `bg-cyan-50` | 1 |
| `bg-cyan-500` | 1 |
| `bg-emerald-100/90` | 1 |
| `bg-emerald-200` | 1 |
| `bg-emerald-50/20` | 1 |
| `bg-emerald-50/30` | 1 |
| `bg-emerald-50/60` | 1 |
| `bg-emerald-50/80` | 1 |
| `bg-emerald-500/20` | 1 |
| `bg-emerald-950/60` | 1 |
| `bg-gray-100/90` | 1 |
| `bg-gray-50/50` | 1 |
| `bg-gray-50/70` | 1 |
| `bg-green-50` | 1 |
| `bg-green-500` | 1 |
| `bg-orange-100` | 1 |
| `bg-purple-400` | 1 |
| `bg-purple-50/70` | 1 |
| `bg-purple-600` | 1 |
| `bg-rose-50/30` | 1 |
| `bg-rose-50/50` | 1 |
| `bg-rose-50/60` | 1 |
| `bg-rose-50/80` | 1 |
| `bg-rose-800/80` | 1 |
| `bg-sky-50/80` | 1 |
| `bg-sky-500` | 1 |
| `bg-slate-900/40` | 1 |
| `bg-stone-200/50` | 1 |
| `bg-stone-200/60` | 1 |
| `bg-stone-50/90` | 1 |
| `bg-stone-500` | 1 |
| `bg-stone-900/95` | 1 |
| `bg-stone-950/80` | 1 |
| `bg-teal-100` | 1 |
| `bg-violet-50` | 1 |
| `bg-violet-500` | 1 |
| `bg-white/15` | 1 |
| `bg-white/25` | 1 |
| `bg-white/90` | 1 |
| `bg-yellow-100` | 1 |
| `border-amber-200/50` | 1 |
| `border-amber-400/10` | 1 |
| `border-amber-400/30` | 1 |
| `border-amber-500/40` | 1 |
| `border-amber-600/60` | 1 |
| `border-blue-700/60` | 1 |
| `border-cyan-200` | 1 |
| `border-emerald-500/30` | 1 |
| `border-emerald-500/40` | 1 |
| `border-indigo-300` | 1 |
| `border-orange-300` | 1 |
| `border-purple-300` | 1 |
| `border-rose-200/70` | 1 |
| `border-rose-200/80` | 1 |
| `border-rose-200/90` | 1 |
| `border-sky-100` | 1 |
| `border-sky-300` | 1 |
| `border-stone-100/70` | 1 |
| `border-stone-100/80` | 1 |
| `border-teal-300` | 1 |
| `border-teal-600` | 1 |
| `border-violet-200` | 1 |
| `border-white/20` | 1 |
| `border-white/5` | 1 |
| `border-yellow-300` | 1 |
| `divide-stone-300` | 1 |
| `divide-stone-50` | 1 |
| `focus-visible:outline-amber-600` | 1 |
| `focus-within:bg-white` | 1 |
| `focus-within:border-amber-400` | 1 |
| `focus:border-blue-500` | 1 |
| `focus:border-emerald-500` | 1 |
| `focus:ring-amber-100` | 1 |
| `focus:ring-blue-500` | 1 |
| `focus:ring-emerald-400` | 1 |
| `from-amber-50/70` | 1 |
| `from-emerald-600` | 1 |
| `group-hover:bg-amber-100/60` | 1 |
| `group-hover:bg-amber-200` | 1 |
| `group-hover:bg-amber-600` | 1 |
| `group-hover:bg-emerald-600` | 1 |
| `group-hover:border-emerald-600` | 1 |
| `group-hover:text-amber-800` | 1 |
| `group-hover:text-amber-900` | 1 |
| `group-hover:text-blue-600` | 1 |
| `group-hover:text-stone-400` | 1 |
| `group-hover:text-stone-700` | 1 |
| `group-hover:text-stone-900` | 1 |
| `group-hover:text-white` | 1 |
| `hover:bg-amber-100/50` | 1 |
| `hover:bg-amber-100/90` | 1 |
| `hover:bg-amber-300` | 1 |
| `hover:bg-amber-400/20` | 1 |
| `hover:bg-amber-50/30` | 1 |
| `hover:bg-amber-50/50` | 1 |
| `hover:bg-amber-50/60` | 1 |
| `hover:bg-black` | 1 |
| `hover:bg-black/30` | 1 |
| `hover:bg-blue-900/80` | 1 |
| `hover:bg-emerald-100/60` | 1 |
| `hover:bg-emerald-600` | 1 |
| `hover:bg-indigo-100` | 1 |
| `hover:bg-indigo-700` | 1 |
| `hover:bg-red-100` | 1 |
| `hover:bg-rose-100/70` | 1 |
| `hover:bg-slate-700` | 1 |
| `hover:bg-stone-100/50` | 1 |
| `hover:bg-stone-200/60` | 1 |
| `hover:bg-stone-200/70` | 1 |
| `hover:bg-stone-50/40` | 1 |
| `hover:bg-stone-50/60` | 1 |
| `hover:bg-stone-50/70` | 1 |
| `hover:bg-stone-700` | 1 |
| `hover:bg-white/10` | 1 |
| `hover:bg-white/25` | 1 |
| `hover:border-amber-300/80` | 1 |
| `hover:border-blue-400` | 1 |
| `hover:border-blue-500` | 1 |
| `hover:border-emerald-200` | 1 |
| `hover:border-emerald-300` | 1 |
| `hover:border-red-100` | 1 |
| `hover:border-rose-200` | 1 |
| `hover:ring-emerald-400` | 1 |
| `hover:text-blue-600` | 1 |
| `hover:text-red-400` | 1 |
| `hover:text-red-700` | 1 |
| `hover:text-rose-400` | 1 |
| `hover:text-rose-800` | 1 |
| `hover:text-stone-300` | 1 |
| `hover:text-stone-500` | 1 |
| `hover:text-stone-950` | 1 |
| `marker:text-gray-900` | 1 |
| `placeholder:text-rose-300` | 1 |
| `placeholder:text-stone-300` | 1 |
| `print:bg-white` | 1 |
| `ring-amber-400/60` | 1 |
| `ring-emerald-500` | 1 |
| `ring-indigo-400` | 1 |
| `ring-rose-200` | 1 |
| `ring-rose-500` | 1 |
| `shadow-amber-400/5` | 1 |
| `shadow-amber-500/25` | 1 |
| `shadow-amber-500/30` | 1 |
| `shadow-emerald-500/20` | 1 |
| `shadow-emerald-500/40` | 1 |
| `shadow-emerald-600/25` | 1 |
| `shadow-rose-600/25` | 1 |
| `shadow-stone-900/5` | 1 |
| `shadow-teal-600/10` | 1 |
| `text-amber-200` | 1 |
| `text-amber-200/90` | 1 |
| `text-amber-500/80` | 1 |
| `text-amber-700/80` | 1 |
| `text-amber-950/80` | 1 |
| `text-blue-200` | 1 |
| `text-blue-300` | 1 |
| `text-blue-900` | 1 |
| `text-cyan-700` | 1 |
| `text-emerald-200` | 1 |
| `text-emerald-700/80` | 1 |
| `text-emerald-800/80` | 1 |
| `text-green-700` | 1 |
| `text-indigo-900` | 1 |
| `text-orange-900` | 1 |
| `text-purple-900` | 1 |
| `text-red-950` | 1 |
| `text-rose-100` | 1 |
| `text-rose-400` | 1 |
| `text-rose-700/80` | 1 |
| `text-sky-500` | 1 |
| `text-sky-900` | 1 |
| `text-slate-300` | 1 |
| `text-slate-800` | 1 |
| `text-teal-800` | 1 |
| `text-teal-900` | 1 |
| `text-violet-700` | 1 |
| `text-white/40` | 1 |
| `text-yellow-900` | 1 |
| `to-emerald-700` | 1 |
| `to-stone-900` | 1 |
