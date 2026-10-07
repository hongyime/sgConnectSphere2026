---
date: 2026-10-02T23:05:00+08:00
runner: Bl0oper
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: "021026"
commit: 036c4bc
---

SCRUM-34 frontend gate F1: `npm test --workspace frontend`, the whole suite
(30 files, 257 tests), all passed. The SCRUM-34 cases are in
`frontend/src/features/coordinator/DecisionPanel.test.tsx` and
`frontend/src/features/organiser/RejectedRequest.test.tsx`, plus two
`ConfirmPanel` cases in `frontend/src/shared/shared.test.tsx`, against
`stubApi` replies shaped like the live API. Each refusal test checks the exact
sentence in `docs/plans/scrum-34-implementation-status.md`. Run by Claude for
Aaron.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E03S03_02 | A blocked approval shows the server sentence and lists the missing items, and the status stays Under review | PASS | "… Missing: Venue requirements." |
| TC_E03S03_04 | An empty or blank reason is refused before anything is sent | PASS | "Add a reason for rejecting this request." No request sent |
| TC_E03S03_05 | The Organiser sees the rejection date and reason in plain language, with nothing to edit or answer | PASS | "Rejected on 10 Sept 2026 — Requested date unavailable across all venues"; also the D30 case "Rejected on 16 Sept 2026. No reason was recorded." |
| TC_E03S03_06 | An unassigned Coordinator sees the refusal and no decision buttons; one reassigned away gets the server refusal in the panel | PASS | "Access denied. This event is not assigned to you." / "Only the assigned Coordinator can decide on this request." |
| TC_E03S03_07 | A request that is not Under Review has nothing to decide; a stale tab gets the server sentence | PASS | "This request is awaiting clarification, so there's nothing to decide." / "A decision can only be made while the request is Under Review." |
| TC_E03S03_08 | An Organiser on the decide page is refused with no decision buttons | PASS | "Access denied. This action is for Event Coordinators." |
| TC_E03S03_09 | A rejected request cannot be decided again; a stale tab approving it gets the server sentence | PASS | "This request is rejected, so there's nothing to decide." |
| TC_E03S03_10 | A 2001-character reason is refused with the limit, and exactly 2000 characters is sent in full | PASS | "The reason must be 2000 characters or fewer." |
| TC_E03S03_11 | The organisation event page offers no Edit event on a rejected request; a stale edit is refused with no change-request link | PASS | "This request is rejected, so it can no longer be changed." |
| TC_E03S03_12 | The page does not block an approval whose accessibility needs are only predefined features | PASS | Body `{ decision: 'approve' }` |
