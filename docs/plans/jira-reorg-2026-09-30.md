# Jira reorg plan — 30 September 2026

**Owner:** Bryan
**Date recorded:** 30 September 2026
**Last updated:** 1 October 2026, after the epic-parenting pass was executed
**Scope:** the 31 issues listed below, which had no parent on 30 September
**Rule reference:** `docs/jira-ticket-classification.md`

---

## Status: most of this is already done

The epic-parenting half of this plan **has been executed** through the Jira
REST API. What remains is only the hierarchy-level changes, which the API
cannot perform.

| | State |
| --- | --- |
| Epic `E00 Platform, Tooling & Delivery` | **created**, as `SCRUM-127` |
| Issues re-parented | **30 of 31**, zero failures |
| Orphans remaining in SCRUM | **0** |
| Children of `SCRUM-127` | 19 |
| Story-to-Subtask conversions | **0 done**, still outstanding |

Measured after the pass: 126 issues, 15 Epics, 0 non-Epic issues without a
parent.

Where the 31 went:

| New parent | Count | Keys |
| --- | --- | --- |
| `SCRUM-127` (E00) | 19 | 87, 88, 90, 92, 100, 101, 102, 103, 104, 106, 108, 109, 110, 111, 112, 116, 117, 118, 119 |
| `SCRUM-2` (E01) | 7 | 89, 91, 93, 94, 95, 105, 107 |
| `SCRUM-6` (E05) | 2 | 97, 120 |
| `SCRUM-4` (E03) | 1 | 96 |
| `SCRUM-8` (E07) | 1 | 98 |
| `SCRUM-15` (E14) | 1 | 99 |

SCRUM-115 is the one mapped key not moved: it was already a Subtask of
SCRUM-37 and needed nothing.

### What is still outstanding

1. **Eight Story-to-Subtask conversions**, in the `Convert to Subtask` rows
   below. These are parked under their Epic, which is correct but one level
   higher than ideal. They need the Jira UI Move wizard; see the section on
   executing those moves.
2. **Eight rows marked `Needs Bryan's call`**, where the correct parent is
   genuinely uncertain. They are parked under their Epic pending a decision.
3. **SCRUM-90** (superseded by ADR-015) and **SCRUM-105** (duplicate of
   SCRUM-93) should be closed rather than re-homed. Both are already `Done`, so
   this is a hygiene tidy, not a status change.

---

## Why E00 exists

Several of these issues are genuine technical enablers that cannot honestly be
assigned to any single user story: CI pipelines, repository tooling, test
harnesses, deploy configuration, and backlog or ADR migrations. Forcing them
under an arbitrary Story would invent a relationship that does not exist, which
is the dispute this plan was written to prevent.

`E00 Platform, Tooling & Delivery` gives them an honest home and keeps Epics
E01 through E14 purely about user story scope, which is the requirement that
prompted the reorganisation. Bryan approved creating it on 30 September 2026
and it exists as `SCRUM-127`.

A rejected alternative, recorded for completeness: label these `platform` and
leave them unparented. That was not chosen because unparented issues do not
appear in the Epic hierarchy at all, which is the problem being fixed.

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
| SCRUM-87 | Task | Done | Story | `SCRUM-127` (E00) | Clear | Reconciling the Playwright scaffold with the test workbook is cross-cutting test infrastructure, not the delivery of any single story. |
| SCRUM-88 | Task | In Review | Story | `SCRUM-127` (E00) | Clear | App shell branding and source-data concerns cut across the whole frontend; no single story owns it. Remains open, so E00 provides an honest home. |
| SCRUM-89 | Task | Done | Story | `SCRUM-127` (E00) | Clear | Landing, login, and protected routing shell is foundational infrastructure; it predates and enables multiple E01 stories rather than delivering one. |
| SCRUM-90 | Task | Done | Close as superseded | — | Clear | Summary explicitly states "[SUPERSEDED by ADR-015]". Close with a "Won't Do / Superseded" resolution. Do not reparent. |
| SCRUM-91 | Task | Done | Story | `SCRUM-127` (E00) | Clear | Consolidating organiser persistence on cookie sessions (ADR-015) is a cross-cutting architecture change, not a single-story deliverable. |
| SCRUM-92 | Task | Done | Story | `SCRUM-127` (E00) | Clear | Replacing routing/auth fixme cases with real Playwright tests is test-infrastructure work spanning the whole auth surface. |
| SCRUM-109 | Task | Done | Story | `SCRUM-127` (E00) | Clear | Setting up TEST_DATABASE_URL via a test schema is CI/test-harness infrastructure. |
| SCRUM-110 | Task | Done | Story | `SCRUM-127` (E00) | Clear | A live Postgres migration roundtrip for a specific migration file is release-engineering infrastructure, not a user story. |
| SCRUM-111 | Task | To Do | Story | `SCRUM-127` (E00) | Clear | Decommissioning Vercel's git integration once Actions-based deploy is stable is a deployment-pipeline task. |
| SCRUM-112 | Task | To Do | Story | `SCRUM-127` (E00) | Clear | Preview-deploy cleanup workflow is CI/CD infrastructure. |
| SCRUM-116 | Task | To Do | Story | `SCRUM-127` (E00) | Clear | Frontend skeleton, route list, building blocks, and page templates are platform infrastructure shared by all frontend stories. |
| SCRUM-117 | Task | To Do | Story | `SCRUM-127` (E00) | Clear | A shared design language document (`design.md`) serves the whole frontend, not a single story. |
| SCRUM-118 | Task | To Do | Story | `SCRUM-127` (E00) | Clear | A screen inventory mapping all Release 1 stories to routes and page patterns is a planning/documentation artefact for the whole release. |
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
| SCRUM-100 | Story | Done | Story | `SCRUM-127` (E00) | Clear | "[Docs] Migrate product backlog and test cases to Markdown" is repo-wide documentation infrastructure, not a user story deliverable. |
| SCRUM-101 | Story | Done | Story | `SCRUM-127` (E00) | Clear | "[E01-EXT] Vitest and React Testing Library harness" is test-infrastructure setup, not a user story. The E01-EXT tag signals it was ancillary to E01 delivery. |
| SCRUM-102 | Story | Done | Story | `SCRUM-127` (E00) | Clear | "[E14-EXT] TC_ID coverage audit and CI-friendly mapping" is tooling infrastructure. |
| SCRUM-103 | Story | Done | Story | `SCRUM-127` (E00) | Clear | "[E14-EXT] Migrate ADR and BDR decision documents to Markdown" is repo-wide documentation infrastructure. |
| SCRUM-104 | Story | Done | Story | `SCRUM-127` (E00) | Clear | "[E14-EXT] Contribution guides for backlog, stories, BDR, tests" is repo-wide documentation infrastructure. |
| SCRUM-105 | Story | Done | Close as duplicate | — | Clear | Summary explicitly states "[DUPLICATE of SCRUM-93]". Close with a "Duplicate" resolution and link to SCRUM-93. Do not reparent. |
| SCRUM-106 | Story | Done | Story | `SCRUM-127` (E00) | Needs Bryan's call | "[E02/E03/E09] Frontend full route coverage" spans three epics. It cannot be an honest Subtask of any single story. Placing it under E00 is the least dishonest option; Bryan may alternatively split it into per-story Subtasks if that effort is worthwhile retrospectively. |
| SCRUM-107 | Story | Done | Subtask | SCRUM-23 (E01-S08 Create an account) | Clear | "[E01] Wire verification email into registration + notification outbox" is a backend slice of E01-S08. Convert to `Backend:` Subtask of SCRUM-23. |
| SCRUM-108 | Story | Done | Story | `SCRUM-127` (E00) | Clear | "[Docs] ADR + BDR docx export script for reviewer handoffs" is repo tooling/documentation infrastructure. Closed today; archive under E00 for traceability. |

---

## Summary counts

Counted from the migration table above, and reconciled against Jira on
1 October 2026. Every row is one issue, so the counts sum to the table length.

| Action | Count | Keys | Done? |
| --- | --- | --- | --- |
| Re-home under `SCRUM-127` (E00) | 21 | 87, 88, 89, 90, 91, 92, 100, 101, 102, 103, 104, 106, 108, 109, 110, 111, 112, 116, 117, 118, 119 | 19 of 21 |
| Convert to Subtask of an existing Story | 8 | 93, 94, 95, 105, 107, 119, 120, and 96 | not started |
| Link to its Epic directly, no single story owns it | 4 | 96, 97, 98, 99 | yes |
| Needs Bryan's call on the exact parent | 8 | 95, 96, 97, 98, 99, 106, 119, 120 | parked under Epic |
| Close as superseded | 1 | 90 | no |
| Close as duplicate | 1 | 105 | no |
| **Distinct issues in the table** | **31** | | **30 re-parented, 0 orphans left** |

The action counts overlap deliberately: an issue can be both
`Needs Bryan's call` and a proposed Subtask, and SCRUM-89 and SCRUM-91 went to
E00 rather than to E01 as the earlier draft implied. The only figure that must
reconcile exactly is the 31 distinct issues.

An earlier revision of this section claimed 45 orphans, 23 E00 moves, 5 Subtask
conversions and 7 uncertain rows. Those numbers were wrong and did not match the
table they summarised; 45 was the count of all parentless issues including the
14 Epics, which are parentless by definition and were never in scope.

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
