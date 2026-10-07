# E01 — Access & Identity

## E01-S01 — Log in to the system

- **Sprint**:
- **Points**: 3
- **BDR references**: C-30, T-38, O-02
- **Owner**:

### User story

As an Event Organiser, I want to log in with my registered credentials so that I can access my organisation's event information securely.

### Acceptance criteria

#### Scenario 1 — Valid credentials accepted

Given I am a registered user with valid credentials When I submit my email address and password Then I am signed in and taken to the dashboard for my role

#### Scenario 2 — Wrong password reveals nothing

Given I am a registered user When I submit an incorrect password Then I remain signed out and see a message that does not reveal whether the email address is registered

#### Scenario 3 — Lockout on fifth failure

Given I have submitted 5 consecutive incorrect passwords When I attempt to sign in again Then my account is locked and I am shown how to reset my password

#### Scenario 4 — Reset link issued

Given my account is locked When I request a password reset Then a reset link is sent to my registered email address

#### Scenario 5 — Lock lifted on new password

Given I have followed a valid reset link When I set a new password Then the lock is lifted and I can sign in with the new password

### Checklist

- Sign in with a valid email and password and reach the dashboard for my role
- Be refused on an incorrect password without learning whether the email is registered
- Be locked out on the 5th consecutive failed attempt
- Receive a reset link at my registered email address
- Regain access once the password has been reset
- Have the lockout recorded in the activity log (E14-S02)

## E01-S02 — Restrict event visibility to my own client

- **Sprint**:
- **Points**: 5
- **BDR references**: C-40, B-01
- **Owner**:

### User story

As an Event Organiser, I want to see only events belonging to my own client organisation so that other clients' information stays confidential.

### Acceptance criteria

#### Scenario 1 — Own client's events only

Given I am signed in as an Event Organiser for Client A When I open my event list Then only events belonging to Client A are shown

#### Scenario 2 — Direct access refused

Given an event belongs to a client organisation I am not linked to When I navigate directly to that event's identifier Then access is refused and the attempt is recorded in the activity log

#### Scenario 3 — Colleague's event visible

Given my organisation has several Event Organisers When a colleague from my organisation creates an event Then I can see that event in my organisation's list

### Checklist

- View only events linked to their own client organisation in their event list
- Be denied access when attempting to open (e.g. via URL or ID) an event belonging to another client organisation
- View events created by any Organiser within their own client organisation
- Search for events without unrelated client organisations' events appearing in the results
- Receive notifications that never reference events belonging to unrelated client organisations
- Confirm that a denied access attempt is captured in the activity log with the user, event and time

## E01-S03 — Hide internal planning information from Attendees

- **Sprint**:
- **Points**: 3
- **BDR references**: B-01
- **Owner**:

### User story

As an Attendee, I want to see only the published details of events I have registered for so that I am not shown ConnectSphere's internal planning information.

### Acceptance criteria

#### Scenario 1 — Published details only

Given I am signed in as an Attendee and registered for an event When I view that event Then I see the published name, date, time and venue, and no Coordinator notes, booking decisions, equipment reservations or internal comments

#### Scenario 2 — Internal screen refused

Given I am signed in as an Attendee When I attempt to open an internal planning screen Then access is refused and the attempt is recorded in the activity log

### Checklist

- View the published name, date, time and venue of an event I am registered for
- Not see Coordinator notes, booking decisions, equipment reservations or comments
- Be refused when opening an internal planning screen directly
- Not see events or events I am not registered for

## E01-S04 — Update my account details

- **Sprint**:
- **Points**: 1
- **BDR references**: T-08, T-61
- **Owner**:

### User story

As a system user, I want to update my name, email and contact number so that ConnectSphere reaches me at the correct address.

### Acceptance criteria

#### Scenario 1 — Valid changes saved

Given I am signed in When I save valid changes to my profile Then the updated details are stored and shown when I next open my profile

#### Scenario 2 — Malformed email rejected

Given I enter an email address in an invalid format When I try to save Then the change is rejected and the invalid field is identified

#### Scenario 3 — Duplicate email rejected

Given I enter an email address already registered to another account When I try to save Then the change is rejected

#### Scenario 4 — Notifications follow the new address

Given I change my email address When the change is saved Then future notifications for my events are sent to the new address

### Checklist

- Update name, email and contact number and see them persist
- Be blocked from saving a malformed email address, with the field identified
- Be blocked from taking an email address already in use
- Receive subsequent notifications at the updated address
- Not be able to change my own role from this screen
- See my organisation displayed read-only, with a hint to contact my Coordinator for organisation changes (T-61)

Organisation is read-only in Release 1 (T-61, confirmed 20 September 2026).
Display the current organisation and guidance to contact the Coordinator. Profile
editing must not rename or create organisations or change organisation membership.

## E01-S05 — Set my notification preferences

- **Sprint**:
- **Points**: 3
- **BDR references**: C-29
- **Owner**:

### User story

As an Event Coordinator, I want to choose which notifications I receive and through which channel so that I am not overwhelmed by messages that do not concern me.

### Acceptance criteria

#### Scenario 1 — Category switched off

Given I am signed in When I turn off a notification category and save Then I no longer receive notifications in that category

#### Scenario 2 — Mandatory category cannot be disabled

Given a notification category is designated by ConnectSphere as mandatory When I open my preferences Then that category is shown as always on and cannot be turned off

### Checklist

_No checklist recorded._

## E01-S06 — Maintain client organisation records

- **Sprint**:
- **Points**: 3
- **BDR references**: -
- **Owner**:

### User story

As an Event Coordinator, I want to create and update client organisation records so that several Event Organisers from the same client are linked to one organisation.

### Acceptance criteria

#### Scenario 1 — Organisation created

Given I am creating a client organisation When I save it with the required details Then it becomes available for selection when linking Event Organisers and events

#### Scenario 2 — Duplicate name warned

Given an organisation with the same registered name already exists When I try to save a duplicate Then I am warned and offered the option to link to the existing record instead

### Checklist

_No checklist recorded._

## E01-S07 — View a client's event history

- **Sprint**:
- **Points**: 1
- **BDR references**: -
- **Owner**:

### User story

As an Event Coordinator, I want to view all past and upcoming events for a client organisation so that I can prepare for a new request with that client's history in mind.

### Acceptance criteria

#### Scenario 1 — Past and upcoming shown

Given a client organisation has past and upcoming events When I open its record Then both lists are shown with dates and current statuses

#### Scenario 2 — Empty state, not an error

Given a client organisation has no events yet When I open its record Then an empty state is shown rather than an error

### Checklist

_No checklist recorded._

## E01-S08 — Create an account

- **Sprint**:
- **Points**: 3
- **BDR references**: C-34, C-35, C-57
- **Owner**:

### User story

As an Attendee, I want to create an account so that I can register for events and manage my registrations.

### Acceptance criteria

#### Scenario 1 — Account created

Given I do not have an account When I submit the required details Then an Attendee account is created and I can sign in with it

#### Scenario 2 — Email already in use

Given an account already exists with that email address When I submit the form Then I am told the address is already in use and no second account is created

#### Scenario 3 — Invalid submission corrected

Given required fields are missing or the password does not meet the stated policy When I submit Then the account is not created and I am shown what to correct

#### Scenario 4 — Attendee role only

Given I sign up through the public form When my account is created Then it holds the Attendee role only

### Checklist

- Create an Attendee account with the required details and sign in with it
- Be told the address is already in use when an account exists, with no second account created
- Be shown what to correct when fields are missing or the password fails the policy
- Receive only the Attendee role from the public sign-up form
- Not be offered any internal role during sign-up

## E01-S09 — Switch between my roles

- **Sprint**:
- **Points**: 5
- **BDR references**: C-33, T-10
- **Owner**:

### User story

As a user who holds more than one role, I want to switch my active role so that I can act on the tasks belonging to each role without a separate account for each.

### Acceptance criteria

#### Scenario 1 — Active role switched

Given I hold more than one role and my active role is Venue Staff When I switch to Technical Support Staff Then I see only the tasks and events permitted to that role and my active role is displayed

#### Scenario 2 — Action outside active role refused

Given my active role is Technical Support Staff When I attempt an action permitted only to Venue Staff Then the action is refused

#### Scenario 3 — No switcher for a single role

Given I hold exactly one role When I sign in Then no role switcher is shown

#### Scenario 4 — Role persists across screens

Given I have switched my active role When I move to another part of the system Then my active role remains unchanged until I switch again or sign out

#### Scenario 5 — Last used role on sign-in

Given I hold more than one role When I sign in Then my active role is set to the role I last used

### Checklist

_No checklist recorded._

## E01-S11 — Deactivate my account

- **Sprint**:
- **Points**: 3
- **BDR references**: C-26, T-09
- **Owner**:

### User story

As a system user, I want to deactivate my account so that I can stop using the system while ConnectSphere retains the records it needs.

### Acceptance criteria

#### Scenario 1 — Deactivated and signed out

Given I am signed in When I confirm deactivation Then I am signed out and can no longer sign in with those credentials

#### Scenario 2 — Historical records retained

Given I have deactivated my account When ConnectSphere views an event I was linked to Then my past registrations and event records remain intact and attributed

#### Scenario 3 — Upcoming registration released

Given I am an Attendee registered for an upcoming event When I deactivate Then my registration is withdrawn and the place is released

#### Scenario 4 — Coordinator with events blocked

Given I am an Event Coordinator with events assigned to me When I attempt to deactivate Then deactivation is blocked until those events are reassigned

### Checklist

- Deactivate my own account and be signed out immediately
- Be unable to sign in afterwards
- Have my historical event and registration records retained and still attributed
- Have upcoming registrations released on deactivation (Attendees)
- Be blocked from deactivating while I still hold assigned events (Coordinators)
- Have the deactivation recorded in the activity log with actor and time

## E01-S12 — Manage only the events assigned to me as an Event Coordinator

- **Sprint**:
- **Points**:
- **BDR references**: C-69, C-40, T-70, T-73, T-74, O-38
- **Owner**:

### User story

As an Event Coordinator, I want my event list and event actions to cover only the events assigned to me so that I manage my own work and cannot act on a colleague's event by mistake.

New story from the Week 7 Customer Changes (C-69). E01-S02 (Organiser isolation) is Done and stays Done; this story extends the same discipline to a second role rather than editing it (T-74). Venue availability (C-40, E05-S03) is unaffected: Coordinators still see every venue's calendar states, with other events' details withheld as E05-S03 Scenario 2 already requires. Estimate at Sprint 3 planning (T-73). Scenarios tagged "(assumes O-xx)" are written to the default recorded in `docs/bdr/C-open-questions.md`.

### Acceptance criteria

#### Scenario 1 — Own assigned events only

Given events are assigned to me and to other Coordinators When I open my event list Then only the events assigned to me are shown

#### Scenario 2 — Direct access to a colleague's event refused

Given an event is assigned to another Coordinator When I navigate directly to its identifier or attempt any action on it Then access is refused, nothing about the event is revealed, and the attempt is recorded in the activity log

#### Scenario 3 — Unassigned requests not visible to Coordinators

Given requests are in the unassigned queue When I open my event list Then they are not shown, because the queue belongs to the Lead (assumes O-38)

#### Scenario 4 — Venue calendars still visible

Given other Coordinators' events hold venue bookings When I open a venue availability calendar Then the Free, Tentative, Confirmed and Blocked states are shown for every period while the other events' details are withheld, exactly as in E05-S03 Scenario 2

#### Scenario 5 — Organiser isolation unchanged

Given an Event Organiser for Client A is signed in When they open their event list Then E01-S02 Scenarios 1 to 3 hold unchanged

### Checklist

- See only the events assigned to me in my event list
- Be refused, with the attempt logged, when opening or acting on another Coordinator's event
- Not see the unassigned queue
- Still see every venue's availability states with other events' details withheld
- Confirm the Organiser's client isolation (E01-S02) is unchanged

## E01-S13 — Sign in as an Event Coordinator Lead or Safety Officer

- **Sprint**:
- **Points**:
- **BDR references**: C-69, C-70, C-57, T-72, T-73, T-74, O-44
- **Owner**:

### User story

As an Event Coordinator Lead or a Safety Officer, I want to sign in and land on the workspace for my role so that I can start on the queue of work that belongs to me.

New story from the Week 7 Customer Changes (C-69, C-70) adding the sixth and seventh roles (T-72). E01-S01 (log in) is Done and stays Done; the two new roles' landing pages are this story rather than an edit to it (T-74). Accounts are pre-seeded like every other internal role (C-57). Estimate at Sprint 3 planning (T-73). Scenarios tagged "(assumes O-xx)" are written to the default recorded in `docs/bdr/C-open-questions.md`.

### Acceptance criteria

#### Scenario 1 — Lead lands on the unassigned queue

Given I am a pre-seeded Event Coordinator Lead When I sign in with valid credentials Then I am taken to the unassigned queue (E03-S08) with the oversight view (E03-S10) one step away, and the navigation shows only the Lead's pages

#### Scenario 2 — Safety Officer lands on the safety review queue

Given I am a pre-seeded Safety Officer When I sign in with valid credentials Then I am taken to the list of events awaiting Operational Safety Check (E08-S06), and the navigation shows only the Safety Officer's pages

#### Scenario 3 — One role per account

Given a Lead or Safety Officer account exists When its role is inspected Then it holds exactly that one role and no Coordinator permissions, consistent with ADR-012 (assumes O-44)

#### Scenario 4 — Existing roles' sign-in unchanged

Given an Organiser, Coordinator, Venue Staff member, Technical Support Staff member and Attendee each sign in When they land Then each reaches the same dashboard as before this story, so E01-S01 Scenario 1 holds for all five existing roles

### Checklist

- Sign in as a Lead and land on the unassigned queue with the Lead's navigation
- Sign in as a Safety Officer and land on the safety review queue with the Safety Officer's navigation
- Confirm each new-role account holds exactly one role
- Confirm the five existing roles still land where they did
