---
date: 2026-10-17T10:37:34+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 161026
database: real
commit: d87081d
---

# E07-S02 screenshot-backed re-run — completed canonical cases

SCRUM-52 / E07-S02; T-65 and T-93. Human tester took and supplied original screenshots; agent copied unchanged. Application frontend/backend ran at d87081d with real remote database. Date is evidence intake. Agent prepared separate synthetic approved events EVT-S02-A-17OCT (20 November 2026 09:00–12:00) and EVT-S02-B-17OCT (21 November 09:00–12:00), existing seeded Coordinator A, microphone stock 10 and projector stock 5. Event-created Session trigger used; no extra Session inserted. No existing S01 fixtures changed, no database reset/reseed. Fixture preparation is not human test execution.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S02_01 | Add equipment requests and notify Technical Support | PASS | Save screenshot shows Event A microphone 2 / stock 10 and projector 1 / stock 5, both Not reserved. Tester explicitly confirmed both persisted as Not reserved after refresh. Support inbox shows two Equipment request updated notifications at 10:34; supplied 01-3 shows Support list with Event A and two requested items, not the opened notification body. Final human 01-4 screenshot shows opened Equipment request updated notification: EVT-S02-A-17OCT: S02 Manual Microphone 17Oct × 2 requested. Review the event’s equipment requests, dated 17 October 2026 10:34, Read. Event-specific Support receipt confirmed. |
| TC_E07S02_03 | Requests for one event leave another event unchanged | PASS | Event A has two saved request lines in 01-1; Event B screenshot shows EVT-S02-B-17OCT, Approved and No equipment requested yet. Separate event remains empty. |
| TC_E07S02_04 | Amend and remove an unreserved request | PASS | Human screenshot shows microphone quantity changed 2→3 with Not reserved and save confirmation. Subsequent removal screenshot shows Equipment request removed, microphone absent and projector 1 / stock 5 still Not reserved. |
| TC_E07S02_02 | Warn when request exceeds total stock | PASS | Human screenshot shows 15 microphone units saved against total stock 10, Exceeds total stock pill, and warning that the request cannot be met from existing stock. UI explicitly states requirement does not reserve equipment. |
| MULTIPLE | Other Coordinator denied access (supplemental) | PASS | Human followed Coordinator B login steps; screenshot for Event A shows Access refused and Access denied. This event is not assigned to you. No request rows exposed. Screenshot is UI evidence, not a separate direct API tampering test. |
| MULTIPLE | Reserved request protected (supplemental) | PASS | After human reservation/login steps, Coordinator Event A view shows projector requested 1 / stock 5, Reserved, and Reserved requests are protected in Actions, with no edit/remove controls for that line. Server protection is not newly tested by this screenshot. |

## Screenshots

Original human PNGs are unchanged and below 1000 KB each. Listed below in execution order; TC_ID filenames remain unchanged.

1. [TC_E07S02_01-1.png](evidence/20261017-103734-xiangyingg-frontend-e2e/TC_E07S02_01-1.png) — Save confirmation and Event A microphone 2 / projector 1, both Not reserved. (206530 bytes).
2. [TC_E07S02_01-2.png](evidence/20261017-103734-xiangyingg-frontend-e2e/TC_E07S02_01-2.png) — Support notification titles and timestamps; no opened body. (134914 bytes).
3. [TC_E07S02_01-3.png](evidence/20261017-103734-xiangyingg-frontend-e2e/TC_E07S02_01-3.png) — Support request list: Event A Approved, two items requested; not notification details. (146796 bytes).
4. [TC_E07S02_03-1.png](evidence/20261017-103734-xiangyingg-frontend-e2e/TC_E07S02_03-1.png) — Event B remains empty. (110277 bytes).
5. [TC_E07S02_04-1.png](evidence/20261017-103734-xiangyingg-frontend-e2e/TC_E07S02_04-1.png) — Unreserved microphone amended to 3. (165851 bytes).
6. [TC_E07S02_02-1.png](evidence/20261017-103734-xiangyingg-frontend-e2e/TC_E07S02_02-1.png) — 15 requested against stock 10 with warning. (189517 bytes).
7. [TC_E07S02_04-2.png](evidence/20261017-103734-xiangyingg-frontend-e2e/TC_E07S02_04-2.png) — Microphone removed; projector 1 remains. (148375 bytes).
8. [MULTIPLE-other-coordinator-denied.png](evidence/20261017-103734-xiangyingg-frontend-e2e/MULTIPLE-other-coordinator-denied.png) — Other Coordinator refused Event A access. (94610 bytes).
9. [MULTIPLE-reserved-request-protected.png](evidence/20261017-103734-xiangyingg-frontend-e2e/MULTIPLE-reserved-request-protected.png) — Reserved projector request has no Coordinator edit/remove controls. (114999 bytes).

10. [TC_E07S02_01-4.png](evidence/20261017-103734-xiangyingg-frontend-e2e/TC_E07S02_01-4.png) — opened Support notification naming Event A and microphone ×2, dated 17 October 10:34; original human PNG (47984 bytes).

## Completion and limits

All four canonical cases (01–04) and both supplemental UI checks have PASS results on d87081d. Only observed results are claimed: screenshots do not newly test direct API tampering or prove notification delivery to every active Support account. Team acceptance of all-active-Support recipient interpretation remains separate. Documentation checks, teammate review and reviewed merge remain required; story Done status is unchanged.
