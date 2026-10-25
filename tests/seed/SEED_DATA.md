# Seed data specification

`backend/src/database/cli.ts` is authoritative for the current runtime seed.
The fixture descriptions below originated with an older scaffold; they are not
a current inventory of every venue, event or Session. Reset/reseed contracts
apply only to approved disposable loopback or CI databases, never shared
Supabase. The narrow T-97 Safety Officer operation uses the separate
[demo-account procedure](../../docs/ops/demo-account-provisioning.md), not a seed run.

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

The current seed also defines these two staff profiles from T-72 / PR #232.
Their password is the same existing `seedCredential` defined in the CLI; no
new credential value is introduced here. Together with the accounts above,
the runtime seed defines 15 user profiles. This is not a production account count.

| Email | Role | Password reference | Contact number | Client organisation | Notes |
|---|---|---|---|---|---|
| `coord_lead@connectsphere.com` | Event Coordinator Lead | `seedCredential` in the CLI | `+65 9200 0003` | — | Already defined for local/CI seed; not provisioned by the Safety Officer operation |
| `safety_officer@connectsphere.com` | Safety Officer | `seedCredential` in the CLI | `+65 9200 0004` | — | Existing seed profile; targeted Supabase provisioning is separately authorised under T-97 and recorded in PR #295 |

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

## Reset contract

`global-setup.ts` must, before every run: truncate all tables, reapply migrations, insert the rows
above, and fail loudly if any insert fails. A partially seeded database is worse than an empty one
because the failures it causes look like application bugs.
