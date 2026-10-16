# Seed data specification

Derived from the pre-conditions of the frontend verification scaffold. Updated for backlog v4: sessions were withdrawn (BDR C-62), so seeded identifiers are events. Every account, venue and item below is named
explicitly by at least one case, so the suite cannot pass against an empty or hand-populated database.

The brief is explicit that this matters: *"Pre-conditions matter because a dirty test database makes
results meaningless."* `globalSetup` must reset and reseed before every run.

## Accounts

| Email | Role | Password | Contact number | Client organisation | Notes |
|---|---|---|---|---|---|
| `organiser_a@clienta.com` | Event Organiser | `ValidPass123` | `+65 9100 0001` | Client A | Primary organiser in most cases |
| `organiser_b@clienta.com` | Event Organiser | `ValidPass123` | `+65 9100 0002` | Client A | Colleague in the same organisation (E01-S02 Scenario 3) |
| `organiser_c@clientb.com` | Event Organiser | `ValidPass123` | `+65 9100 0003` | Client B | Different organisation, used for isolation tests |
| `coord_a@connectsphere.com` | Event Coordinator | `ValidPass123` | `+65 9200 0001` | — | Assigned coordinator in most flows |
| `coord_b@connectsphere.com` | Event Coordinator | `ValidPass123` | `+65 9200 0002` | — | Reassignment target, fewest-active-events tests |
| `venue_a@connectsphere.com` | Venue Staff | `ValidPass123` | `+65 9300 0001` | — | Booking decisions |
| `venue_b@connectsphere.com` | Venue Staff | `ValidPass123` | `+65 9300 0002` | — | Second approver for the concurrency case (E06-S06) |
| `tech_a@connectsphere.com` | Technical Support Staff | `ValidPass123` | `+65 9400 0001` | — | Equipment and assignments |
| `tech_b@connectsphere.com` | Technical Support Staff | `ValidPass123` | `+65 9400 0002` | — | Overlapping-assignment conflict case (E07-S07) |
| `attendee_a@example.com` | Attendee | `ValidPass123` | `+65 9500 0001` | — | Registration, withdrawal, attendance |
| `attendee_b@example.com` | Attendee | `ValidPass123` | `+65 9500 0002` | — | Capacity and duplicate-registration cases |
| `attendee_i@example.com`, `attendee_j@example.com` | Attendee | `ValidPass123` | `+65 9500 0009`, `+65 9500 0010` | — | Waiting list, simultaneous-claim cases |

Contact numbers are seeded because E09-S07 now shows name, email address and contact number (BDR T-32, revised v5). Without them the registration-list cases cannot assert the third field.

## Client organisations

`Client A` and `Client B`, both active. E01-S02 is meaningless without two, since the whole story is
that an Organiser sees only their own organisation's events.

## Venues

| Name | Capacity | Layouts | Notes |
|---|---|---|---|
| `Orchid Hall` | 200 | Theatre 120, Banquet 80 | Used by the boundary cases; do not change capacities without updating TC_E05S01_05/06 and TC_E05S02_04/05 |
| `Lotus Room` | 50 | Boardroom 40 | Small venue for unsuitability cases |

## Equipment

| Item | Total quantity | Notes |
|---|---|---|
| `Projector-HD` | 10 | Boundary cases assume 6 committed elsewhere, leaving 4 free |
| `Microphone-Wireless` | 6 | Partial-reservation cases |

## Events

`EVT-101` and the `EVT-2001`..`EVT-2004` range are referenced by id. Seed them at the status each case
expects rather than driving them through the UI, otherwise a failure in an early story cascades into
unrelated failures elsewhere.

TC_E11S01_02 fixture mapping: `backend/src/database/cli.ts` seeds `EVT-3001 Approved Annual Conference` with a Confirmed booking at `Jasmine Hall`, assigned to active `venue_b@connectsphere.com`, not `venue_a@connectsphere.com`. Its code and 15 October 2026 date do not guarantee a future-valid fixture. The case separately requires an approved isolated fixture with a current-policy-valid execution-relative date, coherent event/related session/booking/publication data, assigned `tech_a@connectsphere.com`, registered `attendee_a@example.com` and waitlisted `attendee_b@example.com`; prepare and verify these prerequisites rather than assuming the seed provides them. This note changes no seed code and authorizes no reset/reseed of the shared Supabase test schema.

## Reset contract

`global-setup.ts` must, before every run: truncate all tables, reapply migrations, insert the rows
above, and fail loudly if any insert fails. A partially seeded database is worse than an empty one
because the failures it causes look like application bugs.
