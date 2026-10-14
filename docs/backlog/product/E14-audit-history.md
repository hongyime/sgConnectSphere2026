# E14 — Audit & History

## E14-S01 — View an event's change history

- **Sprint**:
- **Points**: 3
- **BDR references**: -
- **Owner**:

### User story

As an Event Coordinator, I want to see how an event's important information has changed over time so that I can explain how the current arrangements were reached.

### Acceptance criteria

#### Scenario 1 — Before and after values listed

Given an event's date, venue, attendance or status has changed When I open its change history Then each change is listed with the previous value, the new value, who made it and when

#### Scenario 2 — Restricted entries hidden

Given I am not permitted to view a particular change When I open the history Then that entry is not shown to me

### Checklist

_No checklist recorded._

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
