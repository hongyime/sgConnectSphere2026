# Week 9 customer Q&A decisions and impact reconciliation

Goal: record the team's selected Week 9 Q&A decisions in canonical BDR Markdown, map every affected requirement/design/code/Jira artifact, and publish reviewable changes without violating active-sprint, source-of-truth, or handoff conventions.

## Done so far

- Archived the eight customer-supplied source files and recorded C-71 to C-136 in workbook order.
- Added team decisions T-79 to T-91; reconciled O-10, O-22 to O-24, O-34, O-37 to O-49 while preserving original customer wording and the C-111/C-119 conflict.
- Rewrote the impact register with selected rules, affected artifacts, implementation tasks, code areas, Jira candidates, and delivery sequence.
- Refreshed Jira read-only on 13 October. Sprint 3 is active through 17 October. SCRUM-44, 46, 47, 48, 49, 50, 60 and 75 are members and keep their existing acceptance assumptions until sprint close under T-73.
- Regenerated the BDR and ADR Word exports for 13 October after merging current main, preserving T-77 and T-78 alongside T-79 to T-91. `docs/source-of-truth.md` points to the dated exports.
- Created the T-65 tooling run record and verified it with the run-record validator. A final clean-tree repository check is still required after the main merge.
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

- Commit and push the generated-export refresh, run the required check on the merged tree, then open the decision-record PR.
- Follow with scoped PRs for future/unassigned stories and canonical test cases (including E02-S05 and E04-S02), then architecture/contract/schema/flow/design artifacts. Do not amend active Sprint 3 stories until 17 October; prepare explicit follow-up tasks for them.
- Keep implementation changes story-sized and gated by the updated canonical requirements, tests, and Definition of Done.
- Regenerate backlog/test workbooks after their Markdown sources change.
- Reconcile Jira only after canonical Markdown merges; no Jira edits have been made.

## Verification

- python scripts/agent_handoffs.py completed at task start.
- Live Jira JQL was read-only and confirmed the Sprint 3 assignments and dates above.
- python scripts/export_adr_bdr_docx.py --date 131026 regenerated the dated exports after merging current main. The BDR export contains Version 8, T-91 and O-49; the ADR export was refreshed. Both open as DOCX files.
- The earlier `python scripts/check.py` run passed before merging current main. Rerun it in a clean temporary worktree before committing/pushing this final tree. Application checks were not run.
- python scripts/check_test_run_records.py passed and validated 181 test-run records, including the new T-65 record.
- git diff --cached --check passed without whitespace errors.
- Do not commit session-managed changes in .agents/STATE.md or .agents/JOURNAL.md.
