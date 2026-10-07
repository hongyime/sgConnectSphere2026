# EXX test cases

## Definition of Done

### TC_PERF_01 — Verify a venue search returns within the 3-second target on a realistic catalogue

- **Sprint**: 3
- **AC reference**: Definition of Done · BDR T-51 · Week 1 §8a
- **Type**: 3 - Cross-cutting

#### Pre-conditions

The venue catalogue holds 50 venues with layouts, accessibility features and facilities. 200 confirmed bookings exist across the next 90 days. Coordinator coord_a@connectsphere.com is signed in

#### Test steps

1. Open the venue search
 2. Enter date 2026-12-01, time 09:00–11:00, expected attendance 120, layout Theatre, accessibility Step-free access
 3. Start a timer on submit and stop it when results render

#### Test data

50 venues · 200 bookings · elapsed time measured client-side

#### Expected result

Results render in under 3 seconds. Record the measured time; if it exceeds 3 seconds the story does not meet the Definition of Done

### TC_PERF_02 — Verify the venue availability calendar loads within the 3-second target for a busy month

- **Sprint**: 2
- **AC reference**: Definition of Done · BDR T-51 · Week 1 §8a
- **Type**: 3 - Cross-cutting

#### Pre-conditions

Orchid Hall has 40 confirmed bookings, 5 tentative holds and 3 maintenance blocks within 2026-12-01 to 2026-12-31

#### Test steps

1. Open Orchid Hall in the venue catalogue
 2. Select the calendar for December 2026
 3. Start a timer on selection and stop it when all states have rendered

#### Test data

48 calendar entries in one month · elapsed time measured client-side

#### Expected result

The calendar renders all Free, Tentative, Confirmed and Blocked states in under 3 seconds

### TC_PERF_03 — Verify a registration submission completes within the 3-second target near capacity

- **Sprint**: 4
- **AC reference**: Definition of Done · BDR T-51 · Week 1 §8a
- **Type**: 3 - Cross-cutting

#### Pre-conditions

Event EVT-2001 is Confirmed with Orchid Hall booked, venue capacity 200, and 198 registrations recorded. Attendee attendee_b@example.com is signed in

#### Test steps

1. Open event EVT-2001
 2. Submit a registration
 3. Start a timer on submit and stop it when confirmation renders

#### Test data

198 existing registrations · capacity 200 · elapsed time measured client-side

#### Expected result

The registration is created and confirmation renders in under 3 seconds, including the capacity check against the booked venue
