---
date: 2026-10-29T20:06:18+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: 281026
database: real
commit: 01057a7
---

Command (from `backend/`): `npx tsx --test tests/arrangementImpact.integration.test.ts`
against native loopback PostgreSQL 17 (`connectsphere_notification_test`, a fresh
schema per test via `loginDatabase()`, all migrations applied). 11 tests, 11 passed,
0 failed. E10-S02 / SCRUM-71, backend subtask SCRUM-236.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_01 | An attendance change should flag only bookings whose governing Session headcount exceeds capacity | PASS | Two tests: Session A 80 to 81 (capacity 80) flags only A, Session B at exactly 120 of 120 is not flagged (Session changed in SQL; no single-Session edit exists yet, E04-S02); Event attendance 200 to 250 via the real save flags the 200-seat booking and notifies only that venue's Venue Staff |
| TC_E10S02_02 | Editing only the event description should flag nothing | PASS | Real save; no flag, no arrangement audit row, no staff notice |
| TC_E10S02_03 | Saving a change that affects confirmed arrangements should show them before it takes effect | PASS | Real preview lists the booking and Projector reservation; Event, Session, flags, audit and notification counts unchanged afterwards |
| TC_E10S02_04 | Capacity reduced below the registration count warns without removing anyone | PASS | 100 Registered, layout capacity 120 to 80 set in SQL (no Coordinator edit sets a layout yet); save returns Session and Event warnings 100 vs 80; all 100 still Registered. Supporting check: E09-S02 Event capacity equals the sum of Confirmed bookings (80 + 120 = 200) |
| TC_E10S02_05 | Changing a Session date should flag its booking and equipment reservation | PASS | Session A date moved in SQL flags A's booking and reservation only, B stays Confirmed; the Event date change via the real save flags both |
| TC_E10S02_06 | Technical Support Staff are notified as well as Venue Staff | PASS | Real save of a date change: one reconfirmation notice each to the venue's Venue Staff and the assigned Technical Support Staff; unrelated Venue Staff get none; the Organiser keeps the generic date notice |
| TC_E10S02_07 | A booking headcount override governs over Session attendance | PASS | Session changes in SQL: A (headcount 60, attendance 100, capacity 80) not flagged; B (attendance 81, capacity 80) flagged |
| TC_E10S02_08 | An Event-wide date change should flag arrangements for every Session | PASS | Real save on a two-Session Event flags both bookings and both reservations; both venues' staff and Technical Support notified |
| TC_E10S02_09 | An Event description-only edit should not flag any Session arrangements | PASS | Real save on a two-Session Event: all four arrangements stay unflagged, no audit rows |
