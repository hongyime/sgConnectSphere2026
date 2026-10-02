# E11 — Notifications & Reminders

## E11-S01 — Notify users about events they are involved in

- **Sprint**: Sprint 2
- **Points**: 5
- **BDR references**: C-04, C-29, C-53, T-35, T-36, T-44, T-48, T-64, C-68, T-69, O-33, C-69, T-70
- **Owner**:

### User story

As a user involved in an event, I want to be notified when its status or arrangements change so that I do not have to keep checking the system and nobody continues working from outdated information.

### Acceptance criteria

#### Scenario 1 — Status change notified

Given I am a recipient under the approved routing matrix When an event status changes or a booking decision is made Then I receive a notification stating what changed, when, and which event it concerns, unless I performed the action myself

#### Scenario 2 — All affected parties notified

Given the event's date, time or venue changes When the change takes effect Then the Event Organiser, assigned Event Coordinator, affected assigned Venue Staff, affected assigned Technical Support Staff, registered Attendees and waitlisted Attendees are notified according to the routing matrix, excluding the acting user

#### Scenario 3 — Unaffected users not notified

Given a change does not affect a particular user's responsibilities When the change occurs Then that user is not notified

#### Scenario 4 — Delivered in-app and by email

Given a notification is generated for me When it is delivered Then it appears in the system and is also sent to my registered email address

#### Scenario 5 — Unread notifications distinguished

Given I have several unread notifications When I open my notification list Then they are shown newest first with unread ones distinguished

#### Scenario 6 — Marked as read

Given I open an unread notification When I have read it Then it is marked as read

### Approved recipient routing (T-64, 2026-09-27)

Specific routing is a team decision under C-53. The repository owner approved
this matrix and the integration boundary on 2026-09-27. It extends general
arrangement notifications to the assigned Coordinator and waitlisted Attendees.

| Change | Organiser | Coordinator | Venue Staff | Technical Staff | Registered | Waitlisted |
| --- | --- | --- | --- | --- | --- | --- |
| Internal review, clarification, approval or rejection | Yes | Yes | No | No | No | No |
| New request enters the unassigned queue | No | No | No | No | No | No |
| Coordinator assigned or reassigned, by the Lead or by acceptance | Yes | Incoming and outgoing | No | No | No | No |
| New venue booking request | No | No | Responsible staff | No | No | No |
| Venue booking confirmed, rejected or released | No | Yes | No | No | No | No |
| Tentative hold about to expire (reminder) or expired | No | Yes | No | No | No | No |
| Equipment result or operational shortfall | No | Yes | If affected | If affected | No | No |
| Effective date/time/venue change | Yes | Yes | If affected | If affected | Yes | Yes |
| Event confirmed or reverted from Confirmed to Planning | Yes | Yes | If affected | If affected | Yes | Yes |
| Event cancelled | Yes | Yes | Affected staff before release | Affected staff before release | Yes | Yes |
| Event completed | Yes | Yes | If affected | If affected | Yes | Yes |
| Waitlist place released | No | No | No | No | No | All eligible waitlisted |
| Description-only edit | No general notice | No general notice | No | No | No | No |

- The Event Coordinator Lead is notified when a request enters the unassigned queue
  and when a Coordinator asks the Lead to reassign an event (E03-S08, E03-S09); the
  Lead is not a column above because no other change routes to that role (C-69).
- Suppress the acting user's routine self-notification; preserve the audit and UI
  acknowledgement. System-generated changes have no actor to exclude.
- Deduplicate each logical change per user. Exclude inactive, withdrawn and
  unrelated users. Temporary account lockout does not remove membership.
- Venue Staff means active users explicitly assigned to the affected venue;
  `venue_bookings.decided_by` is not an assignment. A venue move affects both old
  and new responsible staff. Missing assignment data is an explicit integration
  dependency, never permission to notify every Venue Staff user.
- Cancellation captures recipients before releasing bookings, staff assignments
  and registrations. Ordinary changes use current attendee memberships.
- Attendees receive public change descriptions using the published event name,
  never internal planning titles, decisions or comments. A published snapshot is
  required. Effective arrangement changes and their publication are the owning
  workflow's responsibility; pending operational decisions are internal.
- Build and test reusable transactional hooks now; integrate existing business
  writes. Booking, assignment, equipment and change workflows stay in their owning
  stories. Track missing integrations; hooks alone do not complete all E11-S01 ACs.

See [implementation and remaining tasks](../../plans/e11-notification-hooks.md).

### Checklist

- Receive a notification when an event I am linked to changes status
- Receive a notification when a booking decision is made
- Confirm all affected parties are notified when the event's date, time or venue changes
- Confirm unaffected, inactive, withdrawn and unrelated users are not notified
- Confirm the acting user is excluded and each recipient gets one notification per logical change
- Confirm cancellation preserves recipients before links are released
- Confirm internal booking decisions do not reach Attendees
- See what changed, when, and which event and event it concerns
- Receive the same notification in the system and by email
- See notifications newest first with unread ones distinguished
- Mark a notification as read
