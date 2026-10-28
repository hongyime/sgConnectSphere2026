# test/SCRUM-209-e09-manual-runs

Record the manual end-to-end runs (T-65, T-93) for Amareet's three merged E09
stories in one PR: E09-S01 (SCRUM-63, run subtask SCRUM-209), E09-S02 (SCRUM-64,
SCRUM-212) and E09-S03 (SCRUM-65, SCRUM-215). Merging closes the three run
subtasks; the stories then wait for the PO's acceptance receipt under the DoD (#330).

## Done

- `docs/testing/manual/E09-S01-S03-preconditions.sql`: the `setup` stage makes
  four events (EVT-9201 to EVT-9204), four small venues and four attendee
  copies, so every case is reachable by clicking; the `tc11` stage is
  TC_E09S02_11's arrangement change.
- `docs/testing/manual/E09-S01-S03-click-through.md`: one ordered sitting, parts
  A (S01), B (S02) and C (S03), with wording checked against the code on `main`
  at `f3df479`.
- The run on 28 Oct 2026, 12:57 to 13:25, by Amareet: 21 cases PASS, 3 SKIP
  (TC_E09S02_03, TC_E09S03_07, TC_E09S03_08, all covered by automated
  real-database or unit tests). There are three records, `20261028-125700`,
  `-130500` and `-131500`, with 24 hand-taken screenshots.

## Notes

- TC_E09S03_02 was entered as 05/12/2026; the sheet now uses the case's
  10/12/2026.
- The audit log showed 11 `Access Denied` rows from pages outside the script,
  probably the browser preloading old URLs; all were correctly refused.
- The page allows a withdrawal deadline before registration opens. The ACs don't
  forbid it, so it's noted as a possible improvement.

## Next

- E09-S07 (SCRUM-69), the Organiser registration list.
