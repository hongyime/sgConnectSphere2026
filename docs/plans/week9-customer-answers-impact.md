# Week 9 customer answers: impact and implementation register

Updated 13 October 2026. The customer answers are recorded as C-71 to C-136 in the BDR; team choices are recorded separately as T-79 to T-91. This register tracks affected requirements, designs, tests, code and Jira work. Decisions and planned work do not prove implementation or story completion.

## Decisions applied

| Area | Selected rule | Authority |
| --- | --- | --- |
| Sessions | Restore Sessions beneath Events. Venue bookings and equipment requests/reservations link to Sessions. Each Session has separate attendance for suitability; the Event-level attendance remains the overall planning total. One Event-level registration selects one or more Sessions. | C-107; T-79; supersedes T-48; attendance split is a team design choice |
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
| Architecture and UI handoff | Reconciled ADRs 003/004/005/006/007/009/010/012 and added ADR-018/019; updated the target schema, booking contract, API overview, C4/module/class views, user flows, design status vocabulary and Figma refinement plan. Actual database migrations, application behavior and Figma frame edits remain downstream. |

## Remaining impact and work

| Workstream | Files or areas | Required work |
| --- | --- | --- |
| Sprint 3 backlog and cases | E01-S12/S13, E03-S08/S09/S10, E05-S05/S06, E06-S02/S03/S04/S05/S06, E07-S01..S07, E08-S03/S06, E10-S05, E14-S02 | Keep current acceptance assumptions through 17 October under T-73. After Sprint 3 closes, verify actual Jira sprint state, create a follow-up for each story still incomplete, retain Done stories and prior evidence, and add only the new behavior that remains. Do not edit these active-sprint criteria in this PR. |
| Data model and migrations | `docs/db_schema.md`, backend migrations, seed data | The target schema now defines Event→Session, Session-linked venue/equipment records, event-level registration selections, many-to-many roles, open-ended blocks/history, configured holds, safety decision/checklist and Obsolete request history. Migration/backfill and seed changes are still required; retain current data and audit history and do not invent defaults for legacy holds. |
| Shared contracts and APIs | `docs/contracts/venue-bookings.md`, `docs/api-changes-week7.md`, backend modules | The contract and API overview now specify Session ownership, per-Session suitability, block/hold behavior, Pending capacity review, automatic Safety Review, Lead authority and terminal request closure. Endpoint implementations and transactional guarantees remain code work. |
| ADRs and architecture views | ADR-003/004/005/006/007/009/010/012/018/019; `docs/c4-diagrams.md`, `docs/class-diagram.md`, `docs/modular-monolith-architecture.md`, `docs/plans/e11-notification-hooks.md` | Updated in the architecture follow-up with explicit supersession links, consequences, ownership, migration notes and history. Preserve C-62 as historical evidence and distinguish customer rules from team choices. The E11 handoff now records T-83/T-89 without rewriting its dated implementation snapshot. |
| User flows and UI/UX | `docs/dynamic-user-flows.md`, `design.md`, `docs/design/figma-wireframe-refinement-plan.md`, shared frontend skeleton | Updated repository flows/notes for Session setup and attendee selection; per-Session capacity and Pending review; automatic safety review; Lead-only assignment; per-hold settings/extensions; open-ended editable blocks and lift notices. Actual Figma frames and application screens remain to update after these requirements are reviewed; keep O-50/O-51 visible and do not add a Coordinator request flow, roster screen or per-Session waitlist by assumption. |
| Backend/frontend implementation | Migrations/seed data; `backend/src/modules/{eventLifecycle,venueBooking,equipmentSupport,registration,accessControl,changeManagement,eventNotifications,shared}`; `frontend/src/features/{organiser,coordinator,venue,support,attendee}`; `frontend/src/app/roles.ts` and API/session types | No application code is included in the documentation PRs. After requirements and architecture merge, create story-sized PRs: Event/Session model and copy/date validation; Session-linked bookings/equipment; configured holds and block history; multi-role access; registration selections/capacity/Pending review; automatic safety review; Obsolete closure; notification routing. Include migrations/backfill and access-control checks, 100% unit coverage of changed code or stated gaps, manual E2E evidence and review. Preserve Done-story and active Sprint 3 boundaries. |
| Jira | SCRUM-30, SCRUM-39, SCRUM-50, SCRUM-60, SCRUM-61, SCRUM-63..67, SCRUM-70..73; new E02-S07/E07-S08 | Reconciled 14 October after #253, #254 and #255 merged. Existing descriptions mirror canonical Markdown. SCRUM-50 and SCRUM-60 were corrected to the already-merged Week 7 Sprint 3 planning scope; no Week 9 behavior was applied to active Sprint 3 stories under T-73. SCRUM-180 (E02-S07) and SCRUM-181 (E07-S08) were created under their matching epics. Existing statuses, owners, estimates and sprint assignments were preserved. The two new Stories remain unassigned, unestimated and unscheduled pending planning. |

## Sprint boundary and Jira snapshot

The active Jira Sprint 3 (id 36) runs 4–17 October 2026; Sprint 4 (id 67) runs 18–31 October. Release 1 Markdown labels more stories Sprint 3 than the live board currently lists. In particular, SCRUM-152 (E05-S06), SCRUM-154 (E03-S09), SCRUM-158 (E08-S06), and SCRUM-74 (E10-S05) are labelled Sprint 3 in the Release 1 view but are not on the active board. Keep Sprint 3 scope unchanged through 17 October, then reconcile the discrepancy against Jira before editing or moving anything.

The 14 October live Sprint 3 query showed these incomplete items: SCRUM-44 (In Review, Bryan), SCRUM-46 (In Review, Ji Ning), SCRUM-47 (In Progress, Ji Ning), SCRUM-48 (In Progress, Le Xin), SCRUM-49 (In Progress, Amareet), SCRUM-50 (To Do, Le Xin), SCRUM-55 (In Review, Aaron), SCRUM-60 (To Do, Aaron), SCRUM-75 (In Progress, Ji Ning), and SCRUM-176 (To Do, Bryan). SCRUM-86 and SCRUM-51/52/53/54/56/57 remain Done. Bryan already owns SCRUM-44 and SCRUM-176. These are still in an active sprint, not confirmed carryovers; after Sprint 3 closes, inspect the live board, preserve Done stories, create follow-ups for incomplete stories, and assign any agreed carryover work to Bryan.

On 14 October, the Week 9 description mirror was refreshed for SCRUM-30 (E02-S05), SCRUM-39 (E04-S02), SCRUM-61 (E08-S04), SCRUM-63..67 (E09-S01..S05), and SCRUM-70..73 (E10-S01..S04). All were To Do at recheck. A separate source-sync correction updated SCRUM-50 (E06-S06) and SCRUM-60 (E08-S03) from pre-Week-7 Jira wording to the already-merged Sprint 3 planning baseline in the canonical backlog. Their To Do status, assignees, 5-point estimates and active Sprint 3 membership stayed unchanged. This correction did not apply Week 9 T-79/T-80/T-82/T-84 behavior to active sprint scope under T-73. SCRUM-74 (E10-S05) was deliberately not edited while the Release 1 view labels it Sprint 3.

Created SCRUM-180 (E02-S07, under SCRUM-3) and SCRUM-181 (E07-S08, under SCRUM-8) as Stories. Both are To Do with no assignee, estimate or sprint, as required pending planning. They mirror `docs/backlog/release-1/E02-event-request-submission.md` and `docs/backlog/release-1/E07-equipment-technical-support.md` respectively. Existing Done stories SCRUM-26/27 (E02-S01/S02) and SCRUM-51/52/53/54/56/57 (E07-S01/S02/S03/S04/S06/S07) remain Done.

## Delivery sequence

1. Completed: merged the Week 9 decision-record PR (#253).
2. Completed: merged the stacked backlog/test follow-up (#254) and architecture/UI follow-up (#255).
3. Completed 14 October: reconciled the listed Jira issues after rechecking status, owner, estimate and sprint; corrected SCRUM-50/SCRUM-60 to the pre-sprint Week 7 baseline and preserved their planning fields.
4. Update actual Figma frames from the merged requirements; retain O-50/O-51 as assumptions until resolved.
5. Implement in story-sized PRs with migration, unit, integration and manual E2E evidence and peer review. Revisit Sprint 3 stories only after sprint close.

## Verification limits

The repository check validates repository hygiene and tooling tests only. It does not prove frontend/backend behavior, application tests, build, deployment, or story completion. Any later application evidence must be recorded and attributed to the exact run and commit.
