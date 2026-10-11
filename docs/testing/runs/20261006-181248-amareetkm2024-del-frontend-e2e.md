---
date: 2026-10-06T18:12:48+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 031026
database: real
commit: bfebe7f
pr: 225
---

E07-S06 dry run on the real stack. This is a scripted Playwright run in
Chromium, not the manual E2E, which is SCRUM-147. The stack was:

- the frontend (Vite, 127.0.0.1:5173)
- the local API (`backend/src/dev.ts`, 3001, with
  `ADDITIONAL_ALLOWED_ORIGINS=http://127.0.0.1:5173`)
- a freshly reset and seeded local PostgreSQL 17 database in Docker
  (`connectsphere_dev_stack`, loopback only), never the shared database

The script signed in through the login page as `coord_a` and `tech_a`, using
the accounts in `docs/testing/test-accounts.md`. Screenshots were kept at
1280px and 393px. Afterwards the database had one `tech_support_requests`
row each for EVT-3003 (required, open) and EVT-3001 (not required), and one
"Technical support requested" notification each for `tech_a` and `tech_b`.

6/6 checks passed. An attempt at 18:12:08 failed the TC_E07S06_03 check on
script timing: it read the card before it reloaded, although the database
showed the declaration saved. The script was changed to wait for the text,
the database re-seeded, and this run repeated. Run by Claude for Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S06_01 | Submitting a support request describing the support and times notifies Technical Support Staff and records it against the event | PASS | coord_a on EVT-3003 (planning): blank submit showed "Describe the technical support the event needs."; "1 AV technician for the full event" sent; page showed "2 Technical Support Staff members have been notified." and listed the request; tech_a opened "Technical support requested" and read "EVT-3003 needs technical support: 1 AV technician for the full event" |
| TC_E07S06_02 | Submitting a support request before the venue is confirmed is accepted | N/A | Not exercised in this run; EVT-3001 (approved, no venue) was used for TC_E07S06_03. Covered in the Vitest record for this PR |
| TC_E07S06_03 | Marking an event as needing no technical support creates no request and doesn't block confirmation | PASS | coord_a on EVT-3001 (approved): "Marked as needing no technical support. Nobody has been notified."; card read "This event needs no technical support. Nothing is waiting to be staffed."; database: one support_required = false row, no new notification |
| MULTIPLE | Phone width (393px) | PASS | Card, form and actions stack; page scrollWidth 393, no sideways scroll |
