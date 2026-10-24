---
date: 2026-10-24T16:22:00+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 211026
database: real
commit: b5f5736
pr: 299
---

Ji Ning performed these browser actions against the actual local API and isolated native PostgreSQL. Agent prepared synthetic fixtures only. Event: EVT-E06-INTEGRATION. Initial run used b5f5736; final replacement/retry retests used that checkout plus the uncommitted frontend callback fix. This is a focused integration session, not complete execution of each cited canonical case.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_07 | Multiple independent bookings: approval integration subset | PASS | Venue Staff approved Hall 1; Confirmed and automatic Primary appeared for Coordinator. Activity showed Hall 1 Pending to Confirmed attributed to Venue Staff. Coordinator received approval inbox notice. Other canonical assertions not claimed. |
| TC_E06S03_12 | Replacement and retry automatic list update, initial attempt | FAIL | Suggested Hall 3 request persisted but required F5 to appear, both on initial replacement and retry after withdrawal. Retained original failure screenshots. |
| TC_E06S03_12 | Fresh replacement after withdrawal, fixed retest | PASS | New Hall 2 request rejected with Hall 3 suggestion. Replacement appeared Pending without F5. Withdrew it, then retried from the same rejected Hall 2; new Pending Hall 3 and Released history appeared without F5. Human explicitly confirmed both. |
| TC_E06S03_13 | Latest rejection with no suggestion, controls subset | PASS | Venue Staff rejected latest Hall 3 with No suggestion and reason No alternative venue is available. Coordinator saw reason with no Request suggested venue button. Complete chain and recipient boundaries not claimed. |

## Screenshots

User-saved original filenames are retained. Some TC prefixes were suggested incorrectly during guidance: files prefixed TC_E06S03_11 show rejection/suggestion setup, not the canonical TC_11 recipient-exclusion test. No TC_11 pass is claimed. No screenshot modifications or agent substitutes.

- [TC_E06S03_07_activity-log](evidence/20261024-162200-jininggg-frontend-e2e/TC_E06S03_07_activity-log.png)
- [TC_E06S03_07_automatic-primary](evidence/20261024-162200-jininggg-frontend-e2e/TC_E06S03_07_automatic-primary.png)
- [TC_E06S03_07_coordinator-notification](evidence/20261024-162200-jininggg-frontend-e2e/TC_E06S03_07_coordinator-notification.png)
- [TC_E06S03_07_staff-approval](evidence/20261024-162200-jininggg-frontend-e2e/TC_E06S03_07_staff-approval.png)
- [TC_E06S03_11_rejected-with-suggestion](evidence/20261024-162200-jininggg-frontend-e2e/TC_E06S03_11_rejected-with-suggestion.png)
- [TC_E06S03_11_rejection-notification](evidence/20261024-162200-jininggg-frontend-e2e/TC_E06S03_11_rejection-notification.png)
- [TC_E06S03_11_replacement-auto-refresh-fixed](evidence/20261024-162200-jininggg-frontend-e2e/TC_E06S03_11_replacement-auto-refresh-fixed.png)
- [TC_E06S03_11_suggested-replacement-after-refresh](evidence/20261024-162200-jininggg-frontend-e2e/TC_E06S03_11_suggested-replacement-after-refresh.png)
- [TC_E06S03_12_replacement-withdrawn](evidence/20261024-162200-jininggg-frontend-e2e/TC_E06S03_12_replacement-withdrawn.png)
- [TC_E06S03_12_retry-after-refresh](evidence/20261024-162200-jininggg-frontend-e2e/TC_E06S03_12_retry-after-refresh.png)
- [TC_E06S03_12_retry-auto-refresh-fixed](evidence/20261024-162200-jininggg-frontend-e2e/TC_E06S03_12_retry-auto-refresh-fixed.png)
- [TC_E06S03_12_retry-available](evidence/20261024-162200-jininggg-frontend-e2e/TC_E06S03_12_retry-available.png)
- [TC_E06S03_13_no-suggestion-controls](evidence/20261024-162200-jininggg-frontend-e2e/TC_E06S03_13_no-suggestion-controls.png)
- [TC_E06S03_13_rejected-no-suggestion](evidence/20261024-162200-jininggg-frontend-e2e/TC_E06S03_13_rejected-no-suggestion.png)
