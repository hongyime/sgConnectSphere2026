---
date: 2026-10-06T15:41:06+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: '031026'
database: real
commit: 157995d
pr: 216
---

# SCRUM-52 / E07-S02 manual validation

Recorded after the user's manual testing and confirmations in this session on
6 October 2026. The timestamp is the documentation time; individual action times
were not captured. HEAD identifies the local version served during this session.
The user operated the browser; the agent observed supplied screenshots and
recorded the user's reports. Screenshots remain in the conversation and are not
attached to this repository. This is not an independently executed agent run.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S02_01 | Equipment recorded against an event and Support notified | PASS | User confirmed saving and refresh persistence. Screenshot: EVT-3001, Microphone-Wireless, note Manual E07-S02 test. Support notification/read-only checks subsequently confirmed by user; no Support screenshot supplied. |
| TC_E07S02_02 | Request exceeds total stock | PASS | Screenshot shows quantity 8 against stock 6, saved requirement and Exceeds total stock warning. Refresh retention was instructed; final confirmation supplied by user. |
| TC_E07S02_03 | Events independent of each other | PASS | User confirmed the separate-event check; second event code and before/after quantities were not supplied. |
| TC_E07S02_04 | Amend or remove before reservation | PASS | Removal path observed: Equipment request removed. Quantity changed to 8 in screenshots; no separate screenshot of the suggested quantity-3 amendment or note update was supplied. |
| MULTIPLE | Access protection and reserved-request protection | PASS | User explicitly reported Access refused after signing in as Coordinator B. Subsequently confirmed remaining checks including reserved protection; fixture identity and reservation details were not supplied. |

Recipient interpretation approved by user: all active Technical Support accounts
receive equipment-request intake notices before a technician is assigned.

A screenshot also showed a saved-request banner above an empty list. The agent
requested refresh to distinguish stale feedback after removal from a persistence
problem; no explicit resolution screenshot was supplied. This discrepancy is
retained in the plan as a limitation rather than claimed resolved.

No live email-provider delivery, direct API bypass, duplicate/invalid quantity,
mobile, concurrency or rollback test is claimed from this manual session.
