---
date: 2026-10-17T22:06:16+08:00
runner: bryanseah234
scope: backend/db
environment: local
run_type: automated
test_case_version: 161026
database: real
commit: fc443e8
---

E06-S03 / SCRUM-47 #299 follow-up database acceptance. Command:
`node --import tsx --test backend/tests/bookingDecisionIntegration.integration.test.ts backend/tests/bookingSubmission.integration.test.ts`

Ran in an isolated checkout of `fc443e8` against native loopback PostgreSQL. The disposable DB was `connectsphere_notification_test_scrum47_step37`; test fixtures used random schemas, applied migrations there, and dropped those schemas. The current real `decisions.ts` from PR #298 head `7d674fe80c219f9ecbde93bb09874ccf91d98d12` was overlaid only in this temporary checkout so the conditional real-decision cases executed. It was not added to this branch. Result: 27 passed, zero failures, zero skips. No shared Supabase database, Docker, reset, or seed command was used.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S03_07 | Approval and primary selection serialize | PASS | Both real decision/selection lock orders passed; exactly one primary remained. |
| TC_E06S03_09 | Pending withdrawal preserves other bookings and refuses a different Coordinator | PASS | Different Coordinator received 404; withdrawal released only its Pending request, preserved the sibling booking and expiry history, and delivered one notice to assigned Venue Staff. |
| TC_E06S03_10 | Withdrawal and approve/reject decisions serialize | PASS | Actual `decideBooking` approve and reject variants passed both lock orders: withdrawal-first left Released with no decision effects; decision-first returned the current busy 409 without withdrawal effects; venue/event lock inversion completed without deadlock. |
| TC_E06S03_11 | Withdrawal delivery is exclusive and transactional | PASS | Only assigned staff received the withdrawal notice; forced outbox failure rolled back booking, audit, and notification effects. |
| TC_E06S03_12 | Released replacement permits retry and preserves history | PASS | Idempotent replay returned the Released request; one of two concurrent fresh attempts succeeded; replacement chains continued from the latest rejection. |
| TC_E06S03_13 | Replacement follows only the latest suggestion | PASS | Older rejected attempts were not reopened; an absent latest suggestion stopped the chain. |
| MULTIPLE | Combined E06-S03 PostgreSQL acceptance | PASS | 27/27 passed, zero skipped, zero failed using the command above and the temporary PR #298 source overlay. |
