# Event date horizon — E02-S07 / SCRUM-180

This implementation increment validates submitted Event start/end dates. It does
not complete independent Session acceptance. Sources: E02-S07 in
`docs/backlog/release-1/E02-event-request-submission.md`, TC_E02S07_01–05 in
`docs/testing/cases/E02.md`, and decisions C-71, C-72 and T-87.

## Implemented Event contract

- Use the current calendar date in Asia/Singapore plus two calendar years,
  inclusively. Clamp 29 February to the target month's last day; do not use 730 days.
- Compare Singapore calendar dates, including the whole last allowed day.
- Submission validates both Event dates. Beyond-horizon dates return HTTP 400,
  `event_date_outside_horizon`, `field: startAt | endAt`, and `maximumDate`.
- Preserve existing past-date validation and normal range/required-field checks.
  Add no fixed minimum lead time.
- Draft saves can retain farther dates; submission rechecks the complete draft.
  A refused submission leaves persisted Event and Session data unchanged.
- The Organiser form names the offending Event field and maximum date.
- The database's sole default Session mirrors the validated Event range.

## E04 integration handoff — still required

The E04 Session authoring owner must apply the same calendar rule to every
Session range at submission, preserve drafts, and recheck them on submission.
Errors must identify the offending Session and date field. Valid Event dates
must not bypass a past or beyond-horizon Session. Reuse
`backend/src/modules/eventLifecycle/dateHorizon.ts`; retain the existing
past-date rule. Confirm the Session error payload with the frontend owner when
that write path is designed; this increment defines no new Session API.

No independent Session date creation/edit API exists in the merged base used
here. TC_E02S07_05 and the independent Session portions of TC01–04 remain open.
The Event-only integration test deliberately labels its scope; it is not proof
of complete multi-Session acceptance.

## Human acceptance handoff

Use a test environment and an Organiser with a client organisation. Derive dates
from today's Asia/Singapore calendar date; the canonical examples are historical.
Do not change the computer clock. For Event-only evidence, submit a request one
day beyond the maximum, at the maximum, the next day, and in the past; record
field errors or normal submission results. Save a farther draft, submit it,
verify refusal, correct the dates and submit successfully. Capture event/draft
identity, entered dates, and the visible result. Record the tested commit,
environment and observations using `docs/testing/runs/README.md`.

Run the canonical multi-Session cases only after the E04 write path is integrated.
No human run or screenshots are claimed by this implementation. Independent
human review, remaining Session acceptance and PO/delegated DoD acceptance are
required before the whole story is Done. The separate estimate proposal #388
must be accepted before changing Jira's estimate.
