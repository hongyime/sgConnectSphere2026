# test/SCRUM-86-e14-s02-rerun

Goal: re-run E14-S02 (SCRUM-86, Done in Sprint 3) by hand with screenshots
before the Sprint 3 Review, as T-93 requires for Sprint 3 Done stories. New
T-65 record only; the story stays Done (T-74) and the 8 October record is
unchanged. No application code changes.

## Done

- Le Xin's manual re-run at `main` `8599ad2`: TC_E14S02_01, _02, _04, _05 and
  _08 all PASS. Record
  `docs/testing/runs/20261016-164756-lexinphun2024-debug-frontend-e2e.md` with
  eight hand-taken screenshots (including TC_E14S02_01-0 for the set-up).
- EVT-2003's required fields were completed through the Organiser form; no
  database shortcut was needed (E03-S11 added registration setup).
- TC_05's database step (UPDATE/DELETE refused by the trigger) was run by the
  agent against the local disposable database.

## Next

- Review and merge. Findings outside E14-S02 (raw UTC dates, Organiser
  activity names) are tracked separately.
