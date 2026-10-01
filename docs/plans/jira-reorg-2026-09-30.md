# Jira reorg plan — 30 September 2026

**Owner:** Bryan
**Date recorded:** 30 September 2026
**Last updated:** 1 October 2026, re-read against Jira after review of PR #165
**Scope:** the 31 non-Epic issues that had no parent on 30 September
**Rule reference:** `docs/jira-ticket-classification.md`

Jira is the source of truth. This file records where those 31 sit now and what
is still a decision. It does not keep a second copy of the proposed-parent
table. That table drifted (wrong Epic keys, SCRUM-89 and SCRUM-91 counted under
E00, SCRUM-115 named as an unmoved issue it was never part of) and is removed.

---

## Status

Re-read on 1 October 2026. All 31 now have a parent. Non-Epic issues with no
parent: **0**. SCRUM-115 was never in this set; it was already a Subtask of
SCRUM-37.

| | State |
| --- | --- |
| Epic `E00 Platform, Tooling & Delivery` | exists, as `SCRUM-127` |
| The 31 re-parented | **31 of 31** |
| Children of `SCRUM-127` | 19 |
| Story or Task converted to Subtask | **4 of 6** done (93, 94, 107, 120) |

Where the 31 went:

| New parent | Count | Keys |
| --- | --- | --- |
| `SCRUM-127` (E00) | 19 | 87, 88, 90, 92, 100, 101, 102, 103, 104, 106, 108, 109, 110, 111, 112, 116, 117, 118, 119 |
| `SCRUM-2` (E01) | 7 | 89, 91, 93, 94, 95, 105, 107 |
| `SCRUM-6` (E05) | 2 | 97, 120 |
| `SCRUM-4` (E03) | 1 | 96 |
| `SCRUM-8` (E07) | 1 | 98 |
| `SCRUM-15` (E14) | 1 | 99 |

SCRUM-89 and SCRUM-91 are under E01 (`SCRUM-2`), not under E00. An earlier note
in this file said the opposite. That note was wrong.

Epic keys, so they are not two off again: E03 is `SCRUM-4`, E05 is `SCRUM-6`,
E07 is `SCRUM-8`, E14 is `SCRUM-15`.

---

## What is still left

1. **SCRUM-95** is still a Story under E01 (`SCRUM-2`). Converting it to a
   Subtask of SCRUM-23 (E01-S08) is still Bryan's call. Not done.
2. **SCRUM-119** is still a Task under E00. Converting it to a Subtask of
   SCRUM-43 (E05-S04) is still Bryan's call. Not done. The alternative, if the
   pages span more than that story, is to leave it as an E00 Story.
3. **SCRUM-90** is Done and parented to E00. It is parked there until someone
   closes it as superseded by ADR-015. Parenting it was not a mistake; closing
   it is the remaining tidy.
4. **SCRUM-105** is Done and parented to E01. A Duplicate link to SCRUM-93
   already exists. It is parked there until the resolution is set to Duplicate.
5. **SCRUM-96, 97, 98, 99** are already on the correct Epics (`SCRUM-4`,
   `SCRUM-6`, `SCRUM-8`, `SCRUM-15`). Splitting each into per-story Subtasks is
   optional. Leaving them as Epic-level Stories is enough to close the reorg.
6. **SCRUM-106** is a Story under E00. The earlier open call is resolved by
   leaving it there, unless someone later chooses to split it across E02, E03
   and E09.

The six Subtask candidates were 93, 94, 95, 107, 119 and 120. Four are
Subtasks now:

| Key | Type now | Parent |
| --- | --- | --- |
| SCRUM-93 | Subtask | SCRUM-23 |
| SCRUM-94 | Subtask | SCRUM-16 |
| SCRUM-107 | Subtask | SCRUM-23 |
| SCRUM-120 | Subtask | SCRUM-43 |

The eight rows that needed a call were 95, 96, 97, 98, 99, 106, 119 and 120.
Only 95 and 119 are still open. 120 is decided. 96 to 99 sit on their Epics.
106 sits on E00.

---

## Why E00 exists

Several of these issues are technical enablers that no single user story owns:
CI, repository tooling, test harnesses, deploy configuration, and backlog or
ADR migrations. Forcing them under an arbitrary Story would invent a parent.
`E00 Platform, Tooling & Delivery` (`SCRUM-127`) is that home. Bryan approved
it on 30 September 2026.

Leaving them unparented with a `platform` label was rejected, because
unparented issues do not appear in the Epic hierarchy.

---

## How to convert the two that remain

The Jira REST API on this site cannot change an existing Story or Task into a
Subtask. If Bryan decides SCRUM-95 or SCRUM-119 should move, use the UI:

1. On the backlog, tick the issue.
2. **... (Actions)** → **Bulk change** → **Move**.
3. Choose **Subtask**.
4. On "Select Parent", choose SCRUM-23 for SCRUM-95, or SCRUM-43 for SCRUM-119.
5. Confirm, then check the type, the parent, and that the Epic is inherited.

Do not PUT a Team value onto the new Subtask. Subtasks inherit Team from the
parent, and the API rejects a direct set.
