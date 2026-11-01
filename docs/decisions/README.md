# ConnectSphere decision register

Start here to find the project's accepted decisions and the customer statements
they follow. This register is an index, not another copy of the records: the
linked Markdown files remain authoritative, so a decision has one maintained
home.

## Find a decision

| Record | What it contains | Index |
| --- | --- | --- |
| Backlog Decision Review (BDR) | Customer clarifications (`C-`), team backlog/product decisions (`T-`), open questions and assumptions (`O-`), boundary rulings (`B-`), and their history | [BDR index](../bdr/README.md) |
| Architecture Decision Records (ADR) | Technical architecture choices, alternatives, consequences, and retired or superseded decisions | [ADR index](../adr/README.md) |
| Repository decisions | Engineering and repository workflow decisions | [Repository decisions below](#repository-decisions) |

For a story or criterion, start with its Backlog Decision Reference and follow
the `C-`, `T-`, `O-` or `B-` code into the linked BDR section. Read a referenced
ADR when it concerns system design. Read the repository decision when it
concerns contribution or tooling practice. The BDR preserves customer wording
and team interpretation separately; an ADR records a technical choice, not a
new customer requirement.

## Authority and change history

The Markdown records linked here are authoritative. Jira, generated Word and
spreadsheet exports, Figma boards and PostPlans are views or proposals derived
from them. When a decision is superseded, keep its original record and follow
the explicit superseding link; do not erase its history. See
[source of truth](../source-of-truth.md) for the full authority order and the
downstream update process.

## Trace a client answer through the team's decision

Use the existing BDR and ADR records as one trace, rather than copying the
decision into a second log:

1. **Client wording and answer:** find the `C-` row in
   [customer clarifications](../bdr/A-customer-clarifications.md). The archived
   source workbook or briefing is linked from
   [customer source archive](../bdr/customer-sources/README.md).
2. **Team response:** follow the `T-` reference in
   [team decisions](../bdr/B-team-decisions.md). It records the team's choice
   and rationale separately from what the client said.
3. **Unresolved question:** follow its `O-` reference in
   [open questions](../bdr/C-open-questions.md). A team default remains a team
   assumption until the question is answered and the BDR records the outcome.
4. **Affected work:** use the dated entries in
   [BDR change log](../bdr/G-change-log.md) to find downstream backlog,
   test-case, and design/schema updates. The story's Backlog Decision Reference
   links its criteria back to the applicable `C-`, `T-`, `O-` or `B-` entries.
5. **Technical choice:** follow the Related BDR references from the relevant
   [ADR index](../adr/README.md) to the architecture record. An ADR explains
   implementation structure; it does not replace the customer answer or team
   product decision.

For Week 9, the 66 client answers are C-71 to C-136 in the customer-clarification
table, and the team's impact-review decisions are T-79 to T-91 in the team
decisions table. The later team defaults T-98 and T-99 close O-50 and O-51.
For example, C-107 led to T-79/T-85 and ADR-018; the earlier C-62 remains in
history and is explicitly superseded for the current Release 1 model. This is
an index to the maintained records, not another copy of their text.

### Week 9 change and decision trace at a glance

Week 9 produced 66 customer Q&A entries, not one client change request. Keep
the client's exact answer in `C-` records, the team's interpretation or choice
in `T-` records, any unresolved point in `O-` records, and the dated downstream
application in the BDR change log. Read the original answers in [BDR section
A](../bdr/A-customer-clarifications.md), team decisions in [section
B](../bdr/B-team-decisions.md), unresolved questions in [section
C](../bdr/C-open-questions.md), and chronology in [section
G](../bdr/G-change-log.md). The table below is a cross-reference only; those
records hold the full wording and rationale.

| Team decision | Client answer(s) | Decision at a glance | Open question / affected records |
| --- | --- | --- | --- |
| [T-79](../bdr/B-team-decisions.md) | C-107; earlier C-62 | Restore Sessions under an Event; bookings and equipment attach to Sessions; registration and lifecycle stay Event-level. | Closes O-10 and supersedes T-48 while retaining C-62 as history. E04, E06–E10, ADR-018, schema and venue/equipment contracts. |
| [T-80](../bdr/B-team-decisions.md) | C-111, C-118, C-119 | Choose open-ended venue blocks until lifted; keep setup/turnaround buffers off maintenance blocks. | Resolves O-22/O-23 as a team choice despite the C-111/C-119 conflict. E05/E06, schema and venue-booking contract. |
| [T-81](../bdr/B-team-decisions.md) | C-113, C-120, C-121 | Venue loss returns a Confirmed event to Planning and alerts its Coordinator; notify Organisers/Attendees after replacement arrangements or formal changes. | Resolves O-24 and supersedes the conflicting part of T-28/T-67. E05/E08/E10/E11 and lifecycle/notification contracts. |
| [T-82](../bdr/B-team-decisions.md) | C-132, C-134 | Start Safety Review automatically when arrangements are confirmed; keep a team-added checklist plus the required decision/comments. | Resolves O-40/O-42. E08/E14, safety flow, schema, ADR-006 and ADR-009. |
| [T-83](../bdr/B-team-decisions.md) | C-56, C-104, C-128–C-130; PO decision 2026-11-01 | The Lead assigns/reassigns directly; an assigned Coordinator may escalate to the Lead; only Leads see the queue. | Resolves O-36–O-38 for Release 1; records the PO choice that differs from C-129. E01/E03 and access, assignment and notification flows. |
| [T-84](../bdr/B-team-decisions.md) | C-79, C-99, C-110, C-124–C-126 | Set each hold's expiry and warning; allow at most two extensions, each with a reason. | Resolves O-31/O-33/O-34. E06-S05, venue-booking contract, schema and ADR-006. |
| [T-85](../bdr/B-team-decisions.md) | C-78, C-97, C-98, C-107 | One event-level registration can select Sessions; enforce per-Session and combined Event capacity; over-capacity requests enter Pending review. | Resolves O-48 and refines T-29/T-31. E04/E09, schema, cases and ADR-018. |
| [T-86](../bdr/B-team-decisions.md) | C-136 | One account may hold multiple roles; initial seed data still gives each account one role. | Resolves O-44 as a team choice; ADR-019 supersedes ADR-012. E01 access model and role schema. |
| [T-87](../bdr/B-team-decisions.md) | C-71, C-72 | No fixed minimum lead time; the team sets a two-year maximum date horizon. | Resolves O-45; the maximum is a team policy, not a client requirement. E02 date rules and boundary cases. |
| [T-88](../bdr/B-team-decisions.md) | C-77 | Make pending change requests Obsolete when their Event becomes Completed or Cancelled; record the transition. | Resolves O-46. E10 lifecycle, audit behavior and ADR-009. |
| [T-89](../bdr/B-team-decisions.md) | C-89 | Keep venue-to-staff assignment as setup/routing data; do not add a Release 1 roster screen. | Resolves O-49 and refines T-64. E05/E06 setup and E11 routing. |
| [T-90](../bdr/B-team-decisions.md) | C-74 | Include E02-S05 in Release 1 with its existing estimate; leave sprint placement to planning. | E02 release backlog and copy flow; no story requirement was retroactively rewritten. |
| [T-91](../bdr/B-team-decisions.md) | C-112 | Allow Venue Staff to edit blocks, preserve the change history, and notify affected Coordinators when a block is lifted. | Resolves O-47. E05-S06, schema, venue-booking contract and ADR-009. |

Later resolutions are recorded in their own dated entries: T-98/T-99 close
O-50/O-51. The subsequent story and architecture changes remain in their
canonical files. For a future client-requested scope change, record the
client's wording first, record the team's impact decision separately, leave
any unresolved point open, and then log the affected canonical files in the
change log. Week 9 was recorded as customer Q&A, so this index does not assign
it a new CR number after the fact. This preserves the distinction between what
the client said and what the team chose without inventing a second copy of
either record.

## Repository decisions

| ID | Decision |
| --- | --- |
| 0001 | [Repository foundation](0001-repository-foundation.md) |
| 0002 | [Attendee registration](0002-attendee-registration.md) |
| 0003 | [Profile editing](0003-profile-editing.md) |
| 0004 | [Backlog Markdown authority](0004-backlog-markdown-authority.md) |
| 0005 | [ADR/BDR Markdown authority](0005-adr-bdr-markdown-authority.md) |
| 0006 | [Jira status sync](0006-jira-status-sync.md) |
| 0007 | [Application checks skip workflow](0007-application-checks-skip-workflow.md) |
| 0008 | [Migrate to rulesets](0008-migrate-to-rulesets.md) |
| 0009 | [Security scanners](0009-security-scanners.md) |
| 0010 | [Single Vercel deploy path](0010-single-vercel-deploy-path.md) |
| 0011 | [Load Inter from Google Fonts](0011-load-inter-from-google-fonts.md) |
| 0012 | [Merge queue](0012-merge-queue.md) |
| 0013 | [Per-task handoff files](0013-per-task-handoff-files.md) |
| 0014 | [Pull requests do not edit STATE.md or JOURNAL.md](0014-pull-requests-do-not-edit-state-or-journal.md) |
| 0015 | [One-at-a-time production migrations](0015-one-at-a-time-production-migrations.md) |
| 0016 | [Story-level design ownership and cross-story coordination](0016-story-level-design-ownership.md) |
| 0017 | [Guard pull-request scope and reference artifacts](0017-pr-guardrails-for-reference-artifacts-and-scope.md) |
| 0018 | [Guard code changes against doc drift](0018-doc-sync-guard.md) |
