# E01 — Access & Identity

## E01-S01 — Log in to the system

- **Sprint**: Sprint 1
- **Points**: 3
- **BDR references**: C-30, T-38, O-02
- **Owner**: xiang ying / ji ning

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

- **Sprint**: Sprint 1
- **Points**: 5
- **BDR references**: C-40, B-01
- **Owner**: xiang ying / ji ning

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

- **Sprint**: Sprint 1
- **Points**: 3
- **BDR references**: B-01
- **Owner**: xiang ying / ji ning

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

- **Sprint**: Sprint 1
- **Points**: 1
- **BDR references**: T-08
- **Owner**: xiang ying / ji ning

### User story

As a system user, I want to update my name, organisation and contact details so that ConnectSphere reaches me at the correct address.

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

- Update name, organisation and contact details and see them persist
- Be blocked from saving a malformed email address, with the field identified
- Be blocked from taking an email address already in use
- Receive subsequent notifications at the updated address
- Not be able to change my own role from this screen

## E01-S08 — Create an account

- **Sprint**: Sprint 1
- **Points**: 3
- **BDR references**: C-34, C-35, C-57
- **Owner**: xiang ying / ji ning

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

## E01-S11 — Deactivate my account

- **Sprint**: Sprint 1
- **Points**: 3
- **BDR references**: C-26, T-09, T-52, T-53, T-54, T-55
- **Owner**: xiang ying / ji ning

### User story

As a system user, I want to deactivate my account so that I can stop using the system while ConnectSphere retains the records it needs.

### Acceptance criteria

#### Scenario 1 — Deactivated and signed out

Given I am signed in When I confirm deactivation Then I am signed out and can no longer sign in with those credentials

#### Scenario 2 — Historical records retained

Given I have deactivated my account When ConnectSphere views an event I was linked to Then my past registrations and event records remain intact and attributed

#### Scenario 3 — Upcoming registration released

Given I am an Attendee registered for an upcoming event (an event whose start timestamp is in the future) When I deactivate Then my registration is withdrawn and the place is released, and this applies to both `registered` and `waitlisted` entries, and deactivation overrides the E09-S05 `withdrawal_deadline` (see T-53, T-54, T-55)

#### Scenario 4 — Coordinator with events blocked

Given I am an Event Coordinator with events assigned to me in an active-lifecycle status (Submitted, Under review, Clarification requested, Approved, Planning, or Confirmed) When I attempt to deactivate Then deactivation is blocked until those events are reassigned, while events in Completed, Cancelled, or Rejected status do not block deactivation (see T-52)

### Checklist

- Deactivate my own account and be signed out immediately
- Be unable to sign in afterwards
- Have my historical event and registration records retained and still attributed
- Have upcoming registrations (event start in the future) released on deactivation, including waitlisted entries, overriding the E09-S05 withdrawal deadline (Attendees; T-53, T-54, T-55)
- Be blocked from deactivating while I hold any event in an active-lifecycle status (Submitted through Confirmed); events in Completed, Cancelled, or Rejected do not block (Coordinators; T-52)
- Have the deactivation recorded in the activity log with actor and time
