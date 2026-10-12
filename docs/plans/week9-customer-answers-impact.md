# Week 9 customer answers: impact and implementation register

Updated 13 October 2026. This register turns the team's selected Week 9 answers into traceable work. The customer answers remain C-71 to C-136 in the BDR; team-selected behavior is recorded separately as T-79 to T-91. A decision in this register does not prove implementation or story completion.

## Decisions applied

| Area | Selected rule | Authority |
| --- | --- | --- |
| Sessions | Restore Session records under Event. Link venue bookings and equipment requests/reservations to a Session. Keep registration event-level, with attendees selecting Sessions. | C-107; T-79; supersedes T-48 |
| Open venue blocks and buffers | Allow a block to remain open-ended until Venue Staff lift it, following C-119 despite conflicting C-111. Buffers apply between event uses and holds, not maintenance blocks. | C-111, C-118, C-119; team resolution T-80 |
| Venue loss | On loss of a venue, return the event to Planning/change review and notify its Coordinator; do not cancel. Tell Organisers and Attendees after confirmed replacement arrangements or formal event changes. | C-120/C-121; T-81 |
| Safety review | Automatically enter Safety Review after all required venue and technical arrangements are confirmed. Record both a checklist for each safety factor and the Safety Officer's decision/comments. | C-132/C-134; T-82 |
| Lead assignment | Leads manage assignment and reassignment; there is no in-system Coordinator request; only Leads see the unassigned queue. | C-129/C-130; T-83 |
| Holds | No default expiry. Venue Staff set expiry per hold; Coordinator sets warning timing per hold. Allow at most two extensions, with a reason for each. | C-110/C-124/C-125/C-126; T-84 |
| Registration and capacity | One active registration per account/event, selecting one or more Sessions. Enforce both per-Session layout capacity and combined event capacity. Over-capacity submissions remain Pending for Organiser review and do not become approved seats unless both limits allow them. | C-78/C-97/C-98/C-107; T-85 |
| Roles | An account may hold multiple roles; seed data assigns one role per account. | C-136; T-86 |
| Event date rules | No fixed minimum lead time; the Coordinator assesses feasibility. Reject requested dates more than two years ahead as a team rule. | C-71/C-72; T-87 |
| Change requests | Automatically close pending change requests as Obsolete when an event becomes Completed or Cancelled. | C-77; T-88 |
| Staff routing and blocks | Keep venue-to-staff assignments as setup data with no roster screen. Venue Staff may edit blocks, retain change history, and notify affected Coordinators when a block is lifted. | C-89/C-112; T-89/T-91 |
| Release scope | Add E02-S05, Reuse a previous event's details, to Release 1 at its existing 3-point estimate. Assign sprint placement during planning. | C-74; T-90 |

## Affected artifacts and work

| Workstream | Affected source files / implementation | Required changes |
| --- | --- | --- |
| Backlog and acceptance criteria | Product and Release 1 views for E02, E03, E04, E05, E06, E07, E08, E09, E10, E11; especially E02-S01/S05, E03-S09, E04-S02, E05-S06, E06-S05, E08-S03/S04/S06, E09-S01/S02, E10-S01/S04/S05. | Update user stories and ACs to cite C/T references; restore E04-S02 and E02-S05 to Release 1; retain Done-story history under T-74; keep product and release views aligned. Do not invent sprint assignments. Re-estimate changed To Do stories in planning and retain historical estimates/actuals. |
| Canonical test cases | docs/testing/cases/E02.md through E11.md where their owning story changes. | Add or revise cases for selected sessions; per-session and aggregate capacity; pending over-capacity review; automatic safety review; venue loss reversion; open-ended/editable blocks; hold expiry/warnings/two extensions; Lead-only queue and reassignment; Obsolete requests; date boundaries. Preserve retired case IDs as history and ensure every changed AC has a valid case. |
| Schema and migrations | docs/db_schema.md; backend/database/migrations; venue-bookings contract. | Add EVENT_SESSIONS; add session_id to venue bookings and equipment requests/reservations with event/session consistency; add registration-session selection while retaining unique active account/event registration; model role memberships; support nullable block end, block history, per-hold warning/expiry/extension count/reasons, safety factor decisions/comments, and Obsolete change requests. Define transactional and backfill behavior before migration implementation. |
| ADRs and architecture | ADR-003/004/005/006/007/009/012; C4, class diagram, module architecture, API change notes. | Revisit the retired Session decisions (ADR-004/005); update role membership, conflict constraints, audit events, hold and block lifecycle, and event lifecycle. Document tradeoffs and migration consequences. Align the booking contract with session linkage and buffered occupancy. |
| User flows and UI/UX | docs/dynamic-user-flows.md, design.md where new reusable patterns are needed, Figma refinement notes, frontend venue/Lead/Coordinator/Organiser/attendee/Safety Officer views. | Show multi-session setup and selection, capacity feedback, pending over-capacity decisions, automatic Safety Review, decision/comments plus factor checklist, open-ended/editable blocks and lift notifications, per-hold dates/extensions, and Lead-only assignment screens. Follow design.md and shared skeleton; avoid screens for roster management or Coordinator requests. |
| Backend and database code | backend modules: eventLifecycle, venueBooking, registration, eventNotifications, accessControl; migrations and seed data. | Implement the approved state transitions, permissions, session links, registration/capacity transactions, hold/block history, role join model, Obsolete transition, and date validation. Add migration/backfill and preserve audit/outbox behavior. Work in story-sized vertical slices with 100% unit coverage of changed code or a stated gap. |
| Frontend and automated tests | frontend features: events, venue, attendee, organiser, coordinator, safety, notifications; backend/tests and frontend tests. | Implement the revised journeys and validation/error states. Add unit/integration/E2E coverage for changed rules. Record only evidence runs in a new T-65 session file; exploratory runs do not need a run record. |
| Generated files | Dated backlog and test-case workbooks; BDR/ADR DOCX; tc-coverage.md only if test declarations or its legacy input change. | Regenerate each derivative from Markdown using the repository scripts. Never edit exports by hand. Update docs/source-of-truth.md when publishing a new dated export. |
| Jira | Existing owning stories/subtasks; new SCRUM story for E02-S05 only if the issue does not already exist. | Reconcile only after the canonical Markdown PR merges. Recheck live status, sprint, owner and estimate; preserve sprint commitments and Done stories. Use story subtasks for owned work; use SCRUM-127 for cross-cutting enablement without a single story owner. Do not create or edit Jira scope ahead of merged Markdown. |

## Delivery sequence

1. **Decision record — ready for review:** BDR v8, T-79 to T-91, and O-10/O-22 to O-24/O-34/O-37 to O-49 reconciled; customer sources are archived, the BDR/ADR exports are regenerated, and the impact register is verified. Merge this source-of-truth PR before reconciling Jira.
2. **Backlog and test catalogue — staged:** update matching product and Release 1 Markdown, then canonical test cases. Sprint 3 stories below keep their existing criteria through the sprint end; prepare their correction as follow-up work under T-73. Update future-sprint/unassigned stories before Sprint 4 planning.
3. **Architecture and UI/UX:** update schema, contracts, ADRs, diagrams, API notes, flows and design artifacts from the revised stories. Identify migration order and deployment/backfill risks.
4. **Implementation by story:** split branches/PRs by coherent story or vertical slice. A story is not Done until its AC, automated/manual evidence, review and Definition of Done are satisfied.
5. **Generated exports and Jira:** regenerate workbooks/docs from merged canonical Markdown, then reconcile Jira after that Markdown change merges.

## Jira reconciliation candidates

The earlier 12 October snapshot has been refreshed read-only through Jira on 13 October. Likely owners include SCRUM-44/46/47/48/49/50, SCRUM-60/64/70/71/74/75, SCRUM-152/153/154/155/157 and SCRUM-127. Preserve Done stories including SCRUM-45, SCRUM-32 and SCRUM-37 per T-74. E02-S05 needs a Release 1 Jira Story only if none already exists; first search by story key to avoid a duplicate.

### Sprint 3 boundary (live Jira, 13 October 2026)

SCRUM Sprint 3 is active from 4 October through 17 October 2026. T-73 requires in-sprint stories to keep their recorded assumptions until the sprint ends; queue corrections as follow-up work rather than silently changing current sprint acceptance scope. The affected Sprint 3 issues are SCRUM-44, SCRUM-46, SCRUM-47, SCRUM-48, SCRUM-49, SCRUM-50, SCRUM-60 and SCRUM-75. Their statuses range from To Do to In Progress/In Review; sprint membership, not status, sets this boundary. SCRUM-64, SCRUM-70 and SCRUM-71 are assigned to future Sprint 4 (18–31 October). Recheck all states at the Sprint 3 close before Jira changes.

## Review and verification constraints

- Canonical Markdown stays authoritative; Jira and exports follow it.
- Keep original customer wording in C-records. Describe T-records as team choices, especially the C-111/C-119 conflict and C-134 checklist.
- Never reopen a Done story for new scope. Create a new story when T-74 requires it.
- Use the conventional branch/commit/PR conventions and one per-branch handoff file. Do not edit .agents/STATE.md or .agents/JOURNAL.md.
- Run python scripts/check.py before committing. Report its actual scope and outcome; repository checks are not application checks.
- If code or test changes are cited as evidence, follow T-65 run-record rules and the Definition of Done.
- Jira edits and story closure remain blocked until the relevant Markdown merges; this task does not merge PRs.
