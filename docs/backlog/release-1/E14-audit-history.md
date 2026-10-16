# E14 — Audit & History

## E14-S02 — Record significant actions in an activity log

- **Sprint**: Sprint 3
- **Points**: 3
- **BDR references**: T-04, T-75, T-76
- **Owner**: Le Xin

### User story

As a ConnectSphere staff member, I want significant actions to be recorded so that we can determine who did what and when.

### Acceptance criteria

#### Scenario 1 — Status change recorded

Given an event status changes When the change completes Then an entry is recorded with the actor, the action, the affected event and the time, and an Event Coordinator permitted to view the event can read it in the event Activity log; access-denial entries are not shown in that log

#### Scenario 2 — Access denial recorded

Given a user is denied access to an event or screen When the refusal occurs Then an entry is recorded with the user, the target and the time

#### Scenario 3 — Transferred to E06-S04 Scenario 5 (T-76)

Booking approval, rejection and release logging is accepted under E06-S04. This historical scenario number is retained for traceability and is not an E14-S02 completion criterion.

#### Scenario 4 — Deactivation recorded

Given an account is deactivated When the action completes Then an entry is recorded

#### Scenario 5 — Log entries immutable

Given an activity log entry exists When any user attempts to edit or delete it Then the attempt is refused

### Checklist

- Record every event status change with actor, action, event and time
- Record every denied access attempt with user, target and time
- Record every account deactivation
- Confirm log entries cannot be edited or deleted by any user
- Verify that an Event Coordinator can read the event Activity log within existing event access rules
- Confirm access-denial entries, and the names of the users they refer to, are not shown in the event Activity log
- Verify denial and deactivation entries in a controlled test database; no Administrator sign-in is required

### Planning and reader scope

T-75 and T-76 were approved on 2 October 2026. The original Sprint 1
commitment was 3 points; the unfinished story carries through Sprint 2 into
Sprint 3 without rewriting that commitment or changing its estimate. The
remaining acceptance criteria are Scenarios 1, 2, 4 and 5. Their implementation,
verification and peer review still determine completion; E06-S04 is no longer
a prerequisite for closing E14-S02.

Use the existing event Activity log for Coordinator viewing. Denial and account
deactivation records are checked in the test database, not exposed through a
new application role. A global Administrator log viewer is deferred to Release 2.

Access-denial entries are stored against the event they refused and name the
refused user, who is often from another client organisation. The event
Activity log therefore never shows them; they are checked in the test
database only (TC_E14S02_02). This keeps the #161 data-isolation fix in place
when the log is opened to Coordinators. Added at the story owner's request
from the post-merge review of #192; the story is not Done, so it is updated
in place (T-74), and TC_E14S02_08 verifies it.

## E14-S03 — Read edited Activity log dates and times in Singapore time

- **Sprint**: Sprint 3
- **Points**:
- **BDR references**: T-97
- **Owner**: Le Xin

### Planning and provenance

The Product Owner approval source is T-97 in PR #293, which is currently open, not merged.

Selected by the Product Owner on 16 October 2026: "new E14S03/E03S12 ... put in Sprint 3"; the Product Owner explicitly confirmed both existing Organiser and assigned Coordinator Activity log views, readable Singapore time, with audit data and access unchanged. This is an unestimated mid-sprint scope addition pending team estimation, not delivery or a rewrite of the original commitment. Le Xin offered "I will add/fix"; PR #292 by Le Xin records this separate raw-UTC follow-up.

E14-S02 stays Done; its historical acceptance criteria and estimate remain unchanged (CONTRIBUTING.md). What went wrong: the existing Organiser Activity log interpolates new_value verbatim, and the Coordinator ActivityLog.tsx interpolates general old_value/new_value verbatim even though its When column and venue hold expiry already use shared formatDate. Edited date/time values can therefore expose raw UTC ISO strings. Prevention: test both existing views with same-day and midnight-boundary timestamps and compare stored audit values before and after display. Apply design.md's Singapore-time formatting through frontend/src/shared/format.ts, without changing its contract.

### User story

As an Event Organiser or the assigned Event Coordinator, I want edited date/time values in my existing event Activity log to be readable in Singapore time so that I can understand the recorded edit without interpreting raw UTC strings.

### Acceptance criteria

#### Scenario 1 — Both existing readers see Singapore time

Given an authorised Organiser or assigned Coordinator opens the existing event Activity log When an entry displays an edited date/time field value Then each date/time value already displayed by that view uses the existing shared Singapore formatter, including both old and new values where already shown, independently of the browser timezone; 2026-10-15T09:30:00Z represents 15 October 2026 at 17:30 Singapore time, not 16 October. Existing field keys are startAt, endAt and registrationDates; registrationDates stores "opensAt to closesAt", so both endpoints are formatted for display without changing that stored string.

#### Scenario 2 — Singapore calendar rollover

Given an edited date/time value is 2026-10-15T18:30:00Z When either view displays it Then it represents 16 October 2026 at 02:30 Singapore time; the calendar date as well as the hour is converted correctly.

#### Scenario 3 — Missing and invalid values keep the existing contract

Given a date/time value is missing or invalid When formatting is needed Then formatDate retains its existing "Not recorded" result; each view retains its existing omission/label-only behavior for absent change values, without throwing, inventing a date or introducing a new fallback.

#### Scenario 4 — Other values and existing display paths unchanged

Given an entry contains ordinary text, a status change or a venue hold expiry When either view renders it Then ordinary text remains text, existing status labels/badges remain unchanged, and existing hold-expiry formatting and behavior are preserved; the correction is field-aware, not conversion of every date-looking string.

#### Scenario 5 — Audit evidence and access unchanged

Given the existing event access rules apply When either permitted reader views or reloads the formatted log Then stored UTC old_value/new_value and occurred_at, actor and action remain unchanged and immutable; unauthorised readers remain refused and access-denial entries remain hidden from event logs, with no new audit viewer or permissions.

### Checklist

- Scope implementation to the edited date/time value rendering in frontend/src/features/organiser/ClientEvents.tsx and frontend/src/features/events/ActivityLog.tsx using shared formatDate
- Cover both views, same-day and rollover boundaries, missing/invalid inputs, other values and immutable/access-preserving reads with TC_E14S03_01 to _06
- Do not add before/after history to a view that does not already show it; wider E14-S01 history remains separate
- Exclude notification "Changed at ...Z" text, unrelated action/field labels, global viewers, new notifications and changes to stored audit data or hold-expiry behavior
- Obtain human code/test review and future T-65/T-93 manual evidence; these planned cases are not execution evidence
