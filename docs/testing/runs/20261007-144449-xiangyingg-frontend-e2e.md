---
date: 2026-10-07T14:44:49+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: '031026'
database: real
commit: ede1540
pr: 229
---

# SCRUM-53 / E07-S03 human manual checklist

Tester: the user associated with GitHub login xiangyingg, manually operating the
browser. The agent prepared isolated fixtures, guided the checklist, inspected
supplied screenshots and recorded the user's actual confirmations. This is not
an automated Playwright run or independently observed agent manual walkthrough.
Timestamp is final-result documentation after the user's last confirmation;
individual click times were not captured. Application version remained ede1540.

Environment: local frontend and API backed by a dedicated disposable PostgreSQL
schema. Synthetic Support and Coordinator accounts, Manual Microphone, Manual
Projector and Maintenance Speaker. No shared application database was reset or
seeded. Fixture release/update was performed by the agent directly in that schema;
it does not validate E07-S04/E07-S05 writer screens.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S03_01 | Open equipment availability | PASS | Support user opened the live page with Start/End fields and Check availability. |
| TC_E07S03_01 | Reserved and damaged stock excluded | PASS | 15 Nov 2026 09:00–12:00 Singapore: Manual Microphone total 10, reserved 3, damaged 2, free 5; user screenshot and confirmation. |
| TC_E07S03_02 | Location does not restrict availability | PASS | Manual Projector at Grand Ballroom showed total/free 10 with no commitments or transport deduction; user confirmed and screenshot showed the location. |
| TC_E07S03_03 | Non-overlapping time windows | PASS | User confirmed microphone free 10 for 12:00–14:00 and 14:00–17:00 on 15 Nov 2026. |
| TC_E07S03_01 | Standing maintenance excludes stock | PASS | Maintenance Speaker total 4, free 0, Under maintenance, location Not specified; screenshot and user confirmation. |
| TC_E07S03_01 | Release restores capacity | PASS | Agent released only the isolated fixture reservation; user refreshed morning period and confirmed reserved 0, damaged 2, free 8; later screenshot confirms values. E07-S04 release UI was not tested. |
| MULTIPLE | Invalid period rejected | PASS | User confirmed End must be after start for Start noon / End 09:00. Network request suppression was not manually inspected. |
| MULTIPLE | Coordinator role refused | PASS | After successful Coordinator login, user opened the direct availability API URL and confirmed Access denied. Only Technical Support Staff can check equipment availability.; no quantities returned. |
| MULTIPLE | Same-period check refreshes commitments | PASS | Agent changed the isolated reservation to 4; user clicked Check availability without changing morning period and explicitly confirmed reserved 4, damaged 2, free 4. |
| MULTIPLE | Phone layout usable | PASS | User confirmed phone-viewport instructions passed: usable fields/buttons/results and no whole-page horizontal overflow. No mobile screenshot or exact dimensions supplied. |

All ten rows of docs/plans/scrum-53-equipment-availability.md's manual checklist
were completed and confirmed by the user in this conversation. Screenshots remain
in the conversation; they are not committed artifacts. User reports are identified
above where no screenshot was supplied. API 404 and unit coverage evidence remain
separate automated records. Final CI, human code/test review and reviewed merge
still govern overall story Done.
