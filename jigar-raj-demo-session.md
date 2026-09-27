# Jigar Raj demo session — 27 September 2026

Used the local SolarFlow demo at http://127.0.0.1:5186 through its browser UI for approximately 10 minutes, entering the name Jigar Raj (Admin demo role). Exports were left for later. No application code was changed.

## Saved demo activity

- Created **Jigar Raj Demo Home**, synthetic phone **0000000847**, email **jigar.demo@example.invalid**, village **Demo Ahmedabad**. Selected WAAREE, 580 W, six modules; Auto calculated **3.48 kWp**. Selected Cash.
- Checked empty lead submission: customer-name and phone validation appeared.
- Saved a follow-up stage remark and moved the home project from Leads to Registration. Confirmed the project in Registration and its history attributed to Jigar Raj.
- Created **Quote-6259** for **Jigar Raj Demo Quote**, synthetic phone **0000000848**, six 580 W modules, WAAREE, Goodwe inverter. Three base prices: ₹185,000 / ₹195,000 / ₹205,000. Applied ₹5,000 discount and ₹78,000 subsidy to all options. Saved and reopened the draft, confirming its system, prices, note and salesperson name.
- Converted Quote-6259 to a lead. Selected Cash and attached the built-in **light_bill_demo_sample.svg** through Upload As-Is. Confirmed Uploaded status and saved the lead.
- Reordered stops in DEMO-TRUCK-003, then restored the original order (Demo Customer 39, Demo Customer 21, Demo Customer 6). Viewed the material summary; it listed 18 panels split 6 / 6 / 6. Both reorder actions were attributed to Jigar Raj in Activity Log.
- Tried EMI presets, inclusive GST calculation and savings inputs. Values responded to edits. This was UI testing, not validation of tax rules or estimate assumptions.
- Browsed Operations and the Drivers directory and completed the six-step introduction tour.

## Findings to revisit

1. **Inventory stock receipt is blocked.** Inventory → search Solar Panel → Receive → quantity 6 → reference `DEMO-JIGAR-RAJ: fictional receipt for user testing` → Save quantity produced `column "demo_session_id" does not exist`. The dialog remained open and stock remained 120 Nos. Cancelled the failed receipt.
2. **Inventory balances disagree.** Stock displayed Solar Panel (SF-MAT-001) at 120 Nos, while Daily Report for 2026-09-27 showed opening/closing 9,237 with incoming/outgoing zero. This needs investigation; the session did not determine why.
3. **Loading feedback can be misleading.** Opening a global-search result briefly showed blank project details and the old stage before loading the complete record. Activity filtering briefly retained previous entries; after Refresh completed, Jigar Raj + Stage Transitions correctly showed the one stage-change entry. Neither observation establishes data loss.
4. **History contains unchanged-value edits.** Saving the project logged fields such as MODULE WP 580 → 580 and NO OF MODULES 6 → 6, adding noise to meaningful changes.

The two named demo leads and Quote-6259 remain available for review. The failed inventory receipt was not recorded, and delivery stop order was restored.
