# Week 9 customer Q&A decisions and impact reconciliation

Goal: record the team's selected Week 9 Q&A decisions in canonical BDR Markdown, map every affected requirement/design/code/Jira artifact, and publish reviewable changes without violating active-sprint, source-of-truth, or handoff conventions.

## Done so far

- Archived the eight customer-supplied source files and recorded C-71 to C-136 in workbook order.
- Added team decisions T-79 to T-91; reconciled O-10, O-22 to O-24, O-34, O-37 to O-49 while preserving original customer wording and the C-111/C-119 conflict.
- Rewrote the impact register with selected rules, affected artifacts, implementation tasks, code areas, Jira candidates, and delivery sequence.
- Refreshed Jira read-only on 13 October. Sprint 3 is active through 17 October. SCRUM-44, 46, 47, 48, 49, 50, 60 and 75 are members and keep their existing acceptance assumptions until sprint close under T-73.
- Regenerated the BDR and ADR Word exports for 13 October and updated docs/source-of-truth.md.
- Created the T-65 tooling run record and verified it with the run-record validator.
- Left .agents/STATE.md and .agents/JOURNAL.md untouched and unstaged.

## Decisions recorded

- Restore Session under Event; venue bookings and equipment link to Sessions; attendee registration stays event-level with selected Sessions.
- Choose C-119's open-ended block behavior over conflicting C-111; buffers do not surround maintenance blocks.
- Venue loss returns a Confirmed event to Planning and immediately notifies its Coordinator.
- Safety Review starts automatically after all arrangements are confirmed; the system records both factor checklist and decision/comments.
- Leads own all assignment/reassignment; no Coordinator request flow; Lead-only unassigned queue.
- No default hold expiry; expiry/warning are configured per hold; at most two reasoned extensions.
- Enforce per-Session and combined event capacity; over-capacity requests remain Pending for Organiser review, with approval constrained by both limits.
- One account may hold multiple roles; seed data assigns one.
- No fixed minimum event lead time; reject dates more than two years ahead as team policy.
- Pending change requests become Obsolete automatically when an event closes.
- Venue-to-staff assignments are setup data without a roster screen.
- Add E02-S05 to Release 1 with its existing three-point estimate.
- Venue Staff may edit blocks; retain history and notify affected Coordinators on lift.

## Not done / next step

- Commit and push this decision-record PR.
- Update future-sprint/unassigned stories and canonical test cases, including E02-S05 and E04-S02. Do not amend active Sprint 3 stories until 17 October; prepare corrections as follow-up work.
- Reconcile schema, ADRs, booking contracts, diagrams, flows, design notes and code in scoped follow-up branches.
- Regenerate backlog/test workbooks after their Markdown sources change.
- Reconcile Jira only after canonical Markdown merges; no Jira edits have been made.

## Verification

- python scripts/agent_handoffs.py completed at task start.
- Live Jira JQL was read-only and confirmed the Sprint 3 assignments and dates above.
- python scripts/export_adr_bdr_docx.py --date 131026 generated both dated exports; the BDR export contains Version 8, T-91 and O-49, and both exports open as DOCX files.
- python scripts/check.py passed in a clean temporary worktree with the staged documentation patch: repository hygiene and 87 tooling tests passed. Application checks were not run.
- python scripts/check_test_run_records.py passed and validated 181 test-run records, including the new T-65 record.
- git diff --cached --check passed without whitespace errors.
- Do not commit session-managed changes in .agents/STATE.md or .agents/JOURNAL.md.
