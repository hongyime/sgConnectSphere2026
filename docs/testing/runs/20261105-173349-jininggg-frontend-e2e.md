---
date: 2026-11-05T17:33:49+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "051126"
database: real
commit: 1fe793e
---

Human browser session on **production**, https://sgconnectsphere.vercel.app,
5 November 2026, starting 17:33 SGT; booking trigger at 19:49 SGT.
`environment: local` denotes the tester's local browser (the schema permits only
local/ci), NOT a local application/database. The application used production
Supabase. The commit field is the evidence-preparation checkout derived from
Git; **the exact deployed source SHA has not been verified** and must be supplied
by the deploy owner. Do not attribute this run to that checkout's application
build. Screenshots were taken and supplied by Ji Ning, not by the agent.

Synthetic event: E11 notification acceptance test; 15 January 2027, 09:00-10:00
SGT, attendance 10. New event owned by the tester's real-mailbox Organiser
account; assigned Coordinator reviewed/approved it. Coordinator submitted one
Orchid Hall booking request with purpose E11 notification routing test. No
booking approval or additional trigger is claimed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_05 | In-app and registered-email delivery | FAIL | Under-review notice visible at 17:33; tester reports no matching email after the requested five-minute wait and checking Inbox/Spam. Screenshot proves in-app receipt only; mailbox non-arrival is tester-reported. Delivery/outbox/provider diagnosis pending Bryan. Do not treat earlier 41 sent/done rows as this event's evidence. |
| TC_E11S01_02 | Scoped supplementary assigned-Venue-Staff routing observation | PASS | Aaron's assigned Venue Staff inbox changed from empty to one booking-request decision notice at 19:49 after the Coordinator requested Orchid Hall. This is a booking-request routing slice, NOT full execution of canonical TC_02's effective date/time/venue-change matrix. |
| TC_E11S01_11 | Scoped actor-exclusion observation | PASS | Coordinator's before/after inbox contains the same existing 17:33 assignment notice, with no booking-request decision notice after their own action and refresh. Does not claim all duplicate-recipient paths were manually executed. |
| TC_E11S01_03 | Unaffected-recipient baseline comparison | SKIP | Technical Support inbox was empty after the action, but no pre-action baseline was captured; retain post-action observation only, not full PASS. No unassigned Venue Staff account was available. Independent reviewer must assess existing automated evidence or specify a further check. |

## Screenshots

- [TC_E11S01_02-assigned-after](evidence/20261105-173349-jininggg-frontend-e2e/TC_E11S01_02-assigned-after.png)
- [TC_E11S01_02-assigned-before](evidence/20261105-173349-jininggg-frontend-e2e/TC_E11S01_02-assigned-before.png)
- [TC_E11S01_05-in-app](evidence/20261105-173349-jininggg-frontend-e2e/TC_E11S01_05-in-app.png)
- [TC_E11S01_11-actor-after](evidence/20261105-173349-jininggg-frontend-e2e/TC_E11S01_11-actor-after.png)
- [TC_E11S01_11-actor-before](evidence/20261105-173349-jininggg-frontend-e2e/TC_E11S01_11-actor-before.png)

## Open gates

Missing-mailbox diagnosis/receipt, exact deployed source identification,
independent human evidence review and PO/delegate acceptance remain open.
No Jira Done transition or claim of complete story acceptance is made.
A later result belongs in a new immutable T-65 record; do not overwrite this FAIL.

Supplementary post-only SKIP observation image retained alongside the other
files: `evidence/20261105-173349-jininggg-frontend-e2e/TC_E11S01_03-unrelated-tech-after.png`.
This is not a PASS/FAIL screenshot link.
