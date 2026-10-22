# test/SCRUM-54-e07s04-manual-rerun

Re-run the E07-S04 "Reserve equipment for an event" click-through (story
SCRUM-54) by hand with screenshots, as T-93 requires for Sprint 3 Done stories
before the Sprint 3 Review. The story stays Done (T-74, Definition of Done);
this adds a new session record, its evidence folder and a Run-log row only.

## Done

- Ran the 19-step "Click-through script" in
  `docs/plans/scrum-54-implementation-status.md` on `main` at `1b06812`
  against a freshly reset and seeded local database. All 19 steps passed.
- Record: `docs/testing/runs/20261018-003145-Bl0oper-frontend-e2e.md`
  (four TC rows and one MULTIPLE row for the steps with no catalogue case,
  the same split as the 8 October F4 record).
- 22 screenshots by Aaron in
  `docs/testing/runs/evidence/20261018-003145-Bl0oper-frontend-e2e/`,
  99 to 258 KB each, saved unchanged.
- A Run-log row in the story's run record.

## Notes for the reviewer

- The 8 October record (`20261008-144000-Bl0oper-frontend-e2e.md`) is left
  untouched; this one supersedes it as the screenshot evidence.
- EVT-3001's seeded dates (15 Oct 2026) are now in the past. Nothing in the
  reservation or availability code refuses past dates, so the script ran
  unchanged.

## Learnings

- Windows Snipping Tool (Win+Shift+S) only copies to the clipboard unless
  "Automatically save screenshots" is on. Recent snips can still be
  recovered from its temporary folder under the app's package `TempState`.
