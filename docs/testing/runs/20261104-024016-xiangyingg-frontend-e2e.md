---
date: 2026-11-04T02:40:16+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "021126"
database: real
commit: 017257c
pr: 420
---

## Manual testing

Archive of the human tester's restored original screenshots from the earlier
2026-11-04 Singapore-time browser session. The date above is the archive time;
the captures were observed and reviewed earlier in this session. Application
behavior was unchanged across the documentation-only commits since 85e2097.
The local application used the isolated native PostgreSQL manual-test database.
Test data follows the actual run date (2026-11-04), next day (2026-11-05), and
inclusive maximum (2028-11-04), rather than canonical example dates.

Fixture setup used the local API for Boundary Retest and TC03 Prepared Retest;
the human verified the browser values and performed submissions. TC04's past
Event dates were entered by the human in the browser. This archive does not
claim every setup step was performed in the browser. TC05 remains recorded
separately in 20261104-023314-xiangyingg-frontend-e2e; its limitations are unchanged.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E02S07_01 | A date beyond two calendar years should block request submission | PASS | Start-field refusal names Session 2 (New Session). Final Boundary Retest captures show Afternoon's end on 2028-11-05 and the specific end-field refusal with maximum 2028-11-04, while Opening shows valid boundary dates. Earlier Event-only refusal and Draft-only images are excluded from this passing evidence set. |
| TC_E02S07_02 | A date exactly two calendar years ahead should pass the horizon check | PASS | Boundary Retest's final success timeline and persisted Under review row show Event dates 2028-11-04 09:00–17:00. This supports boundary submission acceptance; there is no final screenshot showing every Session's corrected saved range after reload. No complete per-Session boundary screenshot coverage is claimed. |
| TC_E02S07_03 | Near-term dates should not be rejected for minimum lead time | PASS | Final prepared retest captures show Opening and Afternoon on 2026-11-05, followed by successful submission and the named Prepared Retest Under review. Earlier 2026-11-06 Session and refused-edit attempts are excluded. Session screenshots are cropped and linked to the named Event through this run's fixture/observation sequence, not a visible URL. |
| TC_E02S07_04 | A past Event date should block request submission | PASS | Human captures show Preferred date must be in the future and disabled Submit request after entering 2026-11-03. The disabled Remove session screenshot is excluded. This is client-side refusal; no saved past Event or submitted API request is claimed. |

## Screenshots

- [TC_E02S07_01-1](evidence/20261104-024016-xiangyingg-frontend-e2e/TC_E02S07_01-1.png): Event identity and Session start-field refusal.
- [TC_E02S07_01-2](evidence/20261104-024016-xiangyingg-frontend-e2e/TC_E02S07_01-2.png): Afternoon end-field refusal, with valid Opening boundary dates.
- [TC_E02S07_01-3](evidence/20261104-024016-xiangyingg-frontend-e2e/TC_E02S07_01-3.png): Afternoon inputs ending 5 Nov 2028 and matching end-field refusal.
- [TC_E02S07_02-5](evidence/20261104-024016-xiangyingg-frontend-e2e/TC_E02S07_02-5.png): Final successful API submission timeline.
- [TC_E02S07_02-6](evidence/20261104-024016-xiangyingg-frontend-e2e/TC_E02S07_02-6.png): Boundary Retest persisted Under review on 4 Nov 2028.
- [TC_E02S07_03-1](evidence/20261104-024016-xiangyingg-frontend-e2e/TC_E02S07_03-1.png): Opening on 5 Nov 2026, 09:00–10:00.
- [TC_E02S07_03-2](evidence/20261104-024016-xiangyingg-frontend-e2e/TC_E02S07_03-2.png): Afternoon on 5 Nov 2026, 13:00–14:00.
- [TC_E02S07_03-3](evidence/20261104-024016-xiangyingg-frontend-e2e/TC_E02S07_03-3.png): TC03 Prepared Retest persisted Under review on 5 Nov 2026.
- [TC_E02S07_03-4](evidence/20261104-024016-xiangyingg-frontend-e2e/TC_E02S07_03-4.png): Successful API submission timeline for the prepared next-day fixture.
- [TC_E02S07_04-1](evidence/20261104-024016-xiangyingg-frontend-e2e/TC_E02S07_04-1.png): Past Event date warning.
- [TC_E02S07_04-2](evidence/20261104-024016-xiangyingg-frontend-e2e/TC_E02S07_04-2.png): Disabled Submit request button, not Remove session.

## Evidence review status

Original supplied files are copied unchanged; timestamped final versions are
normalized to TC_ID-based archive names. Existing immutable records are not edited.
This archive supersedes the earlier note that TC01–04 originals were unavailable:
they have now been restored and archived. The two documented limits remain:
TC02 lacks final saved ranges for every Session; TC05 lacks a browser capture
of corrected Opening dates after reload. These are not silently treated as
performed human editor steps. Independent human review and PO/delegated acceptance
remain required before claiming the story Done.
