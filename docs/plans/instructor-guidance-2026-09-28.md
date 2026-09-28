# Instructor guidance review - 28 September 2026

Source: instructor announcement supplied by the operator on 28 September 2026.
This applies that guidance to the existing `CONTRIBUTING.md` Definition of Done
and `docs/source-of-truth.md`; it changes no story acceptance criteria, estimates,
sprint dates or Jira states.

## What changes now

| Guidance | Repository evidence and action |
| --- | --- |
| Generate incrementally by story | Review existing generated screens against their owning stories; use targeted implementation/fix PRs from now on |
| Audit before ready/done | Retain the existing human review and acceptance gates; distinguish PR readiness from parent-story completion |
| Branches last roughly 1-3 days | Make that target explicit; stop adding scope to old integration branches and finish their reviews |
| Consistent sprint duration | Keep the agreed cadence; document exceptional changes and actual duration rather than silently moving dates |
| AI-assisted early finish | Close early only after team validation; label shortened-sprint metrics and adapt future planning |
| Learn from early mistakes | Bring generated-but-unvalidated scope, ageing branches and corrections to the next class review |

## Current PR implications

- #126 is a point-in-time coverage audit, not proof of story completion or a
  newly enforced coverage threshold.
- #127 contains three explicit presentation placeholders (E01-S01, E09-S04,
  E06-S04). Its existing multi-story scaffold history is an early workflow
  exception, not a pattern to extend. Review it as scaffolding and implement each
  owning story separately; merging it cannot mark those stories Done.
- #136 follows the now-merged calendar API #134. Verify the combined UI/API
  acceptance scope and obtain renewed peer review after the main refresh.
- #137 connects organiser reads. Its remaining mocked clarification/change/cancel
  behaviour stays outside delivered scope and needs the owning-story work.
- #144 and #145 are focused maintenance PRs. Dependency installation and scanner
  configuration checks are not application acceptance evidence.

Repeated main updates have conflicted in shared agent-history files and dismissed
approvals. Resolve conflicts and regenerate inventories before asking for the
final review. Keep the protected review gate; do not bypass it to meet a branch
age target. Record continuity in concise entries and retain existing histories.

## Next team review

1. Walk through each delivered story's acceptance criteria and actual test/manual
   evidence. Keep missing integration or human validation visible in Jira.
2. Identify old branches, freeze extra scope, and agree a reviewer and next action
   for each; split future work by story or focused maintenance task.
3. Confirm the existing sprint cadence. If early closure or exceptional changes
   are proposed, record the reason, original commitment and actual timestamps.
4. Discuss these corrections at the upcoming class review and check progress at
   the next retrospective. No retrospective status or velocity rewrite is implied.
