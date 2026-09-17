# E14 — Audit & History

## E14-S02 — Record significant actions in an activity log

- **Sprint**: Sprint 1
- **Points**: 3
- **BDR references**: T-04
- **Owner**: Le Xin

### User story

As a ConnectSphere staff member, I want significant actions to be recorded so that we can determine who did what and when.

### Acceptance criteria

#### Scenario 1 — Status change recorded

Given an event status changes When the change completes Then an entry is recorded with the actor, the action, the affected event and the time

#### Scenario 2 — Access denial recorded

Given a user is denied access to an event or screen When the refusal occurs Then an entry is recorded with the user, the target and the time

#### Scenario 3 — Booking decision recorded

Given a venue booking is approved, rejected or released When the action completes Then an entry is recorded with the actor, the action, the affected records and the time

#### Scenario 4 — Deactivation recorded

Given an account is deactivated When the action completes Then an entry is recorded

#### Scenario 5 — Log entries immutable

Given an activity log entry exists When any user attempts to edit or delete it Then the attempt is refused

### Checklist

- Record every event status change with actor, action, event and time
- Record every denied access attempt with user, target and time
- Record every venue booking approval, rejection and release
- Record every account deactivation
- Confirm log entries cannot be edited or deleted by any user
