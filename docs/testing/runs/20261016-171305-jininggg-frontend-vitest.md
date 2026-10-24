---
date: 2026-10-16T17:13:05+08:00
runner: jininggg
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: 161026
database: mocked
commit: 8599ad2
---

E06-S03 / SCRUM-47 manual testing found no discoverable route from assigned
Coordinator event details to the venue booking list. Added a shared ButtonLink
labelled Venue bookings beside the existing event actions, available regardless
of event status including Confirmed. Viewing does not change submission or
withdrawal permissions. Tested HEAD 8599ad2 plus uncommitted withdrawal/switch
work and this link. Runner is the authenticated GitHub login for this session.

Command: `npm test --workspace frontend -- --run src/features/coordinator/CoordinatorWorkspace.test.tsx src/features/coordinator/CoordinatorWorkspace.navigation.test.tsx --no-file-parallelism`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Existing Coordinator workspace and navigation regression | PASS | 15 passed across two files. Mocked API; existing tests only, not a specific assertion of the new link or human click-through. |

Human event-page navigation retest remains pending. No database writes or
whole-story completion claim. Earlier records remain unchanged.
