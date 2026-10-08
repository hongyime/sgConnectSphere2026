# Test case coverage audit

Point-in-time mapping of every workbook test case (from `docs/testing/PROJECT TEST CASES.xlsx`, 315 cases) against the automated test suite. Rebuild with `python scripts/tc_coverage_audit.py`.

**Automation status is by strict TC_ID naming.** A case is counted as automated only when a live `test(...)` block anywhere in the repository has the TC_ID literally in its title (e.g. `test('TC_E01S08_01 rejects duplicate email', ...)`). Behavioural coverage that happens to test the same acceptance criterion under a different test title is called out separately in the "Active tests that cover behaviour without an explicit TC reference" section below.

## Summary

- Total test cases: **315**
- Automated (explicit TC_ID in an active test title): **142** (45.1%)
  - Real-database (`.integration.test` / `.db.test`): **22**
  - Mock-backed (imports `mocks.ts` or uses `vi.mock`/`jest.mock`): **1**
  - Live-assertion (other active tests): **119**
- Scaffold (mentioned only in `test.fixme` / `test.skip`): **116** (36.8%)
- No test yet (no test file mentions the TC_ID): **57** (18.1%)

## Coverage by epic

| Epic | Cases | Automated | Scaffold | No test |
| --- | ---: | ---: | ---: | ---: |
| E01 | 38 | 25 | 11 | 2 |
| E02 | 13 | 12 | 1 | 0 |
| E03 | 52 | 39 | 3 | 10 |
| E05 | 37 | 24 | 0 | 13 |
| E06 | 37 | 4 | 21 | 12 |
| E07 | 30 | 20 | 10 | 0 |
| E08 | 26 | 0 | 15 | 11 |
| E09 | 36 | 5 | 30 | 1 |
| E10 | 20 | 0 | 15 | 5 |
| E11 | 15 | 12 | 3 | 0 |
| E14 | 8 | 1 | 7 | 0 |
| EXX | 3 | 0 | 0 | 3 |
| **Total** | **315** | **142** | **116** | **57** |

## Case-by-case status

Each row records the TC_ID, story, scenario, current status, and (for automated or scaffold rows) the test file and test title that touches it. Sort order is by epic then Story ID then TC_ID.

### E01

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_E01S01_01` | E01-S01 | Verify that a registered user with valid credentials should sign in and reach th | ✅ active | tests/auth-e2e/loginRecovery.spec.ts: TC_E01S01_01 — real login normalizes email, reaches organiser events and protects the signed-out route; tests/e2e/profile.spec.ts: TC_E01S01_0 |
| `TC_E01S01_02` | E01-S01 | Verify that an incorrect password should keep the user signed out without reveal | ✅ active | tests/auth-e2e/loginRecovery.spec.ts: TC_E01S01_02 — wrong, unknown and inactive accounts show the same error |
| `TC_E01S01_03` | E01-S01 | Verify that after 5 consecutive incorrect password attempts, the next sign-in at | ✅ active | tests/auth-e2e/loginRecovery.spec.ts: TC_E01S01_03 TC_E01S01_04 TC_E01S01_05 TC_E01S01_06 TC_E01S01_07 — lock, audit, emailed reset, unlock and single-use recovery |
| `TC_E01S01_04` | E01-S01 | Verify that requesting a password reset on a locked account should send a reset  | ✅ active | tests/auth-e2e/loginRecovery.spec.ts: TC_E01S01_03 TC_E01S01_04 TC_E01S01_05 TC_E01S01_06 TC_E01S01_07 — lock, audit, emailed reset, unlock and single-use recovery |
| `TC_E01S01_05` | E01-S01 | Verify that setting a new password via a valid reset link should lift the lock a | ✅ active | tests/auth-e2e/loginRecovery.spec.ts: TC_E01S01_03 TC_E01S01_04 TC_E01S01_05 TC_E01S01_06 TC_E01S01_07 — lock, audit, emailed reset, unlock and single-use recovery |
| `TC_E01S01_06` | E01-S01 | Verify that an account lockout should be recorded in the activity log with the a | ✅ active | tests/auth-e2e/loginRecovery.spec.ts: TC_E01S01_03 TC_E01S01_04 TC_E01S01_05 TC_E01S01_06 TC_E01S01_07 — lock, audit, emailed reset, unlock and single-use recovery |
| `TC_E01S01_07` | E01-S01 | Verify that a sixth sign-in attempt is refused even with the correct password on | ✅ active | tests/auth-e2e/loginRecovery.spec.ts: TC_E01S01_03 TC_E01S01_04 TC_E01S01_05 TC_E01S01_06 TC_E01S01_07 — lock, audit, emailed reset, unlock and single-use recovery |
| `TC_E01S02_01` | E01-S02 | Verify that an Event Organiser's event list should only show events from their o | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S02_01 - Verify that an Event Organiser |
| `TC_E01S02_02` | E01-S02 | Verify that direct access to another client's event via URL/ID should be denied  | ✅ active | tests/e2e/client-events.spec.ts: TC_E01S02_02 — direct access denial shows no event details and offers a return path; tests/e2e/e01.spec.ts: TC_E01S02_02 - Verify that direct acces |
| `TC_E01S02_03` | E01-S02 | Verify that events created by colleagues within the same client organisation sho | ✅ active | tests/e2e/client-events.spec.ts: TC_E01S02_03 TC_E01S02_04 — organisation events show colleague attribution and an accessible empty search state; tests/e2e/e01.spec.ts: TC_E01S02_0 |
| `TC_E01S02_04` | E01-S02 | Verify that search results should exclude events belonging to unrelated client o | ✅ active | tests/e2e/client-events.spec.ts: TC_E01S02_03 TC_E01S02_04 — organisation events show colleague attribution and an accessible empty search state; tests/e2e/e01.spec.ts: TC_E01S02_0 |
| `TC_E01S02_05` | E01-S02 | Verify that notifications should never reference events from unrelated client or | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S02_05 - Verify that notifications should never reference events from unrelated client organisations |
| `TC_E01S02_06` | E01-S02 | Verify that a denied access attempt should be logged with the user, event, and t | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S02_06 - Verify that a denied access attempt should be logged with the user, event, and time |
| `TC_E01S03_01` | E01-S03 | Verify that an Attendee viewing a registered event should see only published det | ✅ active | tests/e2e/attendee-events.spec.ts: TC_E01S03_01 — attendee sees only published fields for registered events; tests/e2e/e01.spec.ts: TC_E01S03_01 - Verify that an Attendee viewing a |
| `TC_E01S03_02` | E01-S03 | Verify that an Attendee attempting to open an internal planning screen directly  | ✅ active | tests/e2e/attendee-events.spec.ts: TC_E01S03_02 — direct internal planning request is sent for auditing and denied; tests/e2e/e01.spec.ts: TC_E01S03_02 - Verify that an Attendee at |
| `TC_E01S03_03` | E01-S03 | Verify that an Attendee should not see events or events they are not registered  | ✅ active | tests/e2e/attendee-events.spec.ts: TC_E01S03_03 — unregistered direct event is refused with no event fields; tests/e2e/e01.spec.ts: TC_E01S03_03 - Verify that an Attendee should no |
| `TC_E01S04_01` | E01-S04 | Verify that name, email and contact changes persist while organisation remains r | ✅ active | tests/e2e/profile.spec.ts: TC_E01S04_01 TC_E01S04_05 — edit profile, save normalized values and reload; organisation stays read-only |
| `TC_E01S04_02` | E01-S04 | Verify that saving a malformed email address should be rejected with the field i | ✅ active | tests/e2e/e01.spec.ts: TC_E01S04_02 - Verify that saving a malformed email address should be rejected with the field identified; tests/e2e/profile.spec.ts: TC_E01S04_02 TC_E01S04_0 |
| `TC_E01S04_03` | E01-S04 | Verify that saving an email already registered to another account should be reje | ✅ active | tests/e2e/e01.spec.ts: TC_E01S04_03 - Verify that saving an email already registered to another account should be rejected; tests/e2e/profile.spec.ts: TC_E01S04_02 TC_E01S04_03 — f |
| `TC_E01S04_04` | E01-S04 | Verify that changing the registered email should route future notifications to t | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S04_04 - Verify that changing the registered email should route future notifications to the new address |
| `TC_E01S04_05` | E01-S04 | Verify that a user should not be able to change their own role from the account  | ✅ active | tests/e2e/e01.spec.ts: TC_E01S04_05 - Verify that a user should not be able to change their own role from the account details screen; tests/e2e/profile.spec.ts: TC_E01S04_01 TC_E01 |
| `TC_E01S08_01` | E01-S08 | Verify that submitting valid sign-up details should create an Attendee account t | ✅ active | tests/e2e/e01.spec.ts: TC_E01S08_01 - Verify that submitting valid sign-up details should create an Attendee account that can then sign in; tests/e2e/registration.spec.ts: TC_E01S0 |
| `TC_E01S08_02` | E01-S08 | Verify that signing up with an already-registered email should be rejected witho | ✅ active | tests/e2e/e01.spec.ts: TC_E01S08_02 - Verify that signing up with an already-registered email should be rejected without creating a duplicate; tests/e2e/registration.spec.ts: TC_E0 |
| `TC_E01S08_03` | E01-S08 | Verify that leaving a required sign-up field empty should block account creation | ✅ active | tests/e2e/e01.spec.ts: TC_E01S08_03 - Verify that leaving a required sign-up field empty should block account creation and identify the missing field; tests/e2e/registration.spec.t |
| `TC_E01S08_04` | E01-S08 | Verify that an account created through the public sign-up form should hold the A | ✅ active | tests/e2e/e01.spec.ts: TC_E01S08_04 - Verify that an account created through the public sign-up form should hold the Attendee role only; tests/e2e/registration.spec.ts: TC_E01S08_0 |
| `TC_E01S08_05` | E01-S08 | Verify that the public sign-up form should not offer any internal role as a choi | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S08_05 - Verify that the public sign-up form should not offer any internal role as a choice |
| `TC_E01S08_06` | E01-S08 | Verify that entering a password that fails the stated policy should block accoun | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S08_06 - Verify that entering a password that fails the stated policy should block account creation and identify the requirement it fails |
| `TC_E01S11_01` | E01-S11 | Verify that confirming deactivation should sign the user out and block further s | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S11_01 - Verify that confirming deactivation should sign the user out and block further sign-in with those credentials |
| `TC_E01S11_02` | E01-S11 | Verify that past registrations and event records should remain intact and attrib | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S11_02 - Verify that past registrations and event records should remain intact and attributed after deactivation |
| `TC_E01S11_03` | E01-S11 | Verify that an Attendee's upcoming registration should be withdrawn and its plac | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S11_03 - Verify that an Attendee |
| `TC_E01S11_04` | E01-S11 | Verify that an Event Coordinator with assigned events should be blocked from dea | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S11_04 - Verify that an Event Coordinator with assigned events should be blocked from deactivating until those events are reassigned |
| `TC_E01S11_05` | E01-S11 | Verify that a deactivation should be recorded in the activity log with the actor | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S11_05 - Verify that a deactivation should be recorded in the activity log with the actor and time |
| `TC_E01S12_01` | E01-S12 | Verify that a Coordinator's event list should contain only events assigned to th | ✅ active | tests/e2e/verify.spec.ts: TC_E01S12_01 — verify success renders confirmation and sign-in link |
| `TC_E01S12_02` | E01-S12 | Verify that a Coordinator opening or acting on a colleague's event directly shou | ✅ active | tests/e2e/verify.spec.ts: TC_E01S12_02 — verify expired token surfaces expired copy and register link |
| `TC_E01S12_03` | E01-S12 | Verify that a Coordinator should still see every venue's availability states wit | ✅ active | tests/e2e/verify.spec.ts: TC_E01S12_03 — verify already-verified token shows the idempotent message |
| `TC_E01S12_04` | E01-S12 | Verify that Organiser client isolation should be unchanged by Coordinator scopin | ✅ active | tests/e2e/verify.spec.ts: TC_E01S12_04 — missing token bypasses the API and shows invalid |
| `TC_E01S13_01` | E01-S13 | Verify that a Lead and a Safety Officer should each land on their own workspace  | ❌ none | — |
| `TC_E01S13_02` | E01-S13 | Verify that new-role accounts should hold exactly one role and that the five exi | ❌ none | — |

### E02

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_E02S01_01` | E02-S01 | Verify that submitting a request with every mandatory field complete should set  | ✅ active | tests/e2e/e02.spec.ts: TC_E02S01_01 - Verify that submitting a request with every mandatory field complete should set its status to Submitted and confirm to the Organiser |
| `TC_E02S01_02` | E02-S01 | Verify that submitting with any mandatory field empty should be blocked with eve | ✅ active | tests/e2e/e02.spec.ts: TC_E02S01_02 - Verify that submitting with any mandatory field empty should be blocked with every missing field identified |
| `TC_E02S01_03` | E02-S01 | Verify that entering a preferred date in the past should block submission with a | ✅ active | tests/e2e/e02.spec.ts: TC_E02S01_03 - Verify that entering a preferred date in the past should block submission with an explanation |
| `TC_E02S01_04` | E02-S01 | Verify that selecting 'none required' for equipment, layout, or registration set | ✅ active | tests/e2e/e02.spec.ts: TC_E02S01_04 - Verify that selecting  |
| `TC_E02S01_05` | E02-S01 | Verify that the event request form should require all ten mandatory fields befor | ✅ active | tests/e2e/e02.spec.ts: TC_E02S01_05 - Verify that the event request form should require all ten mandatory fields before it can be considered complete |
| `TC_E02S02_01` | E02-S02 | Verify that saving a partially completed request as a draft should hide it from  | ✅ active | tests/e2e/e02.spec.ts: TC_E02S02_01 - Verify that saving a partially completed request as a draft should hide it from Event Coordinators |
| `TC_E02S02_02` | E02-S02 | Verify that reopening a saved draft should restore all previously entered values | ✅ active | tests/e2e/e02.spec.ts: TC_E02S02_02 - Verify that reopening a saved draft should restore all previously entered values |
| `TC_E02S02_03` | E02-S02 | Verify that deleting a draft should remove it from the list and stop it counting | ✅ active | tests/e2e/e02.spec.ts: TC_E02S02_03 - Verify that deleting a draft should remove it from the list and stop it counting as an active request |
| `TC_E02S02_04` | E02-S02 | Verify that submitting a draft with every mandatory field complete should follow | ✅ active | tests/e2e/e02.spec.ts: TC_E02S02_04 - Verify that submitting a draft with every mandatory field complete should follow the normal submission flow |
| `TC_E02S02_05` | E02-S02 | Verify that all of an Organiser's saved drafts should be listed and clearly dist | ✅ active | tests/e2e/e02.spec.ts: TC_E02S02_05 - Verify that all of an Organiser |
| `TC_E02S03_01` | E02-S03 | Verify that selecting predefined accessibility requirements should store them wi | ✅ active | tests/e2e/e02.spec.ts: TC_E02S03_01 - Verify that selecting predefined accessibility requirements should store them with the request and show them to the Coordinator |
| `TC_E02S03_02` | E02-S03 | Verify that a free-text accessibility requirement should be stored and shown to  | ✅ active | tests/e2e/e02.spec.ts: TC_E02S03_02 - Verify that a free-text accessibility requirement should be stored and shown to the Coordinator but excluded from automated venue matching |
| `TC_E02S03_03` | E02-S03 | Verify that recorded predefined accessibility requirements should exclude or fla | ⚠️ scaffold | tests/e2e/e02.spec.ts: TC_E02S03_03 - Verify that recorded predefined accessibility requirements should exclude or flag venues that cannot meet them |

### E03

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_E03S01_01` | E03-S01 | Verify that submitting a request should trigger automatic assignment of exactly  | ✅ active | backend/tests/coordinatorNotifications.integration.test.ts: TC_E03S01_01 TC_E11S01_11: submission and draft submission notify organiser and assigned Coordinator once each with emai |
| `TC_E03S01_02` | E03-S01 | Verify that when several Coordinators are available, the system should assign th | ⚠️ scaffold | tests/e2e/e03.spec.ts: TC_E03S01_02 - Verify that when several Coordinators are available, the system should assign the one with the fewest active events |
| `TC_E03S01_03` | E03-S01 | [RETIRED — contradicts Scenarios 3 and 4, where ownership moves only once the co | ⚠️ scaffold | tests/e2e/e03.spec.ts: TC_E03S01_03 - Verify that the currently assigned Coordinator should be able to reassign the event to a colleague |
| `TC_E03S01_04` | E03-S01 | Verify that a Coordinator who is not assigned to an event should be refused when | ✅ active | tests/e2e/e03.spec.ts: TC_E03S01_04 - Verify that a Coordinator who is not assigned to an event should be refused when attempting to reassign it |
| `TC_E03S01_05` | E03-S01 | Verify that when the named colleague declines a reassignment, the original Coord | ✅ active | backend/tests/coordinatorNotifications.integration.test.ts: TC_E03S01_05 TC_E03S01_07 TC_E11S01_11: reassignment request and responses produce one outbox job without actor self-not |
| `TC_E03S01_07` | E03-S01 | Verify that ownership moves only once the incoming Coordinator accepts a reassig | ✅ active | backend/tests/coordinatorNotifications.integration.test.ts: TC_E03S01_05 TC_E03S01_07 TC_E11S01_11: reassignment request and responses produce one outbox job without actor self-not |
| `TC_E03S02_01` | E03-S02 | Verify that recording and sending clarification questions on an Under-Review req | ✅ active | backend/tests/clarification.integration.test.ts: TC_E03S02_01: questions move an Under Review request to Awaiting Clarification and notify the Organiser once, with the question tex |
| `TC_E03S02_02` | E03-S02 | Verify that when the Organiser responds and resubmits, the request should return | ✅ active | backend/tests/clarification.integration.test.ts: TC_E03S02_02: a complete answer resolves the question, returns the request to Under Review and notifies the Coordinator once; tests |
| `TC_E03S02_03` | E03-S02 | Verify that a request Awaiting Clarification should show its outstanding questio | ✅ active | backend/tests/clarification.integration.test.ts: TC_E03S02_03: both event detail reads list the outstanding questions with the date each was raised; tests/e2e/e03.spec.ts: TC_E03S0 |
| `TC_E03S02_04` | E03-S02 | Verify that an Event Coordinator should be able to filter their events by clarif | ✅ active | backend/tests/clarification.integration.test.ts: TC_E03S02_04: a Coordinator can filter their events to Awaiting Clarification; tests/e2e/e03.spec.ts: TC_E03S02_04 - Verify that an |
| `TC_E03S02_05` | E03-S02 | Verify that a Coordinator who is not assigned to a request should be refused whe | ✅ active | backend/tests/clarification.integration.test.ts: TC_E03S02_05: a Coordinator not assigned to the request is refused, nothing changes and the attempt is audited; frontend/src/featur |
| `TC_E03S02_06` | E03-S02 | Verify that clarification cannot be requested on a request that is not Under Rev | ✅ active | backend/tests/clarification.integration.test.ts: TC_E03S02_06: clarification cannot be requested on a request that is not Under Review; frontend/src/features/coordinator/RequestCla |
| `TC_E03S02_07` | E03-S02 | Verify that a clarification request with no question, or only a blank question,  | ✅ active | backend/tests/clarification.integration.test.ts: TC_E03S02_07: a request with no question, or only blank questions, is rejected; backend/tests/clarification.test.ts: TC_E03S02_07:  |
| `TC_E03S02_08` | E03-S02 | Verify the 2000-character limit on a clarification question | ✅ active | backend/tests/clarification.integration.test.ts: TC_E03S02_08: a 2001-character question is rejected and a 2000-character question is accepted; backend/tests/clarification.test.ts: |
| `TC_E03S02_09` | E03-S02 | Verify that the Organiser must answer every outstanding question before the requ | ✅ active | backend/tests/clarification.integration.test.ts: TC_E03S02_09: a partial answer is rejected and every question stays outstanding; backend/tests/clarification.test.ts: TC_E03S02_09: |
| `TC_E03S02_10` | E03-S02 | Verify that only the Organiser who owns a request can answer its clarification q | ✅ active | backend/tests/clarification.integration.test.ts: TC_E03S02_10: another Organiser in the same organisation cannot answer, and the attempt is audited; frontend/src/features/organiser |
| `TC_E03S02_11` | E03-S02 | Verify that answers are refused when the request is not Awaiting Clarification | ✅ active | backend/tests/clarification.integration.test.ts: TC_E03S02_11: answers are refused while the request is not Awaiting Clarification; frontend/src/features/organiser/AnswerQuestions. |
| `TC_E03S02_12` | E03-S02 | Verify that several questions can be sent together, are all shown, and are all r | ✅ active | backend/tests/clarification.integration.test.ts: TC_E03S02_12: two questions are sent in one notice, both listed, and both resolved by one complete response; tests/e2e/e03.spec.ts: |
| `TC_E03S03_01` | E03-S03 | Verify that approving a request with complete required information should move i | ✅ active | backend/tests/decision.integration.test.ts: TC_E03S03_01: approving a complete Under Review request makes it Approved, audits it and notifies the Organiser once; backend/tests/deci |
| `TC_E03S03_02` | E03-S03 | Verify that approval should be blocked while required information is incomplete, | ✅ active | backend/tests/decision.integration.test.ts: TC_E03S03_02: approval is blocked while Venue requirements is missing, the item is listed and nothing changes; backend/tests/decision.in |
| `TC_E03S03_03` | E03-S03 | Verify that rejecting a request under review with a recorded reason should set i | ✅ active | backend/tests/decision.integration.test.ts: TC_E03S03_03: rejecting with a reason makes the request Rejected, stores the reason and notifies the Organiser once, with the reason; te |
| `TC_E03S03_04` | E03-S03 | Verify that attempting to reject a request without recording a reason should be  | ✅ active | backend/tests/decision.integration.test.ts: TC_E03S03_04: a rejection without a reason is refused and the request stays Under Review; backend/tests/decision.test.ts: TC_E03S03_04:  |
| `TC_E03S03_05` | E03-S03 | Verify that a rejected request should show its reason and decision date in plain | ✅ active | backend/tests/decision.integration.test.ts: TC_E03S03_05: the Organiser sees the reason and decision date of a rejected request, cannot edit it, and the edit is refused; backend/te |
| `TC_E03S03_06` | E03-S03 | Verify that a Coordinator who is not assigned to a request should be refused whe | ✅ active | backend/tests/decision.integration.test.ts: TC_E03S03_06: a Coordinator not assigned to the request is refused for both decisions; nothing changes, the attempts are audited and hid |
| `TC_E03S03_07` | E03-S03 | Verify that a decision cannot be made on a request that is not Under Review | ✅ active | backend/tests/decision.integration.test.ts: TC_E03S03_07: a decision is refused while the request is Awaiting Clarification or already Approved; frontend/src/features/coordinator/D |
| `TC_E03S03_08` | E03-S03 | Verify that an Event Organiser should not be able to approve their own request | ✅ active | backend/tests/decision.integration.test.ts: TC_E03S03_08: the Organiser who submitted the request cannot approve it, and the attempt is audited; backend/tests/decision.test.ts: TC_ |
| `TC_E03S03_09` | E03-S03 | Verify that a rejected request cannot be decided again | ✅ active | backend/tests/decision.integration.test.ts: TC_E03S03_09: a rejected request cannot be decided again; frontend/src/features/coordinator/DecisionPanel.test.tsx: TC_E03S03_09 - a rej |
| `TC_E03S03_10` | E03-S03 | Verify the 2000-character limit on a rejection reason | ✅ active | backend/tests/decision.integration.test.ts: TC_E03S03_10: a 2001-character reason is refused and a 2000-character reason is stored in full; backend/tests/decision.test.ts: TC_E03S0 |
| `TC_E03S03_11` | E03-S03 | Verify that an Event Organiser cannot edit their rejected request | ✅ active | backend/tests/decision.integration.test.ts: TC_E03S03_11: the Organiser of a rejected request is refused an edit with no change-request offer; others keep their usual refusal; back |
| `TC_E03S03_12` | E03-S03 | Verify that a request whose accessibility needs are given only as predefined fea | ✅ active | backend/tests/decision.integration.test.ts: TC_E03S03_12: a request whose accessibility needs are given only as predefined features can be approved; frontend/src/features/coordinat |
| `TC_E03S05_01` | E03-S05 | Verify that opening an event should show its current status and the date it was  | ✅ active | tests/e2e/e03.spec.ts: TC_E03S05_01 - Verify that opening an event should show its current status and the date it was reached in plain language |
| `TC_E03S05_02` | E03-S05 | Verify that when an event's status changes, the new status should be shown and t | ✅ active | tests/e2e/e03.spec.ts: TC_E03S05_02 - Verify that when an event |
| `TC_E03S05_03` | E03-S05 | Verify that an Organiser should be able to see the full status history for their | ✅ active | tests/e2e/e03.spec.ts: TC_E03S05_03 - Verify that an Organiser should be able to see the full status history for their event |
| `TC_E03S06_01` | E03-S06 | Verify that posting a comment on an accessible event should show the author, tim | ✅ active | tests/e2e/e03.spec.ts: TC_E03S06_01 - Verify that posting a comment on an accessible event should show the author, timestamp, and notify the assigned Coordinator |
| `TC_E03S06_02` | E03-S06 | Verify that all comments on an event should be shown in chronological order | ✅ active | tests/e2e/e03.spec.ts: TC_E03S06_02 - Verify that all comments on an event should be shown in chronological order |
| `TC_E03S06_03` | E03-S06 | Verify that attempting to post a comment on an event without access should be re | ✅ active | tests/e2e/e03.spec.ts: TC_E03S06_03 - Verify that attempting to post a comment on an event without access should be refused |
| `TC_E03S07_01` | E03-S07 | Verify that an Organiser should be able to directly edit any field while the eve | ✅ active | tests/e2e/e03.spec.ts: TC_E03S07_01 - Verify that an Organiser should be able to directly edit any field while the event has not yet been approved |
| `TC_E03S07_02` | E03-S07 | Verify that the assigned Coordinator should be able to edit any field after appr | ⚠️ scaffold | tests/e2e/e03.spec.ts: TC_E03S07_02 - Verify that the assigned Coordinator should be able to edit any field after approval, with the change recorded in the activity log |
| `TC_E03S07_03` | E03-S07 | Verify that an Organiser should be able to directly edit name, description, purp | ✅ active | tests/e2e/e03.spec.ts: TC_E03S07_03 - Verify that an Organiser should be able to directly edit name, description, purpose, or registration dates even after approval |
| `TC_E03S07_04` | E03-S07 | Verify that an Organiser attempting to directly edit a restricted field after ap | ✅ active | tests/e2e/e03.spec.ts: TC_E03S07_04 - Verify that an Organiser attempting to directly edit a restricted field after approval should be refused and directed to the change request fo |
| `TC_E03S07_05` | E03-S07 | Verify that a Coordinator who is not assigned to an approved event should be ref | ✅ active | tests/e2e/e03.spec.ts: TC_E03S07_05 - Verify that a Coordinator who is not assigned to an approved event should be refused when attempting to edit it |
| `TC_E03S07_06` | E03-S07 | Verify that an Organiser's unrestricted post-approval edit should also be record | ✅ active | tests/e2e/e03.spec.ts: TC_E03S07_06 - Verify that an Organiser |
| `TC_E03S08_01` | E03-S08 | Verify that a newly submitted request should enter the unassigned queue with no  | ❌ none | — |
| `TC_E03S08_02` | E03-S08 | Verify that the unassigned queue should show each request's basic information ol | ❌ none | — |
| `TC_E03S08_03` | E03-S08 | Verify that the Lead assigning a Coordinator should move the request to Under Re | ❌ none | — |
| `TC_E03S08_04` | E03-S08 | Verify that a Coordinator attempting to assign a queued request should be refuse | ❌ none | — |
| `TC_E03S08_05` | E03-S08 | Verify that the Organiser's status history should show Submitted then Under Revi | ❌ none | — |
| `TC_E03S09_01` | E03-S09 | Verify that a Lead reassignment should take effect immediately with both Coordin | ❌ none | — |
| `TC_E03S09_02` | E03-S09 | Verify that Coordinator-to-Coordinator reassignment should still require the col | ❌ none | — |
| `TC_E03S09_03` | E03-S09 | Verify that a Coordinator should be able to ask the Lead to reassign an event an | ❌ none | — |
| `TC_E03S10_01` | E03-S10 | Verify that the oversight view should list every active event with its Coordinat | ❌ none | — |
| `TC_E03S10_02` | E03-S10 | Verify that a Coordinator navigating to the oversight view should be refused and | ❌ none | — |

### E05

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_E05S01_01` | E05-S01 | Verify that saving a new venue with its full details should make it searchable b | ✅ active | backend/tests/venueCatalogue.integration.test.ts: E05-S01 TC_E05S01_01 TC_E05S01_02 TC_E05S01_03 TC_E05S01_04 TC_E05S01_05 TC_E05S01_06 TC_E05S01_07 / E05-S02 TC_E05S02_01 TC_E05S0 |
| `TC_E05S01_02` | E05-S01 | Verify that reducing a venue's capacity below a confirmed booking's expected att | ✅ active | backend/tests/venueCatalogue.integration.test.ts: E05-S01 TC_E05S01_01 TC_E05S01_02 TC_E05S01_03 TC_E05S01_04 TC_E05S01_05 TC_E05S01_06 TC_E05S01_07 / E05-S02 TC_E05S02_01 TC_E05S0 |
| `TC_E05S01_03` | E05-S01 | Verify that retiring a venue with no future bookings should remove it from searc | ✅ active | backend/tests/venueCatalogue.integration.test.ts: E05-S01 TC_E05S01_01 TC_E05S01_02 TC_E05S01_03 TC_E05S01_04 TC_E05S01_05 TC_E05S01_06 TC_E05S01_07 / E05-S02 TC_E05S02_01 TC_E05S0 |
| `TC_E05S01_04` | E05-S01 | Verify that attempting to retire a venue with future bookings should be blocked  | ✅ active | backend/tests/venueCatalogue.integration.test.ts: E05-S01 TC_E05S01_01 TC_E05S01_02 TC_E05S01_03 TC_E05S01_04 TC_E05S01_05 TC_E05S01_06 TC_E05S01_07 / E05-S02 TC_E05S02_01 TC_E05S0 |
| `TC_E05S01_05` | E05-S01 | Verify that updating an existing venue's attributes should save the changes | ✅ active | backend/tests/venueCatalogue.integration.test.ts: E05-S01 TC_E05S01_01 TC_E05S01_02 TC_E05S01_03 TC_E05S01_04 TC_E05S01_05 TC_E05S01_06 TC_E05S01_07 / E05-S02 TC_E05S02_01 TC_E05S0 |
| `TC_E05S01_06` | E05-S01 | Verify that reducing venue capacity one below the booked expected attendance fla | ✅ active | backend/tests/venueCatalogue.integration.test.ts: E05-S01 TC_E05S01_01 TC_E05S01_02 TC_E05S01_03 TC_E05S01_04 TC_E05S01_05 TC_E05S01_06 TC_E05S01_07 / E05-S02 TC_E05S02_01 TC_E05S0 |
| `TC_E05S01_07` | E05-S01 | Verify that reducing venue capacity to exactly the booked expected attendance do | ✅ active | backend/tests/venueCatalogue.integration.test.ts: E05-S01 TC_E05S01_01 TC_E05S01_02 TC_E05S01_03 TC_E05S01_04 TC_E05S01_05 TC_E05S01_06 TC_E05S01_07 / E05-S02 TC_E05S02_01 TC_E05S0 |
| `TC_E05S02_01` | E05-S02 | Verify that adding a supported layout with its maximum capacity should store it  | ✅ active | backend/tests/venueCatalogue.integration.test.ts: E05-S01 TC_E05S01_01 TC_E05S01_02 TC_E05S01_03 TC_E05S01_04 TC_E05S01_05 TC_E05S01_06 TC_E05S01_07 / E05-S02 TC_E05S02_01 TC_E05S0 |
| `TC_E05S02_02` | E05-S02 | Verify that a venue whose layout capacity is below a event's required attendance | ✅ active | backend/tests/venueCatalogue.integration.test.ts: E05-S01 TC_E05S01_01 TC_E05S01_02 TC_E05S01_03 TC_E05S01_04 TC_E05S01_05 TC_E05S01_06 TC_E05S01_07 / E05-S02 TC_E05S02_01 TC_E05S0 |
| `TC_E05S02_03` | E05-S02 | Verify that attempting to add a layout that already exists on the venue should b | ✅ active | backend/tests/venueCatalogue.integration.test.ts: E05-S01 TC_E05S01_01 TC_E05S01_02 TC_E05S01_03 TC_E05S01_04 TC_E05S01_05 TC_E05S01_06 TC_E05S01_07 / E05-S02 TC_E05S02_01 TC_E05S0 |
| `TC_E05S02_04` | E05-S02 | Verify that venue Staff should be able to view all layouts supported by a venue  | ✅ active | backend/tests/venueCatalogue.integration.test.ts: E05-S01 TC_E05S01_01 TC_E05S01_02 TC_E05S01_03 TC_E05S01_04 TC_E05S01_05 TC_E05S01_06 TC_E05S01_07 / E05-S02 TC_E05S02_01 TC_E05S0 |
| `TC_E05S02_05` | E05-S02 | Verify that editing the maximum capacity of an existing layout should save the u | ✅ active | backend/tests/venueCatalogue.integration.test.ts: E05-S01 TC_E05S01_01 TC_E05S01_02 TC_E05S01_03 TC_E05S01_04 TC_E05S01_05 TC_E05S01_06 TC_E05S01_07 / E05-S02 TC_E05S02_01 TC_E05S0 |
| `TC_E05S02_06` | E05-S02 | Verify that removing a layout no longer offered at the venue should delete it fr | ✅ active | backend/tests/venueCatalogue.integration.test.ts: E05-S01 TC_E05S01_01 TC_E05S01_02 TC_E05S01_03 TC_E05S01_04 TC_E05S01_05 TC_E05S01_06 TC_E05S01_07 / E05-S02 TC_E05S02_01 TC_E05S0 |
| `TC_E05S02_07` | E05-S02 | Verify that a layout whose capacity exactly equals event attendance is treated a | ✅ active | backend/tests/venueCatalogue.integration.test.ts: E05-S01 TC_E05S01_01 TC_E05S01_02 TC_E05S01_03 TC_E05S01_04 TC_E05S01_05 TC_E05S01_06 TC_E05S01_07 / E05-S02 TC_E05S02_01 TC_E05S0 |
| `TC_E05S02_08` | E05-S02 | Verify that a layout one place short of event attendance is excluded or marked u | ✅ active | backend/tests/venueCatalogue.integration.test.ts: E05-S01 TC_E05S01_01 TC_E05S01_02 TC_E05S01_03 TC_E05S01_04 TC_E05S01_05 TC_E05S01_06 TC_E05S01_07 / E05-S02 TC_E05S02_01 TC_E05S0 |
| `TC_E05S03_01` | E05-S03 | Verify that opening a venue's calendar for a period with bookings and blocks sho | ✅ active | backend/tests/venueCalendar.integration.test.ts: E05-S03 TC_E05S03_01 TC_E05S03_02 TC_E05S03_03 TC_E05S03_04 TC_E05S03_05: venue availability calendar against real PostgreSQL; back |
| `TC_E05S03_02` | E05-S03 | Verify that a period the Coordinator is not permitted to view should show as una | ✅ active | backend/tests/venueCalendar.integration.test.ts: E05-S03 TC_E05S03_01 TC_E05S03_02 TC_E05S03_03 TC_E05S03_04 TC_E05S03_05: venue availability calendar against real PostgreSQL; back |
| `TC_E05S03_03` | E05-S03 | Verify that a venue blocked for maintenance should be visually distinct from a b | ✅ active | backend/tests/venueCalendar.integration.test.ts: E05-S03 TC_E05S03_01 TC_E05S03_02 TC_E05S03_03 TC_E05S03_04 TC_E05S03_05: venue availability calendar against real PostgreSQL; back |
| `TC_E05S03_04` | E05-S03 | Verify that an Event Coordinator should be able to select a date or date range a | ✅ active | backend/tests/venueCalendar.integration.test.ts: E05-S03 TC_E05S03_01 TC_E05S03_02 TC_E05S03_03 TC_E05S03_04 TC_E05S03_05: venue availability calendar against real PostgreSQL; test |
| `TC_E05S03_05` | E05-S03 | Verify that for periods the Coordinator is permitted to view, the calendar shoul | ✅ active | backend/tests/venueCalendar.integration.test.ts: E05-S03 TC_E05S03_01 TC_E05S03_02 TC_E05S03_03 TC_E05S03_04 TC_E05S03_05: venue availability calendar against real PostgreSQL; back |
| `TC_E05S04_01` | E05-S04 | Verify that blocking a venue for a period with no bookings should make it unavai | ✅ active | backend/tests/venueBlocks.integration.test.ts: E05-S04 TC_E05S04_01: blocking a free period makes the venue unavailable for those dates; tests/e2e/e05.spec.ts: TC_E05S04_01 - Verif |
| `TC_E05S04_02` | E05-S04 | Verify that attempting to block a venue over a period with a confirmed booking s | ✅ active | backend/tests/venueBlocks.integration.test.ts: E05-S04 TC_E05S04_02: a block over a confirmed booking is refused and names the booking; tests/e2e/e05.spec.ts: TC_E05S04_02 - Verify |
| `TC_E05S04_03` | E05-S04 | Verify that creating a block over an upcoming event's dates should notify the af | ✅ active | backend/tests/venueBlocks.integration.test.ts: E05-S04 TC_E05S04_03: a block over an upcoming tentative event notifies its Coordinator once; tests/e2e/e05.spec.ts: TC_E05S04_03 - V |
| `TC_E05S04_04` | E05-S04 | Verify that removing or shortening an existing block should restore the venue's  | ✅ active | backend/tests/venueBlocks.integration.test.ts: E05-S04 TC_E05S04_04: shortening or removing a block restores the released days; tests/e2e/e05.spec.ts: TC_E05S04_04 - Verify that re |
| `TC_E05S05_01` | E05-S05 | Verify that saving a setup time and a turnaround time on a venue should store bo | ❌ none | — |
| `TC_E05S05_02` | E05-S05 | Verify that the availability calendar should show a booking's buffered occupancy | ❌ none | — |
| `TC_E05S05_03` | E05-S05 | Verify that changing a venue's turnaround time so that two confirmed bookings no | ❌ none | — |
| `TC_E05S05_04` | E05-S05 | Verify that a booking whose buffered window starts exactly when another's buffer | ❌ none | — |
| `TC_E05S05_05` | E05-S05 | Verify that a booking adjacent to a maintenance block should not be treated as c | ❌ none | — |
| `TC_E05S05_06` | E05-S05 | Verify that venues created before buffers existed should default to 0 and 0 and  | ❌ none | — |
| `TC_E05S05_07` | E05-S05 | Verify that a venue whose existing booking overlaps the event only once its setu | ❌ none | — |
| `TC_E05S06_01` | E05-S06 | Verify that marking a venue unavailable with a reason category over a period wit | ❌ none | — |
| `TC_E05S06_02` | E05-S06 | Verify that marking a venue unavailable over a Pending request and a Confirmed b | ❌ none | — |
| `TC_E05S06_03` | E05-S06 | Verify that each Coordinator whose booking became Conflicting should receive an  | ❌ none | — |
| `TC_E05S06_04` | E05-S06 | Verify that an unavailability with no end date and time should be refused | ❌ none | — |
| `TC_E05S06_05` | E05-S06 | Verify that extending an unavailability should flag bookings newly inside the lo | ❌ none | — |
| `TC_E05S06_06` | E05-S06 | Verify that E05-S04's block, shorten and remove behaviour still works for period | ❌ none | — |

### E06

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_E06S01_01` | E06-S01 | Verify that running a search where multiple criteria match an available venue sh | ✅ active | backend/tests/venueSearch.integration.test.ts: TC_E06S01_01 TC_E06S01_02 TC_E06S01_03 TC_E06S01_04: PostgreSQL event requirements, near matches and range boundaries; backend/tests/ |
| `TC_E06S01_02` | E06-S01 | Verify that when no venue matches every criterion, near matches should be return | ✅ active | backend/tests/venueSearch.integration.test.ts: TC_E06S01_01 TC_E06S01_02 TC_E06S01_03 TC_E06S01_04: PostgreSQL event requirements, near matches and range boundaries; tests/e2e/e06. |
| `TC_E06S01_03` | E06-S01 | Verify that a venue available but with capacity below the event's expected atten | ✅ active | backend/tests/venueSearch.integration.test.ts: TC_E06S01_01 TC_E06S01_02 TC_E06S01_03 TC_E06S01_04: PostgreSQL event requirements, near matches and range boundaries; tests/e2e/e06. |
| `TC_E06S01_04` | E06-S01 | Verify that a venue that is blocked or already confirmed for the requested perio | ✅ active | backend/tests/venueSearch.integration.test.ts: TC_E06S01_01 TC_E06S01_02 TC_E06S01_03 TC_E06S01_04: PostgreSQL event requirements, near matches and range boundaries; tests/e2e/e06. |
| `TC_E06S02_01` | E06-S02 | Verify that viewing a venue in the context of a event with recorded requirements | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S02_01 - Verify that viewing a venue in the context of a event with recorded requirements should show a suitability status for that event |
| `TC_E06S02_02` | E06-S02 | Verify that a venue failing one or more recorded requirements should be marked u | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S02_02 - Verify that a venue failing one or more recorded requirements should be marked unsuitable with every failing requirement named |
| `TC_E06S02_03` | E06-S02 | Verify that a venue meeting all recorded requirements for the event should be ma | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S02_03 - Verify that a venue meeting all recorded requirements for the event should be marked suitable |
| `TC_E06S02_04` | E06-S02 | Verify that submitting a booking request for a venue marked unsuitable should st | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S02_04 - Verify that submitting a booking request for a venue marked unsuitable should still be accepted, with the unsuitability shown to Venue Staff |
| `TC_E06S03_01` | E06-S03 | Verify that submitting a booking request for a event with no existing pending re | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S03_01 - Verify that submitting a booking request for a event with no existing pending request should create it as Pending and notify Venue Staff |
| `TC_E06S03_02` | E06-S03 | Verify that submitting the first booking request for an Approved event should mo | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S03_02 - Verify that submitting the first booking request for an Approved event should move its status to Planning |
| `TC_E06S03_03` | E06-S03 | Verify that submitting a second booking request for a event that already has a p | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S03_03 - Verify that submitting a second booking request for a event that already has a pending request should be blocked with the existing request ide |
| `TC_E06S03_04` | E06-S03 | Verify that submitting a request for a venue already Pending or Confirmed for an | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S03_04 - Verify that submitting a request for a venue already Pending or Confirmed for another event over the same period should be blocked with the co |
| `TC_E06S03_05` | E06-S03 | Verify that an Event Coordinator should be able to view the status of each of th | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S03_05 - Verify that an Event Coordinator should be able to view the status of each of their own booking requests |
| `TC_E06S03_06` | E06-S03 | Verify that a booking request whose period overlaps another event's buffered win | ❌ none | — |
| `TC_E06S03_07` | E06-S03 | Verify that a Coordinator should be able to hold several venue bookings for one  | ❌ none | — |
| `TC_E06S03_08` | E06-S03 | Verify that withdrawing one of several venue bookings should leave the others un | ❌ none | — |
| `TC_E06S04_01` | E06-S04 | Verify that approving a pending request for a venue that is free for the period  | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S04_01 - Verify that approving a pending request for a venue that is free for the period should confirm the booking, update the calendar, and notify th |
| `TC_E06S04_02` | E06-S04 | Verify that rejecting a request with a recorded reason and a suggested alternati | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S04_02 - Verify that rejecting a request with a recorded reason and a suggested alternative venue should notify the Coordinator with both, allowing the |
| `TC_E06S04_03` | E06-S04 | Verify that attempting to reject a request without recording a reason should be  | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S04_03 - Verify that attempting to reject a request without recording a reason should be blocked |
| `TC_E06S04_04` | E06-S04 | Verify that approving a request whose buffered window overlaps another confirmed | ❌ none | — |
| `TC_E06S04_05` | E06-S04 | Verify that an approved venue booking should be recorded with the actor, action, | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S04_05 - Verify that an approved venue booking should be recorded with the actor, action, affected records, and time |
| `TC_E06S04_06` | E06-S04 | Verify that a rejected venue booking should be recorded with the actor, action,  | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S04_06 - Verify that a rejected venue booking should be recorded with the actor, action, affected records, and time |
| `TC_E06S04_07` | E06-S04 | Verify that a released venue booking should be recorded with the actor, action,  | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S04_07 - Verify that a released venue booking should be recorded with the actor, action, affected records, and time |
| `TC_E06S05_01` | E06-S05 | Verify that a second tentative hold on the same venue and period is refused | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S05_01 - Verify that a second tentative hold on the same venue and period is refused |
| `TC_E06S05_02` | E06-S05 | Verify that a tentative hold should occupy the venue's buffered window so that a | ❌ none | — |
| `TC_E06S05_03` | E06-S05 | Verify that a new tentative hold should carry an expiry 48 hours after creation  | ❌ none | — |
| `TC_E06S05_04` | E06-S05 | Verify that submitting a booking request for a held venue should complete the ho | ❌ none | — |
| `TC_E06S05_05` | E06-S05 | Verify that an unconverted hold should become Expired when its expiry passes, fr | ❌ none | — |
| `TC_E06S05_06` | E06-S05 | Verify that the Coordinator should receive a reminder 24 hours before a hold exp | ❌ none | — |
| `TC_E06S05_07` | E06-S05 | Verify that Venue Staff should be able to extend an unexpired hold but not an ex | ❌ none | — |
| `TC_E06S06_01` | E06-S06 | Verify that attempting to approve a request that overlaps an existing confirmed  | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S06_01 - Verify that attempting to approve a request that overlaps an existing confirmed booking for the same venue should be blocked with the conflict |
| `TC_E06S06_02` | E06-S06 | Verify that approving one of two pending requests for the same venue and overlap | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S06_02 - Verify that approving one of two pending requests for the same venue and overlapping times should flag the other as conflicting |
| `TC_E06S06_03` | E06-S06 | Verify that if another Venue Staff member approves a conflicting request moments | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S06_03 - Verify that if another Venue Staff member approves a conflicting request moments earlier, a simultaneous approval attempt should fail safely a |
| `TC_E06S06_04` | E06-S06 | Verify that a booking beginning exactly when another ends is not treated as a co | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S06_04 - Verify that a booking beginning exactly when another ends is not treated as a conflict |
| `TC_E06S06_05` | E06-S06 | Verify that a booking overlapping an existing one by a single minute is blocked | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S06_05 - Verify that a booking overlapping an existing one by a single minute is blocked |
| `TC_E06S06_06` | E06-S06 | Verify that two approvals whose advertised times do not overlap but whose buffer | ❌ none | — |
| `TC_E06S06_07` | E06-S06 | Verify that approving two requests from the same event on two different venues o | ❌ none | — |

### E07

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_E07S01_01` | E07-S01 | Verify that saving a new equipment item with its full details should make it ava | ✅ active | backend/tests/equipmentCatalogue.integration.test.ts: TC_E07S01_01 TC_E07S01_02 TC_E07S01_03 TC_E07S01_04 equipment catalogue against PostgreSQL; tests/auth-e2e/equipmentCatalogue. |
| `TC_E07S01_02` | E07-S01 | Verify that reducing an item's quantity below the amount already reserved for up | ✅ active | backend/tests/equipmentCatalogue.integration.test.ts: TC_E07S01_01 TC_E07S01_02 TC_E07S01_03 TC_E07S01_04 equipment catalogue against PostgreSQL; tests/auth-e2e/equipmentCatalogue. |
| `TC_E07S01_03` | E07-S01 | Verify that retiring an item with no future reservations should remove it from a | ✅ active | backend/tests/equipmentCatalogue.integration.test.ts: TC_E07S01_01 TC_E07S01_02 TC_E07S01_03 TC_E07S01_04 equipment catalogue against PostgreSQL; tests/auth-e2e/equipmentCatalogue. |
| `TC_E07S01_04` | E07-S01 | Verify that updating an existing equipment item's attributes should save the cha | ✅ active | backend/tests/equipmentCatalogue.integration.test.ts: TC_E07S01_01 TC_E07S01_02 TC_E07S01_03 TC_E07S01_04 equipment catalogue against PostgreSQL; tests/auth-e2e/equipmentCatalogue. |
| `TC_E07S02_01` | E07-S02 | Verify that adding equipment items with quantities to a event of an approved eve | ✅ active | backend/tests/equipmentRequests.integration.test.ts: TC_E07S02_01 TC_E07S02_02 TC_E07S02_03 TC_E07S02_04 real event equipment request persistence, notifications and guards; tests/a |
| `TC_E07S02_02` | E07-S02 | Verify that requesting more of an item than ConnectSphere owns in total should w | ✅ active | backend/tests/equipmentRequests.integration.test.ts: TC_E07S02_01 TC_E07S02_02 TC_E07S02_03 TC_E07S02_04 real event equipment request persistence, notifications and guards; tests/a |
| `TC_E07S02_03` | E07-S02 | Verify that recording equipment for one event should leave a different event's e | ✅ active | backend/tests/equipmentRequests.integration.test.ts: TC_E07S02_01 TC_E07S02_02 TC_E07S02_03 TC_E07S02_04 real event equipment request persistence, notifications and guards; tests/a |
| `TC_E07S02_04` | E07-S02 | Verify that amending or removing an equipment request before it is reserved shou | ✅ active | backend/tests/equipmentRequests.integration.test.ts: TC_E07S02_01 TC_E07S02_02 TC_E07S02_03 TC_E07S02_04 real event equipment request persistence, notifications and guards; tests/a |
| `TC_E07S03_01` | E07-S03 | Verify that checking availability for a period with other reservations should ex | ✅ active | backend/tests/equipmentAvailability.integration.test.ts: TC_E07S03_01 TC_E07S03_02 TC_E07S03_03 real PostgreSQL availability, damaged stock, location and independent periods; backe |
| `TC_E07S03_02` | E07-S03 | Verify that an item free for the requested date and time but located at another  | ✅ active | backend/tests/equipmentAvailability.integration.test.ts: TC_E07S03_01 TC_E07S03_02 TC_E07S03_03 real PostgreSQL availability, damaged stock, location and independent periods; backe |
| `TC_E07S03_03` | E07-S03 | Verify that two events requiring the same item at non-overlapping times on the s | ✅ active | backend/tests/equipmentAvailability.integration.test.ts: TC_E07S03_01 TC_E07S03_02 TC_E07S03_03 real PostgreSQL availability, damaged stock, location and independent periods; backe |
| `TC_E07S04_01` | E07-S04 | Verify that reserving the requested quantity when sufficient equipment is free s | ⚠️ scaffold | tests/e2e/e07.spec.ts: TC_E07S04_01 - Verify that reserving the requested quantity when sufficient equipment is free should record the reservation and notify the Event Coordinator |
| `TC_E07S04_02` | E07-S04 | Verify that recording a partial reservation when only part of the requested quan | ⚠️ scaffold | tests/e2e/e07.spec.ts: TC_E07S04_02 - Verify that recording a partial reservation when only part of the requested quantity is free should notify the Coordinator of the shortfall |
| `TC_E07S04_03` | E07-S04 | Verify that once an item becomes fully committed, a subsequent availability chec | ⚠️ scaffold | tests/e2e/e07.spec.ts: TC_E07S04_03 - Verify that once an item becomes fully committed, a subsequent availability check for that period should show no free quantity |
| `TC_E07S04_04` | E07-S04 | Verify that releasing a reservation when a event is cancelled or the equipment i | ⚠️ scaffold | tests/e2e/e07.spec.ts: TC_E07S04_04 - Verify that releasing a reservation when a event is cancelled or the equipment is no longer required should return the quantity to the availab |
| `TC_E07S04_05` | E07-S04 | Verify that requesting one fewer than the free quantity produces a full reservat | ⚠️ scaffold | tests/e2e/e07.spec.ts: TC_E07S04_05 - Verify that requesting one fewer than the free quantity produces a full reservation and leaves the remainder free |
| `TC_E07S04_06` | E07-S04 | Verify that requesting exactly the free quantity produces a full reservation and | ⚠️ scaffold | tests/e2e/e07.spec.ts: TC_E07S04_06 - Verify that requesting exactly the free quantity produces a full reservation and leaves nothing free |
| `TC_E07S04_07` | E07-S04 | Verify that requesting one more than the free quantity produces a partial reserv | ⚠️ scaffold | tests/e2e/e07.spec.ts: TC_E07S04_07 - Verify that requesting one more than the free quantity produces a partial reservation that blocks confirmation |
| `TC_E07S05_01` | E07-S05 | Verify that marking an item with no reservations in the period unavailable, with | ⚠️ scaffold | tests/e2e/e07.spec.ts: TC_E07S05_01 - Verify that marking an item with no reservations in the period unavailable, with a reason and a period, should exclude it from availability ch |
| `TC_E07S05_02` | E07-S05 | Verify that marking an item unavailable while it is reserved for an upcoming eve | ⚠️ scaffold | tests/e2e/e07.spec.ts: TC_E07S05_02 - Verify that marking an item unavailable while it is reserved for an upcoming event should flag the affected event and notify its Coordinator |
| `TC_E07S05_03` | E07-S05 | Verify that returning an item to service should restore it to availability check | ⚠️ scaffold | tests/e2e/e07.spec.ts: TC_E07S05_03 - Verify that returning an item to service should restore it to availability checks |
| `TC_E07S06_01` | E07-S06 | Verify that submitting a technical support request describing the support needed | ✅ active | backend/tests/supportRequests.integration.test.ts: TC_E07S06_01 TC_E07S06_02 TC_E07S06_03 technical support requests against PostgreSQL; backend/tests/supportRequests.test.ts: TC_E |
| `TC_E07S06_02` | E07-S06 | Verify that submitting a technical support request before the venue is confirmed | ✅ active | backend/tests/supportRequests.integration.test.ts: TC_E07S06_01 TC_E07S06_02 TC_E07S06_03 technical support requests against PostgreSQL; backend/tests/supportRequests.test.ts: TC_E |
| `TC_E07S06_03` | E07-S06 | Verify that marking a event as needing no technical support should create no req | ✅ active | backend/tests/supportRequests.integration.test.ts: TC_E07S06_01 TC_E07S06_02 TC_E07S06_03 technical support requests against PostgreSQL; backend/tests/supportRequests.test.ts: TC_E |
| `TC_E07S07_01` | E07-S07 | Verify that a colleague with no conflicting assignment during the event's requir | ✅ active | backend/tests/staffAssignments.integration.test.ts: TC_E07S07_01 TC_E07S07_02 TC_E07S07_03 TC_E07S07_04 TC_E07S07_05 TC_E07S07_06 technician assignments against PostgreSQL; backend |
| `TC_E07S07_02` | E07-S07 | Verify that the assignment should be reflected on the assigned staff member's sc | ✅ active | backend/tests/staffAssignments.integration.test.ts: TC_E07S07_01 TC_E07S07_02 TC_E07S07_03 TC_E07S07_04 TC_E07S07_05 TC_E07S07_06 technician assignments against PostgreSQL; tests/e |
| `TC_E07S07_03` | E07-S07 | Verify that assigning a colleague who has an overlapping assignment should be bl | ✅ active | backend/tests/staffAssignments.integration.test.ts: TC_E07S07_01 TC_E07S07_02 TC_E07S07_03 TC_E07S07_04 TC_E07S07_05 TC_E07S07_06 technician assignments against PostgreSQL; backend |
| `TC_E07S07_04` | E07-S07 | Verify that removing an existing assignment from a staff member's schedule shoul | ✅ active | backend/tests/staffAssignments.integration.test.ts: TC_E07S07_01 TC_E07S07_02 TC_E07S07_03 TC_E07S07_04 TC_E07S07_05 TC_E07S07_06 technician assignments against PostgreSQL; backend |
| `TC_E07S07_05` | E07-S07 | Verify that assigning a replacement colleague after removing an assignment shoul | ✅ active | backend/tests/staffAssignments.integration.test.ts: TC_E07S07_01 TC_E07S07_02 TC_E07S07_03 TC_E07S07_04 TC_E07S07_05 TC_E07S07_06 technician assignments against PostgreSQL; tests/e |
| `TC_E07S07_06` | E07-S07 | Verify that the assigned staff member should receive a notification when they ar | ✅ active | backend/tests/staffAssignments.integration.test.ts: TC_E07S07_01 TC_E07S07_02 TC_E07S07_03 TC_E07S07_04 TC_E07S07_05 TC_E07S07_06 technician assignments against PostgreSQL; tests/e |

### E08

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_E08S03_01` | E08-S03 | Verify that confirming an event where every event has a confirmed venue and full | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S03_01 - Verify that confirming an event where every event has a confirmed venue and full equipment reservation should set its status to Confirmed and  |
| `TC_E08S03_02` | E08-S03 | Verify that attempting to confirm an event while a event is missing a confirmed  | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S03_02 - Verify that attempting to confirm an event while a event is missing a confirmed venue should be blocked with the outstanding event named |
| `TC_E08S03_03` | E08-S03 | Verify that attempting to confirm an event while a event has only a partial equi | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S03_03 - Verify that attempting to confirm an event while a event has only a partial equipment reservation should be blocked with the outstanding quant |
| `TC_E08S03_04` | E08-S03 | Verify that attempting to confirm an event while a event's requested technical s | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S03_04 - Verify that attempting to confirm an event while a event |
| `TC_E08S03_05` | E08-S03 | Verify that once an event is confirmed, the Organiser should see the confirmed v | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S03_05 - Verify that once an event is confirmed, the Organiser should see the confirmed venue, date, time and arrangements for every event |
| `TC_E08S03_06` | E08-S03 | Verify that confirming an event with several venue bookings should be blocked wh | ❌ none | — |
| `TC_E08S03_07` | E08-S03 | Verify that an event should be confirmable once every venue booking is Confirmed | ❌ none | — |
| `TC_E08S03_08` | E08-S03 | Verify that submitting a fully arranged event for its Operational Safety Check s | ❌ none | — |
| `TC_E08S03_09` | E08-S03 | Verify that submission for safety review should be blocked while a readiness ite | ❌ none | — |
| `TC_E08S04_01` | E08-S04 | Verify that reverting a Confirmed event to Planning with a recorded reason shoul | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S04_01 - Verify that reverting a Confirmed event to Planning with a recorded reason should update its status and notify the Organiser with the reason |
| `TC_E08S04_02` | E08-S04 | Verify that reverting a Confirmed event with registered Attendees should notify  | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S04_02 - Verify that reverting a Confirmed event with registered Attendees should notify them that arrangements are being revised |
| `TC_E08S04_03` | E08-S04 | Verify that an arrangement breaking on a Confirmed event should not automaticall | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S04_03 - Verify that an arrangement breaking on a Confirmed event should not automatically revert its status; the affected arrangement should instead b |
| `TC_E08S04_04` | E08-S04 | Verify that a reversion from Confirmed to Planning should be recorded in the act | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S04_04 - Verify that a reversion from Confirmed to Planning should be recorded in the activity log |
| `TC_E08S04_05` | E08-S04 | Verify that a reverted event should pass the Operational Safety Check again befo | ❌ none | — |
| `TC_E08S05_01` | E08-S05 | Verify that a Confirmed event should automatically become Completed once its las | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S05_01 - Verify that a Confirmed event should automatically become Completed once its last event |
| `TC_E08S05_02` | E08-S05 | Verify that an Event Coordinator should be able to manually mark a Confirmed eve | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S05_02 - Verify that an Event Coordinator should be able to manually mark a Confirmed event complete once its last event has started |
| `TC_E08S05_03` | E08-S05 | Verify that attempting to mark an event complete before its first event has star | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S05_03 - Verify that attempting to mark an event complete before its first event has started should be blocked |
| `TC_E08S05_04` | E08-S05 | Verify that a Cancelled event should never auto-complete, even after its origina | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S05_04 - Verify that a Cancelled event should never auto-complete, even after its original end time passes |
| `TC_E08S05_05` | E08-S05 | Verify that an event's transition to Completed should be recorded in the activit | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S05_05 - Verify that an event |
| `TC_E08S05_06` | E08-S05 | Verify that an event auto-completes at the exact end time and not before | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S05_06 - Verify that an event auto-completes at the exact end time and not before |
| `TC_E08S06_01` | E08-S06 | Verify that the safety review queue should show each waiting event with the info | ❌ none | — |
| `TC_E08S06_02` | E08-S06 | Verify that approving an event after recording every factor as satisfactory shou | ❌ none | — |
| `TC_E08S06_03` | E08-S06 | Verify that requesting changes should return the event to Planning with the item | ❌ none | — |
| `TC_E08S06_04` | E08-S06 | Verify that rejecting the safety arrangement should return the event to Planning | ❌ none | — |
| `TC_E08S06_05` | E08-S06 | Verify that reject and request changes should require a reason and that no role  | ❌ none | — |
| `TC_E08S06_06` | E08-S06 | Verify that events confirmed before the safety check existed should be untouched | ❌ none | — |

### E09

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_E09S01_01` | E09-S01 | Verify that submitting the required registration information for an open event w | ✅ active | tests/e2e/attendee-registration.spec.ts: TC_E09S01_01 — event discovery lists published events with capacity; tests/e2e/e09.spec.ts: TC_E09S01_01 - Verify that submitting the requi |
| `TC_E09S01_02` | E09-S01 | Verify that registering for a multi-event event should let the Attendee choose w | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S01_02 - Verify that registering for a multi-event event should let the Attendee choose which events to attend, reserving a place in each chosen event |
| `TC_E09S01_03` | E09-S01 | Verify that attempting to register again for a event already registered for shou | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S01_03 - Verify that attempting to register again for a event already registered for should be told so, without creating a duplicate |
| `TC_E09S01_04` | E09-S01 | Verify that submitting registration with a required field empty should block reg | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S01_04 - Verify that submitting registration with a required field empty should block registration and identify the missing fields |
| `TC_E09S01_05` | E09-S01 | Verify that attempting to register for an event that is not Confirmed should be  | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S01_05 - Verify that attempting to register for an event that is not Confirmed should be refused |
| `TC_E09S01_06` | E09-S01 | Verify that an Attendee viewing a multi-venue event should see only the primary  | ❌ none | — |
| `TC_E09S02_01` | E09-S02 | Verify that an Event Organiser should be able to set a registration limit for a  | ✅ active | tests/e2e/attendee-registration.spec.ts: TC_E09S02_01 — registration confirms with a mock success on submit; tests/e2e/e09.spec.ts: TC_E09S02_01 - Verify that an Event Organiser sh |
| `TC_E09S02_02` | E09-S02 | Verify that registration should stop once the event reaches the lower of the Org | ✅ active | tests/e2e/attendee-registration.spec.ts: TC_E09S02_02 — full event routes registration into a waitlist join; tests/e2e/e09.spec.ts: TC_E09S02_02 - Verify that registration should s |
| `TC_E09S02_03` | E09-S02 | Verify that when only one place remains, two simultaneous registration attempts  | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S02_03 - Verify that when only one place remains, two simultaneous registration attempts should result in exactly one success |
| `TC_E09S02_04` | E09-S02 | Verify that opening the registration page for a full event should close registra | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S02_04 - Verify that opening the registration page for a full event should close registration and offer the waiting list where enabled |
| `TC_E09S02_06` | E09-S02 | Verify that a VIP can be added manually when normal registration is full but ven | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S02_06 - Verify that a VIP can be added manually when normal registration is full but venue capacity is not reached |
| `TC_E09S02_07` | E09-S02 | Verify that a manual VIP addition is blocked once total registrations equal venu | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S02_07 - Verify that a manual VIP addition is blocked once total registrations equal venue capacity |
| `TC_E09S03_01` | E09-S03 | Verify that an Event Organiser should be able to set the registration opening an | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S03_01 - Verify that an Event Organiser should be able to set the registration opening and closing dates for an event |
| `TC_E09S03_02` | E09-S03 | Verify that an Event Organiser should be able to set a withdrawal deadline for a | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S03_02 - Verify that an Event Organiser should be able to set a withdrawal deadline for an event |
| `TC_E09S03_03` | E09-S03 | Verify that an Attendee viewing an event before its registration opening date sh | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S03_03 - Verify that an Attendee viewing an event before its registration opening date should see registration as not yet open, with the opening date s |
| `TC_E09S03_04` | E09-S03 | Verify that an Attendee trying to register after the registration closing date h | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S03_04 - Verify that an Attendee trying to register after the registration closing date has passed should be refused |
| `TC_E09S03_05` | E09-S03 | Verify that setting a registration closing date that falls after the event has s | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S03_05 - Verify that setting a registration closing date that falls after the event has started should warn the Organiser and ask them to confirm |
| `TC_E09S03_06` | E09-S03 | Verify that enabling the waiting list for an event should offer it to Attendees  | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S03_06 - Verify that enabling the waiting list for an event should offer it to Attendees once a event becomes full |
| `TC_E09S03_07` | E09-S03 | Verify that registration succeeds at the exact opening timestamp | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S03_07 - Verify that registration succeeds at the exact opening timestamp |
| `TC_E09S03_08` | E09-S03 | Verify that registration still succeeds at the exact closing timestamp | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S03_08 - Verify that registration still succeeds at the exact closing timestamp |
| `TC_E09S04_01` | E09-S04 | Verify that joining the waiting list for a full event with the list enabled shou | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S04_01 - Verify that joining the waiting list for a full event with the list enabled should add the Attendee and confirm their position |
| `TC_E09S04_02` | E09-S04 | Verify that when a place is released in a event with a waiting list, all waitlis | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S04_02 - Verify that when a place is released in a event with a waiting list, all waitlisted Attendees should be notified and the place claimed on a fi |
| `TC_E09S04_03` | E09-S04 | Verify that claiming a released place should remove the Attendee from the waitin | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S04_03 - Verify that claiming a released place should remove the Attendee from the waiting list for that event |
| `TC_E09S04_04` | E09-S04 | Verify that a full event should not offer a waiting list when the Organiser has  | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S04_04 - Verify that a full event should not offer a waiting list when the Organiser has disabled it |
| `TC_E09S04_05` | E09-S04 | Verify that an Attendee should be able to voluntarily leave the waiting list bef | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S04_05 - Verify that an Attendee should be able to voluntarily leave the waiting list before a place is released |
| `TC_E09S05_01` | E09-S05 | Verify that withdrawing from a single event before the withdrawal deadline shoul | ✅ active | tests/e2e/attendee-registration.spec.ts: TC_E09S05_01 — withdrawal requires a reason before recording; tests/e2e/e09.spec.ts: TC_E09S05_01 - Verify that withdrawing from a single e |
| `TC_E09S05_03` | E09-S05 | Verify that attempting to withdraw after the withdrawal deadline has passed shou | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S05_03 - Verify that attempting to withdraw after the withdrawal deadline has passed should be refused, with a contact provided for assistance |
| `TC_E09S05_04` | E09-S05 | Verify that withdrawal succeeds at the exact withdrawal deadline | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S05_04 - Verify that withdrawal succeeds at the exact withdrawal deadline |
| `TC_E09S06_01` | E09-S06 | Verify that marking a registered Attendee as attended for a event after the even | ✅ active | tests/e2e/attendee-registration.spec.ts: TC_E09S06_01 — feedback requires a rating; tests/e2e/e09.spec.ts: TC_E09S06_01 - Verify that marking a registered Attendee as attended for  |
| `TC_E09S06_02` | E09-S06 | Verify that a registered Attendee who did not attend should be shown as register | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S06_02 - Verify that a registered Attendee who did not attend should be shown as registered but not attended once the event is Completed |
| `TC_E09S06_03` | E09-S06 | Verify that attempting to record attendance before the event is Completed should | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S06_03 - Verify that attempting to record attendance before the event is Completed should be blocked |
| `TC_E09S06_04` | E09-S06 | Verify that registration and attendance counts should be viewable side by side f | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S06_04 - Verify that registration and attendance counts should be viewable side by side for each event |
| `TC_E09S07_01` | E09-S07 | Verify that opening the registration list for an event with registered Attendees | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S07_01 - Verify that opening the registration list for an event with registered Attendees should show each Attendee |
| `TC_E09S07_02` | E09-S07 | Verify that the registration list should show the registered count and remaining | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S07_02 - Verify that the registration list should show the registered count and remaining capacity per event |
| `TC_E09S07_03` | E09-S07 | Verify that attempting to open the registration list for an event that does not  | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S07_03 - Verify that attempting to open the registration list for an event that does not belong to the Organiser |
| `TC_E09S07_04` | E09-S07 | Verify that waitlisted Attendees should be shown separately from registered Atte | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S07_04 - Verify that waitlisted Attendees should be shown separately from registered Attendees on the registration list |

### E10

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_E10S01_01` | E10-S01 | Verify that submitting a change request on an approved or confirmed event should | ⚠️ scaffold | tests/e2e/e10.spec.ts: TC_E10S01_01 - Verify that submitting a change request on an approved or confirmed event should notify the assigned Coordinator and record the request agains |
| `TC_E10S01_02` | E10-S01 | Verify that viewing an event with a pending change request should still show the | ⚠️ scaffold | tests/e2e/e10.spec.ts: TC_E10S01_02 - Verify that viewing an event with a pending change request should still show the currently confirmed details alongside the pending request |
| `TC_E10S01_03` | E10-S01 | Verify that attempting to directly edit a restricted field after approval should | ⚠️ scaffold | tests/e2e/e10.spec.ts: TC_E10S01_03 - Verify that attempting to directly edit a restricted field after approval should be refused and offered the change request form pre-filled wit |
| `TC_E10S01_04` | E10-S01 | Verify that when the Coordinator approves a change request, the event should be  | ⚠️ scaffold | tests/e2e/e10.spec.ts: TC_E10S01_04 - Verify that when the Coordinator approves a change request, the event should be updated and the Organiser notified |
| `TC_E10S01_05` | E10-S01 | Verify that when the Coordinator declines a change request, the Organiser should | ⚠️ scaffold | tests/e2e/e10.spec.ts: TC_E10S01_05 - Verify that when the Coordinator declines a change request, the Organiser should be notified |
| `TC_E10S02_01` | E10-S02 | Verify that increasing a event's expected attendance beyond its confirmed venue' | ⚠️ scaffold | tests/e2e/e10.spec.ts: TC_E10S02_01 - Verify that increasing a event |
| `TC_E10S02_02` | E10-S02 | Verify that editing only the event description on an event with confirmed venue  | ⚠️ scaffold | tests/e2e/e10.spec.ts: TC_E10S02_02 - Verify that editing only the event description on an event with confirmed venue and equipment should flag nothing |
| `TC_E10S02_03` | E10-S02 | Verify that saving a change that affects confirmed arrangements should show whic | ⚠️ scaffold | tests/e2e/e10.spec.ts: TC_E10S02_03 - Verify that saving a change that affects confirmed arrangements should show which arrangements are affected before the change takes effect |
| `TC_E10S02_04` | E10-S02 | Verify that a venue change that reduces a event's capacity below its registratio | ⚠️ scaffold | tests/e2e/e10.spec.ts: TC_E10S02_04 - Verify that a venue change that reduces a event |
| `TC_E10S02_05` | E10-S02 | Verify that changing a event's date or time should flag its venue booking and eq | ⚠️ scaffold | tests/e2e/e10.spec.ts: TC_E10S02_05 - Verify that changing a event |
| `TC_E10S02_06` | E10-S02 | Verify that when a date or time change flags arrangements for reconfirmation, th | ⚠️ scaffold | tests/e2e/e10.spec.ts: TC_E10S02_06 - Verify that when a date or time change flags arrangements for reconfirmation, the assigned Technical Support Staff should also be notified, no |
| `TC_E10S02_07` | E10-S02 | Verify that increasing expected attendance on a multi-venue event should flag on | ❌ none | — |
| `TC_E10S04_01` | E10-S04 | Verify that cancelling an event and recording a reason should release its venue  | ⚠️ scaffold | tests/e2e/e10.spec.ts: TC_E10S04_01 - Verify that cancelling an event and recording a reason should release its venue bookings and equipment reservations, update the venue calendar |
| `TC_E10S04_03` | E10-S04 | Verify that cancelling a event should notify all of its registered and waitliste | ⚠️ scaffold | tests/e2e/e10.spec.ts: TC_E10S04_03 - Verify that cancelling a event should notify all of its registered and waitlisted Attendees |
| `TC_E10S04_04` | E10-S04 | Verify that a cancelled event should be read-only and show its cancellation reas | ⚠️ scaffold | tests/e2e/e10.spec.ts: TC_E10S04_04 - Verify that a cancelled event should be read-only and show its cancellation reason and date to any viewer |
| `TC_E10S04_05` | E10-S04 | Verify that an Event Organiser attempting to cancel directly should have the act | ⚠️ scaffold | tests/e2e/e10.spec.ts: TC_E10S04_05 - Verify that an Event Organiser attempting to cancel directly should have the action recorded as a cancellation request for the Coordinator to  |
| `TC_E10S05_01` | E10-S05 | Verify that when a booked venue is marked unavailable the Coordinator's event sh | ❌ none | — |
| `TC_E10S05_02` | E10-S05 | Verify that a flagged event should show the reason, period and affected booking, | ❌ none | — |
| `TC_E10S05_03` | E10-S05 | Verify that requesting a replacement venue should create a second booking reques | ❌ none | — |
| `TC_E10S05_04` | E10-S05 | Verify that the Organiser and registered Attendees should be notified of the ven | ❌ none | — |

### E11

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_E11S01_01` | E11-S01 | Verify that a user linked to an event should be notified when its status changes | ✅ active | backend/tests/eventNotifications.integration.test.ts: TC_E11S01_01: real status change commits its audit and correct recipients; same status is silent; tests/auth-e2e/notificationI |
| `TC_E11S01_02` | E11-S01 | Verify that effective date, time or venue changes follow the approved recipient  | ✅ active | backend/tests/eventNotifications.integration.test.ts: TC_E11S01_02 TC_E11S01_14: actual date edit notifies active linked users using public attendee content; tests/e2e/e11.spec.ts: |
| `TC_E11S01_03` | E11-S01 | Verify that a user whose responsibilities are unaffected by a change should not  | ⚠️ scaffold | tests/e2e/e11.spec.ts: TC_E11S01_03 - Verify that a user whose responsibilities are unaffected by a change should not be notified |
| `TC_E11S01_05` | E11-S01 | Verify that a generated notification should appear in the system and also be sen | ⚠️ scaffold | tests/e2e/e11.spec.ts: TC_E11S01_05 - Verify that a generated notification should appear in the system and also be sent to the user |
| `TC_E11S01_06` | E11-S01 | Verify that opening the notification list with several unread notifications shou | ✅ active | backend/tests/notificationInbox.integration.test.ts: TC_E11S01_06 TC_E11S01_07: PostgreSQL inbox ownership, ordering and persistent idempotent read state; tests/auth-e2e/notificati |
| `TC_E11S01_07` | E11-S01 | Verify that opening an unread notification should mark it as read | ✅ active | backend/tests/notificationInbox.integration.test.ts: TC_E11S01_06 TC_E11S01_07: PostgreSQL inbox ownership, ordering and persistent idempotent read state; backend/tests/notificatio |
| `TC_E11S01_08` | E11-S01 | Verify that an unreachable email provider does not affect the business change or | ⚠️ scaffold | tests/e2e/e11.spec.ts: TC_E11S01_08 - Verify that an unreachable email provider does not affect the business change or the in-app notification |
| `TC_E11S01_09` | E11-S01 | Verify that a rolled-back business transaction publishes no notification | ✅ active | backend/tests/coordinatorNotifications.integration.test.ts: TC_E11S01_09: email-outbox failure rolls back creation, draft submission, reassignment request and each response; backen |
| `TC_E11S01_10` | E11-S01 | Apply the approved role/change recipient matrix | ✅ active | backend/tests/eventNotifications.test.ts: TC_E11S01_10: approved recipient matrix distinguishes internal decisions from public changes |
| `TC_E11S01_11` | E11-S01 | Suppress self-notifications and duplicate recipient links | ✅ active | backend/tests/coordinatorNotifications.integration.test.ts: TC_E03S01_01 TC_E11S01_11: submission and draft submission notify organiser and assigned Coordinator once each with emai |
| `TC_E11S01_12` | E11-S01 | Preserve before/after recipients during cancellation and venue moves | ✅ active | backend/tests/eventNotifications.integration.test.ts: TC_E11S01_12: cancellation notifications retain recipients after registrations and staff are released; backend/tests/eventNoti |
| `TC_E11S01_13` | E11-S01 | Expose missing Venue Staff assignments without an unsafe fallback | ✅ active | backend/tests/eventNotifications.integration.test.ts: TC_E11S01_13: decided_by and unrelated Venue Staff never stand in for assignments; backend/tests/eventNotifications.test.ts: T |
| `TC_E11S01_14` | E11-S01 | Protect attendee notification content and membership boundaries | ✅ active | backend/tests/eventNotifications.integration.test.ts: TC_E11S01_02 TC_E11S01_14: actual date edit notifies active linked users using public attendee content; backend/tests/eventNot |
| `TC_E11S01_15` | E11-S01 | Deduplicate concurrent notification-hook retries | ✅ active | backend/tests/eventNotifications.integration.test.ts: TC_E11S01_15: concurrent retries yield one in-app and email record per recipient |
| `TC_E11S01_16` | E11-S01 | Keep uncommitted notifications invisible and roll back all writes | ✅ active | backend/tests/eventNotifications.integration.test.ts: TC_E11S01_16: uncommitted messages are invisible and rollback leaves no jobs |

### E14

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_E14S02_01` | E14-S02 | Verify that an event status change should be recorded with the actor, action, af | ⚠️ scaffold | tests/e2e/e14.spec.ts: TC_E14S02_01 - Verify that an event status change should be recorded with the actor, action, affected event, and time |
| `TC_E14S02_02` | E14-S02 | Verify that a denied access attempt should be recorded with the user, target, an | ⚠️ scaffold | tests/e2e/e14.spec.ts: TC_E14S02_02 - Verify that a denied access attempt should be recorded with the user, target, and time |
| `TC_E14S02_03` | E14-S02 | [RETIRED — moved to TC_E06S04_05 by T-76] Verify that an approved venue booking  | ⚠️ scaffold | tests/e2e/e14.spec.ts: TC_E14S02_03 - [RETIRED — moved to E06-S04 Scenario 5 by T-76] Verify that an approved venue booking should be recorded with the actor, action, affected reco |
| `TC_E14S02_04` | E14-S02 | Verify that an account deactivation should be recorded in the activity log | ⚠️ scaffold | tests/e2e/e14.spec.ts: TC_E14S02_04 - Verify that an account deactivation should be recorded in the activity log |
| `TC_E14S02_05` | E14-S02 | Verify that any attempt to edit or delete an activity log entry should be refuse | ✅ active | backend/tests/auditLogImmutability.integration.test.ts: TC_E14S02_05: an activity log entry cannot be edited or deleted, even by the server connection; tests/e2e/e14.spec.ts: TC_E1 |
| `TC_E14S02_06` | E14-S02 | [RETIRED — moved to TC_E06S04_06 by T-76] Verify that a rejected venue booking s | ⚠️ scaffold | tests/e2e/e14.spec.ts: TC_E14S02_06 - [RETIRED — moved to E06-S04 Scenario 5 by T-76] Verify that a rejected venue booking should be recorded with the actor, action, affected recor |
| `TC_E14S02_07` | E14-S02 | [RETIRED — moved to TC_E06S04_07 by T-76] Verify that a released venue booking s | ⚠️ scaffold | tests/e2e/e14.spec.ts: TC_E14S02_07 - [RETIRED — moved to E06-S04 Scenario 5 by T-76] Verify that a released venue booking should be recorded with the actor, action, affected recor |
| `TC_E14S02_08` | E14-S02 | Verify that access-denial entries should not be shown in the event Activity log  | ⚠️ scaffold | tests/e2e/e14.spec.ts: TC_E14S02_08 - Verify that access-denial entries should not be shown in the event Activity log a Coordinator reads |

### EXX

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_PERF_01` | Definition of Done | Verify a venue search returns within the 3-second target on a realistic catalogu | ❌ none | — |
| `TC_PERF_02` | Definition of Done | Verify the venue availability calendar loads within the 3-second target for a bu | ❌ none | — |
| `TC_PERF_03` | Definition of Done | Verify a registration submission completes within the 3-second target near capac | ❌ none | — |

## Active tests that cover behaviour without an explicit TC reference

The following tests are actively running (not `test.fixme`) but their titles do not embed a TC_ID. They still contribute to Q1/Q2 coverage; they just don't show up in the counts above. Add a TC_XX reference to the test title if you want the auditor to pick it up next run. Blank sections mean every active test in that file already has a TC_ID.

### `backend/tests/attendeeVisibility.integration.test.ts`

- E01-S03: real PostgreSQL sign-in, published fields, registration isolation and audited planning denial

### `backend/tests/auditLogImmutability.integration.test.ts`

- deleting a draft event keeps its activity log entries and only clears the event link
- deleting a user keeps their activity log entries and only clears the actor

### `backend/tests/clarification.test.ts`

- SCRUM-33: at most 20 questions can be sent at once
- SCRUM-33: answers must name a question once, and are limited to 2000 characters
- SCRUM-33: only Event Coordinators can ask and only Event Organisers can answer; refusals are audited, no event is read

### `backend/tests/coordinatorAssignment.integration.test.ts`

- SCRUM-32: coordinator auto-assignment and reassignment against PostgreSQL

### `backend/tests/coordinatorAssignment.test.ts`

- the active statuses used for assignment match the T-52 list deactivation uses
- S1: a submitted request gets exactly one Coordinator, moves to Under Review, is audited and the Coordinator is notified
- S2: the pick orders by fewest active events, then least recently assigned, then id, among eligible Coordinators only
- D4: with no eligible Coordinator the request stays Submitted and unassigned, and the gap is audited
- a request that is not Submitted, or already has a Coordinator, is left alone
- S3: the assigned Coordinator names a colleague; the request is recorded and the colleague notified, and ownership does not move
- S6: a Coordinator who is not assigned is refused, with the denial committed after the rollback
- S6: an unknown event is refused exactly like one assigned to someone else
- non-Coordinators cannot request a reassignment, and the attempt is audited against the screen
- a reassignment must name a valid colleague other than the requester
- an ineligible colleague, an inactive event and a second pending request are all refused without writing
- S4: accepting moves ownership to the colleague, ends the request and logs the change
- S5: declining leaves the original Coordinator assigned and tells them
- only the named colleague may answer; anyone else is refused and audited
- a request can be answered only once, and not after the event changed hands or ended
- an unknown request, an invalid id or a missing decision is rejected
- the assigned-event list is limited to the caller and never includes drafts
- an event not assigned to the caller is refused like an unknown one, and audited

### `backend/tests/deactivation.integration.test.ts`

- PostgreSQL: retention, time boundaries, capacity count, session revocation, coordinator statuses and rollback

### `backend/tests/deactivation.test.ts`

- eligible attendee: locks identity, withdraws, deactivates, revokes sessions, audits and commits
- coordinator assignments block without successful audit or mutations
- coordinator without blocking assignments succeeds
- already deactivated returns safe conflict without audit
- endpoint authentication, CSRF, identity and cookie clearing

### `backend/tests/decision.integration.test.ts`

- SCRUM-34 D10: a start date already in the past does not block approval

### `backend/tests/decision.test.ts`

- SCRUM-34: the reason is trimmed, an approval ignores any reason, and an unknown decision is refused

### `backend/tests/emailTemplate.test.ts`

- escapeHtml neutralizes all five HTML-significant characters
- buildNotificationEmailHtml escapes both title and message
- buildNotificationEmailHtml converts newlines to <br> after escaping
- buildNotificationEmailHtml linkifies a bare URL as a real, brand-colored anchor
- buildNotificationEmailHtml trims one trailing sentence-punctuation character out of the link
- buildNotificationEmailHtml does not linkify a URL injected via message content differently than any other text -- it is still escaped first
- buildNotificationEmailHtml output carries ConnectSphere branding and is a complete HTML document

### `backend/tests/equipmentAvailability.test.ts`

- period validation rejects missing offsets, invalid ranges and malformed ids
- availability denies wrong, inactive and locked roles before period validation or equipment reads
- handler exposes availability as authenticated read-only API
- equipment-not-found availability API returns 404 for a valid absent item id

### `backend/tests/equipmentCatalogue.test.ts`

- equipment input rejects invalid quantities and forged retirement
- catalogue denies unauthenticated, wrong-role, inactive and locked writes before querying equipment
- catalogue rejects invalid identifiers before database casts

### `backend/tests/equipmentHandler.test.ts`

- equipment handler checks origin before writes and rejects unsupported methods
- equipment handler returns validation failures without creating a transaction

### `backend/tests/equipmentRequests.test.ts`

- equipment request input rejects zero, fractions, duplicate shapes and forged ids
- request readers and writers deny wrong roles and inactive accounts before reading event data
- request handler enforces method, origin and valid action without opening a transaction
- request boundary validation refuses malformed bodies and identifiers without a transaction
- handler reads list/detail and rejects malformed save/remove actions

### `backend/tests/eventLifecycle.integration.test.ts`

- SCRUM-110: migration 0005 free-text fields survive a real PostgreSQL roundtrip

### `backend/tests/eventLifecycle.test.ts`

- a request with all ten mandatory fields complete is submitted
- every missing mandatory field is named, not just the first one
- a preferred date in the past is blocked with an explanation
- an empty equipment/layout/registration field without
- an end time at or before the start time is rejected
- a non-positive or non-integer expected attendance is reported as missing
- an empty HTTP request being submitted reports all ten mandatory fields without writing
- an empty HTTP request saved as a draft reports only the three always-mandatory fields
- a draft with title, attendance and dates but nothing else is saved
- a draft missing title, attendance or dates is still rejected
- a predefined accessibility selection alone satisfies the mandatory Accessibility needs field
- neither free text nor a predefined selection still reports Accessibility needs as missing
- accessibilityFeatureIds round-trips through create and a subsequent update
- a draft can be re-saved as a draft with a changed field
- a draft can be submitted through the same update entry point
- submitting an update still requires every mandatory field
- updating someone else\
- updating an already-submitted request is refused
- updating an unknown draft id is reported as not found
- a draft can be deleted by its owner
- deleting someone else\
- deleting an already-submitted request is refused
- changing status passes the actor and prior status through for the audit entry
- an illegal status transition is rejected before any audit entry is written
- changing status to the same status is a no-op that writes no audit entry
- changing the status of an unknown event is reported as not found

### `backend/tests/eventNotifications.integration.test.ts`

- E11-S01: real PostgreSQL recipient selection and atomic business changes

### `backend/tests/eventVisibility.integration.test.ts`

- E01-S02: organisation isolation, colleagues, search, audit and notification delivery

### `backend/tests/eventVisibility.test.ts`

- missing membership and missing event organisation fail closed
- unauthenticated, unlinked, inactive, locked and other roles cannot query organiser data
- a role/organisation denial is audited against the screen, not a specific event
- direct denied access commits actor and attempted event before returning denial
- organiser event detail includes current status date and status history
- SCRUM-37: organiser detail exposes editable fields and full activity log contract
- audit failure never returns event information or a false logged success
- an organiser can post an accessible event comment and notify its coordinator
- comment posting refuses an event outside the organiser organisation
- organiser can update a pre-approval field and the change is audited
- organiser post-approval restricted edits return the change-request hand-off
- only the assigned coordinator can edit an approved event
- assigned coordinator can edit approved event fields and every change is audited
- organiser can update registration dates before approval
- organiser post-approval unrestricted edits are audited
- list and notification reads use trusted organisation and recipient parameters
- notifications without an authorised database record cannot be delivered

### `backend/tests/loginRecovery.integration.test.ts`

- E01-S01 real database, API, registration and recovery acceptance cases
- registered credentials authenticate; email is normalized; secure cookie and no hash exposure
- legacy hashes remain readable and wrong passwords are rejected
- wrong, unknown and inactive accounts have the same response; inactive correct password fails
- counts each failure, locks on five, writes one audit, refuses correct password; success resets count
- concurrent incorrect attempts cannot bypass the threshold or duplicate audit
- reset request API normalizes email and does not expose account eligibility
- outbox delivers a hashed single-use 15-minute link through the existing provider adapter
- invalid, expired, inactive and policy-invalid resets are rejected without consuming usable tokens
- concurrent reset uses token once, invalidates sibling tokens and old sessions
- queued recovery is not delivered to deactivated or changed recipients
- reset transaction rolls back token consumption and lock changes on database failure
- API rejects cross-origin changes and wrong methods

### `backend/tests/notificationInbox.integration.test.ts`

- prepared email uses current account email and a provider rejection preserves the inbox
- PR #143: email verification and other eventless notices never enter inbox responses
- PR #143: inbox is capped at the newest 100 event notifications

### `backend/tests/notificationInbox.test.ts`

- rejects anonymous, inactive and locked callers before database access
- rejects cross-origin writes and client supplied identity
- storage errors never disclose database details

### `backend/tests/originAllowlist.test.ts`

- accepts the configured APP_URL exactly
- accepts PUBLIC_SITE_URL as an additional allowed origin, not only as an APP_URL fallback
- accepts a Vercel-injected hostname (VERCEL_URL) as https, matching the deployment
- accepts VERCEL_PROJECT_PRODUCTION_URL as https
- accepts the Vercel branch alias (VERCEL_BRANCH_URL) as https
- truncates an unparseable attacker-controlled Origin before logging it
- normalises trailing slash on both stored and received origins
- compares case-insensitively on scheme and host
- rejects a foreign origin
- rejects a suffix-spoof of a vercel.app hostname (evil-vercel.app)
- rejects a subdomain-spoof appending an attacker-controlled TLD
- rejects a missing, empty, or whitespace-only Origin header
- rejects a non-http(s) scheme even if the host matches
- rejects a malformed origin string (not a URL) rather than throwing
- fails closed when no origins are configured at all
- ADDITIONAL_ALLOWED_ORIGINS accepts comma-separated local dev hosts and ignores blanks
- the allowed set deduplicates identical origins from multiple env vars
- does not accept an origin that only matches a superstring of an allowed value

### `backend/tests/profile.integration.test.ts`

- real sessions, profile persistence, case-insensitive uniqueness and future notification address

### `backend/tests/profile.test.ts`

- signed-in user loads, saves all editable fields and reloads normalized values
- own current email can be retained with different casing and whitespace
- endpoint uses authenticated identity, rejects unauthenticated and cross-origin writes, and returns field errors
- unexpected database errors do not expose internals

### `backend/tests/registration.db.test.ts`

- PostgreSQL persists defaults, enforces concurrent uniqueness and prevents internal roles

### `backend/tests/registration.test.ts`

- creates an attendee, hashes password and verifies original credentials
- normalizes mixed-case email and rejects a differently cased duplicate
- duplicate email creates only one record
- rejects invalid email and reports all password corrections
- endpoint returns method, validation, creation and safe failure responses

### `backend/tests/sessions.test.ts`

- increments failed_login_count on wrong password below threshold
- sets locked_until at the fifth consecutive failed attempt
- refuses correct password while the lockout window is still in effect
- auto-unlocks after locked_until has passed and accepts a fresh success
- resets counter and lock on a mid-window correct password
- does not increment counter for an inactive account
- does not increment counter when the account does not exist

### `backend/tests/staffAssignments.test.ts`

- every operation refuses signed-out users and roles other than Technical Support, and audits the refusal
- the queue lists only staffable events, open requests first
- a request lists every active colleague, marks who is on it, and names clashes for the rest
- a request on an event that is no longer staffable is shown but cannot be assigned
- request and assignment ids are checked before any lookup; a missing request is a 404
- the schedule shows only the signed-in technician\
- a clashing event whose title already starts with its code, or has no code, is named once
- assignments are refused for cancelled requests, unstaffable events, unknown or inactive colleagues, and repeats
- when two people assign the same colleague at once, the database refusal is reported as the same clash
- the database refusal still gives a sentence when the winner has already been removed or the colleague is unknown
- any other database failure is not mistaken for a clash
- removing one of several keeps the request staffed; removing twice is refused
- handler: methods, origin and actions
- handler: GET routes to the queue, one request or the schedule; POST to assign or remove

### `backend/tests/supportRequests.test.ts`

- validation accepts a trimmed description and an ISO range
- validation boundaries: description length, missing and reversed times, non-object bodies
- reads refuse signed-out users and roles other than Coordinator and Technical Support, and audit the refusal
- reads refuse an empty or oversized event identifier before querying events
- a Coordinator cannot read another Coordinator\
- reads separate requests from the
- requests are refused outside approved or planning and are not written
- an invalid request returns field errors without opening a transaction; wrong roles are refused first
- a refused request on someone else\
- a database failure is not mistaken for a refusal and is not audited
- an event with a live support request cannot be marked as needing none
- handler: unsupported methods, cross-origin writes and unknown actions are refused
- handler: GET reads by event, POST dispatches request and none

### `backend/tests/venueAccessibility.integration.test.ts`

- E02-S03 Scenario 3: venue search excludes venues missing a recorded predefined accessibility requirement

### `backend/tests/venueAccessibility.test.ts`

- matchVenuesByAccessibility returns a venue that supports every requested feature
- matchVenuesByAccessibility excludes a venue that only partially supports the requested features
- matchVenuesByAccessibility returns nothing when no venue supports any requested feature
- matchVenuesByAccessibility with no requested ids matches nothing without querying
- listAccessibilityFeatures requires a signed-in user
- listAccessibilityFeatures returns the vocabulary for any signed-in user, including an organiser

### `backend/tests/venueBlocks.integration.test.ts`

- E05-S04: a block saved with hours accepts its own day back and keeps those hours

### `backend/tests/venueBlocks.test.ts`

- validateBlockInput stores whole Singapore days with an exclusive end
- validateBlockInput accepts a single-day block
- validateBlockInput rejects a non-object submission
- validateBlockInput requires a reason (E05-S04 checklist: recorded reason)
- validateBlockInput rejects malformed, impossible and reversed dates
- validateBlockInput makes the reason optional only when shortening
- block changes require a signed-in Venue Staff member
- listing blocks is limited to the venue catalogue roles
- invalid input is rejected before a transaction opens

### `backend/tests/venueCalendar.test.ts`

- getVenueCalendar requires a signed-in user
- getVenueCalendar refuses roles other than Venue Staff and Event Coordinators, logging the denial
- getVenueCalendar returns 404 for an unknown venue
- parseCalendarRange lists every Singapore day in an inclusive range
- parseCalendarRange rejects missing, malformed, impossible, reversed and oversized ranges
- an unassigned event is Unavailable to every Coordinator but visible to Venue Staff
- Free periods skip overlapping bookings and blocks and stay within opening hours
- a retired venue shows its bookings and blocks but no Free period
- a day fully covered by a block has no Free period

### `backend/tests/venueCatalogue.test.ts`

- validateVenueInput rejects a non-object submission
- validateVenueInput reports every missing required field
- validateVenueInput enforces a positive whole-number capacity
- validateVenueInput enforces HH:MM operating hours with opens before closes
- validateVenueInput requires non-empty facility, accessibility and layout lists
- validateVenueInput rejects layouts that normalize to the same code, even with different casing or spacing
- validateVenueInput rejects facilities or accessibility features that normalize to the same code
- validateVenueInput trims text and accepts a fully valid submission
- catalogue role gates admit only venue staff to maintain venues, and staff or coordinators to view them
- a catalogue role denial is audited against the screen
- read operations reject unauthorised viewers before querying the database
- mutating operations reject anyone but venue staff before opening a transaction
- createVenue reports validation errors without opening a transaction
- addVenueLayout rejects unauthorised callers before opening a transaction
- addVenueLayout reports validation errors without opening a transaction
- updateVenueLayout and removeVenueLayout reject unauthorised callers before opening a transaction
- updateVenueLayout reports validation errors without opening a transaction
- searchVenues excludes venues whose matching layout capacity is below the required attendance, boundary at exactly-equal
- searchVenues finds a suitable venue even when it ranks alphabetically past the first 100 name matches
- searchVenues caps at 100 results drawn from the suitable venues, not the raw name matches
- searchVenues excludes a venue missing even one requested accessibility feature
- searchVenues with no accessibility ids requested applies no accessibility filter
- searchVenues applies the layout and accessibility filters together

### `backend/tests/venueSearch.test.ts`

- capacity without layout uses venue maximum and respects separate minimum
- anonymous search is rejected
- inactive coordinator is rejected
- coordinator can load search options
- invalid input identifies fields before venue query

### `backend/tests/verificationEmail.test.ts`

- sendVerificationEmail issues one token, one notification, one delivery
- buildVerificationMessage embeds the token in a /verify link and trims trailing slashes on appUrl

### `backend/tests/verificationTokens.test.ts`

- issued token is a 64-hex string that consumeVerificationToken accepts
- malformed token is rejected as unknown before hitting the database
- unrecognised token hash is rejected as unknown
- token issued for a different purpose is rejected as wrong_purpose
- token that was already consumed is rejected as consumed
- token past its expiry is rejected as expired
- positive ttl is required at issue time

### `frontend/src/app/AppShell.test.tsx`

- a signed-in page gets exactly one shared header
- older pages now sit inside the shared header too
- the skip link is the first stop and moves focus to the page
- public pages have no shared header
- /home sends a signed-in user to their role home
- /home sends a signed-out visitor to sign in
- a placeholder route shows the Coming soon page with its story

### `frontend/src/app/routes.test.tsx`

- every path is registered once
- coming-soon pages name a Release 1 story
- story IDs use the backlog format
- sign-in and registration pages are public; profile and notifications are not
- an unknown or missing role goes to the landing page

### `frontend/src/features/accessControl/LoginPage.test.tsx`

- an Event Coordinator who is already signed in is sent to /coordinator

### `frontend/src/features/accessControl/RegisterForm.test.tsx`

- submits the four required fields as JSON and shows the success message on 201
- marks the offending field aria-invalid when the server returns a 400 error
- disables the submit button while the request is in flight

### `frontend/src/features/coordinator/CoordinatorEditing.test.tsx`

- the assigned Coordinator edits an approved event and only the changed field is sent
- before approval the Coordinator sees the details read-only with an explanation
- a refused edit keeps the form open and shows the server reason
- invalid values are flagged next to the field and nothing is sent
- cancelling closes the form without saving

### `frontend/src/features/coordinator/CoordinatorWorkspace.test.tsx`

- requesting a reassignment sends the chosen colleague and keeps the current Coordinator assigned
- sending without choosing a colleague is blocked with a message
- a refused reassignment shows the server reason
- an unassigned Coordinator is refused and sees no reassignment action
- an event that is no longer active cannot be reassigned
- declining leaves the original Coordinator assigned
- accepting moves the event to the incoming Coordinator and links to it
- an answer that was already recorded shows the server reason
- the dashboard counts active work and flags incoming requests
- the dashboard explains automatic assignment when nothing is assigned
- the queue filters by status and shows a filter-specific empty state
- a signed-out Coordinator is asked to sign in
- a failed load can be retried

### `frontend/src/features/coordinator/DecisionPanel.test.tsx`

- the event page offers
- the decide page shows what is being decided, with Request clarification, Reject and Approve in that order
- a request with no event code shows
- Request clarification on the decide page opens the question page
- approving shows the outcome, keeps the page, and leaves nothing more to decide
- the confirm button reads Approving… while the decision is being sent
- the decision still lands under StrictMode, which mounts the page twice in development
- opening a panel moves focus into it, and Cancel returns focus to the button that opened it
- a late answer for the previous request never replaces the current one

### `frontend/src/features/coordinator/RequestClarification.test.tsx`

- the event page offers Request clarification only while the request is Under Review
- the send button is busy while the questions are on their way
- a late answer for the previous event never replaces the current one
- the reply is handled under StrictMode, as in development

### `frontend/src/features/coordinator/TechnicalSupport.test.tsx`

- a blank, too long or reversed request is caught before sending, with the server\
- validation boundaries: exactly 2000 characters is accepted, missing times are named
- server field errors land on their fields, and a refusal is shown as sent
- after confirmation the card is read-only, and the form page explains why instead of showing a form
- a failed load can be retried, and a refused
- an unexpected reply is shown as a failed load instead of breaking the event page
- the card is not shown before approval, so no support request is loaded
- moving the start after the end is caught, and an event the Coordinator cannot open shows the refusal
- the notified sentence handles none, one and several

### `frontend/src/features/events/EventEditForm.test.tsx`

- sends only the fields that changed, trimmed and typed
- sends nothing when nothing changed, including whitespace-only edits
- an empty optional field left empty is not sent
- clearing a field that had a value is refused, as the server does
- an end before the start is refused
- changed dates are sent as ISO timestamps
- toLocalInput round-trips through the browser time zone
- date fields warn that a change notifies people and name the time zone
- registration date fields show existing ISO values in local input format
- locked registration dates with no values are left out, as on the Coordinator form
- registration date inputs describe the validation error and hint after an invalid save

### `frontend/src/features/notifications/NotificationInbox.test.tsx`

- shows a loading state before notifications arrive
- renders notifications newest first once loaded
- distinguishes unread notifications from read ones
- marking a notification as read updates it and removes the action
- API failures show a safe retryable error
- a failed read request leaves the notification unread and shows the error

### `frontend/src/features/organiser/AnswerQuestions.test.tsx`

- an over-long answer is caught before sending
- a request that is not yours or does not exist shows not found
- the send button is busy while the answers are on their way
- a late answer for the previous request never replaces the current one
- the reply is handled under StrictMode, as in development

### `frontend/src/features/organiser/Organiser.test.tsx`

- dashboard counts come from the live own-requests list
- dashboard next actions list open requests by date, without drafts or closed ones
- request list shows every own request with plain-language status and Singapore times
- request list filters by status group
- drafts link to the draft editor and other requests to the detail page
- request list says so when there are no requests
- request list asks the Organiser to sign in again on 401
- request list shows the failure and retries
- detail combines the organisation read and the own-request read
- detail timeline shows the real status history, newest first
- detail accepts an event code and resolves it to the request
- detail links to the event page for comments
- detail flags a clarification request and offers no answer link when no questions are outstanding
- detail treats a colleague\
- detail treats an unknown or refused id as not found
- detail treats a successful reply with no event as not found rather than a retry loop
- detail refuses an own-request reply that is missing required fields

### `frontend/src/features/organiser/OrganiserDraftEdit.navigation.test.tsx`

- switching drafts shows the new draft\

### `frontend/src/features/organiser/OrganiserRequestFlow.test.tsx`

- sends all request fields with same-origin credentials and confirms API success
- a network failure reports an error and allows retry
- API validation errors show all returned fields without claiming success
- Save draft is enabled with optional fields incomplete, and saves as a draft
- Save draft is disabled without a title, attendance, or dates
- editing an existing draft PATCHes it instead of creating a new one
- initialValues pre-fill the form for reopening a draft
- clearing the dates disables Save draft too, not just Submit
- prototype mode simulates submission without hitting the API
- the predefined accessibility checklist renders options fetched from the API, not a hardcoded list
- selecting a predefined accessibility feature alone satisfies the mandatory field, and submits ids separately from the free-text note

### `frontend/src/features/organiser/RejectedRequest.test.tsx`

- a seeded rejection with no recorded reason says so (D30)
- a request that is not rejected shows no rejection notice

### `frontend/src/features/shell/AppHeader.test.tsx`

- shows the Coordinator links with the current page marked
- shows Organiser links for an Organiser
- announces the unread notification count
- signs out through the session endpoint and returns to the login page
- keeps the user on the page and explains when sign out fails
- offers sign in when there is no session

### `frontend/src/features/support/EquipmentAvailability.test.tsx`

- invalid time range is associated with End and does not call availability
- availability offers retry after service failure and shows the empty state
- checking the same period again refreshes its quantities
- maintenance item displays zero free and a missing location is explicitly labelled

### `frontend/src/features/support/EquipmentCatalogue.test.tsx`

- saving new equipment persists all fields and reloads the catalogue
- quantity reduction displays affected reservations and notification acknowledgement
- retirement conflict preserves item and names blocking reservations
- Coordinator catalogue has no mutation actions
- server validation retains the form and associates field error
- equipment load failure offers retry and empty catalogue offers add
- late equipment response does not overwrite the next edit route

### `frontend/src/features/support/EquipmentRequests.test.tsx`

- request form saves event-scoped quantity and displays total-stock warning without losing requirement
- request removal requires confirmation and reports failure while retaining the row
- reserved and read-only requests expose no editing form
- Technical Support has read-only event requirements
- request form associates server quantity errors and retains entered values
- late event response cannot overwrite the next equipment request form
- equipment request load failure offers retry and then the empty state
- unexpected removal error releases the confirm button and allows retry
- event selector retries failed loading
- retired item remains visible in edit form and empty catalogue prevents saving
- canceling removal preserves the requirement without a mutation
- form load failure retries and save failure without field errors retains input
- a save completing after leaving the form does not navigate back

### `frontend/src/features/support/TechnicianStaffing.test.tsx`

- the queue shows requests needing a technician first, with filters for staffed and all
- an empty queue and an empty filter each explain themselves; a failed load can be retried
- a removal the server refuses keeps the panel open with its sentence
- an event that can no longer be staffed explains why, and a request with everyone on it says so
- a request that cannot be loaded shows the refusal with a way back
- a malformed reply is a failed load, not a crash
- an empty schedule explains how assignments arrive; a schedule with only past work says nothing is upcoming
- event names avoid repeating a code the title already starts with

### `frontend/src/features/venue/VenueBlockout.test.tsx`

- removing a block goes through ConfirmPanel and reloads the list on success
- loading state renders while blocks are in flight
- client validation refuses an empty form before any POST is sent

### `frontend/src/features/venue/VenueCalendar.navigation.test.tsx`

- changing the calendar route loads the new venue
- coordinators can reach the calendar from their dashboard

### `frontend/src/features/venue/VenueCalendar.test.tsx`

- loads the current month for the first venue
- labels free, tentative, confirmed and blocked entries distinctly
- shows a maintenance block with its reason and never as a booking
- shows an unavailable period without any event details
- expands a permitted booking to show event, code, date and time
- navigates to the next month and then to a custom range
- refuses a reversed or oversized range without calling the API
- splits a multi-day block across each day it covers
- opens the venue named in a coordinator calendar link
- reloads when a different venue is chosen
- notes that a retired venue offers no free time
- shows the server refusal on 403
- shows a failed load and retries on request
- does not present a plain venue record as an empty calendar
- two blocks clipped to the same start get separate rows and keys

### `frontend/src/features/venue/VenueForm.navigation.test.tsx`

- venue A\

### `frontend/src/features/venue/calendarDates.test.ts`

- month bounds cover leap and non-leap Februaries
- shifting months crosses year boundaries
- Singapore day keys and times use UTC+8 regardless of browser timezone
- day counts are inclusive and invalid dates are rejected

### `frontend/src/shared/shared.test.tsx`

- shows Singapore time
- decides
- says when a date is missing
- returns the data on success and sends the session cookie
- uses the server
- keeps field errors and conflict details, and swaps a machine code for the fallback
- shows the body
- a network failure becomes status 0; an abort is re-thrown
- a late response for an earlier id never replaces the current one
- reload keeps the current data on screen while refreshing
- a failure becomes an error state with the message
- links the label, hint and error to the control
- no error means no aria-invalid
- 401 asks the user to sign in
- 403 shows the server
- anything else offers a retry
- requires the reason before confirming, then passes it on
- shows a server refusal inside the panel
- can replace the missing-reason message with the API sentence
- shows the busy label on the confirm button while busy
- DataTable has a caption and labels every cell for the phone layout
- DataTable can hide a header visually and tell apart columns that share one
- FilterChips marks the chosen option and reports changes
- FactList shows
- errors and warnings are announced immediately; success politely
- a busy button is disabled and shows its busy label
- the /ui-kit reference page renders every block without calling the API

### `frontend/src/templates/templates.test.tsx`

- List: loads, filters with counts, and shows a filter-specific empty state
- Detail: shows the facts, and a 404 shows the server message with a way back
- Form: client validation mirrors the server rules
- Form: errors appear next to fields, a server refusal is shown, and a save opens the detail page
- Form: a save still completes under StrictMode, as in npm run dev
- Decision: rejecting requires a reason, then the outcome is confirmed
- Decision: a request that is not under review has nothing to decide

### `frontend/src/testing/fakeApi.test.ts`

- answers by method, path and the query params the key names
- records each call with its parsed JSON body
- answers the header session call for the chosen role, or 401 when signed out
- an unstubbed request fails loudly with 404
- handlers can be functions, and deferred holds a reply back

### `tests/auth-e2e/loginRecovery.spec.ts`

- invalid and expired reset links guide the user back to recovery

### `tests/e2e/admin.spec.ts`

- admin home shows system-wide counts
- user management filters by role
- role assignment saves a role change
- audit log viewer filters by free-text query

### `tests/e2e/attendee-events.spec.ts`

- empty registrations and expired sessions have useful states

### `tests/e2e/client-events.spec.ts`

- expired sessions prompt for sign-in without exposing cached events

### `tests/e2e/coordinator.spec.ts`

- coordinator dashboard shows live workload counts inside the shared header
- review queue filters assigned events by status
- request detail shows the assigned Coordinator and request details
- final confirmation blocks until readiness is met

### `tests/e2e/deactivation.spec.ts`

- explicit confirmation is required and success redirects to signed-out login
- blocked coordinator stays on profile and sees assignments requiring reassignment

### `tests/e2e/e03.spec.ts`

- E03-S07 Scenario 2 - the assigned Coordinator edits an approved event

### `tests/e2e/landing.spec.ts`

- landing page renders at / and links to login and register
- login page posts to /api/auth/session and surfaces server errors without leaking credentials
- login page redirects to the role home on success
- login page sends an Event Coordinator to the Coordinator workspace

### `tests/e2e/layout-and-focus.spec.ts`

- keyboard focus outline is visible against the page (WCAG 3:1)
- decision page /coordinator/events/EVT-C01/decide is one centred column

### `tests/e2e/organiser.spec.ts`

- organiser dashboard shows request status counts from the API
- request list filters between drafts and awaiting review
- request list opens the live request detail with its status history
- request detail shows not found for a request that is not yours

### `tests/e2e/skeleton.spec.ts`

- the page templates run end to end on sample data
- signInAs gives a signed-in page the role navigation

### `tests/e2e/support.spec.ts`

- equipment dashboard shows open requests and shortfalls
- equipment catalogue lists inventory rows
- request queue filters by state
- reservation detail records a shortfall
- technician staffing lists support requests needing a technician
- legacy conflict route opens live equipment availability

### `tests/e2e/venue-search.spec.ts`

- search access denial shows safe error and no criteria form
- venue search shows suitable results, field errors and empty states

### `tests/e2e/venue.spec.ts`

- venue dashboard shows pending and confirmed counts
- venue inventory lists every venue with capacity
- inventory search re-fetches venues filtered by the query
- pressing Enter in the layout inputs adds the layout instead of submitting the form
- availability calendar loads the selected venue from the API
- pending booking detail confirms a booking

### `tests/notifications/postgres.test.ts`

- additive migration preserves old deliveries and prepares escaped authoritative payloads
- business rollback retains no outbox row and uncommitted rows cannot be relayed
- overlapping publishers claim different rows and old tokens cannot overwrite new leases
- concurrent workers and duplicate pointers send once after a durable database claim
- ambiguous publication retains SQL source and duplicate pointers do not resend
- a lost Redis pointer can be rebuilt from the committed SQL delivery
- rebuilding a due retry pointer does not postpone the email retry deadline
- throttling uses bounded retry, preserves content, and frees the queue tail for other jobs
- unknown provider outcome is retained and never automatically resent
- database failure after provider acceptance retains the pointer and expired attempt
- an expired sender cannot replace a durable uncertain outcome with a stale token
- missing and malformed references remain in transport without an email attempt
- an oversized retained payload fails atomically without creating a delivery
- browser roles cannot read private delivery payloads

### `tests/notifications/providers.test.ts`

- real Redis SDK uses only the versioned ID queue and peeks without removing data
- Redis SDK does not retry an ambiguous transport error
- a full transport rejects publication so the caller retains its SQL row
- invalid IDs and oversized batch requests are rejected before a Redis request
- email network ambiguity is retained without an automatic resend
- accepted emails remain sent when optional provider metadata is malformed or oversized
- legacy raw-email helpers fail without reading or mutating the old queue

### `tests/redis/transport.test.ts`

- real Redis preserves legacy bytes while versioned pointers survive peek, defer and acknowledgement
- real Redis Lua enforces the 1000-pointer capacity without deleting retained contents

## Interpretation for the IS212 rubric

1. Every TC_ID in the workbook is at least scaffolded, so requirement traceability is intact. A reviewer can click into any story and find either an active test or a `test.fixme` placeholder waiting for implementation.

2. Scaffold coverage is high because Release 1 is mid-sprint. As features ship, the corresponding `test.fixme` blocks convert to `test(...)` and this audit's Automated column climbs. No new test case is being invented at implementation time; the traceability was written up front from the workbook.

3. The three cases with No test yet are the workbook's cross-cutting rows (performance targets, Definition-of-Done checklists). They do not have a dedicated feature and will not become individual `test()` blocks; their coverage lives inline in the relevant story tests.
