# fix/e03-s12-organiser-save-alert

Goal: E03-S12 Show consistent Organiser save success status (owner Le Xin,
Sprint 3, unestimated). The Organiser's saved-edit confirmation uses the shared
`Alert tone="success"` (keeping `role="status"`) like the Coordinator's event
page, instead of a plain paragraph. Fix story for the finding in the E03-S11
manual run (#292); E03-S07 and E03-S11 stay Done.

- Story definition and TC_E03S12_01 to _05: Bryan's PR #296 (draft on
  2026-10-16). No Jira issue yet; Bryan creates it after #296 merges.
- Do not open this PR until #296 merges: the TC IDs only exist there.

## Done so far

- 2026-10-16: `ClientEvents.tsx` renders the saved message with the shared
  `Alert`. New `ClientEvents.saveStatus.test.tsx` covers TC_E03S12_01 to _05
  (stubbed API): Alert tone and role, one PATCH and the reloaded value, invalid
  input, a failed save after an earlier success (Edit clears the old
  confirmation), and Cancel / restricted fields. TC_01 fails on the old
  plain-paragraph code; the other four pin unchanged behaviour. Vitest 413/413,
  typecheck clean, changed line covered on both branches. Exploratory; T-65
  records come with the PR.
- Note: after a save the page reloads the event and briefly shows "Loading
  events…", so the confirmation disappears and returns. Existing behaviour,
  out of scope (no redesign per the story checklist).

## Next

- After #296 merges: merge `main`, regenerate `tc-coverage.md`, re-run tests,
  write T-65 records.
- Le Xin's manual run of TC_E03S12_01 to _05 with hand-taken screenshots
  (T-93); TC_02 also checks the audit row count in the local database.
- Open the PR citing E03-S12, #296 and #292; human review of code and tests.
