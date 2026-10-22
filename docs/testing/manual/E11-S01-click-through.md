# E11-S01 targeted notification integration manual check

SCRUM-75; T-64/T-89 and the canonical [E11 cases](../cases/E11.md).
This is an execution plan, not a passing run. Use disposable native loopback
PostgreSQL with synthetic users; no Docker Desktop, production seed or live
email is required for these inbox checks. Existing application servers remain
stopped until the human is ready to run this script.

## Preparation

Start the local API/frontend with a verified disposable database; create an
Approved/Planning synthetic event with an open support request and two active
Technical Support Staff. Keep two separate authenticated browser sessions,
Tech A (actor) and Tech B (recipient). Note existing notification IDs/counts
so seeded or earlier messages are not mistaken for new results. Record actual
code HEAD and any uncommitted changes. Never save credentials in screenshots.

## Self-action and colleague-action routing (TC_E11S01_11)

1. As Tech A, assign Tech A to the open request. Confirm the assignment result
   and schedule. Open Tech A's inbox: no new assignment notice about this action.
2. Remove that own assignment. Confirm the slot is free/request reopens if it
   was the last assignment. Tech A's inbox must still have no new self notice.
3. As Tech A, assign Tech B. Tech B's inbox should gain one Technical support
   assignment notice for the correct event. Tech A gains no routine self notice.
4. As Tech A, remove Tech B's assignment. Tech B gains a separate removal notice;
   assignment history/slot are released. Capture both the action result and
   recipient inbox using hand-taken images named TC_E11S01_11-sequence.png.

The API action result acknowledges self-actions; suppressing routine notices
must not prevent the actual assignment/removal. Database tests separately check
no self outbox rows, one delivery per colleague notice and rollback on outbox
failure. A UI-only inbox check does not prove email receipt or database rollback.

## Inbox persistence (TC_E11S01_06, TC_E11S01_07)

5. With multiple new recipient notices, check newest-first ordering and unread
   distinction. Open one unread notice, then refresh; its read state persists.
   The other unread notice remains unread. Save screenshots by each case ID.
6. In the actor's session, verify the recipient's private messages are not shown.
   Do not claim full API identity/tenant coverage from this visual check.

## Other currently available flows

Use the existing venue-assignment/date-time human record
20261016-001813-lexinphun2024-debug-frontend-e2e for its exact observed scope;
repeat only if changed code or missing assertions justify a fresh run. For
any new date/time edit, identify all linked roles and published-event state
before expecting recipients. A private unpublished event must not leak to
Attendees. Equipment recipient scope is clarified in the follow-up below.

## Equipment results (TC_E11S01_10, TC_E11S01_11, TC_E11S01_13)

Prepare a Planning event with an equipment request, assigned Tech B and a
Pending/Confirmed venue whose current responsible staff is Venue A. Tech A
performs the actions. Keep unrelated staff, ended venue assignments and inactive
users as negative controls. Use only synthetic local assignments.

1. As Tech A, reserve part of the requested quantity. Tech B and Venue A each
   receive one notice identifying the event, equipment, reserved/outstanding
   quantity and change timestamp. The Coordinator's existing notice remains.
2. Change to the full requested quantity; then save the same quantity again.
   Each affected staff member gets one change notice, and none for the no-op.
3. Release the reservation. Tech B and Venue A receive the release notice;
   actor/unrelated staff receive none. Existing release behaviour sends no
   Coordinator notice. A repeated release must not send a second notice.
4. With another active reservation, reduce stock or mark enough units unavailable
   to cause a real shortfall. Only staff responsible for the flagged event receive
   the needs-review notice. A sufficient-stock event must remain unaffected.
5. Capture hand-taken screenshots of the action outcome and recipient/negative
   control inboxes. Record only observed results. Database tests, not this UI
   run, verify rollback and snapshot delivery after assignment links are removed
   in the same transaction. The production roster is not changed by this script.

## Actual email delivery (TC_E11S01_05) — separate coordinated run

Agree the intended environment, controlled recipient and relay/worker activation
with the deploy owner before a live send. Record the triggering change, matching
in-app notice and actual received mailbox message with secrets/personal data
excluded. Provider mocks, queued rows and accepted-send responses alone cannot
be marked mailbox receipt. This script does not authorise production changes.

After human execution, create a new immutable T-65 record and put original
images under its matching evidence folder, each below 1000 KB. Record only the
steps actually performed. Hooks, inbox checks and self-suppression do not close
every E11 acceptance criterion or complete SCRUM-75.
