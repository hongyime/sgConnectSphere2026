---
date: 2026-11-06T14:49:37+08:00
runner: xiangyingg
scope: tooling
environment: local
run_type: automated
test_case_version: "051126"
database: none
commit: d4d9614
pr: 435
---

# TC05 evidence review follow-up

Scope: reviewer-requested working diff on d4d9614. Remove the shared .gitignore
allow-entry and unnecessary HTML artifact; preserve original manual evidence.
Aaron explicitly delegated Xiang Ying's own records/screenshots in #435. This
record adds Le Xin's issue note without rewriting the 5 November manual run.
No application suite or new manual browser execution was performed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Repository setup and tooling | PASS | `python scripts/setup.py` completed; `python scripts/check.py` passed repository hygiene and 197 tooling tests. Existing secondary-worktree warnings remain. |
| MULTIPLE | Documentation guard | PASS | `python scripts/doc_guard.py`: zero errors, 160 existing metadata warnings. |
| MULTIPLE | Original evidence integrity and scope | PASS | Four screenshot files and both original records byte-match the parent commit; .gitignore matches main. This checks preservation, not application behavior. |
| TC_E02S07_05 | Reproduce reported submission-message discrepancy | SKIP | Not rerun in this tooling session. The potential defect below remains unresolved; the earlier supplemental PASS is not evidence that this discrepancy is fixed. |

## Potential defect: failure message after persisted submission

**Status: reported observation; not reproduced or diagnosed.** Raised by Le Xin
in PR #435. Source: `20261105-215902-xiangyingg-frontend-e2e.md`, Execution and
attribution, first Event (`a5ab86c2-c340-4996-89c6-5163ec276431`,
`TC05 Retake Xiang Ying 5 Nov`). That immutable record reports a generic
submission-error capture, while read-only database inspection found the Event
Under review and both corrected future Session ranges retained. The named
Under review result is archived as
`evidence/20261105-215902-xiangyingg-frontend-e2e/TC_E02S07_05-3.png`.
The generic-error capture itself is not one of that record's four archived
images; this follow-up does not invent an attachment or a new observation.

Expected: one successful submission should persist the Event and show a
consistent success/Under review result. A failed submission should show a
failure consistent with persisted state. If a successful submit showed the
reported error, the feedback could mislead the Organiser into retrying.

Uncertainty: the available evidence does not correlate that error to one exact
HTTP request or prove whether it followed a retry after successful submission.
Duplicate-submit rejection, stale UI and response handling are hypotheses,
not established causes. Do not classify this as a confirmed backend failure
or quietly discard it as irrelevant.

Investigation handoff to the Event submission/frontend owner:

1. Use one fresh dedicated Draft with a future Event and two Sessions; correct
   a past Session through the browser and save it.
2. Submit once. Capture Event ID, timestamp, browser Network response and the
   immediate UI message; compare with persisted status for that same request.
3. Reload/view the named Event and distinguish first submission from any later
   retry. Check frontend response handling against the API status/body.
4. If reproduced, record a linked defect/follow-up and verify the fix with a
   focused regression and human evidence. Until then this issue remains open
   in this record; no fix, story acceptance or Jira transition is claimed.
