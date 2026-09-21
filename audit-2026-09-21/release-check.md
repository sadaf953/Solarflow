# Demo release check — 21 September 2026

## Inventory

The earlier migration warning is no longer reproducible. No hosted schema was changed. A fresh anonymous Admin session on the approved demo project successfully called sync_inventory_catalog and read 54 materials and 49 stock movements. The returning browser visitor also loaded stock, movements and daily reports successfully.

Local fixes: distinguish missing schema from access errors and other failures; show unavailable totals instead of zero when loading fails; hide stale stock actions/pagination on failure; preserve the actual error in the developer console. Fixed inconsistent JSON import attributes that caused the build warning.

## Verification completed

- All eight roles successfully entered through the demo backend. Admin/Office read 250 leads; CPO/Manager read 100. Other role-specific UI filtering was not comprehensively audited; backend entry success is not an authorization audit.
- Created, reread and removed one clearly labelled test lead in a fresh anonymous sandbox. This was an API persistence check, not a full UI lead-save check.
- Existing local quotation browser suite passed: mobile list, new action disclosure, PDF download/issued status, saved draft reopening, offline recovery, editor steps, desktop preview, dealer layout at 320px, and vendor/document-role quotation restrictions. This uses a local fixture with external requests blocked, not hosted quotation persistence.
- Screenshot inspected: output/quotation-qa/mobile-list.png. PDF and other captures are in output/quotation-qa/.
- Build passed without the previous JSON import warning; isolation checks passed.
- 48 unit/integration tests passed serially. A parallel run hit the pre-existing 20ms performance threshold (61.93ms); serial rerun passed. Treat that timing test as sensitive to machine load.

## Still required before publication

- **Deployment broken — user-reported, deferred at user request:** `npm run deploy` does not work and the deployed site is not working. This workspace currently has no deploy script, and the isolation guard rejects deploy/predeploy scripts. Diagnose the deployed site and configure a supported, separate advanced-demo target before adding a narrowly allowed deploy command. Nothing has been committed, pushed or published by this work.
- **Live enquiry persistence verified:** the public form helper received an acknowledged insert; an exact-ID read confirmed the Advanced request was stored. This does not verify email notifications or staff follow-up. Test ID: `a99549ea-28a8-4de5-a647-d8011a25074f`, labelled QA / do not contact with fictional contact details. Visitor deletion affected zero rows; the owner can delete this one record.
- **Enquiry privacy fix applied by user and read denial verified on 22 September:** setup script 16 previously granted SELECT to every authenticated visitor (including anonymous sign-ins). A fresh anonymous session could read the QA record created before it signed in. Updated script 16 removes the broad SELECT policy, revokes visitor SELECT/UPDATE/DELETE and retains INSERT. A fresh demo visitor now receives permission denial 42501 when reading the known test enquiry. No account-wide connector or hosted schema mutation was used.
- The core workflow checks below now include browser delivery dispatch, hosted quotation save, delivery/stock transactions, a PDF upload, vendor installation, document return and subsidy completion. They do not establish exhaustive coverage of every portal; PNG/JPEG upload and bulk/per-project transaction checks are recorded below, with their specific limits.
- Focused accessibility review completed below; whole-app screen-reader and WCAG conformance testing remains outside the verified scope.

## Follow-up — 22 September 2026

- Hosted enquiry privacy correction confirmed after user applied it: a fresh anonymous visitor querying only the known QA ID receives PostgreSQL permission denial 42501. No other enquiry contents were requested.
- All eight role landing screens loaded through browser role switching at 1280px and 390px, with no uncaught runtime errors, visible error alerts, or document-level horizontal overflow. Evidence: `output/role-qa/results.json` and 16 screenshots. This is a landing-screen smoke check, not exhaustive operational workflow coverage.
- Inspected Dealer, Vendor and Document coordinator mobile screenshots. Vendor/document banners used the undefined Tailwind color `stone-850`, leaving a pale gradient behind white text. Replaced its endpoint with supported `stone-800`.
- Deployment remains deferred at the user's request.

## Delivery/stock verification — 22 September 2026

Fresh anonymous demo-only sandbox, with clearly labelled QA projects and batches:
- Delivered deducts exactly the saved BOM quantity and records one customer-linked stock movement.
- Repeating Delivered, including after changing back to In Transit, does not deduct again.
- Insufficient stock and missing BOM reject the transaction: batch status, customer status, issue marker and stock remain unchanged.
- Evidence: `output/delivery-qa.json`. These were live API transaction tests, not a full browser dispatch workflow. QA records remain only in the fresh test visitor's sandbox; the existing user's projects and stock were untouched.

Fixed a frontend consistency bug: a rejected atomic delivery RPC previously fell back to separate writes, which could save the batch before stock validation rejected its projects. Status updates now require an acknowledged atomic success; errors preserve the previous UI status. Cached batch status is updated only after success, and the selector is disabled while saving. No hosted schema change was required.

Validation: build, isolation checks/tests, 12 delivery/inventory tests and the live scenarios above passed. Deployment remains deferred.

## Batch create/edit/delete correction — 22 September

Hosted checks confirmed save_delivery_batch_atomic and delete_delivery_batch_atomic are missing (PGRST202). Prepared both functions in the existing SQL 07 setup script and removed unsafe frontend fallback writes. Batch/cache updates occur after acknowledged transaction success; delete now uses the shared confirmation popup. The frontend intentionally blocks save/delete until updated SQL 07 is applied.

Local PostgreSQL tests pass for create/link, edit/unlink, stale input rollback, conflicting assignments, missing projects, cross-visitor denial, disband preserving customers and delivered-batch protection. Tests are saved in tests/delivery/batch-sql.mjs. Build, isolation and five delivery unit tests pass. Hosted SQL was not changed by the agent.

## Delivery read-failure handling — 22 September

Removed the unscoped legacy delivery-batch browser cache from this screen. Failed reads now show a retry alert, hide batch actions and display unavailable totals instead of silently substituting stale trips or claiming there are no batches. Creation is disabled until data loads. Concurrent refresh responses use a request sequence so an older response cannot overwrite newer data. Build, isolation tests and six delivery tests passed. SQL 07 remains pending user application; this change does not require SQL.

Browser verification passed in a fresh demo session: simulated a 503 for batch reads, confirmed the retry message and disabled Create Delivery Batch, confirmed no false empty-list message, then restored responses and retried successfully. No batches were mutated.

## Live handoff checks — 22 September

After the user applied SQL 07, live calls to both batch functions succeeded: create linked a QA customer and disband cleared the batch link while preserving the customer. The earlier missing-function blocker is resolved.

Browser checks against the approved demo backend passed with fictional QA data in fresh anonymous sessions:

- Vendor: saved Installed with an installation date; persisted status was Installed and stage advanced to GEO TAG PHOTO.
- Document coordinator: uploaded a generated QA PDF, downloaded it from storage with matching size, then confirmed Send to Document Making. The request left the queue, stamp_sent persisted as true and the existing first-party details were preserved.
- Admin: changed the subsidy tag from Approved to Received; both the stored tag and its history recorded Received. Evidence for this final check and batch verification: `output/handoff-qa/result.json`.

The initial browser script stopped at the subsidy search because it attempted to fill the field before focusing it. Focusing before filling resolved the test interaction; the subsidy check then passed separately. Earlier failure captures in that output directory describe that test-script issue, not an unresolved application failure.

No application fix was needed for these handoffs. QA records/documents remain in the fresh test visitors' sandboxes. These checks did not exercise every upload type, the complete preceding subsidy process, or production deployment. Deployment remains deferred.

## Hosted quotation persistence — 22 September

Passed in the local UI connected to the approved demo backend, using a fresh anonymous Admin session and fictional contact details:

- Created a quotation through the editor and saved its draft; a separate API read confirmed the customer name and address.
- Reloaded the page and verified the saved address in the editor.
- Changed the address and saved again, returned to the quotation list, then reopened Edit and verified the updated address in both UI and database.

Evidence: `output/quotation-live-qa/result.json` and `output/quotation-live-qa/saved-draft.png`. An initial test selector could not find the populated textarea after reload; the final run used its visible field label and passed. No application changes were required. QA drafts remain in their fresh test visitors' sandboxes. This verifies hosted draft persistence, not live PDF issuance, sharing or lead conversion. Deployment remains deferred.

## Browser delivery dispatch — 22 September

Passed against the approved demo backend using a fresh anonymous Admin sandbox. Test setup created one fictional customer with a saved two-unit BOM; dispatch actions were performed through the actual browser UI:

- Created a named batch, selected a seeded demo driver and the QA customer, and clicked Save & Assign Batch. Database reads confirmed both the batch membership and the customer's batch link. Creating the batch did not deduct stock.
- Selected Delivered. The customer status and BOM issue marker persisted, and inventory decreased by exactly two units.
- Selected In Transit and then Delivered again. Inventory did not decrease again; exactly one customer-linked movement existed, for two units.
- Reloaded the page and confirmed the batch still displayed Delivered.

Evidence: `output/dispatch-browser-qa/result.json` and `output/dispatch-browser-qa/delivered.png`. No application fix was required. The fictional project, delivered batch and stock movement remain only in this fresh test visitor's sandbox. This covers the batch status selector; it does not separately verify every per-project or bulk action. Broader accessibility checks and deferred deployment remain outstanding.

## Accessibility fixes — 22 September

Completed a focused browser accessibility pass and fixed missing Add Lead/delivery field names, delivery modal focus, role-picker focus return, shared popup Tab wrapping and mobile navigation focus containment. Added visible keyboard outlines, improved Add Lead/editor text contrast and fixed mobile delivery filter overflow. Keyboard verification passed in the in-app browser; build/isolation checks passed. See [the illustrated accessibility report](accessibility-check.md) for five reviewed steps, screenshots and limits. No deployment was performed.

## Quotation issuance and conversion — 22 September

Created fictional QA quotation 5655 (`ed903cde-f206-4ec8-b5d9-74374168fd81`) in the in-app demo session. The download action displayed Download complete and the quotation persisted as Issued. Browser download-event capture timed out; actual downloaded bytes were not inspected in this run, so this establishes app generation/issuance behavior rather than file-level validation. Earlier local fixture PDF download checks remain separate evidence.

Converted it through the real Add Lead UI. The resulting lead retained customer name, synthetic phone 0000000085, address, six 580 W modules and 3.48 kWp capacity. After reload, the quotation displayed Converted and Open Lead reopened the saved customer. Retry/concurrency idempotence is covered by the repository tests, not by a live concurrent conversion test. The clearly named QA quotation and lead remain in the browser's demo sandbox.

Found and fixed an actual UI obstruction: the floating Team Chat launcher covered Preview PDF at the quotation editor footer. Its position now moves above the sticky actions while that editor is present. Verified normal pointer clicks reach Preview PDF on desktop and at 390px; mobile bounding boxes did not overlap. No chat messages were sent.

Validation: production build with isolation guard, all 20 quotation model/repository tests, and whitespace checks passed. Evidence: `output/quotation-conversion-qa/results.json`, saved UI snapshots and preview screenshot. Deployment remains deferred.

## Remaining uploads and delivery actions — 22 September

Fixed two remaining unsafe delivery paths. Mark All Delivered now requires the same acknowledged atomic RPC as the batch selector, with no direct-write fallback. Moving a single project to Pending now uses the existing batch save transaction to unlink it and update membership together; removing the last project uses the disband transaction after a UI confirmation. These transactions retain existing safeguards against stale membership or issued stock. Controls are disabled during saves. Individual In Transit/Delivered updates use one project UPDATE and its transactional stock trigger. No new hosted SQL is required.

Live API checks in a fresh anonymous sandbox passed: unlink one of two projects, unlink/disband the last one while keeping customers, bulk insufficient-stock rollback across every project and stock, successful bulk delivery issuing two BOMs once, and repeated individual delivery without duplicate stock deduction. Evidence: `output/remaining-delivery-qa.json`. These remaining-action checks exercised the same transaction helpers and trigger used by the UI; they were not a full click-through of every bulk button. Earlier browser dispatch checks remain separate evidence.

Found and fixed incorrect image crop ratios: equal crop percentages on a 640×480 image produced 512×384 for the Square preset. Geometry now accounts for source dimensions and rotation; resizing maintains the selected pixel ratio and image bounds. Export crops the same source rectangle shown by the overlay, then rotates it. Unit checks cover landscape/portrait images, all quarter-turn rotations, all ratio presets and both resize corners.

Real browser upload checks passed with synthetic test images on QA image upload (phone 0000000083): PNG Square crop now produces 432×432; JPEG Upload As-Is keeps 640×480. Saved the lead, reloaded, reopened File Storage and loaded both images from storage with those dimensions. Cancelling an Extra Documents image upload left it Not Uploaded. A development hot-reload context error interrupted an earlier unsaved test form; a full reload recovered and the final workflow passed. Existing PDF upload checks cover the third supported document type. Evidence: `output/upload-qa/results.json`, saved UI snapshot and JPEG preview screenshot. QA files remain in the demo sandbox.

Validation passed: isolation guard, 2 isolation tests, 9 delivery/crop tests, production build and whitespace check. Deployment remains deferred. Broader device/screen-reader coverage, malformed/maximum-size files and downloaded quotation PDF byte inspection remain validation limits, not claims of complete certification.
