# Jira reorg plan — 30 September 2026

**Owner:** Bryan (bryanseah234)
**Date recorded:** 30 September 2026
**Scope:** 45 orphaned issues (no current parent) in project SCRUM
**Rule reference:** `docs/jira-ticket-classification.md`

This plan records the concrete per-ticket decisions Bryan should execute in
the Jira UI. No Jira API write calls are involved; all changes are done
through the board or backlog.

---

## Context

At the 30 September 2026 measurement, SCRUM has 125 issues: 14 Epics, 87
Stories, 9 Subtasks, and 15 Tasks. Of these, 80 have a parent and 45 do not.
The 14 Epics (SCRUM-2 through SCRUM-15, labelled E01 through E14) and the 71
Stories SCRUM-16 through SCRUM-86 are correctly structured and are not
touched by this plan.

The 45 orphans fall into two groups: Tasks with no parent (SCRUM-87 through
SCRUM-92 and SCRUM-109 through SCRUM-120) and Stories with bracket-tag
summaries that were never parented to an Epic (SCRUM-93 through SCRUM-108).

---

## Prerequisite decision: create Epic E00

Several orphans are genuine technical enablers that cannot honestly be
assigned to any single user story. The recommendation in
`docs/jira-ticket-classification.md` is to create one new Epic,
`E00 Platform, Tooling & Delivery`, and make these tickets Stories under it.
This keeps Epics E01 through E14 purely about user story scope.

**Bryan must decide whether to create E00 before executing the moves below.**
The table marks affected rows with the parent `E00 (new)`. If Bryan decides
against E00, an alternative is to use a label (for example `platform`) and
leave those tickets as unparented Tasks, accepting that they will remain
outside the Epic hierarchy.

---

## How to execute Story-to-Subtask moves in Jira

The Jira REST API cannot convert an existing Story to a Subtask on this
instance (see `docs/jira-ticket-classification.md` for the verified
evidence). Use the UI bulk-change Move wizard:

1. On the board or backlog, tick the checkboxes for the issues to move.
2. Click **... (Actions)** → **Bulk change** → **Move**.
3. Choose **Subtask** as the target issue type.
4. On the "Select Parent" step, choose the correct parent Story.
   Group moves by target parent — one bulk-move operation per parent.
5. Complete the field-mapping step and confirm.
6. Verify each ticket after the operation: it should show the correct type,
   parent, and Epic inheritance.

For simple re-parenting within the same type (for example, linking an
existing Story to an Epic), use the Epic Link field on the ticket directly
or drag the ticket to the Epic in the backlog view.

---

## Migration table

Confidence legend:
- **Clear** — the correct action is unambiguous from the ticket title,
  status, and available parent candidates.
- **Needs Bryan's call** — the correct parent is genuinely uncertain;
  Bryan should read the ticket description before acting.

### Tasks (type Task, no parent)

| Key | Current type | Status | Proposed type | Proposed parent | Confidence | Reasoning |
| --- | --- | --- | --- | --- | --- | --- |
| SCRUM-87 | Task | Done | Story | E00 (new) | Clear | Reconciling the Playwright scaffold with the test workbook is cross-cutting test infrastructure, not the delivery of any single story. |
| SCRUM-88 | Task | In Review | Story | E00 (new) | Clear | App shell branding and source-data concerns cut across the whole frontend; no single story owns it. Remains open, so E00 provides an honest home. |
| SCRUM-89 | Task | Done | Story | E00 (new) | Clear | Landing, login, and protected routing shell is foundational infrastructure; it predates and enables multiple E01 stories rather than delivering one. |
| SCRUM-90 | Task | Done | Close as superseded | — | Clear | Summary explicitly states "[SUPERSEDED by ADR-015]". Close with a "Won't Do / Superseded" resolution. Do not reparent. |
| SCRUM-91 | Task | Done | Story | E00 (new) | Clear | Consolidating organiser persistence on cookie sessions (ADR-015) is a cross-cutting architecture change, not a single-story deliverable. |
| SCRUM-92 | Task | Done | Story | E00 (new) | Clear | Replacing routing/auth fixme cases with real Playwright tests is test-infrastructure work spanning the whole auth surface. |
| SCRUM-109 | Task | Done | Story | E00 (new) | Clear | Setting up TEST_DATABASE_URL via a test schema is CI/test-harness infrastructure. |
| SCRUM-110 | Task | Done | Story | E00 (new) | Clear | A live Postgres migration roundtrip for a specific migration file is release-engineering infrastructure, not a user story. |
| SCRUM-111 | Task | To Do | Story | E00 (new) | Clear | Decommissioning Vercel's git integration once Actions-based deploy is stable is a deployment-pipeline task. |
| SCRUM-112 | Task | To Do | Story | E00 (new) | Clear | Preview-deploy cleanup workflow is CI/CD infrastructure. |
| SCRUM-116 | Task | To Do | Story | E00 (new) | Clear | Frontend skeleton, route list, building blocks, and page templates are platform infrastructure shared by all frontend stories. |
| SCRUM-117 | Task | To Do | Story | E00 (new) | Clear | A shared design language document (`design.md`) serves the whole frontend, not a single story. |
| SCRUM-118 | Task | To Do | Story | E00 (new) | Clear | A screen inventory mapping all Release 1 stories to routes and page patterns is a planning/documentation artefact for the whole release. |
| SCRUM-119 | Task | To Do | Subtask | SCRUM-43 (E05-S04) | Needs Bryan's call | Moving Amareet's Sprint 2 pages onto the skeleton is frontend delivery work. The most plausible parent is SCRUM-43 (E05-S04 Block venue for maintenance), but Bryan should confirm this is Amareet's current Sprint 2 assignment before linking. Alternative: keep as E00 Story if the pages span multiple stories. |
| SCRUM-120 | Task | To Do | Subtask | SCRUM-43 (E05-S04) | Needs Bryan's call | "Frontend: maintenance blocks screen (E05-S04), skeleton pilot" names E05-S04 explicitly. Proposed as `Frontend:` Subtask of SCRUM-43. Confirm the story is the correct current parent. |

### Stories with bracket tags (type Story, no parent)

| Key | Current type | Status | Proposed type | Proposed parent | Confidence | Reasoning |
| --- | --- | --- | --- | --- | --- | --- |
| SCRUM-93 | Story | Done | Subtask | SCRUM-23 (E01-S08 Create an account) | Clear | Email verification token flow is a backend slice of E01-S08. Convert to `Backend:` Subtask of SCRUM-23. |
| SCRUM-94 | Story | Done | Subtask | SCRUM-16 (E01-S01 Log in) | Clear | Login lockout state machine is a backend slice of E01-S01. Convert to `Backend:` Subtask of SCRUM-16. |
| SCRUM-95 | Story | Done | Subtask | SCRUM-23 (E01-S08 Create an account) | Needs Bryan's call | Landing, login, and router shell contributed to E01-S08 auth delivery. If the landing/router work spans more than one E01 story, Bryan may prefer to keep it as a Story under E00. |
| SCRUM-96 | Story | Done | Story | E03 (Epic, SCRUM-6) | Needs Bryan's call | "[E03] Coordinator functional screens (mock data)" spans all E03 stories; it cannot map to one story parent. Attach directly to Epic E03 as an Epic-level Story, or split by screen and create one Subtask per story. Bryan decides which approach. |
| SCRUM-97 | Story | Done | Story | E05 (Epic, SCRUM-8) | Needs Bryan's call | Same as SCRUM-96 but for E05 (Venue Staff). Spans all E05 stories. Attach directly to Epic E05 or split by screen. |
| SCRUM-98 | Story | Done | Story | E07 (Epic, SCRUM-10) | Needs Bryan's call | Same pattern for E07 (Technical Support). |
| SCRUM-99 | Story | Done | Story | E14 (Epic, SCRUM-15) | Needs Bryan's call | Same pattern for E14 (Admin). |
| SCRUM-100 | Story | Done | Story | E00 (new) | Clear | "[Docs] Migrate product backlog and test cases to Markdown" is repo-wide documentation infrastructure, not a user story deliverable. |
| SCRUM-101 | Story | Done | Story | E00 (new) | Clear | "[E01-EXT] Vitest and React Testing Library harness" is test-infrastructure setup, not a user story. The E01-EXT tag signals it was ancillary to E01 delivery. |
| SCRUM-102 | Story | Done | Story | E00 (new) | Clear | "[E14-EXT] TC_ID coverage audit and CI-friendly mapping" is tooling infrastructure. |
| SCRUM-103 | Story | Done | Story | E00 (new) | Clear | "[E14-EXT] Migrate ADR and BDR decision documents to Markdown" is repo-wide documentation infrastructure. |
| SCRUM-104 | Story | Done | Story | E00 (new) | Clear | "[E14-EXT] Contribution guides for backlog, stories, BDR, tests" is repo-wide documentation infrastructure. |
| SCRUM-105 | Story | Done | Close as duplicate | — | Clear | Summary explicitly states "[DUPLICATE of SCRUM-93]". Close with a "Duplicate" resolution and link to SCRUM-93. Do not reparent. |
| SCRUM-106 | Story | Done | Story | E00 (new) | Needs Bryan's call | "[E02/E03/E09] Frontend full route coverage" spans three epics. It cannot be an honest Subtask of any single story. Placing it under E00 is the least dishonest option; Bryan may alternatively split it into per-story Subtasks if that effort is worthwhile retrospectively. |
| SCRUM-107 | Story | Done | Subtask | SCRUM-23 (E01-S08 Create an account) | Clear | "[E01] Wire verification email into registration + notification outbox" is a backend slice of E01-S08. Convert to `Backend:` Subtask of SCRUM-23. |
| SCRUM-108 | Story | Done | Story | E00 (new) | Clear | "[Docs] ADR + BDR docx export script for reviewer handoffs" is repo tooling/documentation infrastructure. Closed today; archive under E00 for traceability. |

---

## Summary counts

| Action | Count |
| --- | --- |
| Move to E00 as Story (requires E00 Epic creation) | 23 |
| Convert to Subtask of an existing Story | 5 (SCRUM-93, 94, 107, 119, 120) |
| Link to Epic directly (spans whole epic, no single story parent) | 4 (SCRUM-96, 97, 98, 99) |
| Close as superseded | 1 (SCRUM-90) |
| Close as duplicate | 1 (SCRUM-105) |
| Needs Bryan's call on exact parent | 7 (SCRUM-95, 96, 97, 98, 99, 106, 119, 120) |
| **Total orphans addressed** | **45** |

---

## Execution order

1. **Bryan decides on E00.** Without E00, 23 moves cannot proceed cleanly.
2. **Create Epic E00** in Jira if approved: summary `E00 Platform, Tooling &
   Delivery`, Epic Name `E00`.
3. **Close SCRUM-90** (superseded) and **SCRUM-105** (duplicate) first — no
   parent needed, and it reduces the orphan count before bulk moves.
4. **Move the 23 clear E00 Stories** in one or two bulk-move operations
   (they are all the same target: E00).
5. **Convert SCRUM-93, 94, 107** to Subtasks of SCRUM-23 / SCRUM-16 via the
   UI Move wizard (group by target parent).
6. **Confirm and convert SCRUM-119 and SCRUM-120** after Bryan has verified
   the correct parent.
7. **Link SCRUM-96, 97, 98, 99** to their respective Epics via the Epic Link
   field; decide whether to split or leave as Epic-level Stories.
8. **Resolve SCRUM-95 and SCRUM-106** based on Bryan's judgement on scope.
9. Verify the board and backlog show zero unparented non-Epic issues.

---

## Items outside scope of this plan

- SCRUM-2 through SCRUM-15 (Epics) — correctly structured, not touched.
- SCRUM-16 through SCRUM-86 (Stories parented to Epics) — correctly
  structured, not touched.
- SCRUM-113 through SCRUM-115 and SCRUM-121 through SCRUM-126 (existing
  Subtasks) — already correctly structured, used as the reference pattern.
- Sprint assignment, story points, and acceptance criteria for any ticket —
  out of scope for this structural reorg; address separately if needed.
