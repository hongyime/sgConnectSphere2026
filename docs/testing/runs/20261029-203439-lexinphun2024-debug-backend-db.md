---
date: 2026-10-29T20:34:39+08:00
runner: lexinphun2024-debug
scope: backend/db
environment: local
run_type: automated
test_case_version: 281026
database: real
commit: 584ecb5
---

Command (from `backend/`): `npx tsx --test tests/arrangementImpact.integration.test.ts`
against native loopback PostgreSQL 17 (`connectsphere_notification_test`, a fresh
schema per test via `loginDatabase()`, all migrations applied). 15 tests, 15 passed,
0 failed. E10-S02 / SCRUM-71, backend subtask SCRUM-236.

Before this run, nine deliberate code breaks (warning and capacity boundaries,
the Confirmed / live-reservation / Registered filters, an end-only Event move,
and the own-headcount rule) were each confirmed to fail this suite and the unit
tests; the code was restored before the run.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_01 | An attendance change should flag only bookings whose governing Session headcount exceeds capacity | PASS | Three tests: Session A 80 to 81 (capacity 80) flags only A while Session B at exactly 120 of 120 is not flagged; a booking whose own headcount 90 is above capacity 80 is flagged when its Session attendance changes (Sessions changed in SQL, no single-Session edit exists yet, E04-S02); Event attendance 200 to 250 via the real save flags the booking and notifies only that venue's Venue Staff |
| TC_E10S02_02 | Editing only the event description should flag nothing | PASS | Real save; no flag, no arrangement audit row, no staff notice |
| TC_E10S02_03 | Saving a change that affects confirmed arrangements should show them before it takes effect | PASS | Real preview lists the booking and Projector reservation; Event, Session, flags, audit and notification counts unchanged afterwards |
| TC_E10S02_04 | Capacity reduced below the registration count warns without removing anyone | PASS | Four tests: 100 Registered with layout capacity 120 to 80 (layout set in SQL, no Coordinator edit sets one yet) gives Session and Event warnings and all 100 stay Registered; 80 of 80 does not warn with 5 Pending and 5 waitlisted present, 81 does; unbooked Session or Event does not warn; E09-S02 Event capacity equals the sum of Confirmed bookings (200) |
| TC_E10S02_05 | Changing a Session date should flag its booking and equipment reservation | PASS | Session A date moved in SQL flags A's booking and reservation only, B stays Confirmed; the Event date change via the real save flags the Confirmed booking and live reservation but not a Pending booking request or released equipment |
| TC_E10S02_06 | Technical Support Staff are notified as well as Venue Staff | PASS | Real save of a date change: one reconfirmation notice each to the venue's Venue Staff and the assigned Technical Support Staff; unrelated Venue Staff get none; the Organiser keeps the generic date notice |
| TC_E10S02_07 | A booking headcount override governs over Session attendance | PASS | Sessions changed in SQL: A (headcount 60, attendance 100, capacity 80) not flagged; B (attendance 81, capacity 80) flagged |
| TC_E10S02_08 | An Event-wide date change should flag arrangements for every Session | PASS | Two tests via the real save on a two-Session Event: moving the dates, and moving only the end, each flag both bookings and both reservations; both venues' staff and Technical Support notified |
| TC_E10S02_09 | An Event description-only edit should not flag any Session arrangements | PASS | Real save on a two-Session Event: all four arrangements stay unflagged, no audit rows |
