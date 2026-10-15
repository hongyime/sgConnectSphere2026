---
date: 2026-10-16T00:50:43+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 031026
database: real
commit: 7a3368e
---

# E07-S01 manual evidence — partial practice run

SCRUM-51 / E07-S01; T-65 and proposed T-93 (#279). Screenshot taken and supplied by the human tester. Captured on the local application at commit `7a3368e`, not the current main used to prepare these documents. Workbook `031026` is the latest dated catalogue in that running checkout. Record timestamp is the time the supplied evidence was documented; exact screenshot capture time was not independently established.

This is a partial run. The first screenshot shows the catalogue save confirmation; the second shows the item details. The details show Audio, quantity 10, Main Storage, Working, description “S01 Manual Microphone 16Oct”, and No reservations yet. The user supplied the second image in response to the requested details/refresh step; a static image does not independently establish the refresh action. Third human screenshot shows the item in Technical Support availability for 16 October 2026 00:55–22 October 2026 00:55: total 10, reserved 0, damaged/withdrawn 0, free 10, Main Storage, Working. This is read-only availability evidence, not creation of a reservation. No full-case PASS or final Sprint 3 current-code rerun is claimed. No database reset or fixture creation was performed for this evidence.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S01_01 | Save a new equipment item and make it available for reservation | SKIP | Partially executed: human screenshot shows “S01 Manual Microphone 16Oct saved.” and the catalogue row with Audio, quantity 10, Main Storage and Working. Second human screenshot shows matching details, description “S01 Manual Microphone 16Oct” and No reservations yet. Third screenshot confirms Technical Support availability for 16 October 2026 00:55–22 October 2026 00:55: total 10, reserved 0, withdrawn 0, free 10. Explicit refresh/entered-description confirmation and the canonical Coordinator-side equipment-selection step remain unverified; full-case verdict is deferred. |

| TC_E07S01_04 | Update equipment location and reopen the record | PASS | Human screenshot shows S01 Manual Microphone 16Oct with Annex Storage, quantity 10, Audio and Working. Tester explicitly confirmed the edited location remained after reopening and refreshing. Screenshot evidence and human action confirmation are distinguished. |

## Screenshots

- [TC_E07S01_01-1](evidence/20261016-005043-xiangyingg-frontend-e2e/TC_E07S01_01-1.png): human-supplied catalogue save confirmation and saved item row; original PNG retained unchanged (313988 bytes).

- [TC_E07S01_01-2](evidence/20261016-005043-xiangyingg-frontend-e2e/TC_E07S01_01-2.png): human-supplied item details, including description and empty reservation history; original PNG retained unchanged (210790 bytes).

- [TC_E07S01_01-3](evidence/20261016-005043-xiangyingg-frontend-e2e/TC_E07S01_01-3.png): human-supplied Technical Support availability results for 16–22 October 2026, showing 10 free; original PNG retained unchanged (217417 bytes).

- [TC_E07S01_04](evidence/20261016-005043-xiangyingg-frontend-e2e/TC_E07S01_04.png): human-supplied catalogue row showing Annex Storage and quantity 10 (45193 bytes), original PNG unchanged.

## Remaining work

- Run the final checklist on current main and record its actual tested commit in a new session.
- Confirm the user refreshed before the second screenshot. Description is visibly “S01 Manual Microphone 16Oct”; confirm this matches the entered value rather than assuming the suggested description was used.
- Technical Support read-only availability now evidenced. Verify the canonical Coordinator-side selection step using the permitted current workflow; do not infer a reservation was created.
- TC_E07S01_04 persistence confirmed by tester; PASS on the recorded older application commit. Execute TC_E07S01_02 (future reservation review flag and assigned-Coordinator notification), and TC_E07S01_03 (retirement with historical reservations retained). These cases have not been executed in this session.
