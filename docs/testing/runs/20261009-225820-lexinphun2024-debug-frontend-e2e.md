---
date: 2026-10-09T22:58:20+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: "091026"
database: mocked
commit: e6f58ea
---

Follow-up to #175 / #132. `npx playwright test tests/e2e/e03.spec.ts`
(desktop and Pixel 7 projects, faked API responses): 52 passed, 6 skipped
(existing `test.fixme` placeholders). Same working tree as commit e6f58ea.
The registration section of the Organiser edit form was also screenshotted
before and after the fix on both projects. Before: "Opens" was pushed outside
its box to the right. After: "Registration setup", then "Registration opens"
and "Registration closes" side by side on desktop and stacked on the phone,
with no horizontal scroll on either.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E03S07_01 | Verify that an Organiser should be able to directly edit any field while the event has not yet been approved | PASS | Desktop and mobile. |
| TC_E03S07_03 | Verify that an Organiser should be able to directly edit name, description, purpose, or registration dates even after approval | PASS | Desktop and mobile. |
| TC_E03S07_04 | Verify that an Organiser attempting to directly edit a restricted field after approval should be refused and directed to the change request form | PASS | Desktop and mobile. |
| TC_E03S07_05 | Verify that a Coordinator who is not assigned to an approved event should be refused when attempting to edit it | PASS | Desktop and mobile. |
| TC_E03S07_06 | Verify that an Organiser's unrestricted post-approval edit should also be recorded in the activity log | PASS | Desktop and mobile. |
| TC_E03S07_02 | Verify that the assigned Coordinator should be able to edit any field after approval, with the change recorded in the activity log | SKIP | Existing `test.fixme`, unchanged by this PR. |
