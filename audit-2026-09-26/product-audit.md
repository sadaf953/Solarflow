# SolarFlow product audit — 26 September 2026

## Audit scope

Combined UX, visual-design and accessibility review of the anonymous demo entry, dashboard, inventory, stock movements, toolbox, delivery batches, installation tracking, project record, leads, role switching, mobile inventory and quotations.

User goal: help a solar company move a project from enquiry to quotation, materials, delivery, installation and subsidy with less manual follow-up than a general ERP.

## Overall verdict

SolarFlow has a credible solar-specific data model and several useful operational features. Its strongest advantage is the connection between quotations, project stages, BOM materials, delivery, installation evidence and subsidy. The product currently presents those capabilities as separate screens and database stages. It needs a consistent visual system, role-based work queues and automation around the next action before it will feel easier than a configured Odoo workflow.

The highest-value direction is not adding more unrelated modules. It is turning the existing end-to-end solar workflow into an action system: show what is blocked, assign the next task, automate routine follow-up, and make stock readiness visible per project.

## Captured flow

1. **Anonymous demo entry — Healthy with friction.** Strong headline and clear solar positioning. The name gate delays the product preview and the page contains several competing routes below the primary action. Evidence: `screenshots/01-current-home.png`.
2. **Mobile dashboard — Needs work.** The guided-tour card dominates the first screen while operational priorities are below the fold. Icon-only header controls and the `+` button are hard to interpret without labels. Evidence: `screenshots/02-role-picker.png`.
3. **Desktop dashboard — Needs work.** Counts and pipeline distribution are visible, but the dashboard describes the database rather than telling the user what requires action today. Large totals do not expose overdue work, blockers, owners or ageing. Evidence: `screenshots/03-dashboard-desktop.png`.
4. **Inventory stock list — Functional but shallow.** On-hand quantities, reorder levels and manual receive/issue actions are useful. Missing: reserved quantity, available-to-promise, incoming stock, shortage, warehouse/location, supplier, cost, serial/batch tracking and project demand. Evidence: `screenshots/04-inventory.png`.
5. **Stock movements — Useful foundation.** A shared ledger with reference, actor and timestamp supports traceability. It needs movement types, project/vendor links, filters, adjustment reasons and a readable item drill-down. Evidence: `screenshots/05-inventory-movements.png`.
6. **Solar Toolbox — Valuable but disconnected.** The calculators and document generators are relevant to solar teams. They appear as eight unrelated tabs instead of actions inside a customer or quotation workflow, which makes them feel bolted on. Evidence: `screenshots/06-toolbox.png`.
7. **Delivery batches — Strong concept, weak decision support.** Clubbing projects into dispatch trips and printing a gate pass is specific and useful. The captured screen shows eight batches, two in transit and 15 clubbed sites while visible batch cards show zero projects and zero capacity; that inconsistency reduces trust. Evidence: `screenshots/07-delivery-batches.png`.
8. **Installation tracking — Scannable but passive.** Status totals and project cards are easy to scan. The list does not surface appointment date, technician workload, overdue status, missing prerequisite or the next action. Evidence: `screenshots/08-installation-tracking.png`.
9. **Project record — Powerful but difficult to navigate.** The record covers the full solar journey and is the product's strongest differentiator. The long horizontal stage strip, separate Checklist/Documents controls, stage-specific forms and generic saved bar create a heavy modal. Users must know which tab comes next; the UI does not explain blockers or advance them to the next incomplete task. Evidence: `screenshots/09-customer-detail.png`.
10. **Lead list — Needs data and hierarchy cleanup.** Cards contain useful solar attributes, but repeated names and phone numbers, status labels such as `INPROCESS`, and near-identical cards make the demo look duplicated. Primary next actions are hidden behind opening or editing a card. Evidence: `screenshots/10-leads.png`.
11. **Role switching — Healthy foundation.** Eight perspectives and plain descriptions are a good base for role-specific work. The product currently changes access/context more than it changes the daily task experience. Evidence: `screenshots/11-role-picker.png`.
12. **Mobile inventory — Needs work.** The page reflows without horizontal overflow, but large hero content, wrapping metric labels, anonymous icon buttons and the floating Team Chat cover useful space. The table and stock actions begin below the first screen. Evidence: `screenshots/12-inventory-mobile.png`.
13. **Quotation records — Strong feature, excessive volume.** Search, status filters, preview, editing and lead conversion are useful. Showing 3,754 demo quotations creates noise and weakens credibility; cards have large empty areas and separate `More actions` menus slow common tasks. Evidence: `screenshots/13-quotation-maker.png`.

## Strengths to protect

- One solar project can carry sales, finance choice, materials, delivery, installation evidence, DISCOM work and subsidy through a single lifecycle.
- Quotations are connected to customer conversion rather than living as isolated PDFs.
- BOM-based stock deduction and delivery batches connect operational data to real work.
- Role switching can become a strong daily-work experience for office, dealer, vendor and document teams.
- Solar calculators, receipts, warranty cards and one-page quotations are meaningful industry tools.

## Structural UX risks

1. **No daily work system.** The dashboard shows totals but does not answer `What should I do now?`, `What is late?`, or `Who owns it?`.
2. **Stage navigation substitutes for automation.** Staff move between many stage screens and tabs manually. The product should create the next task, assign it and notify the right person when a prerequisite is completed.
3. **Information architecture mixes products, stages and tools.** `Quotation Maker`, `Solar Toolbox`, operational trackers and project-stage menus use different organizing ideas in one sidebar.
4. **Demo data damages trust.** Very large counts, repeated records and contradictory delivery metrics make the app feel generated rather than operated.
5. **The visual language changes by feature.** The marketing entry uses bold black/orange typography; the dashboard is pale and spacious; inventory uses a large orange gradient; delivery uses uppercase operational cards; project details use a dark dense modal. These can share a brand while still feeling like one system.
6. **Important actions lack priority.** Search, export, refresh, guided tour, switch role and add lead repeatedly compete in the global header, while task-specific next actions are lower or hidden.

## Accessibility risks visible in screenshots

- Small uppercase labels, pale grey metadata and thin outlined controls may have insufficient contrast at normal zoom.
- Several controls use only icons on mobile, so their purpose is not visually clear.
- Dense card grids and long stage strips increase cognitive load and can make zoomed layouts harder to follow.
- Floating Team Chat overlaps content and controls on mobile and sits close to record actions on desktop.
- Status is often communicated through pale colour pills; text is present, but the light treatment reduces clarity.

Screenshots cannot confirm keyboard order, screen-reader names, error announcements, touch target size, focus visibility throughout every screen, or full WCAG compliance.

## Comparison with Odoo

Odoo is stronger in general-purpose inventory: locations and putaway rules, reservations, replenishment, purchase triggers, barcode operations, lots/serials, stock forecasting and role-based fulfilment to-do lists. Odoo CRM also emphasizes planned next actions, assignment rules, activity queues and deduplication.

SolarFlow should not reproduce all of that. It can win on the solar-specific layer Odoo would need configured: project BOM readiness, installation prerequisites, evidence collection, DISCOM/subsidy progress, vendor hand-offs and customer reminders.

## Recommended product plan

### Phase 1 — Make the current workflow faster

1. Replace the dashboard tour as the main focus with a role-based **Today** queue: overdue, blocked, awaiting customer, ready for dispatch and ready for installation.
2. Add a persistent **Next action** panel to every project: action, owner, due date, blocker and one primary button. Provide `Save and open next assigned project`.
3. Trigger tasks automatically when stages change. Examples: quotation accepted → verify documents; BOM approved → reserve stock; delivery completed → schedule installation; installation evidence complete → begin DISCOM submission.
4. Add reminder rules for missing documents, scheduled installation and subsidy follow-up. Record every reminder in the project timeline and prevent duplicates.
5. Clean the demo dataset to a believable 20–40 projects with distinct names and internally consistent counts.

### Phase 2 — Make inventory operational

1. Show **On hand / Reserved / Available / Incoming / Required** for every material.
2. Add a project material-readiness card: Ready, Partially ready or Blocked, with exact shortages.
3. Reserve materials when a project is approved and release them when a project is cancelled or revised.
4. Add purchase suggestions for shortages, supplier and expected arrival date. Keep accounting outside scope.
5. Add warehouse/location, serial numbers for inverters, module batch/lot tracking, warranty links, returns, damaged stock and cycle counts.
6. Turn delivery planning into a dispatch board with vehicle capacity, route/drop order, material readiness and exception warnings.

### Phase 3 — Unify the product theme

1. Create one design system: typography scale, spacing scale, card styles, button hierarchy, status colours, form controls and modal rules.
2. Reserve orange for the primary action or solar highlight; use green for success and a neutral base for surfaces.
3. Simplify the global header to search, one context-specific primary action, notifications and profile. Move export and guided tour into secondary menus.
4. Replace the stage-heavy sidebar with role-oriented destinations such as Today, Customers, Quotations, Projects, Inventory, Dispatch and Reports.
5. Move toolbox actions into their natural context: EMI and savings in quotations; receipt in payments; warranty card after installation; vendor payment in vendor/project detail.

## What would make SolarFlow preferable

For a customer already using Odoo, SolarFlow becomes compelling when it saves more time on solar execution than the customer would spend configuring Odoo. The clearest promise is:

> SolarFlow tells every team member what to do next, reserves the right materials, follows up automatically and keeps the full installation-to-subsidy journey in one project.

That is more defensible than competing on the number of modules.

## Evidence limits

This audit used the anonymous demo and read-only exploration plus opening existing records. It did not create or edit business records, test every role end-to-end, inspect malformed/error states, test a screen reader, or measure task completion time with actual solar-company staff.
