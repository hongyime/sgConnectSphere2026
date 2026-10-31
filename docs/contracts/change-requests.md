# E10-S01 change requests — backend increment

SCRUM-202 implements the backend portion of SCRUM-70. Requirements remain in
`docs/backlog/release-1/E10-changes-rescheduling-cancellation.md` and
`docs/testing/cases/E10.md`. Ownership/field classification follows the agreed
20 October 2026 comment on SCRUM-70. This increment does not complete the story.
The 30/31 October integration sections below describe the current application
path; earlier waiting-state notes are foundation history.

## Authenticated API

Use the existing `/api/events` cookie-session handler:

| Method / query | Body | Result |
| --- | --- | --- |
| GET `?changeRequests=1&id=<event id or code>` | None | `{ event: { id, eventCode, status }, permissions: { canSubmit, canDecide }, references: { layouts, accessibility }, current, requests }` |
| POST `?changeRequests=1&id=<event id or code>` | `{ description, changes: { title: "New name" } }` | 201 `{ request }` |
| POST `?changeRequests=1&id=<event id or code>&requestId=<request id>` | `{ decision: "preview" | "approve" | "decline" | "apply", reason?: string, previewToken?: string, confirmLateClose?: boolean }` | 200 `{ request }` |

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

## Original E10-S02 boundary (historical foundation)

The first increment also accepts `expectedAttendance`, `venueRequirements`,
`equipmentRequirements`, `accessibilityNote`, `layoutPreference`,
`registrationSetup`, `startAt`, and `endAt`. Dates require an explicit timezone;
combined dates must be ordered. These fields make the whole request
arrangement-affecting, including a mix of safe and arrangement fields.
Approval records Approved and notifies the requester with
“Approved — waiting for the arrangement check”. Explicit application refuses
until the real E10-S02 shared function is integrated. Nothing is partially
applied, flagged or falsely reported as Applied in this interim state.

The structured-field follow-up below extends that first allowlist without
enabling arrangement application. Full Scenario 4 remains incomplete, as does
the parent story. Agree the shared function's
typed input/result, preview-before-apply, publication updates, transaction
ownership, stale checking and resulting staff-notification responsibility with
Le Xin before wiring it. Do not invoke an external transaction after committing
the request, or duplicate the staff notices in both owners' code.

SCRUM-203 owns the real UI and side-by-side view; SCRUM-205 owns refused-edit
prefilling. Cancellation and completion owners retain terminal Obsolete handling.
SCRUM-204 remains the human acceptance/evidence and whole-story completion gate.
Automated service tests do not establish browser acceptance or mailbox receipt.

## Structured-field audit and follow-up — 22 October

The canonical E10-S01 agreement, E09-S03 window rules and current schema were
checked before extending the allowlist. No migration or speculative Session
API is introduced.

| Field | Existing source | Request behaviour |
| --- | --- | --- |
| `layoutId` | events.layout_id -> room_layouts | UUID or explicit null; referenced layout must exist at submission and approval. |
| `accessibilityFeatureIds` | event_accessibility_needs -> accessibility_features | Array of UUIDs, including empty to request clearing. Canonical lowercase/sorted unique set; every feature must exist. |
| `registrationEnabled`, `waitlistEnabled` | Existing Event booleans | Strict booleans; false is retained, not treated as an omitted field. |
| `registrationDates` | registration_opens_at / registration_closes_at | Both keys required; each may be a zoned date or explicit null. Closing must be later than opening when both are set. |
| `withdrawalDeadline` | events.withdrawal_deadline | Zoned date or explicit null. |
| Session edits | sessions and Session requirement relations exist | No mutation shape added: coordinate the E04/E10-S02 write/preview contract first. |
| Registration capacity | E09-S02 derives combined capacity from confirmed Session layouts | No independently writable Event-capacity column invented. Coordinate with E09 and E10-S02. |

All newly accepted fields are arrangement-affecting. A mixed request stays
entirely Approved/unapplied; safe fields inside it are not applied separately.
Snapshot arrays and registration windows are compared structurally for staleness.
Related-record existence is rechecked when approving, including deletions after
submission. Decline remains possible when a referenced catalogue item is gone.

The private GET now includes `references: { layouts, accessibility }`, each an
array of `{ id, label }`. The form uses catalogue choices and explicit switches,
Singapore-local date inputs and clearable boundaries. Comparisons display
labels and Enabled/Disabled rather than raw objects or UUIDs. E09-S03 permits
closing after Event start with a warning/confirmation; this increment does not
reject such a proposal. That confirmation must be part of the real apply path,
which remains disabled pending E10-S02.

### Coordination checklist for Le Xin (proposal, not a new agreed API)

- Agree the typed preview/apply interface, including these structured values and
  the future Session-change shape; retain only one authoritative field classifier.
- Keep Event locking and stale checks in the same transaction as the apply,
  affected-arrangement flags, audit, publication and notice/outbox writes.
- Show the affected arrangements and any over-subscription/late-close warning
  before applying. Do not remove registrations automatically.
- Decide which owner writes each notice so E10-S01 decision notices and E10-S02
  staff-arrangement notices are not duplicated.
- Only mark Applied after the actual update succeeds; failure must roll back the
  whole application step. No mock success or client force flag.

This coordination checklist is prepared locally only; no message was sent to
another team member and no Jira scope/status was changed.

## Publication and integration handoff

The first PR is an explicitly partial foundation under
`feature/e10-change-request-foundation`. SCRUM-70, SCRUM-202, SCRUM-203 and
SCRUM-204 remain open after this increment. Their keys are traceability, not
completion directives. Xiang Ying can build SCRUM-205/206 against these routes
and lifecycle without waiting for E10-S02; no automatic prefilling is supplied
by this PR. Coordinate that query/prefill contract with her before extending it.
After this increment merges, continue the E10-S02/Session integration from the
then-current main in a new branch and run the combined acceptance evidence.

## E10-S02 owner proposal (historical, superseded below)

Reuse the same arrangement path as Coordinator direct edits. Under the existing
Event lock: loadArrangementSnapshot before; apply stored fields; load snapshot
after; assessArrangementImpact; applyArrangementImpact with per-arrangement
audit and the reconfirmation_required staff notice; return impact and
assessOverSubscription. Preview must use previewEventChangeWith's savepoint and
rollback before the Coordinator confirms. Preserve one transaction and the
existing stale/terminal checks; no second independent UPDATE/apply path.

Her capacity proposal uses C-78 combined Confirmed layout capacity with T-85;
booking headcount takes priority over Session attendance for impact (T-78/T-79).
This records her proposal, not a newly approved shared signature. Her unpublished
backend must still expose support for layoutId, accessibilityFeatureIds,
registrationEnabled, waitlistEnabled and withdrawalDeadline before those fields
can be applied here. Session shape and registration warning/confirmation remain
to agree against the published PR. Do not mark mixed requests Applied meanwhile.

Read listing uses a plain Event SELECT, not a retained row lock. Mutations still
lock Event before request. canSubmit requires both the owning Organiser and an
assigned Coordinator; history remains readable without one. Approval confirmation
explains the entire mixed request waits, matching the backend atomic behaviour.

## E10-S02 backend delivered (SCRUM-236, 29 October)

### E10-S01 integration increment (30 October)

Request decision POST accepts `decision: "preview"` for Pending/Approved requests.
It checks actor, assignment, terminal state, changed-field staleness and references
under Event -> request locks. Supported fields return `request.preview` with
`canApply: true`, `impact`, `overSubscription`, `lateClose` and `token`; the real
shared edit runs in `previewEventChangeWith`'s rolled-back savepoint. Preview
does not decide the request or persist edits, flags, audits or notices.

Supported arrangement approval requires `previewToken`; older Approved requests
use `decision: "apply"`. The server recomputes preview under the lock. Changed
impact refuses with 409 and requires another preview. `confirmLateClose: true`
is additionally required when registration closes after the proposed start
(428 without consent). The UI shows affected arrangements and capacity warnings
before confirmation. Over-subscription never removes registrations.

`updateEventInformationWithNotificationsWith` exposes the shared save path in
the caller's transaction. Request status, fields, flags, audit, publication and
outbox roll back together. The shared path owns staff reconfirmation/public date
notices; the request service owns the Organiser's decision notice, suppressing
its duplicate generic date notice. No provider delivery is implied. Internal
approved-request context supports Safety Review; ordinary direct edits retain
their existing status restriction.

### Layout/accessibility continuation (31 October)

The trusted approved-request context now applies `layoutId` (UUID or null) and
`accessibilityFeatureIds` (canonical set, including empty). References are
validated and protected with key-share locks before application. Preview rolls
back the real update, including the requirement relation replacement.

T-16 treats layout/accessibility as arrangement-affecting: a changed Event
requirement flags its confirmed venue bookings for review, with named `layout`
and `accessibility` reasons. It does not cancel bookings or flag equipment just
for these venue requirements. A layout-induced capacity change also uses the
existing headcount and E09 registration-capacity checks; over-subscription warns
without removing or waitlisting anyone. Null/empty clears are real changes.

Migration 0014 synchronizes an Event layout to its sole Session. On multi-Session
Events, the Event requirement is updated and venues are flagged, but individually
authored Session layouts/requirements are not overwritten. Editing those needs
the E04-S02 Session mutation contract. All currently accepted Event request
fields can now be previewed/applied, including mixed safe/structured requests.
This does not close Session integration or the combined human acceptance gate.

The Coordinator's direct edit now runs the arrangement check described in the
owner proposal above. Under the Event row lock, `updateEventInformationWithNotifications`
loads the arrangement snapshot before and after the edit, flags what changed
(`applyArrangementImpact`), sends the `reconfirmation_required` staff notice and
returns `impact` and `overSubscription`. `previewEventChange` (`&preview=1`) runs
the same edit in a savepoint and rolls it back. The over-subscription warning now
reads E09-S02's `eventCapacity()`, so the warning and registration enforcement share
one capacity rule; it warns only strictly above capacity and skips a Session or
Event with no Confirmed booking. Route and response shapes are in
`docs/api-changes-week7.md`.

**Agreed Scenario 1 behaviour (team, 29 October, PR #376):** when a Session's
attendance changes, every booking in that Session whose governing headcount
(its own when set, otherwise the Session's attendance) is strictly above
capacity is flagged, including a booking whose own headcount was already above
capacity. Proposed by the story owner (Le Xin), agreed by the reviewer (Bl0oper)
and by Ji Ning for E10-S01, which reuses the same rule when it applies approved
changes. No Product Owner decision was needed: the AC wording and
TC_E10S02_01 to _09 are unchanged.

Known limit (reviewer note on PR #376): on a multi-Session Event, an Event-level
`expectedAttendance` edit does not reach the Sessions, because the 0014 trigger
only syncs a sole Session. Scenario 1 can therefore fire there only through a
Session edit, which arrives with E04-S02.

**Save bound to the reviewed preview (PR #380 review, Ji Ning, 30 October):**
the preview also returns `revision`, a fingerprint (`changeRevision`) of exactly
the `impact` and `overSubscription` it lists. The Coordinator's screen sends it
back as `&reviewed=<revision>` on every save that follows a preview, including
one with nothing to review. Under the Event row lock the save recomputes the
same check and, when its revision differs (for example another booking was
confirmed, or more Attendees registered, while the review was open), throws
`ArrangementsChangedError` before flagging, auditing or notifying anything; the
whole edit rolls back. The route answers 409 `arrangements_changed` with the
fresh `impact`, `overSubscription` and `revision` and no `changeRequestUrl`, and
the screen shows that list for a new review. A save without `reviewed` (the
Organiser's form, other callers) behaves as before: the revision is checked
only when sent, since the Coordinator may save the edit either way and the
review is a safeguard, not a permission. E10-S01 can reuse the same revision
when approved changes call the preview.

Historical backend-only follow-ups (superseded for supported E10-S01 fields by
the integration increment above):

- Approved E10-S01 change requests still stop at "Approved — waiting for the
  arrangement check". Calling `previewEventChangeWith` and the apply path from
  `decideChangeRequest` needs Ji Ning's agreement on notice ownership, since her
  decision notice and this staff notice must not be duplicated. Until then
  TC_E10S02_04 has no app path that lowers capacity and is proved only against
  PostgreSQL.
- No route edits a single Session (E04-S02, SCRUM-39), so the two-Session parts
  of TC_E10S02_01, _05 and _07 are proved only against PostgreSQL.
- The Coordinator's preview screen is the frontend increment (SCRUM-237, PR #380).
- Closed by E08-S04 (SCRUM-242, 31 October): Venue Staff now clear a booking's
  `requires_reconfirmation` by reconfirming it (`docs/contracts/venue-bookings.md`),
  the follow-up raised on #376. Equipment was already cleared by re-reserving (E07-S04).

## Refused-edit handoff (SCRUM-205)

The owning Organiser's event edit form keeps post-approval restricted fields
read-only. Each field's request link opens the existing form with that field
selected and its current value populated. If approval occurs while an edit
form is open, a refused PATCH with HTTP 409 and `changeRequestUrl` offers an
explicit recovery link. The rejected PATCH does not save Event details.

The recovery link accepts only the API's relative `/change-requests/new` route
for the same Event. Its `event` and `fields` query parameters identify the Event
and restricted fields. Proposed values travel in router navigation state,
scoped to that Event, rather than in the URL or persistent local storage.
Absent/invalid values fall back to the current authenticated read. Unknown
fields and state for other Events are ignored. Opening a form never submits it:
the Organiser reviews the proposed value, describes the change and sends it.
Existing server authorization, lifecycle restrictions and validation still apply.
Coordinator edit screens do not offer this Organiser-only recovery.

Frontend component and intercepted desktop/mobile browser tests validate this
handoff. They are not evidence of real-database persistence or human execution.
Human TC_E10S01_03 acceptance remains a separately logged run under SCRUM-204;
this frontend increment does not close parent SCRUM-70.

## Review usability follow-up to #383

Both E10 review panels use shared readable impact labels, retaining the
headcount/capacity figures when provided. A late-close preview disables approval
or application until explicit consent is ticked; form submission is guarded as
well. The server's consent validation remains authoritative.

Open product question from Amareet's #383 review: should an arrangement-affecting
approved request applied during Safety Review return the Event to Planning?
The current contract permits requests/application in Safety Review; it does not
specify that automatic transition. No transition is added by this UI follow-up.
Bryan must confirm the lifecycle policy before that separate behaviour changes.
