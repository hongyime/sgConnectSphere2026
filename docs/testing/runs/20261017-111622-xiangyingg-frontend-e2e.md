---
date: 2026-10-17T11:16:22+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 161026
database: real
commit: d87081d
---

# E07-S03 screenshot-backed manual re-run

SCRUM-53 / E07-S03, T-65/T-93. Human performed the walkthrough and supplied screenshots in step order; originals copied unchanged. Local frontend/backend ran at d87081d with real remote database. Record date is evidence intake, not a certified capture timestamp. Agent created separate synthetic fixture event EVT-S03-MANUAL-17OCT with existing seeded accounts, four test items, three-unit reservation plus two-unit dated damaged withdrawal in the morning, and a ten-unit shared-microphone reservation noon–14:00 on 15 November 2026. No reset/reseed or S01/S02-fixture changes. Fixture setup is not human UI execution.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S03_01 | Reserved and damaged/maintenance stock excluded | PASS | Morning walkthrough 15 November 09:00–12:00: human image shows S03 Manual Microphone 17Oct total 10, reserved 3, withdrawn 2, free 5. Maintenance Speaker total 4, reserved/withdrawn 0, free 0, Under maintenance and location Not specified. Cropped results omit time selection; period attributed to tester’s ordered walkthrough, not independently visible in these images. |
| TC_E07S03_02 | Location does not reduce availability | PASS | Human image shows S03 Manual Projector 17Oct total 10, reserved/withdrawn 0, free 10, Grand Ballroom, Working for morning walkthrough. No transport deduction observed. Generic availability has no requested-venue selector; a separate Riverside Hall event selection was not performed, and no hidden transport computation is inferred. |
| TC_E07S03_03 | Non-overlapping periods share equipment | PASS | Human step-ordered images show Shared Microphone total 10: morning 09:00–12:00 reserved 0/free 10, noon–14:00 reserved 10/free 0, afternoon 14:00–17:00 reserved 0/free 10. Cropped rows omit dates/headers; times come from supplied walkthrough sequence and prepared fixture, not screenshot text. This tests adjacent free windows around an existing reservation, not two new reservation writes. |
| MULTIPLE | Invalid date range (supplemental) | PASS | Screenshot shows 15 November 2026 Start 18:00, End 14:00, red End field and End must be after start. Actual start differs from suggested 17:00 but remains invalid. No network suppression assertion claimed. |
| MULTIPLE | Coordinator refused availability data (supplemental) | PASS | After Coordinator login walkthrough, screenshot shows 15 November 09:00–12:00 submitted, Access refused and Only Technical Support Staff can check equipment availability. Empty form can render before query; data retrieval is denied. Screenshot does not show profile identity; role attributed to human walkthrough. |

## Screenshots

Eight hand-taken original PNGs below 1000 KB, linked in execution order:

1. [TC_E07S03_01-1.png](evidence/20261017-111622-xiangyingg-frontend-e2e/TC_E07S03_01-1.png) — Morning microphone 10−3−2 = 5; column headings visible. (139560 bytes).
2. [TC_E07S03_01-2.png](evidence/20261017-111622-xiangyingg-frontend-e2e/TC_E07S03_01-2.png) — Maintenance zero and missing-location fallback. (22632 bytes).
3. [TC_E07S03_02-1.png](evidence/20261017-111622-xiangyingg-frontend-e2e/TC_E07S03_02-1.png) — Projector 10 free at Grand Ballroom. (21834 bytes).
4. [TC_E07S03_03-1.png](evidence/20261017-111622-xiangyingg-frontend-e2e/TC_E07S03_03-1.png) — Shared microphone morning 10 free. (22055 bytes).
5. [TC_E07S03_03-2.png](evidence/20261017-111622-xiangyingg-frontend-e2e/TC_E07S03_03-2.png) — Shared microphone during reservation 0 free. (21616 bytes).
6. [TC_E07S03_03-3.png](evidence/20261017-111622-xiangyingg-frontend-e2e/TC_E07S03_03-3.png) — Shared microphone afternoon 10 free. (22355 bytes).
7. [MULTIPLE-invalid-date-range.png](evidence/20261017-111622-xiangyingg-frontend-e2e/MULTIPLE-invalid-date-range.png) — Invalid range actual start 18:00, end 14:00. (70221 bytes).
8. [MULTIPLE-coordinator-availability-denied.png](evidence/20261017-111622-xiangyingg-frontend-e2e/MULTIPLE-coordinator-availability-denied.png) — Coordinator submission refused; data not returned. (183410 bytes).

## Completion and limits

Three canonical cases and two supplemental checks have observed PASS results. Test data names differ from canonical examples but preserve quantities/scenarios. Cropped-image timing and role limitations are explicit above. No release workflow, mobile layout, concurrency or fresh automated application tests claimed in this run. Older records and story Done status unchanged. Teammate evidence review and normal CI/merge process remain required.
