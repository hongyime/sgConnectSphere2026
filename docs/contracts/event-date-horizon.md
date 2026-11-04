# Event and Session date horizon — E02-S07 / SCRUM-180

Sources: E02-S07 in `docs/backlog/release-1/E02-event-request-submission.md`,
TC_E02S07_01–05 in `docs/testing/cases/E02.md`, C-71, C-72 and T-87.
Event-level validation was delivered in #389; this follow-up integrates the
E04 Session write path from #401/#408.

## Submission rules

- Use the current calendar date in Asia/Singapore plus two calendar years,
  inclusively. Clamp leap day to the target month's last day; never use 730 days.
- Preserve the existing future-instant rule and add no fixed minimum lead time.
- Event dates are checked on create and draft submission. On draft submission,
  check every independent Session start/end before writing the Event or notices.
- A past Session returns HTTP 400 `session_date_in_past`. A later-than-boundary
  Session returns HTTP 400 `session_date_outside_horizon`. Both carry `sessionId`,
  `sessionTitle`, one-based `sessionNumber`, `field: startAt | endAt` and
  `maximumDate: YYYY-MM-DD`. The number follows the same time/id ordering as the
  Session editor; unnamed Sessions use `Untitled Session`.
- Draft Session saves may retain past or farther dates so the Organiser can
  correct them. Saving a draft does not assert submission acceptance.
- The Organiser form names the Session and date field, explains the allowed
  date and asks for correction. A refused submission leaves the draft, Session
  rows and submission history unchanged. Correcting and resubmitting succeeds.
- A sole Session retains migration 0014's existing Event-range sync: validate its
  prospective Event dates, not the older range that the same update replaces.
  Direct Event creation still creates only that mirrored default Session.

## Transaction and concurrency

Submission locks Event, then Session rows, and reads their persisted dates in the
same transaction. Draft Session creation and editing lock Event first and recheck
that it is still Draft. A writer queued behind submission therefore returns 409
instead of modifying a submitted request. Deletion and Planning/request-approved
Session edits retain their existing lifecycle rules and transaction paths.

No new Session API, schema, dependency or environment variable is introduced.
This submission rule does not broaden post-approval editing rights or create an
Event-envelope requirement beyond the canonical date-horizon scope.

## Acceptance evidence

Automated coverage includes all five canonical cases, real API/PostgreSQL
multi-Session refusal/correction and boundary submission, lock contention, and
real desktop/mobile browser correction/resubmission. Run outcomes and exact
commit/working-tree boundaries are recorded in new T-65 files.

The human click-through is `docs/testing/manual/E02-S07-click-through.md`.
Agent-driven browser checks are automated evidence, not hand-taken screenshots.
Human acceptance, independent review, required CI and PO/delegated DoD acceptance
must be recorded before SCRUM-180 is Done. No historical run record is amended.
