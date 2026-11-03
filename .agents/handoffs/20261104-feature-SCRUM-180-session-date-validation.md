Complete E02-S07 / SCRUM-180 Session-date submission validation after merged E04-S02, following Event-level delivery #389. Preserve draft saves and sole-Session sync, validate all independent Sessions atomically at submission, identify the Session and field in the UI, and record honest automated/acceptance evidence without inventing a human run.

## Scope

- Base: main 267348f3. Existing Event horizon/date helpers and structured 400 response are reused.
- Submission checks run while holding Event and Session locks. Draft Session writers recheck draft status under the Event lock so they cannot bypass a completed submission.
- No new migration, dependency, environment variable, Session editor or production write.
- Independent human review, required CI and PO acceptance remain separate from implementation.

## Observed verification before latest-main sync

- Base 267348f3 plus working diff: backend 721 passed/1 existing database-only
  skip; frontend 810 passed; API/Session/lifecycle database slice 22 passed;
  real desktop/mobile browser refusal/correction/reload/submission 4 passed.
- New pure validator has zero uncovered statements and all branch counters hit
  in c8 JSON. SQL/locking covered by native PostgreSQL rather than mock SQL.
- Preserve initial extension-race and browser-fixture failures in T-65 records.
- Synced latest main 41c16563 (#415) cleanly before publication. Re-run the
  combined-tree checks; no human manual run or screenshots claimed.
- Ponytail review: reuse date helpers and Session reader, preserve single-Session
  sync and Event-first locking, no new migration/dependency/env; no blocker found.

## Final combined-tree verification

- Main 41c1656 plus working diff: backend 723 passed/1 existing skip; frontend
  812 passed; native PostgreSQL 22 passed; real desktop/mobile browser 4 passed;
  typechecks/build passed and runtime 26 passed. Final immutable regression
  record: 20261104-003500-xiangyingg-full-regression.md.
- Human acceptance remains open; follow the new click-through guide.

## Human evidence added

- PR #420: supplied TC01 start-field refusal screenshot retained unchanged in
  20261104-012731-xiangyingg-frontend-e2e. Visible title is New Session.
- Saved input dates, TC01 end-field refusal and TC02–05 remain to capture.
  Record does not claim full manual acceptance.

## Manual evidence archive audit

- Added available human TC05 captures in 20261104-023314-xiangyingg-frontend-e2e.
- Only post-correction submission/persistence is claimed; agent corrected the
  fixture via API, and 05-2 shows Event fields rather than Session dates.
- Earlier TC01–04 chat captures are absent from supplied local locations;
  user must restore/reattach originals before the full evidence archive closes.
