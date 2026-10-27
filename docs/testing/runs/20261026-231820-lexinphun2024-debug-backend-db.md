---
date: 2026-10-26T23:18:20+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: "241026"
database: real
commit: 52ce829
pr: 349
---

SCRUM-152 / E05-S06 on #349's tree after merging #348's review fixes
(`f316573`), including the backend fix for a booking over two separate
unavailabilities (`a2010db`). `npm run test:venue-booking-requests:db
--workspace backend` (the E06-S03 Application Checks step) on native
PostgreSQL 127.0.0.1:5432 (no Docker Desktop), database
`connectsphere_notification_test`, only `TEST_DATABASE_URL` set; each suite
builds its own disposable schema. No shared Supabase database, reset, seeding
or production migration. The `date` is when the command started.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Booking selector: E06-S03/E06-S04 bookings, E05-S06 unavailability (TC_E05S06_01–08, the three #348 review regressions) and first-accepted venue claims (#340) | PASS | 83/83, zero skipped |
