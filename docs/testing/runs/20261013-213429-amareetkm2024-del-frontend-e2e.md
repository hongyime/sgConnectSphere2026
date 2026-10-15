---
date: 2026-10-13T21:34:29+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 131026
database: real
commit: 33b4a96
pr: 252
---

The real-session Playwright suite, `npx playwright test --config
playwright.auth.config.ts`, on `33b4a96`, against a disposable local
PostgreSQL 17 container on the loopback interface (random schema per run,
never the application database), desktop and Pixel 7: **12/12 passed**
(2.7 minutes), including the new `tests/auth-e2e/venueHolds.spec.ts`. Run by
Claude for Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S05_03 | Coordinator holds a free venue from the event's venue search for 48 hours | PASS | Database row `tentative`, expiry within 5 minutes of now + 48h |
| TC_E06S05_01 | Another Coordinator's overlapping event sees the hall as Unavailable and is refused, naming the hold | PASS | "This venue already has a tentative hold for EVT-HLD-TC Tech Conference from …"; no row written |
| TC_E06S05_07 | Venue Staff move the expiry later; logged with who made it | PASS | Audit actor is the Venue Staff account; activity log row reads "Hold expiry: … → …" by Venue Staff |
| TC_E06S05_04 | Submitting the booking request makes the hold pending with no expiry | PASS | `pending`, `expires_at` null |
| MULTIPLE | Release after confirming; a passed hold reads Expired with no actions | PASS | Database `released`; card shows "Expired …" |
| MULTIPLE | Rest of the real-session suite | PASS | 12/12 in total |
