# E08 — Readiness & Confirmation

## E08-S03 — Confirm an event

- **Sprint**: Sprint 3
- **Points**: 5
- **BDR references**: C-13, C-39, C-59, C-63, T-02, T-24, T-27, C-67, T-68, O-28, C-70, T-71, T-74, O-39, O-40
- **Owner**:

### User story

As an Event Coordinator, I want to confirm an event once the event's arrangements are complete so that the Event Organiser and Attendees can rely on the details.

Amended in place for the Week 7 Customer Changes (C-70, T-71; this story is To Do, T-74). Completing the arrangements no longer sets Confirmed directly: it lets the Coordinator submit the event for its Operational Safety Check, which moves it to the new Safety Review status, and the Safety Officer's approval (E08-S06) is what sets Confirmed. The readiness checks below are unchanged in substance; what they now gate is the submission. Scenarios tagged "(assumes O-xx)" are written to the default recorded in `docs/bdr/C-open-questions.md`.

### Acceptance criteria

#### Scenario 1 — All arrangements complete, event submitted for safety review

Given every venue booking on the event is Confirmed or has been withdrawn, at least one is Confirmed, its full requested equipment is reserved and any requested technical support is assigned When I submit the event for its Operational Safety Check Then the status becomes Safety Review, the Safety Officer is notified, the Organiser is told the event is awaiting its safety check, and the event becomes Confirmed only when the Safety Officer approves it (E08-S06) (C-67, T-68, C-70, T-71; assumes O-28, O-39, O-40)

#### Scenario 2 — Missing venue blocks submission

Given the event has no Confirmed venue booking, or any of its venue bookings is still Pending or Conflicting When I try to submit for safety review Then submission is blocked and each outstanding booking is listed by venue (assumes O-28)

#### Scenario 3 — Partial equipment blocks submission

Given the event has only a partial equipment reservation When I try to submit for safety review Then submission is blocked and the outstanding quantity is shown

#### Scenario 4 — None required does not block

Given the event was submitted with 'none required' for equipment When I submit it for safety review Then that requirement counts as fulfilled and does not block submission

#### Scenario 5 — Outstanding support assignment blocks submission

Given the event requested technical support and no staff are assigned When I try to submit for safety review Then submission is blocked

#### Scenario 6 — Organiser sees confirmed arrangements

Given an event has been confirmed When the Event Organiser views it Then every confirmed venue with its purpose and period, the date, time and arrangements are shown

#### Scenario 7 — Confirmed is reached only through approval

Given an event is in Safety Review When anyone other than a Safety Officer attempts to set its status to Confirmed Then the action is refused and recorded in the activity log (C-70, T-71)

### Checklist

- Submit an event for its Operational Safety Check once every venue booking is Confirmed or withdrawn, equipment is fully reserved and technical support is assigned, moving it to Safety Review with the Safety Officer notified
- Be blocked from submitting while the event has no Confirmed venue booking or any booking still Pending or Conflicting, with each one listed (assumes O-28)
- Be blocked from submitting while an equipment reservation is partial, with the shortfall shown
- Confirm an event whose equipment requirement was recorded as 'none required'
- Be blocked from submitting while a requested technical support assignment is outstanding
- Confirm the event becomes Confirmed only through the Safety Officer's approval (E08-S06), never directly
- Confirm the Event Organiser is notified with the full confirmed details

## E08-S04 — Revert a confirmed event to planning

- **Sprint**: Sprint 4
- **Points**: 1
- **BDR references**: C-48, T-03, T-28, C-70, T-71
- **Owner**:

### User story

As an Event Coordinator, I want to return a confirmed event to planning when an arrangement breaks so that its status reflects reality.

### Acceptance criteria

#### Scenario 1 — Reverted with a recorded reason

Given an event is Confirmed When I revert it to Planning and record a reason Then the status becomes Planning and the Event Organiser is notified with the reason

#### Scenario 2 — Registered Attendees notified

Given registered Attendees exist When the event is reverted Then they are notified that arrangements are being revised

#### Scenario 3 — No automatic reversion

Given an arrangement breaks on a confirmed event When no one reverts it Then the status stays Confirmed and the affected arrangement is flagged

#### Scenario 4 — Reverted event passes the safety check again

Given a Confirmed event has been reverted to Planning When its arrangements are complete again and it is resubmitted (E08-S03) Then it enters Safety Review and needs a fresh approval before it is Confirmed again; the earlier safety decision stays in the activity log but is not reused (C-70, T-71)

### Checklist

- Revert a confirmed event to Planning with a recorded reason
- Confirm the Organiser is notified with the reason
- Confirm registered Attendees are notified
- Confirm the status never reverts automatically
- Confirm the reversion is recorded in the activity log
- Confirm a reverted event must pass the Operational Safety Check again before it is Confirmed again

## E08-S05 — Complete an event

- **Sprint**: Sprint 4
- **Points**: 3
- **BDR references**: T-03, T-26, T-48
- **Owner**:

### User story

As an Event Coordinator, I want an event to become Completed once it has taken place so that attendance can be recorded and the event closed.

### Acceptance criteria

#### Scenario 1 — Auto-completed after the end time

Given an event is Confirmed and its end time has passed When the system next evaluates it Then the status becomes Completed

#### Scenario 2 — Marked complete manually

Given an event is Confirmed and has already started When I mark it complete Then the status becomes Completed

#### Scenario 3 — Premature completion blocked

Given an event is Confirmed and has not yet started When I try to mark it complete Then the action is blocked

#### Scenario 4 — Cancelled event never auto-completes

Given an event is Cancelled When its original end time passes Then it is not auto-completed and remains Cancelled

### Checklist

- Confirm an event auto-completes once its end time has passed
- Mark an event complete manually once it has started
- Be blocked from marking an event complete before it has started
- Confirm a cancelled event is never auto-completed
- Confirm the transition is recorded in the activity log

## E08-S06 — Conduct the Operational Safety Check as the Safety Officer

- **Sprint**: Sprint 3
- **Points**:
- **BDR references**: C-70, T-71, T-72, T-73, T-74, O-39, O-40, O-41, O-42, O-43
- **Owner**:

### User story

As a Safety Officer, I want to review the operational safety of each event whose venue and technical arrangements are confirmed, and approve it, reject its safety arrangement or request changes, so that no event proceeds to preparation until it is safe to run.

New story from the Week 7 Customer Changes (C-70) and the seventh role (T-72). The Safety Review status it works on sits between Planning and Confirmed as an interim placement (T-71); O-39 asks the customer to confirm. The customer guarantees a response, so there is no timeout path. Estimate at Sprint 3 planning (T-73). Scenarios tagged "(assumes O-xx)" are written to the default recorded in `docs/bdr/C-open-questions.md`.

### Acceptance criteria

#### Scenario 1 — Events awaiting review listed with what the check needs

Given events are in Safety Review When I open my queue Then each shows the event name, date and time, every confirmed venue with its capacity, layout and known restrictions, expected attendance, accessibility requirements, equipment and its placement, and the time it entered Safety Review, oldest first

#### Scenario 2 — Structured review of the listed factors

Given I open an event from the queue When I conduct the check Then I record, for each of expected attendance against capacity, venue capacity and layout, emergency access, accessibility requirements, equipment placement, crowd movement and known venue restrictions, whether it is satisfactory, with a comment, before choosing an overall decision (assumes O-42)

#### Scenario 3 — Approval confirms the event

Given every factor is satisfactory When I approve Then the status becomes Confirmed, the Organiser and the Coordinator are notified with the confirmed details (E08-S03 Scenario 6 and E11-S01's "Event confirmed" row apply), and the activity log records my decision, my identity, the time and the completed checklist

#### Scenario 4 — Requesting changes returns the event to planning

Given one or more factors are unsatisfactory When I request changes and record which factors and why Then the status becomes Planning, the Coordinator and the Organiser are notified with the items to address, the affected venue or technical arrangements are flagged for re-review, the decision is logged, and the event cannot become Confirmed until it is resubmitted (E08-S03) and approved (assumes O-41)

#### Scenario 5 — Rejecting the safety arrangement does not cancel the event

Given the safety arrangement as a whole is unacceptable When I reject it and record the reason Then the status becomes Planning with a visible "safety arrangement rejected" flag and the reason, the Coordinator and the Organiser are notified, the event is not cancelled, and the Coordinator may rework and resubmit or cancel it through E10-S04 (assumes O-41)

#### Scenario 6 — Reason required for reject or request changes

Given I choose reject or request changes When I have not recorded a reason Then the decision is refused until I do

#### Scenario 7 — Only a Safety Officer decides

Given I am a Coordinator, an Event Coordinator Lead or any other role When I attempt to approve, reject or request changes on an event in Safety Review Then the action is refused and recorded in the activity log

#### Scenario 8 — Events confirmed before this story are not re-reviewed

Given an event was Confirmed before the Operational Safety Check existed When the check is introduced Then that event keeps its status, has no safety record and is not placed in Safety Review (assumes O-43)

#### Scenario 9 — Status display and deactivation treat Safety Review as active

Given an event is in Safety Review When its Organiser tracks it (E03-S05) Then "Safety Review" and the date it was reached are shown in plain language; and Given its Coordinator attempts to deactivate their account (E01-S11) Then Safety Review counts as an active-lifecycle status and deactivation is blocked (T-52)

#### Scenario 10 — Every decision is auditable

Given I approve, request changes or reject When the decision completes Then the activity log holds an entry with my identity, the action (safety check approved, changes requested or rejected), the event, the time and the checklist, immutable as E14-S02 requires

### Checklist

- See every event awaiting its safety check with the information the listed factors need, oldest first
- Record each factor as satisfactory or not, with a comment, before deciding
- Approve an event, making it Confirmed with the Organiser and Coordinator notified
- Request changes or reject with a mandatory reason, returning the event to Planning without cancelling it and flagging the affected arrangements
- Be refused as any role other than Safety Officer
- Confirm events already Confirmed before this story are untouched
- Confirm the status tracker shows Safety Review and the deactivation block counts it
- Confirm every decision is in the activity log
