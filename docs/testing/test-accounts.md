# Test accounts for manual runs

The acceptance test cases in `docs/testing/cases/` were written with
placeholder accounts such as `coordinator_1@connectsphere.com`. The seeded
test database (`backend/src/database/cli.ts`) has different accounts, so a
tester cannot follow those steps as written. Until the cases themselves are
updated, use this table to translate each placeholder into the seeded account
to sign in as.

The IS212 Week 4 slides ask for steps that anyone can follow exactly ("log in
with username X and password Y"). That is why the translation is written down
here, and not left to each tester to guess.

Every seeded account uses the seed password, `seedCredential` in
`backend/src/database/cli.ts`. Seed a disposable local database before a
manual run (see "Set up first" in `docs/plans/scrum-33-implementation-status.md`),
never the shared one, so every run starts from the same data.

## Accounts

| Test case says | Sign in as | Role in the seed |
| --- | --- | --- |
| `coordinator_1@connectsphere.com` | `coord_a@connectsphere.com` | Event Coordinator (Coordinator A) |
| `coordinator_2@connectsphere.com` | `coord_b@connectsphere.com` | Event Coordinator (Coordinator B) |
| `tech_support_1@connectsphere.com` | `tech_a@connectsphere.com` | Technical Support Staff (Technical Support A) |
| `tech_support_2@connectsphere.com` | `tech_b@connectsphere.com` | Technical Support Staff (Technical Support B) |
| `venue_staff_1@connectsphere.com` | `venue_a@connectsphere.com` | Venue Staff (Venue Staff A) |
| `venue_staff_2@connectsphere.com` | `venue_b@connectsphere.com` | Venue Staff (Venue Staff B) |
| `organiser_1@connectsphere.com` | `organiser_a@clienta.com` | Event Organiser, Client A (Organiser A) |
| `attendee_1@connectsphere.com` | `attendee_a@example.com` | Attendee (Attendee A) |

Some cases already use `coord_a` and `coord_b` directly; those need no
translation.

## No seeded match yet (team to decide)

| Test case says | Used in | Why there is no match |
| --- | --- | --- |
| `tech_support_3@connectsphere.com` | E07 (replacement technician with a conflicting assignment) | The seed has only two Technical Support Staff accounts |
| `lead_1@connectsphere.com` | E01, E03, E08 ("Event Coordinator Lead") | No such role exists in the system (`user_role` has five roles) |
| `safety_1@connectsphere.com` | E01, E08 | No such role exists in the system |

For these, the story owner either adds the account to the seed in their
story's PR, or rewrites the step, and records which in that PR.

## Events

The cases also name events such as "Tech Conference 2026" that are not in the
seed. Pick the seeded event in the state the case's pre-conditions need, and
name it in the run record's `Remarks`:

| Seeded event | Status | Organiser | Coordinator |
| --- | --- | --- | --- |
| EVT-101 Client A Planning Event | Submitted | Organiser A | Coordinator A |
| EVT-2001 Confirmed Registration Event | Confirmed | Organiser A | Coordinator A |
| EVT-2002 Waitlist Event | Confirmed | Organiser A | Coordinator A |
| EVT-2003 Client B Isolation Event | Under review | Organiser C | Coordinator B |
| EVT-2004 Completed Attendance Event | Completed | Organiser A | Coordinator A |
| EVT-3001 Approved Annual Conference | Approved | Organiser A | Coordinator A |
| EVT-3002 Awaiting Clarification Workshop | Awaiting clarification | Organiser B | Coordinator B |
| EVT-3003 Planning Phase Gala | Planning | Organiser A | Coordinator A |
| EVT-3004 Draft Team Retreat | Draft | Organiser C | none |
| EVT-3005 Rejected Budget Review | Rejected | Organiser B | Coordinator B |

## Keeping this in step

This table describes the seed as of 6 October 2026. If you change the seeded
accounts or events in `backend/src/database/cli.ts`, update this file in the
same PR. Once the team agrees the mapping, a later PR can rename the
placeholders in `docs/testing/cases/` and `tests/e2e/` directly, after PR #217
merges, and then retire this translation table.
