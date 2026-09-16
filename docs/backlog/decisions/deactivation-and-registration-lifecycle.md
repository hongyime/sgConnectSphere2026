# Deactivation and registration-lifecycle ambiguities

Four questions surfaced by the team while writing acceptance tests for E01-S11
(Deactivate my account) and its interaction with E09 (Attendee registration).
Each question is answered with a recommended default, options, and where the
resolution should live once accepted. The recommendations are safe conservative
defaults for Sprint 1; anything more permissive should be a deliberate team
decision.

Every entry below should end up as either a **T-XX team decision** (if the
team accepts the default) or an **O-XX open assumption** (if we want to defer
to a customer clarification) in the Backlog Decision Review document, per the
existing BDR conventions.

## Q1 — Do completed, cancelled, or rejected events count as "assigned events" for coordinator deactivation blocking?

**What the repository says.** E01-S11 Scenario 4 says an Event Coordinator with
"assigned events" cannot deactivate until those events are reassigned. Test case
`TC_E01S11_04` uses two events with status `active`. The workbook does not
name which statuses count.

**Options.**

1. **Only active-lifecycle statuses block.** Block deactivation when the
   coordinator holds any event in `Submitted`, `Under review`, `Clarification
   requested`, `Approved`, `Planning`, or `Confirmed`. Do not block on
   `Completed`, `Cancelled`, or `Rejected`.
2. **Any event ever assigned blocks.** Never let a coordinator deactivate if
   they have historical ownership of any event.
3. **Only current-and-future events block.** Same as option 1 but also allow
   deactivation when every remaining event is in the past even if still marked
   `Confirmed` (i.e. the coordinator has no future obligations).

**Recommended default: Option 1.** The point of the block is to prevent an
event losing its owner mid-planning. A completed event has no further
coordinator work; a cancelled or rejected event has none either. Historical
attribution stays intact via the audit log regardless (E14-S02), so option 2
adds nothing except friction. Option 3 is a subtle refinement that could hide
data-quality issues (an event marked `Confirmed` past its date is a bug, not
a green light).

**Record as.** T-XX team decision in BDR. Amends the acceptance criteria on
E01-S11 Scenario 4 with an explicit status list. Add an inline sentence to the
Markdown backlog file at ``docs/backlog/release-1/E01-access-identity.md``
under the Scenario 4 body.

## Q2 — Does "upcoming registration" mean strictly before the event starts?

**What the repository says.** E01-S11 Scenario 3 says an Attendee's upcoming
registrations are withdrawn on deactivation and the place is released. The
schema stores each event as a range with a start and end timestamp; no rule
defines when a registration stops being "upcoming."

**Options.**

1. **Upcoming = event has not started yet.** A registration for an event whose
   start timestamp is in the future is upcoming and gets withdrawn on
   deactivation. A registration for an event that has already started or ended
   is preserved as historical.
2. **Upcoming = event has not ended yet.** Registrations for events in
   progress are also withdrawn.
3. **Upcoming = event within some window (e.g. 24 hours).** No-shows within a
   short window are treated as still upcoming to release the seat.

**Recommended default: Option 1.** Once an event has started, releasing the
place adds no value: the seat is already accounted for at the door. Removing
the record also destroys attendance evidence, which contradicts E01-S11
Scenario 2 (historical records retained). Option 2 loses attendance evidence
for events the person was actually at. Option 3 introduces a magic window
number that will have to be justified against `TC_PERF_01` and friends.

**Record as.** T-XX team decision in BDR. Amends the acceptance criteria on
E01-S11 Scenario 3.

## Q3 — Does deactivation override the E09-S05 withdrawal deadline?

**What the repository says.** E09-S05 refuses ordinary withdrawals after
`withdrawal_deadline` on the event. E01-S11 requires upcoming registrations
to be withdrawn on deactivation without qualification.

**Options.**

1. **Deactivation overrides the deadline.** Deactivation is a strictly
   stronger action than an ordinary withdrawal; the user is leaving the
   system, so the seat should be released regardless of deadline.
2. **Deactivation respects the deadline.** Registrations past the deadline
   remain in `registered` status even when the account deactivates. The seat
   is not released.
3. **Hybrid: mark as withdrawn but do not release the seat.** The user is
   removed from the roster but the venue count stays the same until the event
   starts. Splits the two concerns (attendee lifecycle vs capacity accounting)
   at the cost of extra state.

**Recommended default: Option 1.** The withdrawal deadline exists to prevent
attendees gaming refund policies or leaving events short-handed; a
deactivation is not the same class of action. The user is leaving the system
entirely, and blocking the seat release makes the accounting confusing (the
seat is held by a nonexistent user). Also aligns with Scenario 2 keeping
historical records intact: attendance history from before deactivation stays
in the audit log, only the future commitment is released.

**Record as.** T-XX team decision in BDR. Amends the acceptance criteria on
E01-S11 Scenario 3 and E09-S05 with a cross-reference: deactivation overrides
the withdrawal deadline.

## Q4 — Do waitlisted registrations become withdrawn on deactivation?

**What the repository says.** The schema supports `registered`, `waitlisted`,
and `withdrawn` states for a registration. E01-S11 only discusses registered
places.

**Options.**

1. **Waitlisted registrations are withdrawn too.** All future-facing
   registration state on the deactivating account is closed out consistently,
   whether the user held a confirmed place or was waiting for one.
2. **Waitlisted registrations are kept intact.** Only confirmed
   (`registered`) places are affected. The waitlist entry survives and gets
   promoted if capacity opens up, at which point the promotion fails because
   the account no longer exists.
3. **Waitlisted registrations are silently promoted to withdrawn only if the
   deactivation happens before promotion.** If the user was already promoted
   from waitlisted to registered at the point of deactivation, treat as
   Option 1.

**Recommended default: Option 1.** Option 2 is a foot-gun: the promotion
would eventually try to place a seat with a deactivated user, and the failure
would surface at an inconvenient time (a downstream cron job, not the
deactivation moment). Option 3 is a special case of Option 1 with the same
result but harder to reason about.

**Record as.** T-XX team decision in BDR. Amends the acceptance criteria on
E01-S11 Scenario 3: "upcoming registrations and waitlisted registrations for
future events are withdrawn."

## What to do with this document

1. Read the four options and defaults. Change any that the team disagrees
   with.
2. Once the team accepts, promote each answer to a T-XX entry in
   ``BACKLOG DECISION REVIEW CAA <latest>.docx`` (follow ADR-015 copy-forward
   to create a new dated copy). Add the reference codes back into this
   document.
3. Update the affected Markdown backlog stories under
   ``docs/backlog/release-1/`` with the amended acceptance criteria and the
   T-XX cross-reference.
4. Update the test cases in ``docs/testing/cases/`` to reflect the accepted
   rules.
5. Update the Jira issues for E01-S11 and E09-S05 with links back to the T-XX
   entry.

Do not treat this file as a decision until step 2 completes. Right now it is
a proposal.
