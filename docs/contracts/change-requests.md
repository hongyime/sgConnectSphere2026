# E10-S01 change requests — backend increment

SCRUM-202 implements the backend portion of SCRUM-70. Requirements remain in
`docs/backlog/release-1/E10-changes-rescheduling-cancellation.md` and
`docs/testing/cases/E10.md`. Ownership/field classification follows the agreed
20 October 2026 comment on SCRUM-70. This increment does not complete the story.

## Authenticated API

Use the existing `/api/events` cookie-session handler:

| Method / query | Body | Result |
| --- | --- | --- |
| GET `?changeRequests=1&id=<event id or code>` | None | `{ current, requests }` |
| POST `?changeRequests=1&id=<event id or code>` | `{ description, changes: { title: "New name" } }` | 201 `{ request }` |
| POST `?changeRequests=1&id=<event id or code>&requestId=<request id>` | `{ decision: "approve" | "decline" | "apply", reason?: string }` | 200 `{ request }` |

Only the owning Organiser in the matching organisation can submit. Reads are
limited to that Organiser or the assigned Coordinator; only the assigned
Coordinator can decide/apply. Inactive/changed accounts are refused. Responses
are private/no-store. Unknown or unsupported inputs are refused, not silently
discarded. There is no client-controlled force/apply bypass.

Requests are saved in the existing `change_requests` table. `requested_changes`
contains `{ fields, before }`, with before-values only for the fields changed.
The request response retains existing database snake_case properties. `current`
uses the camelCase field keys below. Requests using `action: "cancel"` belong to
E10-S04 and are excluded from both reads and decisions here. No migration added.

## State and transaction boundaries

Submission requires an Approved, Planning, Safety Review or Confirmed Event
(the latter three are post-approval states). It snapshots changed fields but
does not change Event or public details. An assigned Coordinator is required.

Approve/decline requires Pending; explicit apply requires Approved. Completed,
Cancelled and pre-approval Events refuse all these mutations. Event then request
locks serialize changes and competing decisions. The actor is checked under a
non-waiting shared account lock; concurrent account maintenance returns a retry
conflict rather than creating a user/Event lock cycle.

Approve/apply compares original changed-field values against the locked Event;
a stale request is refused and must be resubmitted/re-reviewed. Unrelated field
changes do not make it stale. Decline leaves Event details untouched. Every
successful transition has an audit and targeted notification/outbox in the same
transaction; failures roll back business writes too. Self notices are excluded.

The agreed safe fields are `title`, `description`, `purpose`. Approval applies
them atomically and sets the request to Applied. Applied title changes update
the name of an existing publication only; they neither publish an unpublished
Event nor expose private purpose/description. Field-level Event audit rows are
retained alongside the request status audit.

## E10-S02 boundary and remaining work

The first increment also accepts `expectedAttendance`, `venueRequirements`,
`equipmentRequirements`, `accessibilityNote`, `layoutPreference`,
`registrationSetup`, `startAt`, and `endAt`. Dates require an explicit timezone;
combined dates must be ordered. These fields make the whole request
arrangement-affecting, including a mix of safe and arrangement fields.
Approval records Approved and notifies the requester with
“Approved — waiting for the arrangement check”. Explicit application refuses
until the real E10-S02 shared function is integrated. Nothing is partially
applied, flagged or falsely reported as Applied in this interim state.

Session edits, layout IDs, predefined accessibility IDs and structured
registration-capacity/window fields are not accepted by this first allowlist.
They need their schema/validation and shared E10-S02 preview/apply contracts
before support is added; they must not be sent as arbitrary JSON. Full Scenario
4 remains incomplete, as does the parent story. Agree the shared function's
typed input/result, preview-before-apply, publication updates, transaction
ownership, stale checking and resulting staff-notification responsibility with
Le Xin before wiring it. Do not invoke an external transaction after committing
the request, or duplicate the staff notices in both owners' code.

SCRUM-203 owns the real UI and side-by-side view; SCRUM-205 owns refused-edit
prefilling. Cancellation and completion owners retain terminal Obsolete handling.
SCRUM-204 remains the human acceptance/evidence and whole-story completion gate.
Automated service tests do not establish browser acceptance or mailbox receipt.
