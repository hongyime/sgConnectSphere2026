---
date: 2026-10-08T18:12:00+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "081026"
database: real
commit: c2ba65a
---

E14-S02 (SCRUM-86) manual end-to-end run, clicked by hand in Microsoft Edge on
the real local stack: the frontend (`npm run dev`, 5173), the local API
(`backend/src/dev.ts`, 3001, started with only `DATABASE_URL`) and a freshly
reset and seeded `connectsphere_dev_stack` (Docker `postgres:17`). Normal and
private windows, signed in through the login page. Database rows checked with
`psql` after each step.

Seed substitutions for the placeholder accounts in `docs/testing/cases/E14.md`:
`coordinator_1` -> `coord_b@connectsphere.com`; "Annual Tech Summit" and
"EVT-B01" -> EVT-2003 (Client B, Under Review, assigned to coord_b);
`organiser_a@clienta.com` as written. Test setup for TC_E14S02_01: as
`organiser_c@clientb.com` the missing venue requirements, accessibility needs,
equipment and layout were filled in through the edit form; the Organiser form
has no registration setup field, so `registration_setup` was set on EVT-2003
directly in the local database so the request could be approved.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E14S02_02 | A denied access attempt is recorded with the user, target and time | PASS | organiser_a opened /events/EVT-2003 and saw "Access denied. This event is not available to your organisation."; audit_logs row: user organiser_a@clienta.com, action Access Denied, target EVT-2003, 2026-10-08 18:12:37 |
| TC_E14S02_01 | An event status change is recorded with the actor, action, affected event and time | PASS | coord_b approved EVT-2003 and saw "Approved. Organiser C has been notified."; the Coordinator event page Activity log showed "Status changed to approved, Under review → Approved, Coordinator B, 8 Oct 2026, 6:17 pm" below Organiser C's four "Record updated" rows; audit_logs row by coord_b, under_review -> approved, 18:17:29 |
| TC_E14S02_08 | Access-denial entries are not shown in the event Activity log a Coordinator reads | PASS | coord_b's Activity log for EVT-2003 listed only the four Organiser C edits and the approval: no Access Denied row, no "Organiser A"; the database still held organiser_a's Access Denied row for EVT-2003 (18:12:37) |
| TC_E14S02_05 | Any attempt to edit or delete an activity log entry is refused | PASS | The Activity log card showed no edit or delete controls; there is no API route that edits or deletes log entries, so the per-role API step had nothing to call; UPDATE and DELETE of the approval row through the database were both refused with "Activity log entries cannot be edited or deleted." and the row was unchanged afterwards |
| TC_E14S02_04 | An account deactivation is recorded in the activity log | PASS | organiser_a deactivated their account from the profile page and was returned to the Sign in page; audit_logs row: actor organiser_a@clienta.com, entity user (own account), action Account Deactivated, 18:23:34; the account is inactive with no sessions left. The earlier Account Deactivated row at 18:11:16 is seed data, not this run |
