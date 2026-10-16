# test/SCRUM-49-e06s05-manual-rerun

Re-run the E06-S05 "Hold a venue tentatively" manual check (story SCRUM-49) with
hand-taken screenshots, as T-93 (#279) requires for Sprint 3 Done stories before
the Sprint 3 Review on 17 October 2026. The story stays Done (T-74); this adds a
new session record and its evidence folder only.

## Done

- Ran `docs/testing/manual/E06-S05-click-through.md` on `main` at `0379cb2`
  against a fresh local seed (migrations 0001 to 0019). All six rows PASS.
- Record: `docs/testing/runs/20261016-090933-amareetkm2024-del-frontend-e2e.md`.
- 15 screenshots by Amareet in
  `docs/testing/runs/evidence/20261016-090933-amareetkm2024-del-frontend-e2e/`,
  named by TC_ID (`MULTIPLE-<label>` for the MULTIPLE row), 18 to 66 KB each.

## Notes for the reviewer

- The script still matches `main` after #261 and #274, with one wording change
  outside the script's checks: after "Submit booking request" the Activity log
  row now reads "Venue booking requested for Cedar Auditorium" (#274), not
  "Tentative hold … submitted as a booking request".
- Two extensions were made in steps 9–10 and Lotus Room was released twice; both
  explained in the record. Neither is a failure.
- #279 (T-93) is not merged yet; this follows its layout, like #281 and #272.

## Next

- Same re-run for E07-S06 (SCRUM-56) and E07-S07 (SCRUM-57), each as its own
  record.
