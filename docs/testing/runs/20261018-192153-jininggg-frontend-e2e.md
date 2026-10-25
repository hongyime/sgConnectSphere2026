---
date: 2026-10-18T19:21:53+08:00
runner: jininggg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 161026
database: real
commit: 3c744d2
---

Ji Ning's focused human retest on the same isolated synthetic event/accounts.
Runtime: HEAD plus uncommitted E11 backend/UI changes, before publication sync.
Agent observed human screenshots and explicit confirmation in chat; no agent
browser automation substitutes for these actions.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_01 | Notification details visible immediately | PASS | Venue A refreshed once to load fixes. Event code, equipment, quantity/change details appeared without expanding titles. |
| TC_E11S01_07 | Live read and bell synchronisation | PASS | Human marked top needs-review notice Read without F5. Heading and bell changed from 5 to 4 unread; card became Read and mark-read button disappeared. |
| TC_E11S01_11 | Visible confirmation and truthful self-action acknowledgement | PASS | Human assigned Tech A. Result no longer claims "has been notified". User explicitly confirmed automatic scrolling into view. No dedicated confirmation screenshot saved; keyboard focus and Cancel restoration are automated assertions, not human keyboard checks. |

Only these three checks repeated. No manual self-removal retest, failure path,
mailbox receipt or complete E11 acceptance claim. Earlier failure evidence is
unchanged. Human screenshots show the runtime before the later main sync.

## Screenshots

- [Visible details](evidence/20261018-192153-jininggg-frontend-e2e/TC_E11S01_01-details.png)
- [Live unread count](evidence/20261018-192153-jininggg-frontend-e2e/TC_E11S01_07-live-bell.png)
- [Truthful self-action result](evidence/20261018-192153-jininggg-frontend-e2e/TC_E11S01_11-self-result.png)
