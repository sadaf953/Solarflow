# SolarFlow advanced demo: customer audit

Reviewed 21 September 2026 on the isolated local demo, port 5186, through anonymous Admin entry. Perspective: a solar-business owner evaluating the advanced CRM for purchase. Login succeeded. The product has useful depth, but the first experience requires too much learning before demonstrating a clear result.

## Fix list, in priority order

| Priority | Fix | Evidence and acceptance target |
|---|---|---|
| P0 — before sharing | **Deployment broken (user confirmed): fix `npm run deploy` and the deployed site. Deferred at user request.** Establish a separate demo-only publishing target and supported deployment path. | `package.json` has no deploy script. `scripts/check-isolation.mjs:38` explicitly rejects deploy/predeploy scripts and other checks reject hosting bindings. Adding a script alone fails. Approve a new demo host, narrowly allow that target, preserve original-project isolation, then run isolation checks/tests and build. Never restore the original deployment. |
| P0 — before sharing | Stop reporting successful enquiries when delivery fails. | Code inspection: `CustomizationEnquiryForm.jsx` calls `setSubmitted(true)` after database errors and in its catch branch; local storage failures are swallowed too. The resulting message promises contact. Only show “Request received” after confirmed remote persistence; otherwise show retry or explicitly label a local-only draft. This was not tested by submitting an enquiry. |
| P1 — first impression | Give the homepage one obvious starting action: “Try the Advanced Demo.” | Step 1 currently leads with a Basic-model exit link, abstract headline, login choices and an Admin Command Center. Use a concrete promise such as “Follow a solar project from enquiry to installation and subsidy,” plus “No signup. Sample data included.” Keep existing-account login secondary. |
| P1 — first impression | Move company configuration behind “Customize this demo.” | Step 7 contains three presets and four questions before secondary portals. Pick a sensible advanced-demo default; visitors should enter without needing to understand the company-role model or storage setup. |
| P1 — learning | Replace the introductory 44-step tour with a 5–7-step quick tour. | Step 3 shows “1 of 44.” Demonstrate one coherent example: quotation → lead → materials → installation → subsidy → overview. Retain the detailed tour as optional training, with chapters. |
| P1 — learning | Make each tour step point to one visible action and outcome. | Step 4 explains two lead-entry methods at once; the bottom overlay covers card actions. Highlight a specific example and control, use short instructions, avoid obscuring the target and allow easy skip/resume. |
| P1 — navigation | Group the sidebar into a few understandable areas. | Steps 2–5 expose tools, tags, 16 project-stage entries and system controls in one long sidebar. Start with Overview, Sales, Projects, Inventory and Team; reveal stage filters within Projects. Preserve detailed functionality behind these groups. |
| P1 — layout | Fix desktop overflow before sending customer links. | Step 5 at the captured ~1272px viewport clips the third lead column, month filter and right header controls, with horizontal overflow. Make the grid adapt and the header wrap/collapse; verify laptop, tablet and mobile widths. |
| P1 — first action | Reduce Add Lead to name, phone and an obvious save action. | Step 6 says only two fields are required but exposes a long form including addresses, partner selection, equipment and document/payment sections. Put optional sections behind expandable groups. Rename “Fill Test Data” to “Use sample customer.” |
| P1 — positioning | Keep the enquiry aligned with the Advanced demo. | Step 8 preselects Basic Model; its storage default is Yes while the demo setup shown in step 7 is No. Default to Advanced and carry explicit configuration choices through, or remove these decisions from the initial enquiry. |
| P2 — navigation | Switch roles without sending visitors back through the landing page. | Step 7 was reached using Switch role from the app. Use a compact role picker with role descriptions, preserve demo context and provide a separate “Back to demo home” action. Actual entry into other roles was not tested. |
| P2 — value | Add a “Start here” task to the dashboard. | Step 2 presents counts and stage distribution but no guided business outcome. Offer “Open the sample project” and three short things to try. Keep metrics, but explain what each helps the owner decide. |
| P2 — comprehension | Use consistent, customer-facing vocabulary. | Replace “CLICKLY CLICK CLACK,” “Stamp Guy,” “Operational Density,” and “Advance Model” with clear terms; consistently distinguish Dealer and Channel Partner. Verify “all 50 customer stages”: the Admin navigation shows 16 stage entries, so define whether 50 means checklist tasks or another unit. |
| P2 — scanability | Give quotation cards one primary next action. | Step 4 displays Edit, Preview, Download, Share, Convert to Lead and Mark Lost on each card, plus global and quotation searches. Promote the appropriate next action and group secondary actions; clarify which search affects which records. |
| P2 — accessibility | Repair labels and improve small, pale text. | In steps 2, 5 and 6, several fields and icon buttons have no useful name in the captured accessibility tree; helper text and section labels are pale/small. Associate labels with inputs, name icon controls, measure contrast, and test keyboard focus, modal containment and zoom. These are observed risks, not a complete WCAG assessment. |

## Recommended first-time journey

Advanced Demo homepage → Try demo → short welcome with one sample project → six-step outcome-based tour → Explore freely → Request setup.

Company presets, all roles and detailed training remain available as secondary options. The advanced features are a strength; the demo needs a clearer introduction to them.

## Captured journey

1. **Homepage — overloaded.** Strong primary card and consistent branding, but Basic-model promotion and multiple entry/configuration choices compete with the advanced-demo purpose.

![Step 1: homepage](/Users/mahvishsadafv2/Desktop/solarflow_demo/audit-2026-09-21/01-home.png)

2. **Anonymous Admin entry and dashboard — functional, weak orientation.** Login succeeded and populated records appeared. The dashboard establishes breadth but does not tell a new evaluator what to try first. Sidebar and small supporting text need simplification.

![Step 2: dashboard](/Users/mahvishsadafv2/Desktop/solarflow_demo/audit-2026-09-21/02-dashboard.png)

3. **Guided tour opening — functional, too long for introduction.** Clearly offers navigation and close/minimize controls, but presents 44 steps and a paragraph of operating instructions immediately.

![Step 3: tour introduction](/Users/mahvishsadafv2/Desktop/solarflow_demo/audit-2026-09-21/03-tour.png)

4. **Quotation tour step — functional, crowded.** Loaded 50 quotations and useful proposal actions. Guide obscures the lower card controls and asks the visitor to understand alternate entry methods before performing one task.

![Step 4: quotation records](/Users/mahvishsadafv2/Desktop/solarflow_demo/audit-2026-09-21/04-quotations.png)

5. **Leads list — layout fix needed.** Cards provide useful project summaries, but the rightmost content and header controls extend beyond the viewport. Multiple search/filter controls compete for horizontal space.

![Step 5: leads](/Users/mahvishsadafv2/Desktop/solarflow_demo/audit-2026-09-21/05-leads.png)

6. **Add Lead — accessible entry point, excessive initial form.** Required fields are explained and the footer actions stay visible. Optional details make the task look longer than it needs to be; labels and the unnamed close control need accessibility verification. Opened and cancelled without saving.

![Step 6: add lead](/Users/mahvishsadafv2/Desktop/solarflow_demo/audit-2026-09-21/06-add-lead.png)

7. **Switch role and company setup — disruptive.** Switch role returns to the whole landing page; the setup section offers presets and toggles before additional portals. The configuration is useful after orientation, but burdens the initial evaluation.

![Step 7: role setup](/Users/mahvishsadafv2/Desktop/solarflow_demo/audit-2026-09-21/07-role-setup.png)

8. **Setup enquiry — inconsistent defaults; delivery risk in code.** Basic selected on the advanced demo, storage preference differs from demo configuration. The promise of follow-up is unsafe when persistence errors are treated as success. No enquiry was submitted.

![Step 8: enquiry](/Users/mahvishsadafv2/Desktop/solarflow_demo/audit-2026-09-21/08-enquiry.png)

## Scope and limits

All screenshots were captured and inspected in this audit. This was a first-visit desktop evaluation, not an exhaustive test of all 44 tour steps, eight roles, project mutations, PDF downloads, mobile layouts or accessibility compliance. Anonymous login and populated Admin navigation were verified; lead saving, enquiry delivery and end-to-end operational workflows were not. No original backend, external Basic-model site, account-wide connector or deployment target was opened. No application or integration code was changed. The local server passed its startup isolation check; no integration changes required additional tests.
