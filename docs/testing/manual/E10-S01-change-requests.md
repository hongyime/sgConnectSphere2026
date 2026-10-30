# E10-S01 focused click-through

SCRUM-204 acceptance preparation for the merged foundation (#341), refused-edit
prefill (#365) and terminal Obsolete handling (#363/#320). This is a planned human
run, not execution evidence. Retain earlier valid evidence rather than repeating
the E11 walkthrough. Full E10-S01 still depends on E10-S02 arrangement application.

## Prepare once

Use only a disposable native loopback PostgreSQL database and local API/frontend
from the same tested application checkout. Do not start Docker, reset Supabase,
apply production migrations or enable live email to prepare this test.

Prepare synthetic active Organiser and assigned Coordinator accounts, plus one
Confirmed Event with a short title and purpose. Keep account credentials in the
temporary environment only, never screenshots or committed documentation.
Use two separate browser sessions. The assigned Coordinator should have access
to the same Event. Synthetic setup is not a human approval/confirmation test.

Before starting, record the actual checkout and any working changes. Create a
new T-65 record with actual outcomes; save tester-taken T-93 screenshots by case.
Keep this increment's manual record separate from other testers' sessions.

## Available focused checks

1. **Submit and compare (TC_E10S01_01/_02).** As Organiser, open the Event and
   select **Change requests**. Describe the change, select **Change event name**
   and enter a different name. Send once. Confirm the success message comes into
   view and the Pending request shows the unchanged current name alongside the
   requested name. Refresh: request remains Pending and Event name unchanged.
   Save one screenshot of the comparison; inspect the Coordinator's in-app inbox
   for **Change requested** (this does not prove mailbox receipt).
2. **Approve a safe change (TC_E10S01_04 subset).** In the Coordinator session,
   open the Event's **Change requests** link. Select **Approve…**, then Cancel:
   nothing changes and focus returns to Approve. Approve again and confirm.
   Request becomes Applied, Event name updates, and the Organiser receives the
   result notice. Save the Applied comparison/result screenshot.
3. **Decline (TC_E10S01_05).** Organiser submits a different purpose. Coordinator
   selects **Decline…**, optionally adds a decision note, and confirms. Request
   becomes Declined; Event purpose remains unchanged. Organiser sees the result
   notice. Save one Declined screenshot with the optional note if entered.
4. **Arrangement waiting state (TC_E10S01_04 incomplete dependency).** Organiser
   requests a different expected attendance. Coordinator approves. Both sessions
   show **Approved — waiting for the arrangement check**; current attendance
   stays unchanged after refresh. Save one screenshot. This is intentional
   interim behaviour, not a PASS for the whole arrangement-application criterion.
5. **Responsive/error behaviour.** On a phone-width viewport, confirm the
   comparison becomes labelled rows/cards without horizontal page scrolling.
   An unrelated account's direct change-request URL must show access refusal,
   without comparison/form/decision controls. Save the refusal screenshot if
   used as acceptance evidence. Automated tests separately cover stale requests,
   duplicate decisions, account locks, rollback and late-response route changes.

6. **Refused-edit handoff (TC_E10S01_03).** On a Confirmed Event's edit form,
   expected attendance is read-only. Its **Request a change** link must open the
   form with that field selected and its current value populated; no request
   exists until the Organiser describes the change and explicitly sends it.
   To exercise a save refusal, keep the Organiser's editable form open while the
   Coordinator approves that Event in a second session. Try to save a restricted
   attendance change. Follow the recovery link: the proposed value must be
   preserved, current details unchanged, and submission still explicit.
7. **Terminal requests (TC_E10S01_06/_07).** Use separate Events with Pending
   requests for the Completed and Cancelled paths. The completion fixture must
   be Confirmed and have already started. Trigger the existing completion or
   cancellation workflow as Coordinator. Reload the Organiser and Coordinator
   change-request pages: Pending requests become Obsolete, show the terminal
   reason, and cannot be approved or submitted. Verify the status transition in
   history; Obsolete must not be presented as Declined. Capture each case only
   when that path was actually performed by the human tester.

The automated `tests/auth-e2e/changeRequests.spec.ts` uses real browser sessions,
the local API and disposable PostgreSQL, without response fixtures. It covers
the readonly/current-value and concurrent-approval refusal paths, persisted
submission/comparison, safe approval/decline, terminal Obsolete rendering and
the arrangement waiting guard. Terminal actions in that suite use the real API;
this is automated integration evidence, not a human completion/cancellation
click-through. Its arrangement waiting assertion is a dependency regression,
not a passing full TC_E10S01_04 arrangement-application result.

Do not count queued outbox rows as email delivery. The final combined human run
and acceptance must include actual arrangement preview/apply after E10-S02 lands.
No extra manual API race tests are required; retain the real-database concurrency
evidence. Keep each tester's session and screenshots in its own T-65 record.
