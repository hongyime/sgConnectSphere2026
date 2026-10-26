# Venue claim rule B decision and gates

On 22 October 2026 the Product Owner chose the rule for an overlapping venue
claim. The first successfully accepted hold or booking request claims that
venue's buffered slot. A later overlapping hold or request is refused while the
claim is active. Approval rechecks current availability, concurrency and buffer
values. This is a PO interpretation of C-01, C-16, C-46, C-60 and C-65, not a
new customer quote; see T-100.

## How the rule works

Pending, Confirmed and unexpired Tentative bookings are active claims. Converting
a hold to a request keeps the same claim. Concurrent overlapping new claims
serialize: one is accepted, while the losing request returns 409 without a new
row or side effects. There is no FIFO queue and no first-approval-wins rule.

If a later buffer edit creates a conflict, C-109 remains in force: save the
change, retain affected bookings and set the existing `buffer_conflict` flag.
Approval is refused while the conflict remains. Venue Staff may explicitly
reject the request; the Coordinator may withdraw it or replan and resubmit it
before a later approval succeeds. Exact adjacency of half-open buffered intervals is allowed;
claims at different venues do not conflict, even for the same event.

## Scope and history

This reconciles only E06-S06 acceptance criteria, its seven current cases and
the shared venue-bookings contract. E06-S03's multi-venue semantics, story and
case IDs, owners, sprint assignments, estimates and Done flags stay as recorded.
This decision does not rewrite migration 0016, adopt migration 0021, add a queue
or status, or authorize silent release of an active claim.

The open-choice snapshot in #338 is superseded prospectively by this PO choice.
The first-approval proposal associated with #308 is not adopted and remains
untouched; this note makes no claim that #308 has merged. Preserve older exports
and T-65 records as historical evidence.

## Adoption and implementation gates

This documentation records the choice; it does not prove product adoption or
implementation. The affected acceptance criteria, test cases, contract and
scaffold descriptions must be reviewed by a human. Runtime behavior and tests
must then demonstrate claim serialization, current-buffer approval checks,
explicit conflict resolution, adjacency and different-venue behavior. Human
review of code and test validity, the Definition of Done, manual E2E evidence
and T-65 recording requirements remain in force. No story is marked Done by
this decision.
