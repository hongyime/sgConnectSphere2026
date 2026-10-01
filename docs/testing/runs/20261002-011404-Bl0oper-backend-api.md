---
date: 2026-10-02T01:14:04+08:00
runner: Bl0oper
scope: backend/api
environment: local
run_type: regression
test_case_version: 011026
commit: a67513a
pr: 174
---

Real HTTP calls to the local API (`tsx src/dev.ts`, port 3033,
`APP_URL=http://localhost:5173`), signed in as coord_a, coord_b, organiser_a,
organiser_b and organiser_c, against a freshly reset and seeded
`connectsphere_dev_stack` database (Docker `postgres:17`), with the database
checked after each step. Refusals ran on seeded events first; organiser_a then
submitted complete requests through the API, each assigned automatically
("Annual Tech Summit" and "Winter Gala" went to coord_b). 23/23 checks passed. Run by Claude for Aaron.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E03S03_01 | "Annual Tech Summit" approved by its assigned Coordinator; status change audited; organiser_a gets exactly one new notice, "Request approved", with an email-outbox row; the Coordinator none | PASS | 200. Notice: "Coordinator B approved Annual Tech Summit. The request is now Approved and moves to planning." |
| TC_E03S03_02 | Approval of seeded EVT-2003 blocked with the missing items listed; stays Under Review; no notice | PASS | 409 "This request can't be approved until its required information is complete." missingFields ["Venue requirements","Accessibility needs","Equipment requirements","Layout preference","Registration setup"] |
| TC_E03S03_03 | "Winter Gala" rejected with the reason stored; organiser_a gets exactly one new notice, "Request rejected", with the reason and an email-outbox row | PASS | 200. Notice: "Coordinator B rejected Winter Gala. The request is now Rejected and can no longer be changed. Reason: Requested date unavailable across all venues" |
| TC_E03S03_04 | Missing, empty and blank reasons refused on EVT-2003; stays Under Review | PASS | 400 "Add a reason for rejecting this request." |
| TC_E03S03_05 | organiser_a's read of "Winter Gala": decision rejected, reason and decision date, `canEdit` false, no editable fields; an edit is refused with no change-request link | PASS | 409 "This request is rejected, so it can no longer be changed." Also seeded EVT-3005 for organiser_b (no stored reason in the seed; date from `status_changed_at`) and an approved request (decision approved, no reason, `canEdit` still true) |
| TC_E03S03_06 | coord_a refused approve and reject on EVT-2003; nothing changes; both denials audited; organiser_c's activity log doesn't show them | PASS | 403 "Only the assigned Coordinator can decide on this request." organiser_c's activity log had 0 rows while 3 `Access Denied` rows exist for EVT-2003 |
| TC_E03S03_07 | Approve on EVT-3002 (Awaiting Clarification) and reject on EVT-3001 (Approved) refused; nothing changes | PASS | 409 "A decision can only be made while the request is Under Review." |
| TC_E03S03_08 | organiser_c refused approving their own EVT-2003; denial audited | PASS | 403 "Only the assigned Coordinator can decide on this request." |
| TC_E03S03_09 | Approve on rejected EVT-3005 refused; stays Rejected; no notice | PASS | 409 "A decision can only be made while the request is Under Review." |
| TC_E03S03_10 | 2001-character reason refused on EVT-2003; a 2000-character reason accepted and stored in full on a submitted request | PASS | 400 "The reason must be 2000 characters or fewer." then 200 |
| TC_E03S03_11 | organiser_b's title and description edits on rejected EVT-3005 refused with no change-request link; unchanged. organiser_a (same organisation, not the owner) keeps the usual refusal | PASS | 409 "This request is rejected, so it can no longer be changed." / 403 "Edit access denied." Unchanged rule also checked: organiser_a's venue edit on approved EVT-3001 still gets 409 with `changeRequestUrl` |
| TC_E03S03_12 | "Accessible Design Workshop" (Wheelchair access only, note blank) approved; organiser_a notified | PASS | 200 |
