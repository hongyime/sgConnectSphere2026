# Week 9 customer answers: impact and implementation register

Updated 13 October 2026. The customer answers are recorded as C-71 to C-136 in the BDR; team choices are recorded separately as T-79 to T-91. This register tracks affected requirements, designs, tests, code and Jira work. Decisions and planned work do not prove implementation or story completion.

## Decisions applied

| Area | Selected rule | Authority |
| --- | --- | --- |
| Sessions | Restore Sessions beneath Events. Venue bookings and equipment requests/reservations link to Sessions. One Event-level registration selects one or more Sessions. | C-107; T-79; supersedes T-48 |
| Open venue blocks and buffers | Blocks may remain open until lifted, following C-119 despite conflicting C-111. Buffers apply between event uses and holds, not maintenance blocks. | C-111, C-118, C-119; team resolution T-80 |
| Venue loss | Return a Confirmed Event to Planning/change review and immediately notify its Coordinator; do not cancel. | C-120/C-121; T-81 |
| Safety review | Enter Safety Review automatically after all required venue and technical arrangements are confirmed. Record each safety-factor checklist and the Safety Officer's decision/comments. | C-132/C-134; T-82 |
| Lead assignment | Leads manage assignment and reassignment; no in-system Coordinator request; only Leads see the unassigned queue. | C-129/C-130; T-83 |
| Holds | No default expiry; configure expiry and warning per hold; allow at most two reasoned extensions. | C-99/C-110/C-124/C-125/C-126; T-84 |
| Registration and capacity | One active registration per account/Event, selecting one or more Sessions. Enforce each selected Session capacity and combined Event capacity. Over-capacity submissions remain Pending for Organiser review and are not approved seats. | C-78/C-97/C-98/C-107; T-85 |
| Roles | Accounts may hold multiple roles; initial seed data assigns one role per account. | C-136; T-86 |
| Event dates | No fixed minimum lead time; Coordinator assesses feasibility. Reject dates more than two years ahead as a team policy. | C-71/C-72; T-87 |
| Change requests | Pending requests become Obsolete with history when an Event becomes Completed or Cancelled. | C-77; T-88 |
| Staff routing and blocks | Venue-to-staff assignments are setup data, without a roster screen. Venue Staff may edit blocks; retain change history and notify affected Coordinators when a block is lifted. | C-89/C-112; T-89/T-91 |
| Release stories | Restore E04-S02 (5 points), add E02-S05 at its existing 3 points, and add E02-S07/E07-S08 without estimates or sprint assignments pending planning. | C-74/C-107; T-79/T-87/T-90; T-74 |

Two boundaries remain explicit assumptions: per-Session waitlist behavior (O-50) and the exact data copied by E02-S05 (O-51). The backlog uses the documented defaults and keeps both open for review; neither is attributed to the customer.

## Changes in this follow-up

| Artifact | Updated |
| --- | --- |
| Product and Release 1 backlog | Added E02-S05/S07, E04-S02, E07-S08; reconciled non-Sprint-3 E08-S04, E09-S01/S02/S03/S04/S05 and E10-S01/S02/S03/S04. Preserved completed-story history and current Sprint 3 acceptance scope. |
| Canonical test catalogue | Added E02-S05/S07, E04-S02, E07-S08 and E10-S03 cases; updated E08-S04, E09-S01/S02/S03/S05 and E10-S01/S02/S04; retired only cases whose criteria were superseded. |
| BDR assumptions and change log | Recorded O-50/O-51 and updated the BDR history to distinguish current decisions from unresolved design assumptions. |
| Exports | Regenerate dated backlog, test-case, and BDR/ADR Word exports from Markdown. Refresh the legacy test workbook input and generated coverage inventory. |

## Remaining impact and work

| Workstream | Files or areas | Required work |
| --- | --- | --- |
| Sprint 3 backlog and cases | E01-S12/S13, E03-S08/S09/S10, E05-S05/S06, E06-S02/S03/S04/S05/S06, E07-S01..S07, E08-S03/S06, E10-S05, E14-S02 | Keep current acceptance assumptions through 17 October under T-73. After Sprint 3 closes, verify actual Jira sprint state, create a follow-up for each story still incomplete, retain Done stories and prior evidence, and add only the new behavior that remains. Do not edit these active-sprint criteria in this PR. |
| Data model and migrations | `docs/db_schema.md`, backend migrations, seed data | Restore Event→Session; model session-linked venue bookings/equipment requests/reservations and registration Session selections; keep Event lifecycle and registration windows at Event level; support many-to-many user roles; nullable-ended blocks and edit history; per-hold expiry/warning/extension count/reasons; safety factor checklist plus decision/comments; Obsolete change-request history. Define migration/backfill and consistency constraints before code. |
| Shared contracts and APIs | `docs/contracts/venue-bookings.md`, `docs/api-changes-week7.md`, backend modules | Add Session identifiers and validate Event/Session ownership. Define booking and equipment availability by Session period; preserve buffers only for event uses/holds. Specify Pending registration review and transactional enforcement of both capacity limits. Model block edits/lifts, hold extensions, safety auto-trigger, Lead authority and terminal request closure. |
| ADRs and architecture views | ADR-003/004/005/006/007/009/012; `docs/c4-diagrams.md`, `docs/class-diagram.md`, `docs/modular-monolith-architecture.md` | Reconcile restored Sessions, role cardinality, block/hold lifecycle, safety review, event lifecycle and registration capacity. Retain historical ADR context and record consequences, ownership, constraints and migration decisions. |
| User flows and UI/UX | `docs/dynamic-user-flows.md`, `design.md`, story-linked Figma plans, shared frontend skeleton | Show Session setup and attendee selection; per-Session capacity and Event-level Pending review; automatic safety review with checklist and comments; Lead-only assignment; per-hold expiry/extensions; open-ended editable blocks and lift notices. Do not add a Coordinator request flow, venue-roster screen, or per-Session waitlist unless O-50 is resolved differently. |
| Backend/frontend implementation | Event lifecycle, sessions, venue bookings, equipment, registration, access control, audit/history, notifications and affected role pages | Split into story-sized branches after requirements and architecture are reviewed. Preserve event-level lifecycle/windows and seed-data role behavior. Add migration, unit, integration and manual E2E evidence; meet the Definition of Done and record cited runs under T-65. Do not claim completion from design or catalogue updates. |
| Jira | Existing SCRUM-30 (E02-S05), SCRUM-39 (E04-S02), Sprint 4 stories, new E02-S07/E07-S08 | Reconcile only after canonical Markdown merges. Update existing tickets rather than duplicating them; create new Stories for E02-S07/E07-S08 after checking classification and current Jira state. Preserve original estimates and sprint commitments; leave estimates/sprints blank until planning where not approved. |

## Sprint boundary and Jira snapshot

The active Jira Sprint 3 runs 4–17 October 2026; Sprint 4 runs 18–31 October. Release 1 Markdown labels more stories Sprint 3 than the live board currently lists. In particular, SCRUM-152 (E05-S06), SCRUM-154 (E03-S09), SCRUM-158 (E08-S06), and SCRUM-74 (E10-S05) are labelled Sprint 3 in the Release 1 view but were not on the active board snapshot. Keep all stories marked Sprint 3 unchanged through 17 October, then reconcile the discrepancy against Jira before editing or moving anything.

Relevant To Do items observed read-only on 13 October include SCRUM-30 (E02-S05), SCRUM-39 (E04-S02), SCRUM-61 (E08-S04), SCRUM-63/64 (E09-S01/S02), SCRUM-65/66/67 (E09-S03/S04/S05), and SCRUM-70/71/72/73/74 (E10-S01/S02/S03/S04/S05). Existing Done stories include SCRUM-26/27 (E02-S01/S02) and SCRUM-51/52/53/54/56/57 (E07-S01/S02/S03/S04/S06/S07). Recheck status, sprint, estimate and ownership before any Jira change; no Jira writes are made here.

## Delivery sequence

1. Merge the Week 9 decision-record PR before downstream Jira reconciliation.
2. Review and merge the backlog/test catalogue follow-up; retain O-50/O-51 as open assumptions until resolved.
3. Update architecture, data model, shared contracts, flows and UI plans from the merged requirements.
4. Implement in story-sized PRs with the required unit, integration and manual E2E evidence and peer review.
5. Reconcile Jira only after canonical Markdown merges; defer Sprint 3 stories until sprint close and recheck live state then.

## Verification limits

The repository check validates repository hygiene and tooling tests only. It does not prove frontend/backend behavior, application tests, build, deployment, or story completion. Any later application evidence must be recorded and attributed to the exact run and commit.
