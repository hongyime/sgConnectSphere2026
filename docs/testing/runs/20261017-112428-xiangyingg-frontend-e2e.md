---
date: 2026-10-17T11:24:28+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 161026
database: real
commit: d87081d
pr: 281
---

# E07-S01 Coordinator evidence — reviewer follow-up

Human performed reviewer-requested Coordinator-side checks using current manual environment d87081d, local frontend/backend with real database. Date is evidence intake. Original PNGs preserved unchanged; no agent screenshots substitute. Prior session files are unchanged.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S01_01 | New equipment offered to Coordinator | PASS | Human followed Coordinator A login steps (coord_a@connectsphere.com). Screenshot shows a successfully saved Event A requirement for S01 Final Check 16Oct, requested 10 / total stock 10, Not reserved. This demonstrates selection and request save rather than only an open dropdown. A new synthetic request was saved in EVT-S02-A-17OCT; no reservation was created. Header/account not in crop; identity comes from human walkthrough. Earlier 01-7 free-10 check occurred after TC_04 changed location to Annex Storage, as visible in that image; not a fresh pre-edit check. |
| TC_E07S01_03 | Retired equipment excluded from Coordinator selector | PASS | Human Coordinator Add equipment request screenshot shows the complete expanded equipment list without S01 Retirement Projector 16Oct. The Final Check item and reserved S02 projector are also absent because already requested; their absence is not treated as retirement. Previous record separately establishes retired projector status and retained history. |

## Screenshots

1. [TC_E07S01_01-8.png](evidence/20261017-112428-xiangyingg-frontend-e2e/TC_E07S01_01-8.png): new item successfully selected and requested by Coordinator, total stock 10. Original 159955 bytes.
2. [TC_E07S01_03-5.png](evidence/20261017-112428-xiangyingg-frontend-e2e/TC_E07S01_03-5.png): complete Coordinator equipment selector excludes retired projector. Original 289839 bytes.

## Clarification of earlier TC_E07S01_02 Remarks

The opened stock-review notification in session 20261016-011435 was checked while signed in as Coordinator A, coord_a@connectsphere.com, following the recorded sign-out/sign-in walkthrough. Screenshot 02-3 crops out the account header; identity is attributed to that human walkthrough, not independently visible in the PNG. This clarifies the earlier observation, not a new notification test. Earlier records are not edited.

## Scope

These Coordinator-side selection checks supplement the Technical Support-only availability reader. No role policy or canonical test wording changed. No S02 historical evidence is rewritten despite the new test request; its prior captured results remain historical. Teammate review and CI/merge remain required. Story Done status unchanged.
