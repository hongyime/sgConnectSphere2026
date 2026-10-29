# Test case coverage audit

Point-in-time mapping of every workbook test case (from `docs/testing/PROJECT TEST CASES.xlsx`, 379 cases) against the automated test suite. Rebuild with `python scripts/tc_coverage_audit.py`.

**Automation status is by strict TC_ID naming.** A case is counted as automated only when a live `test(...)` block anywhere in the repository has the TC_ID literally in its title (e.g. `test('TC_E01S08_01 rejects duplicate email', ...)`). Behavioural coverage that happens to test the same acceptance criterion under a different test title is called out separately in the "Active tests that cover behaviour without an explicit TC reference" section below.

## Summary

- Total test cases: **379**
- Automated (explicit TC_ID in an active test title): **293** (77.3%)
  - Real-database (`.integration.test` / `.db.test`): **45**
  - Mock-backed (imports `mocks.ts` or uses `vi.mock`/`jest.mock`): **1**
  - Live-assertion (other active tests): **247**
- Scaffold (mentioned only in `test.fixme` / `test.skip`): **60** (15.8%)
- No test yet (no test file mentions the TC_ID): **26** (6.9%)

## Coverage by epic

| Epic | Cases | Automated | Scaffold | No test |
| --- | ---: | ---: | ---: | ---: |
| E01 | 38 | 21 | 17 | 0 |
| E02 | 21 | 12 | 1 | 8 |
| E03 | 62 | 49 | 13 | 0 |
| E04 | 5 | 2 | 0 | 3 |
| E05 | 39 | 38 | 1 | 0 |
| E06 | 43 | 40 | 3 | 0 |
| E07 | 37 | 33 | 0 | 4 |
| E08 | 28 | 16 | 11 | 1 |
| E09 | 45 | 33 | 9 | 3 |
| E10 | 29 | 25 | 0 | 4 |
| E11 | 15 | 13 | 2 | 0 |
| E14 | 14 | 11 | 3 | 0 |
| EXX | 3 | 0 | 0 | 3 |
| **Total** | **379** | **293** | **60** | **26** |

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
| `TC_E01S02_02` | E01-S02 | Verify that direct access to another client's event via URL/ID should be denied  | ✅ active | tests/e2e/client-events.spec.ts: TC_E01S02_02 — direct access denial shows no event details and offers a return path |
| `TC_E01S02_03` | E01-S02 | Verify that events created by colleagues within the same client organisation sho | ✅ active | tests/e2e/client-events.spec.ts: TC_E01S02_03 TC_E01S02_04 — organisation events show colleague attribution and an accessible empty search state |
| `TC_E01S02_04` | E01-S02 | Verify that search results should exclude events belonging to unrelated client o | ✅ active | tests/e2e/client-events.spec.ts: TC_E01S02_03 TC_E01S02_04 — organisation events show colleague attribution and an accessible empty search state |
| `TC_E01S02_05` | E01-S02 | Verify that notifications should never reference events from unrelated client or | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S02_05 - Verify that notifications should never reference events from unrelated client organisations |
| `TC_E01S02_06` | E01-S02 | Verify that a denied access attempt should be logged with the user, event, and t | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S02_06 - Verify that a denied access attempt should be logged with the user, event, and time |
| `TC_E01S03_01` | E01-S03 | Verify that an Attendee viewing a registered event should see only published det | ✅ active | tests/e2e/attendee-events.spec.ts: TC_E01S03_01 — attendee sees only published fields for registered events |
| `TC_E01S03_02` | E01-S03 | Verify that an Attendee attempting to open an internal planning screen directly  | ✅ active | tests/e2e/attendee-events.spec.ts: TC_E01S03_02 — direct internal planning request is sent for auditing and denied |
| `TC_E01S03_03` | E01-S03 | Verify that an Attendee should not see events or events they are not registered  | ✅ active | tests/e2e/attendee-events.spec.ts: TC_E01S03_03 — unregistered direct event is refused with no event fields |
| `TC_E01S04_01` | E01-S04 | Verify that name, email and contact changes persist while organisation remains r | ✅ active | tests/e2e/profile.spec.ts: TC_E01S04_01 TC_E01S04_05 — edit profile, save normalized values and reload; organisation stays read-only |
| `TC_E01S04_02` | E01-S04 | Verify that saving a malformed email address should be rejected with the field i | ✅ active | tests/e2e/profile.spec.ts: TC_E01S04_02 TC_E01S04_03 — field errors remain visible and form can be corrected |
| `TC_E01S04_03` | E01-S04 | Verify that saving an email already registered to another account should be reje | ✅ active | tests/e2e/profile.spec.ts: TC_E01S04_02 TC_E01S04_03 — field errors remain visible and form can be corrected |
| `TC_E01S04_04` | E01-S04 | Verify that changing the registered email should route future notifications to t | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S04_04 - Verify that changing the registered email should route future notifications to the new address |
| `TC_E01S04_05` | E01-S04 | Verify that a user should not be able to change their own role from the account  | ✅ active | tests/e2e/profile.spec.ts: TC_E01S04_01 TC_E01S04_05 — edit profile, save normalized values and reload; organisation stays read-only |
| `TC_E01S08_01` | E01-S08 | Verify that submitting valid sign-up details should create an Attendee account t | ✅ active | tests/e2e/registration.spec.ts: TC_E01S08_01 TC_E01S08_04 — registration submits required fields without role and displays success |
| `TC_E01S08_02` | E01-S08 | Verify that signing up with an already-registered email should be rejected witho | ✅ active | tests/e2e/registration.spec.ts: TC_E01S08_02 TC_E01S08_03 — registration displays server field errors and allows correction |
| `TC_E01S08_03` | E01-S08 | Verify that leaving a required sign-up field empty should block account creation | ✅ active | tests/e2e/registration.spec.ts: TC_E01S08_02 TC_E01S08_03 — registration displays server field errors and allows correction |
| `TC_E01S08_04` | E01-S08 | Verify that an account created through the public sign-up form should hold the A | ✅ active | tests/e2e/registration.spec.ts: TC_E01S08_01 TC_E01S08_04 — registration submits required fields without role and displays success |
| `TC_E01S08_05` | E01-S08 | Verify that the public sign-up form should not offer any internal role as a choi | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S08_05 - Verify that the public sign-up form should not offer any internal role as a choice |
| `TC_E01S08_06` | E01-S08 | Verify that entering a password that fails the stated policy should block accoun | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S08_06 - Verify that entering a password that fails the stated policy should block account creation and identify the requirement it fails |
| `TC_E01S11_01` | E01-S11 | Verify that confirming deactivation should sign the user out and block further s | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S11_01 - Verify that confirming deactivation should sign the user out and block further sign-in with those credentials |
| `TC_E01S11_02` | E01-S11 | Verify that past registrations and event records should remain intact and attrib | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S11_02 - Verify that past registrations and event records should remain intact and attributed after deactivation |
| `TC_E01S11_03` | E01-S11 | Verify that an Attendee's upcoming registration should be withdrawn and its plac | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S11_03 - Verify that an Attendee |
| `TC_E01S11_04` | E01-S11 | Verify that an Event Coordinator with assigned events should be blocked from dea | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S11_04 - Verify that an Event Coordinator with assigned events should be blocked from deactivating until those events are reassigned |
| `TC_E01S11_05` | E01-S11 | Verify that a deactivation should be recorded in the activity log with the actor | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S11_05 - Verify that a deactivation should be recorded in the activity log with the actor and time |
| `TC_E01S12_01` | E01-S12 | Verify that a Coordinator's event list should contain only events assigned to th | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S12_01 — Verify that a Coordinator |
| `TC_E01S12_02` | E01-S12 | Verify that a Coordinator opening or acting on a colleague's event directly shou | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S12_02 — Verify that a Coordinator opening or acting on a colleague |
| `TC_E01S12_03` | E01-S12 | Verify that a Coordinator should still see every venue's availability states wit | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S12_03 — Verify that a Coordinator should still see every venue |
| `TC_E01S12_04` | E01-S12 | Verify that Organiser client isolation should be unchanged by Coordinator scopin | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S12_04 — Verify that Organiser client isolation should be unchanged by Coordinator scoping |
| `TC_E01S13_01` | E01-S13 | Verify that a Lead and a Safety Officer should each land on their own workspace  | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S13_01 — Verify that a Lead and a Safety Officer should each land on their own workspace with only their role |
| `TC_E01S13_02` | E01-S13 | Verify that new-role accounts should hold exactly one role and that the five exi | ⚠️ scaffold | tests/e2e/e01.spec.ts: TC_E01S13_02 — Verify that new-role accounts should hold exactly one role and that the five existing roles should still land where they did |

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
| `TC_E02S05_01` | E02-S05 | Copying my completed event should create a draft with its Sessions and requireme | ❌ none | — |
| `TC_E02S05_02` | E02-S05 | Missing venue or equipment references should be flagged against the copied Sessi | ❌ none | — |
| `TC_E02S05_03` | E02-S05 | Submitting a copied draft should apply the current date-horizon rules | ❌ none | — |
| `TC_E02S07_01` | E02-S07 | A date beyond two calendar years should block request submission | ❌ none | — |
| `TC_E02S07_02` | E02-S07 | A date exactly two calendar years ahead should pass the horizon check | ❌ none | — |
| `TC_E02S07_03` | E02-S07 | A feasible near-term date should not be rejected for a minimum lead time | ❌ none | — |
| `TC_E02S07_04` | E02-S07 | Past dates remain blocked by the completed E02-S01 rule | ❌ none | — |
| `TC_E02S07_05` | E02-S07 | A past Session date should be rejected even when the Event date is in the future | ❌ none | — |

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
| `TC_E03S08_01` | E03-S08 | Verify that a newly submitted request should enter the unassigned queue with no  | ⚠️ scaffold | tests/e2e/e03.spec.ts: TC_E03S08_01 — Verify that a newly submitted request should enter the unassigned queue with no Coordinator and status Submitted, and the Lead should be notif |
| `TC_E03S08_02` | E03-S08 | Verify that the unassigned queue should show each request's basic information ol | ⚠️ scaffold | tests/e2e/e03.spec.ts: TC_E03S08_02 — Verify that the unassigned queue should show each request |
| `TC_E03S08_03` | E03-S08 | Verify that the Lead assigning a Coordinator should move the request to Under Re | ⚠️ scaffold | tests/e2e/e03.spec.ts: TC_E03S08_03 — Verify that the Lead assigning a Coordinator should move the request to Under Review, notify the Coordinator and Organiser, remove it from the |
| `TC_E03S08_04` | E03-S08 | Verify that a Coordinator attempting to assign a queued request should be refuse | ⚠️ scaffold | tests/e2e/e03.spec.ts: TC_E03S08_04 — Verify that a Coordinator attempting to assign a queued request should be refused and the attempt logged |
| `TC_E03S08_05` | E03-S08 | Verify that the Organiser's status history should show Submitted then Under Revi | ⚠️ scaffold | tests/e2e/e03.spec.ts: TC_E03S08_05 — Verify that the Organiser |
| `TC_E03S09_01` | E03-S09 | Verify that a Lead reassignment should take effect immediately with both Coordin | ⚠️ scaffold | tests/e2e/e03.spec.ts: TC_E03S09_01 — Verify that a Lead reassignment should take effect immediately with both Coordinators and the Organiser notified and the change logged |
| `TC_E03S09_02` | E03-S09 | Verify that Coordinator-to-Coordinator reassignment should still require the col | ⚠️ scaffold | tests/e2e/e03.spec.ts: TC_E03S09_02 — Verify that Coordinator-to-Coordinator reassignment should still require the colleague |
| `TC_E03S09_03` | E03-S09 | Verify that a Coordinator should be able to ask the Lead to reassign an event an | ⚠️ scaffold | tests/e2e/e03.spec.ts: TC_E03S09_03 — Verify that a Coordinator should be able to ask the Lead to reassign an event and be told the outcome, while a non-assigned Coordinator cannot |
| `TC_E03S10_01` | E03-S10 | Verify that the oversight view should list every active event with its Coordinat | ⚠️ scaffold | tests/e2e/e03.spec.ts: TC_E03S10_01 — Verify that the oversight view should list every active event with its Coordinator or Unassigned, filterable by Coordinator and status, with w |
| `TC_E03S10_02` | E03-S10 | Verify that a Coordinator navigating to the oversight view should be refused and | ⚠️ scaffold | tests/e2e/e03.spec.ts: TC_E03S10_02 — Verify that a Coordinator navigating to the oversight view should be refused and the attempt logged |
| `TC_E03S11_01` | E03-S11 | Verify that the Organiser should be able to add the registration setup before ap | ✅ active | backend/tests/eventVisibility.test.ts: TC_E03S11_01: organiser can fill in registration setup before approval and the edit is audited; frontend/src/features/events/EventEditForm.te |
| `TC_E03S11_02` | E03-S11 | Verify that clearing the registration setup should be blocked and leave the reco | ✅ active | backend/tests/eventVisibility.test.ts: TC_E03S11_02: clearing registration setup is refused and nothing is written; frontend/src/features/events/EventEditForm.test.tsx: TC_E03S11_0 |
| `TC_E03S11_03` | E03-S11 | Verify that the Organiser should see the registration setup as read-only after a | ✅ active | backend/tests/eventVisibility.test.ts: TC_E03S11_03: organiser cannot change registration setup after approval and nothing is written; frontend/src/features/events/EventEditForm.te |
| `TC_E03S11_04` | E03-S11 | Verify that the assigned Coordinator should be able to edit the registration set | ✅ active | backend/tests/eventVisibility.test.ts: TC_E03S11_04: assigned coordinator can edit registration setup after approval and the edit is audited |
| `TC_E03S11_05` | E03-S11 | Verify that the registration dates should be shown as two separate labelled fiel | ✅ active | frontend/src/features/events/EventEditForm.test.tsx: TC_E03S11_05 - the Organiser can fill in registration setup, shown with the two labelled dates under Registration |
| `TC_E03S12_01` | E03-S12 | Organiser sees the shared success Alert after an allowed edit | ✅ active | frontend/src/features/organiser/ClientEvents.saveAlert.test.tsx: TC_E03S12_01 - a saved edit is confirmed in the shared success Alert, not plain text |
| `TC_E03S12_02` | E03-S12 | Saved edit persists and its audit entry is not duplicated by feedback | ✅ active | frontend/src/features/organiser/ClientEvents.saveAlert.test.tsx: TC_E03S12_02 - the saved value survives a reload, and the confirmation causes no second write |
| `TC_E03S12_03` | E03-S12 | Invalid input retains validation feedback without success | ✅ active | frontend/src/features/organiser/ClientEvents.saveAlert.test.tsx: TC_E03S12_03 - an invalid edit keeps its validation feedback and shows no success |
| `TC_E03S12_04` | E03-S12 | Failed request after a prior success cannot leave a false confirmation | ✅ active | frontend/src/features/organiser/ClientEvents.saveAlert.test.tsx: TC_E03S12_04 - a failed save after a success leaves no stale or false confirmation |
| `TC_E03S12_05` | E03-S12 | Cancellation and post-approval restrictions remain unchanged | ✅ active | frontend/src/features/organiser/ClientEvents.saveAlert.test.tsx: TC_E03S12_05 - cancelling an approved event\ |

### E04

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_E04S02_01` | E04-S02 | Creating one Session should support a single-session Event without extra lifecyc | ✅ active | backend/tests/eventSessionsMigration.integration.test.ts: TC_E04S02_01 TC_E04S02_02: migration backfills and keeps single-session Event data aligned |
| `TC_E04S02_02` | E04-S02 | Multiple Sessions should retain their own dates, times, attendance, and requirem | ✅ active | backend/tests/eventSessionsMigration.integration.test.ts: TC_E04S02_01 TC_E04S02_02: migration backfills and keeps single-session Event data aligned |
| `TC_E04S02_03` | E04-S02 | Venue suitability should use each Session’s own attendance and requirements | ❌ none | — |
| `TC_E04S02_04` | E04-S02 | The same venue may have separate bookings for different Sessions of one Event | ❌ none | — |
| `TC_E04S02_05` | E04-S02 | Deleting a Session should release its confirmed booking and retain history | ❌ none | — |

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
| `TC_E05S04_02` | E05-S04 | Verify that attempting to block a venue over a period with a confirmed booking s | ✅ active | backend/tests/venueBlocks.integration.test.ts: E05-S04 TC_E05S04_02 superseded by TC_E05S06_02: a block over a confirmed booking saves and flags it; tests/e2e/e05.spec.ts: TC_E05S0 |
| `TC_E05S04_03` | E05-S04 | Verify that creating a block over an upcoming event's dates should notify the af | ✅ active | backend/tests/venueBlocks.integration.test.ts: E05-S04 TC_E05S04_03: a block over an upcoming tentative event notifies its Coordinator once; tests/e2e/e05.spec.ts: TC_E05S04_03 - V |
| `TC_E05S04_04` | E05-S04 | Verify that removing or shortening an existing block should restore the venue's  | ✅ active | backend/tests/venueBlocks.integration.test.ts: E05-S04 TC_E05S04_04: shortening or removing a block restores the released days; tests/e2e/e05.spec.ts: TC_E05S04_04 - Verify that re |
| `TC_E05S05_01` | E05-S05 | Verify that saving a setup time and a turnaround time on a venue should store bo | ✅ active | backend/tests/venueBufferConflicts.integration.test.ts: TC_E05S05_01: buffers saved on a venue are persisted and returned on detail; tests/e2e/e05.spec.ts: TC_E05S05_01 — Verify th |
| `TC_E05S05_02` | E05-S05 | Verify that the availability calendar should show a booking's buffered occupancy | ✅ active | backend/tests/venueBufferConflicts.integration.test.ts: TC_E05S05_02 calendar clips buffer-only bookings and Free matches advertised search windows; tests/e2e/e05.spec.ts: TC_E05S0 |
| `TC_E05S05_03` | E05-S05 | Verify that changing a venue's turnaround time so that two confirmed bookings no | ✅ active | backend/tests/venueBufferConflicts.integration.test.ts: TC_E05S05_03: a buffer edit flags the later of two newly-overlapping bookings, notifies once, keeps both; tests/e2e/e05.spec |
| `TC_E05S05_04` | E05-S05 | Verify that a booking whose buffered window starts exactly when another's buffer | ✅ active | backend/tests/venueBufferConflicts.integration.test.ts: TC_E05S05_04 buffered writes reject a one-minute overlap, accept adjacency and ignore maintenance buffers; tests/e2e/e05.spe |
| `TC_E05S05_05` | E05-S05 | Verify that a booking adjacent to a maintenance block should not be treated as c | ✅ active | backend/tests/venueBufferConflicts.integration.test.ts: TC_E05S05_05: a block ending before the advertised start but overlapping setup time is allowed silently; tests/e2e/e05.spec. |
| `TC_E05S05_06` | E05-S05 | Verify that venues created before buffers existed should default to 0 and 0 and  | ⚠️ scaffold | tests/e2e/e05.spec.ts: TC_E05S05_06 — Verify that venues created before buffers existed should default to 0 and 0 and that the E05-S03 calendar states remain unchanged for them |
| `TC_E05S05_07` | E05-S05 | Verify that a venue whose existing booking overlaps the event only once its setu | ✅ active | backend/tests/venueBufferConflicts.integration.test.ts: TC_E05S05_07 search names the buffered overlap, falls back to buffer-to-buffer clashes and keeps events private; backend/tes |
| `TC_E05S06_01` | E05-S06 | Verify that marking a venue unavailable with a reason category over a period wit | ✅ active | backend/tests/venueUnavailability.integration.test.ts: TC_E05S06_01: marking a free period unavailable with a reason category saves it and shows the period as Blocked; tests/e2e/e0 |
| `TC_E05S06_02` | E05-S06 | Verify that marking a venue unavailable over a Pending request and a Confirmed b | ✅ active | backend/tests/venueBlocks.integration.test.ts: E05-S04 TC_E05S04_02 superseded by TC_E05S06_02: a block over a confirmed booking saves and flags it; backend/tests/venueUnavailabili |
| `TC_E05S06_03` | E05-S06 | Verify that each Coordinator whose booking became Conflicting should receive an  | ✅ active | backend/tests/venueUnavailability.integration.test.ts: TC_E05S06_03: each Coordinator whose booking became Conflicting gets one in-app notice and one email naming the venue, period |
| `TC_E05S06_04` | E05-S06 | Verify that an unavailability with no end date and time should be saved as open- | ✅ active | backend/tests/venueUnavailability.integration.test.ts: TC_E05S06_04: an unavailability with no end is saved as open-ended and stays in force until lifted; tests/e2e/e05.spec.ts: TC |
| `TC_E05S06_05` | E05-S06 | Verify that extending an unavailability should flag bookings newly inside the lo | ✅ active | backend/tests/venueUnavailability.integration.test.ts: TC_E05S06_05: extending by one minute over a booking flags it, and ending at its start again restores it; tests/e2e/e05.spec. |
| `TC_E05S06_06` | E05-S06 | Verify that E05-S04's block, shorten and remove behaviour still works for period | ✅ active | backend/tests/venueUnavailability.integration.test.ts: TC_E05S06_06: E05-S04; tests/e2e/e05.spec.ts: TC_E05S06_06 — Verify that E05-S04 |
| `TC_E05S06_07` | E05-S06 | Verify that editing and lifting an unavailability should keep a history of each  | ✅ active | backend/tests/venueUnavailability.integration.test.ts: TC_E05S06_07: editing and lifting keep a history, the lifted block is kept, and its Coordinator is told on lift; tests/e2e/e0 |
| `TC_E05S06_08` | E05-S06 | Verify that marking a venue unavailable over an unexpired tentative hold should  | ✅ active | backend/tests/venueUnavailability.integration.test.ts: TC_E05S06_08: an unexpired tentative hold is flagged without being released, its Coordinator told, and restored on lift; test |

### E06

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_E06S01_01` | E06-S01 | Verify that running a search where multiple criteria match an available venue sh | ✅ active | backend/tests/venueSearch.integration.test.ts: TC_E06S01_01 TC_E06S01_02 TC_E06S01_03 TC_E06S01_04: TC_E06S02_01 TC_E06S02_02 TC_E06S02_03 TC_E06S02_05: PostgreSQL event requiremen |
| `TC_E06S01_02` | E06-S01 | Verify that when no venue matches every criterion, near matches should be return | ✅ active | backend/tests/venueSearch.integration.test.ts: TC_E06S01_01 TC_E06S01_02 TC_E06S01_03 TC_E06S01_04: TC_E06S02_01 TC_E06S02_02 TC_E06S02_03 TC_E06S02_05: PostgreSQL event requiremen |
| `TC_E06S01_03` | E06-S01 | Verify that a venue available but with capacity below the event's expected atten | ✅ active | backend/tests/venueSearch.integration.test.ts: TC_E06S01_01 TC_E06S01_02 TC_E06S01_03 TC_E06S01_04: TC_E06S02_01 TC_E06S02_02 TC_E06S02_03 TC_E06S02_05: PostgreSQL event requiremen |
| `TC_E06S01_04` | E06-S01 | Verify that a venue that is blocked or already confirmed for the requested perio | ✅ active | backend/tests/venueSearch.integration.test.ts: TC_E06S01_01 TC_E06S01_02 TC_E06S01_03 TC_E06S01_04: TC_E06S02_01 TC_E06S02_02 TC_E06S02_03 TC_E06S02_05: PostgreSQL event requiremen |
| `TC_E06S02_01` | E06-S02 | Verify that viewing a venue in the context of a event with recorded requirements | ✅ active | backend/tests/venueSearch.integration.test.ts: TC_E06S01_01 TC_E06S01_02 TC_E06S01_03 TC_E06S01_04: TC_E06S02_01 TC_E06S02_02 TC_E06S02_03 TC_E06S02_05: PostgreSQL event requiremen |
| `TC_E06S02_02` | E06-S02 | Verify that a venue failing one or more recorded requirements should be marked u | ✅ active | backend/tests/venueSearch.integration.test.ts: TC_E06S01_01 TC_E06S01_02 TC_E06S01_03 TC_E06S01_04: TC_E06S02_01 TC_E06S02_02 TC_E06S02_03 TC_E06S02_05: PostgreSQL event requiremen |
| `TC_E06S02_03` | E06-S02 | Verify that a venue meeting all recorded requirements for the event should be ma | ✅ active | backend/tests/venueSearch.integration.test.ts: TC_E06S01_01 TC_E06S01_02 TC_E06S01_03 TC_E06S01_04: TC_E06S02_01 TC_E06S02_02 TC_E06S02_03 TC_E06S02_05: PostgreSQL event requiremen |
| `TC_E06S02_04` | E06-S02 | Verify that submitting a booking request for a venue marked unsuitable should st | ✅ active | backend/tests/bookingSubmission.integration.test.ts: TC_E06S03_04 TC_E06S03_06 TC_E06S02_04 buffered request conflicts, blocks, periods and unsuitable hours are distinct gates; bac |
| `TC_E06S02_05` | E06-S02 | Verify operating hours are an advisory suitability criterion only in E06-S02 | ✅ active | backend/tests/venueSearch.integration.test.ts: TC_E06S01_01 TC_E06S01_02 TC_E06S01_03 TC_E06S01_04: TC_E06S02_01 TC_E06S02_02 TC_E06S02_03 TC_E06S02_05: PostgreSQL event requiremen |
| `TC_E06S03_01` | E06-S03 | Verify that submitting a booking request for a event with no existing pending re | ✅ active | backend/tests/bookingSubmission.integration.test.ts: TC_E06S03_01 TC_E06S03_02 TC_E06S03_07 request persists advisory assessment, Planning, calendar and atomic inbox/outbox; backen |
| `TC_E06S03_02` | E06-S03 | Verify that submitting the first booking request for an Approved event should mo | ✅ active | backend/tests/bookingSubmission.integration.test.ts: TC_E06S03_01 TC_E06S03_02 TC_E06S03_07 request persists advisory assessment, Planning, calendar and atomic inbox/outbox; backen |
| `TC_E06S03_03` | E06-S03 | Verify that submitting a second booking request for a event that already has a p | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S03_03 - Verify that submitting another venue booking request for an event with a pending request creates an independent second booking |
| `TC_E06S03_04` | E06-S03 | Verify that submitting a request for a venue already Pending or Confirmed for an | ✅ active | backend/tests/bookingSubmission.integration.test.ts: TC_E06S03_04 TC_E06S03_06 TC_E06S02_04 buffered request conflicts, blocks, periods and unsuitable hours are distinct gates; tes |
| `TC_E06S03_05` | E06-S03 | Verify that an Event Coordinator should be able to view the status of each of th | ✅ active | backend/tests/venueBookingRequests.integration.test.ts: TC_E06S03_05: PostgreSQL request list isolates assigned events and preserves every booking status; backend/tests/venueBookin |
| `TC_E06S03_06` | E06-S03 | Verify that a booking request whose period overlaps another event's buffered win | ✅ active | backend/tests/bookingSubmission.integration.test.ts: TC_E06S03_04 TC_E06S03_06 TC_E06S02_04 buffered request conflicts, blocks, periods and unsuitable hours are distinct gates; tes |
| `TC_E06S03_07` | E06-S03 | Verify that a Coordinator should be able to hold several venue bookings for one  | ✅ active | backend/tests/bookingPrimary.test.ts: TC_E06S03_07 primary selection validates actor, identifier and current assignment/account; backend/tests/bookingPrimary.test.ts: TC_E06S03_07  |
| `TC_E06S03_08` | E06-S03 | Verify that withdrawing one of several venue bookings should leave the others un | ✅ active | backend/tests/bookingSubmission.integration.test.ts: TC_E06S03_08 TC_E06S03_09 TC_E06S03_11 Pending withdrawal preserves other bookings, expiry history and targeted staff delivery; |
| `TC_E06S03_09` | E06-S03 | Refuse withdrawal of Confirmed bookings and requests assigned to another Coordin | ✅ active | backend/tests/bookingSubmission.integration.test.ts: TC_E06S03_08 TC_E06S03_09 TC_E06S03_11 Pending withdrawal preserves other bookings, expiry history and targeted staff delivery; |
| `TC_E06S03_10` | E06-S03 | Serialize Pending withdrawal against approval or rejection | ✅ active | backend/tests/bookingSubmission.integration.test.ts: TC_E06S03_10 decision winning the venue lock prevents withdrawal from overwriting its result; backend/tests/bookingSubmission.i |
| `TC_E06S03_11` | E06-S03 | Notify only the withdrawn request's current venue staff and retain conversion hi | ✅ active | backend/tests/bookingSubmission.integration.test.ts: TC_E06S03_08 TC_E06S03_09 TC_E06S03_11 Pending withdrawal preserves other bookings, expiry history and targeted staff delivery; |
| `TC_E06S03_12` | E06-S03 | Allow a fresh suggested-venue replacement after withdrawal while retaining histo | ✅ active | backend/tests/bookingSubmission.integration.test.ts: TC_E06S03_12 TC_E06S03_13 Released replacement permits a fresh attempt; Rejected follows only its own suggestion; backend/tests |
| `TC_E06S03_13` | E06-S03 | Follow the latest rejection's suggestion without reopening older rejected attemp | ✅ active | backend/tests/bookingSubmission.integration.test.ts: TC_E06S03_12 TC_E06S03_13 Released replacement permits a fresh attempt; Rejected follows only its own suggestion |
| `TC_E06S04_01` | E06-S04 | Verify that approving a pending request for a venue that is free for the period  | ✅ active | backend/tests/venueBookingDecisions.integration.test.ts: TC_E06S04_01: approving a pending request confirms it, updates the calendar and notifies the Coordinator once; backend/test |
| `TC_E06S04_02` | E06-S04 | Verify that rejecting a request with a recorded reason and a suggested alternati | ✅ active | backend/tests/venueBookingDecisions.integration.test.ts: TC_E06S04_02: rejecting with a reason and an alternative venue tells the Coordinator both; backend/tests/venueBookingDecisi |
| `TC_E06S04_03` | E06-S04 | Verify that attempting to reject a request without recording a reason should be  | ✅ active | backend/tests/venueBookingDecisions.integration.test.ts: TC_E06S04_03: a rejection without a reason is blocked and nothing changes; backend/tests/venueBookingDecisions.test.ts: TC_ |
| `TC_E06S04_04` | E06-S04 | Verify that approving a request whose buffered window overlaps another confirmed | ✅ active | backend/tests/venueBookingDecisions.integration.test.ts: TC_E06S04_04: approval is blocked when the buffered windows overlap a confirmed booking, which is named; backend/tests/venu |
| `TC_E06S04_05` | E06-S04 | Verify that an approved venue booking should be recorded with the actor, action, | ✅ active | backend/tests/venueBookingDecisions.integration.test.ts: TC_E06S04_05: an approval is recorded with the actor, action, booking, event and time; tests/e2e/venueBookingDecisions.spec |
| `TC_E06S04_06` | E06-S04 | Verify that a rejected venue booking should be recorded with the actor, action,  | ✅ active | backend/tests/venueBookingDecisions.integration.test.ts: TC_E06S04_06: a rejection is recorded with the actor, action, booking, event and time; tests/e2e/venueBookingDecisions.spec |
| `TC_E06S04_07` | E06-S04 | Verify that a released venue booking should be recorded with the actor, action,  | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S04_07 - Verify that a released venue booking should be recorded with the actor, action, affected records, and time |
| `TC_E06S05_01` | E06-S05 | Verify that a second tentative hold on the same venue and period is refused | ✅ active | backend/tests/venueHolds.integration.test.ts: TC_E06S05_01 TC_E06S05_03 TC_E06S05_04 TC_E06S05_07 holds, clashes, convert, release and extend against PostgreSQL; backend/tests/venu |
| `TC_E06S05_02` | E06-S05 | Verify that a tentative hold should occupy the venue's buffered window so that a | ⚠️ scaffold | tests/e2e/e06.spec.ts: TC_E06S05_02 — Verify that a tentative hold should occupy the venue |
| `TC_E06S05_03` | E06-S05 | Verify that a new tentative hold should carry an expiry 48 hours after creation  | ✅ active | backend/tests/venueHolds.integration.test.ts: TC_E06S05_01 TC_E06S05_03 TC_E06S05_04 TC_E06S05_07 holds, clashes, convert, release and extend against PostgreSQL; backend/tests/venu |
| `TC_E06S05_04` | E06-S05 | Verify that submitting a booking request for a held venue should complete the ho | ✅ active | backend/tests/bookingSubmission.integration.test.ts: TC_E06S05_04 conversion preserves row and stops expiry; concurrent retry and expiry cannot undo Pending; backend/tests/bookingS |
| `TC_E06S05_05` | E06-S05 | Verify that an unconverted hold should become Expired when its expiry passes, fr | ✅ active | backend/tests/venueHolds.integration.test.ts: TC_E06S05_05 TC_E06S05_06 an expired hold frees the venue at once; the job marks it expired and notifies the Coordinator once; backend |
| `TC_E06S05_06` | E06-S05 | Verify that the Coordinator should receive one notice when a hold expires and no | ✅ active | backend/tests/venueHolds.integration.test.ts: TC_E06S05_05 TC_E06S05_06 an expired hold frees the venue at once; the job marks it expired and notifies the Coordinator once; backend |
| `TC_E06S05_07` | E06-S05 | Verify that Venue Staff should be able to extend an unexpired hold but not an ex | ✅ active | backend/tests/venueHolds.integration.test.ts: TC_E06S05_01 TC_E06S05_03 TC_E06S05_04 TC_E06S05_07 holds, clashes, convert, release and extend against PostgreSQL; backend/tests/venu |
| `TC_E06S06_01` | E06-S06 | Verify approval rechecks a confirmed booking after buffer growth | ✅ active | backend/tests/venueClaimPolicy.integration.test.ts: TC_E06S06_01: approval rechecks a confirmed booking after buffer growth and keeps both bookings; tests/e2e/e06.spec.ts: TC_E06S0 |
| `TC_E06S06_02` | E06-S06 | Verify a later overlapping request is refused while the first claim remains acti | ✅ active | backend/tests/venueClaimPolicy.integration.test.ts: TC_E06S06_02: an accepted pending request refuses its competitor without disclosure or side effects; backend/tests/venueClaimPol |
| `TC_E06S06_03` | E06-S06 | Verify concurrent overlapping new claims accept only one request | ✅ active | backend/tests/venueClaimPolicy.integration.test.ts: TC_E06S06_03: concurrent overlapping requests leave exactly one accepted claim; tests/e2e/e06.spec.ts: TC_E06S06_03 - T-100: Ver |
| `TC_E06S06_04` | E06-S06 | Verify exact half-open buffered adjacency is allowed with zero buffers | ✅ active | backend/tests/venueClaimPolicy.integration.test.ts: TC_E06S06_04: a pending request exactly adjacent to a confirmed booking can be approved; tests/e2e/e06.spec.ts: TC_E06S06_04 - T |
| `TC_E06S06_05` | E06-S06 | Verify a one-minute overlap is refused before an impossible fixture is inserted | ✅ active | backend/tests/venueClaimPolicy.integration.test.ts: TC_E06S06_05: a one-minute overlap is refused at submission without disclosure or a new row; tests/e2e/e06.spec.ts: TC_E06S06_05 |
| `TC_E06S06_06` | E06-S06 | Verify buffer-growth conflicts block approvals until an explicit resolution | ✅ active | backend/tests/venueClaimPolicy.integration.test.ts: TC_E06S06_06: buffer growth blocks both approvals until Venue Staff rejects one request; backend/tests/venueClaimPolicy.integrat |
| `TC_E06S06_07` | E06-S06 | Verify one event may confirm overlapping bookings at different venues | ✅ active | backend/tests/venueClaimPolicy.integration.test.ts: TC_E06S06_07: one event can confirm overlapping requests at different venues; tests/e2e/e06.spec.ts: TC_E06S06_07 — T-100: Verif |

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
| `TC_E07S04_01` | E07-S04 | Verify that reserving the requested quantity when sufficient equipment is free s | ✅ active | backend/tests/equipmentReservations.integration.test.ts: TC_E07S04_01 reserving the requested quantity records the reservation against the event and notifies the Coordinator with e |
| `TC_E07S04_02` | E07-S04 | Verify that recording a partial reservation when only part of the requested quan | ✅ active | backend/tests/equipmentReservations.integration.test.ts: TC_E07S04_02 TC_E07S04_07 a partial reservation records Partial and notifies the Coordinator of the shortfall and outstandi |
| `TC_E07S04_03` | E07-S04 | Verify that once an item becomes fully committed, a subsequent availability chec | ✅ active | backend/tests/equipmentReservations.integration.test.ts: TC_E07S04_03 once every unit is reserved for a period the availability check shows no free quantity; tests/e2e/equipmentRes |
| `TC_E07S04_04` | E07-S04 | Verify that releasing a reservation when a event is cancelled or the equipment i | ✅ active | backend/tests/equipmentReservations.integration.test.ts: TC_E07S04_04 releasing a reservation returns its units to the pool keeps the history and lets the line be reserved again; t |
| `TC_E07S04_05` | E07-S04 | Verify that requesting one fewer than the free quantity produces a full reservat | ✅ active | backend/tests/equipmentReservations.integration.test.ts: TC_E07S04_05 TC_E07S04_06 reserving one fewer than free leaves one free and reserving exactly the free quantity leaves none |
| `TC_E07S04_06` | E07-S04 | Verify that requesting exactly the free quantity produces a full reservation and | ✅ active | backend/tests/equipmentReservations.integration.test.ts: TC_E07S04_05 TC_E07S04_06 reserving one fewer than free leaves one free and reserving exactly the free quantity leaves none |
| `TC_E07S04_07` | E07-S04 | Verify that requesting one more than the free quantity produces a partial reserv | ✅ active | backend/tests/equipmentReservations.integration.test.ts: TC_E07S04_02 TC_E07S04_07 a partial reservation records Partial and notifies the Coordinator of the shortfall and outstandi |
| `TC_E07S05_01` | E07-S05 | Verify that marking an item with no reservations in the period unavailable, with | ✅ active | backend/tests/equipmentUnavailability.integration.test.ts: TC_E07S05_01 marking an item with no reservations unavailable for a period with a reason excludes it from availability fo |
| `TC_E07S05_02` | E07-S05 | Verify that marking an item unavailable while it is reserved for an upcoming eve | ✅ active | backend/tests/equipmentUnavailability.integration.test.ts: TC_E07S05_02 marking a reserved item unavailable flags the affected event and notifies its Coordinator once; tests/e2e/eq |
| `TC_E07S05_03` | E07-S05 | Verify that returning an item to service should restore it to availability check | ✅ active | backend/tests/equipmentUnavailability.integration.test.ts: TC_E07S05_03 returning an item to service deletes the period restores availability and is audited; tests/e2e/equipmentUna |
| `TC_E07S06_01` | E07-S06 | Verify that submitting a technical support request describing the support needed | ✅ active | backend/tests/supportRequests.integration.test.ts: TC_E07S06_01 TC_E07S06_02 TC_E07S06_03 technical support requests against PostgreSQL; backend/tests/supportRequests.test.ts: TC_E |
| `TC_E07S06_02` | E07-S06 | Verify that submitting a technical support request before the venue is confirmed | ✅ active | backend/tests/supportRequests.integration.test.ts: TC_E07S06_01 TC_E07S06_02 TC_E07S06_03 technical support requests against PostgreSQL; backend/tests/supportRequests.test.ts: TC_E |
| `TC_E07S06_03` | E07-S06 | Verify that marking a event as needing no technical support should create no req | ✅ active | backend/tests/supportRequests.integration.test.ts: TC_E07S06_01 TC_E07S06_02 TC_E07S06_03 technical support requests against PostgreSQL; backend/tests/supportRequests.test.ts: TC_E |
| `TC_E07S07_01` | E07-S07 | Verify that a colleague with no conflicting assignment during the event's requir | ✅ active | backend/tests/staffAssignments.integration.test.ts: TC_E07S07_01 TC_E07S07_02 TC_E07S07_03 TC_E07S07_04 TC_E07S07_05 TC_E07S07_06 TC_E11S01_06 TC_E11S01_07 TC_E11S01_09 TC_E11S01_1 |
| `TC_E07S07_02` | E07-S07 | Verify that the assignment should be reflected on the assigned staff member's sc | ✅ active | backend/tests/staffAssignments.integration.test.ts: TC_E07S07_01 TC_E07S07_02 TC_E07S07_03 TC_E07S07_04 TC_E07S07_05 TC_E07S07_06 TC_E11S01_06 TC_E11S01_07 TC_E11S01_09 TC_E11S01_1 |
| `TC_E07S07_03` | E07-S07 | Verify that assigning a colleague who has an overlapping assignment should be bl | ✅ active | backend/tests/staffAssignments.integration.test.ts: TC_E07S07_01 TC_E07S07_02 TC_E07S07_03 TC_E07S07_04 TC_E07S07_05 TC_E07S07_06 TC_E11S01_06 TC_E11S01_07 TC_E11S01_09 TC_E11S01_1 |
| `TC_E07S07_04` | E07-S07 | Verify that removing an existing assignment from a staff member's schedule shoul | ✅ active | backend/tests/staffAssignments.integration.test.ts: TC_E07S07_01 TC_E07S07_02 TC_E07S07_03 TC_E07S07_04 TC_E07S07_05 TC_E07S07_06 TC_E11S01_06 TC_E11S01_07 TC_E11S01_09 TC_E11S01_1 |
| `TC_E07S07_05` | E07-S07 | Verify that assigning a replacement colleague after removing an assignment shoul | ✅ active | backend/tests/staffAssignments.integration.test.ts: TC_E07S07_01 TC_E07S07_02 TC_E07S07_03 TC_E07S07_04 TC_E07S07_05 TC_E07S07_06 TC_E11S01_06 TC_E11S01_07 TC_E11S01_09 TC_E11S01_1 |
| `TC_E07S07_06` | E07-S07 | Verify that the assigned staff member should receive a notification when they ar | ✅ active | backend/tests/staffAssignments.integration.test.ts: TC_E07S07_01 TC_E07S07_02 TC_E07S07_03 TC_E07S07_04 TC_E07S07_05 TC_E07S07_06 TC_E11S01_06 TC_E11S01_07 TC_E11S01_09 TC_E11S01_1 |
| `TC_E07S08_01` | E07-S08 | An equipment request should be linked to a Session of its owning Event | ❌ none | — |
| `TC_E07S08_02` | E07-S08 | A reservation should use the linked Session’s date and time for availability | ❌ none | — |
| `TC_E07S08_03` | E07-S08 | A Session from a different Event should be rejected for the equipment request | ❌ none | — |
| `TC_E07S08_04` | E07-S08 | Adding Sessions should not change the Event-level technical staff assignment | ❌ none | — |
| `TC_E07S09_01` | E07-S09 | Stock reduction includes overlapping withdrawals | ✅ active | backend/tests/equipmentCatalogue.integration.test.ts: TC_E07S09_01 stock 10 with 4 withdrawn and 5 reserved: reducing to 8 flags the reservation and notifies once |
| `TC_E07S09_02` | E07-S09 | Withdrawal boundaries and peak demand are respected | ✅ active | backend/tests/equipmentCatalogue.integration.test.ts: TC_E07S09_02 catalogue stock reduction:  |
| `TC_E07S09_03` | E07-S09 | Withdrawal-aware stock edit rolls back on outbox failure | ✅ active | backend/tests/equipmentCatalogue.integration.test.ts: TC_E07S09_03 withdrawal-aware stock edit rolls back stock, review flags and notifications when outbox persistence fails |

### E08

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_E08S03_01` | E08-S03 | Verify that confirming an event where every event has a confirmed venue and full | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S03_01 - Verify that confirming an event where every event has a confirmed venue and full equipment reservation should set its status to Confirmed and  |
| `TC_E08S03_02` | E08-S03 | Verify that attempting to confirm an event while a event is missing a confirmed  | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S03_02 - Verify that attempting to confirm an event while a event is missing a confirmed venue should be blocked with the outstanding event named |
| `TC_E08S03_03` | E08-S03 | Verify that attempting to submit an event for its safety check while it has only | ✅ active | backend/tests/eventReadiness.integration.test.ts: TC_E08S03_03: a partial equipment reservation blocks submission and shows the outstanding quantity; backend/tests/eventReadiness.t |
| `TC_E08S03_04` | E08-S03 | Verify that attempting to submit an event for its safety check while its request | ✅ active | backend/tests/eventReadiness.integration.test.ts: TC_E08S03_04: requested technical support with no staff assigned blocks submission; backend/tests/eventReadiness.test.ts: TC_E08S0 |
| `TC_E08S03_05` | E08-S03 | Verify that once an event is confirmed, the Organiser should see every confirmed | ✅ active | backend/tests/eventReadiness.integration.test.ts: TC_E08S03_05: the Organiser sees every confirmed venue with its purpose and period, and the arrangements, once the event is confir |
| `TC_E08S03_06` | E08-S03 | Verify that confirming an event with several venue bookings should be blocked wh | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S03_06 — Verify that confirming an event with several venue bookings should be blocked while any booking is still Pending or Conflicting, listing each  |
| `TC_E08S03_07` | E08-S03 | Verify that an event should be confirmable once every venue booking is Confirmed | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S03_07 — Verify that an event should be confirmable once every venue booking is Confirmed or withdrawn and the Organiser should see every confirmed ven |
| `TC_E08S03_08` | E08-S03 | Verify that submitting a fully arranged event for its Operational Safety Check s | ✅ active | backend/tests/eventReadiness.integration.test.ts: TC_E08S03_08: submitting a fully arranged Planning event moves it to Safety Review and notifies the Organiser and every active Saf |
| `TC_E08S03_09` | E08-S03 | Verify that submission for safety review should be blocked while a readiness ite | ✅ active | backend/tests/eventReadiness.integration.test.ts: TC_E08S03_09: submission is blocked while a venue booking is outstanding, each one listed by venue, and nothing changes; backend/t |
| `TC_E08S03_10` | E08-S03 | Verify that an event whose equipment was recorded as none required should not be | ✅ active | backend/tests/eventReadiness.integration.test.ts: TC_E08S03_10: equipment recorded as none required, with no request lines, does not block submission; backend/tests/eventReadiness. |
| `TC_E08S04_01` | E08-S04 | Verify that reverting a Confirmed event to Planning with a recorded reason shoul | ✅ active | backend/tests/eventReadinessRoutes.integration.test.ts: TC_E08S03_08, TC_E08S03_09, TC_E08S04_01, TC_E08S04_02 and TC_E08S04_04: the readiness, submission, confirm and revert route |
| `TC_E08S04_02` | E08-S04 | Verify that reverting a Confirmed event with registered Attendees should notify  | ✅ active | backend/tests/eventReadinessRoutes.integration.test.ts: TC_E08S03_08, TC_E08S03_09, TC_E08S04_01, TC_E08S04_02 and TC_E08S04_04: the readiness, submission, confirm and revert route |
| `TC_E08S04_03` | E08-S04 | A non-venue arrangement failure should be flagged without automatically revertin | ✅ active | tests/e2e/e08.spec.ts: TC_E08S04_03 - A non-venue arrangement failure should be flagged without automatically reverting the Event |
| `TC_E08S04_04` | E08-S04 | Verify that a reversion from Confirmed to Planning should be recorded in the act | ✅ active | backend/tests/eventReadinessRoutes.integration.test.ts: TC_E08S03_08, TC_E08S03_09, TC_E08S04_01, TC_E08S04_02 and TC_E08S04_04: the readiness, submission, confirm and revert route |
| `TC_E08S04_05` | E08-S04 | A reverted Event should enter Safety Review automatically after all arrangements | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S04_05 — Verify that a reverted event should pass the Operational Safety Check again before it is Confirmed again |
| `TC_E08S04_06` | E08-S04 | A venue block affecting a Confirmed Event should return it to Planning and notif | ❌ none | — |
| `TC_E08S05_01` | E08-S05 | Verify that a Confirmed event should automatically become Completed once its las | ✅ active | backend/tests/eventCompletion.integration.test.ts: TC_E10S01_06 TC_E08S05_01 TC_E08S05_04 TC_E08S05_06 exact-end auto evaluation excludes Cancelled and other statuses, with System  |
| `TC_E08S05_02` | E08-S05 | Verify that an Event Coordinator should be able to manually mark a Confirmed eve | ✅ active | backend/tests/eventCompletion.integration.test.ts: TC_E10S01_06 TC_E08S05_02 TC_E08S05_03 TC_E08S05_05 manual time gate, durable actor/audit, T-88, and idempotent retries; backend/ |
| `TC_E08S05_03` | E08-S05 | Verify that attempting to mark an event complete before its first event has star | ✅ active | backend/tests/eventCompletion.integration.test.ts: TC_E10S01_06 TC_E08S05_02 TC_E08S05_03 TC_E08S05_05 manual time gate, durable actor/audit, T-88, and idempotent retries; backend/ |
| `TC_E08S05_04` | E08-S05 | Verify that a Cancelled event should never auto-complete, even after its origina | ✅ active | backend/tests/eventCompletion.integration.test.ts: TC_E10S01_06 TC_E08S05_01 TC_E08S05_04 TC_E08S05_06 exact-end auto evaluation excludes Cancelled and other statuses, with System  |
| `TC_E08S05_05` | E08-S05 | Verify that an event's transition to Completed should be recorded in the activit | ✅ active | backend/tests/eventCompletion.integration.test.ts: TC_E10S01_06 TC_E08S05_02 TC_E08S05_03 TC_E08S05_05 manual time gate, durable actor/audit, T-88, and idempotent retries; tests/co |
| `TC_E08S05_06` | E08-S05 | Verify that an event auto-completes at the exact end time and not before | ✅ active | backend/tests/eventCompletion.integration.test.ts: TC_E10S01_06 TC_E08S05_01 TC_E08S05_04 TC_E08S05_06 exact-end auto evaluation excludes Cancelled and other statuses, with System  |
| `TC_E08S06_01` | E08-S06 | Verify that the safety review queue should show each waiting event with the info | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S06_01 — Verify that the safety review queue should show each waiting event with the information the listed factors need, oldest first |
| `TC_E08S06_02` | E08-S06 | Verify that approving an event after recording every factor as satisfactory shou | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S06_02 — Verify that approving an event after recording every factor as satisfactory should make it Confirmed, notify the Organiser and Coordinator, an |
| `TC_E08S06_03` | E08-S06 | Verify that requesting changes should return the event to Planning with the item | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S06_03 — Verify that requesting changes should return the event to Planning with the items to address, flag the affected arrangements and keep it from  |
| `TC_E08S06_04` | E08-S06 | Verify that rejecting the safety arrangement should return the event to Planning | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S06_04 — Verify that rejecting the safety arrangement should return the event to Planning with a rejection flag without cancelling it |
| `TC_E08S06_05` | E08-S06 | Verify that reject and request changes should require a reason and that no role  | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S06_05 — Verify that reject and request changes should require a reason and that no role other than Safety Officer can decide |
| `TC_E08S06_06` | E08-S06 | Verify that events confirmed before the safety check existed should be untouched | ⚠️ scaffold | tests/e2e/e08.spec.ts: TC_E08S06_06 — Verify that events confirmed before the safety check existed should be untouched and that Safety Review should count as an active status for t |

### E09

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_E09S01_01` | E09-S01 | Submitting an open Event registration should reserve one place in each selected  | ✅ active | backend/tests/attendeeRegistration.test.ts: registerForEvent creates one registration with the selected Sessions and a confirmation (TC_E09S01_01, _07); tests/e2e/attendee-registra |
| `TC_E09S01_02` | E09-S01 | [RETIRED — T-79 restores Sessions under one Event; selecting Sessions is covered | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S01_02 - Verify that registering for a multi-event event should let the Attendee choose which events to attend, reserving a place in each chosen event |
| `TC_E09S01_03` | E09-S01 | A second active registration for the same account and Event should be prevented | ✅ active | tests/e2e/e09.spec.ts: TC_E09S01_03 - Verify that attempting to register again for a event already registered for should be told so, without creating a duplicate; frontend/src/feat |
| `TC_E09S01_04` | E09-S01 | Verify that submitting registration with a required field empty should block reg | ✅ active | backend/tests/attendeeRegistration.test.ts: missingDetails names every blank or missing account detail (TC_E09S01_04, T-32); tests/e2e/e09.spec.ts: TC_E09S01_04 - Verify that submi |
| `TC_E09S01_05` | E09-S01 | Verify that attempting to register for an event that is not Confirmed should be  | ✅ active | backend/tests/attendeeRegistration.test.ts: getRegistrationForm refuses unconfirmed, unknown and registration-free events (TC_E09S01_05); tests/e2e/e09.spec.ts: TC_E09S01_05 - Veri |
| `TC_E09S01_06` | E09-S01 | The Event summary should show its primary venue while selected Sessions show the | ✅ active | tests/e2e/e09.spec.ts: TC_E09S01_06 — Verify that an Attendee viewing a multi-venue event should see only the primary venue; frontend/src/features/attendee/EventRegistration.test.t |
| `TC_E09S01_07` | E09-S01 | An Attendee should be able to select multiple Sessions in one Event registration | ✅ active | tests/e2e/attendee-registration.spec.ts: TC_E09S01_07 — one submission creates one Event registration with both Sessions; frontend/src/features/attendee/EventRegistration.test.tsx: |
| `TC_E09S02_01` | E09-S02 | [RETIRED — T-85 uses approved Session layout and combined Event capacities; Orga | ❌ none | — |
| `TC_E09S02_02` | E09-S02 | [RETIRED — T-85 replaces the single lower-of-limit rule with separate Session an | ❌ none | — |
| `TC_E09S02_03` | E09-S02 | Concurrent registration attempts should not exceed a Session or combined Event c | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S02_03 - Concurrent registration attempts should not exceed a Session or combined Event capacity |
| `TC_E09S02_04` | E09-S02 | A full combined Event should offer its enabled Event-level waiting list | ✅ active | tests/e2e/e09.spec.ts: TC_E09S02_04 - A full combined Event should offer its enabled Event-level waiting list; frontend/src/features/attendee/EventRegistration.test.tsx: TC_E09S02_ |
| `TC_E09S02_06` | E09-S02 | An Organiser may manually add an attendee only when both capacities have room | ✅ active | backend/tests/attendeeCapacity.test.ts: manageRegistrations adds an attendee manually within both limits (TC_E09S02_06); tests/e2e/e09.spec.ts: TC_E09S02_06 - An Organiser may manu |
| `TC_E09S02_07` | E09-S02 | A manual addition should be blocked when either capacity is full | ✅ active | backend/tests/attendeeCapacity.test.ts: manageRegistrations blocks a manual addition at either limit and other refusals (TC_E09S02_07); tests/e2e/e09.spec.ts: TC_E09S02_07 - A manu |
| `TC_E09S02_08` | E09-S02 | A registration should be confirmed up to the approved capacity of every selected | ✅ active | backend/tests/attendeeRegistration.test.ts: registerForEvent confirms the last place in a Session and the Event (TC_E09S02_08); tests/e2e/e09.spec.ts: TC_E09S02_08 - A registration |
| `TC_E09S02_09` | E09-S02 | A registration exceeding a selected Session capacity should remain Pending | ✅ active | backend/tests/attendeeRegistration.test.ts: registerForEvent keeps an over-capacity request Pending with its own notice (TC_E09S02_09, _10); tests/e2e/e09.spec.ts: TC_E09S02_09 - A |
| `TC_E09S02_10` | E09-S02 | A registration exceeding combined Event capacity should remain Pending | ✅ active | tests/e2e/e09.spec.ts: TC_E09S02_10 - A registration exceeding combined Event capacity should remain Pending |
| `TC_E09S02_11` | E09-S02 | An Organiser should approve a Pending request only if both capacity limits still | ✅ active | backend/tests/attendeeCapacity.test.ts: manageRegistrations approves a Pending request only while both limits allow it (TC_E09S02_11); tests/e2e/e09.spec.ts: TC_E09S02_11 - An Orga |
| `TC_E09S02_12` | E09-S02 | Combined Event capacity should reflect confirmed Session layout capacities | ✅ active | backend/tests/attendeeCapacity.test.ts: eventCapacity sums Session capacities and counts registered places only (TC_E09S02_12); tests/e2e/e09.spec.ts: TC_E09S02_12 - Combined Event |
| `TC_E09S03_01` | E09-S03 | Verify that an Event Organiser should be able to set the registration opening an | ✅ active | backend/tests/eventVisibility.test.ts: TC_E09S03_01, _02, _06 - after approval the Organiser sets the window, withdrawal deadline and waiting list directly; tests/e2e/e09.spec.ts:  |
| `TC_E09S03_02` | E09-S03 | Verify that an Event Organiser should be able to set a withdrawal deadline for a | ✅ active | tests/e2e/e09.spec.ts: TC_E09S03_02 - Verify that an Event Organiser should be able to set a withdrawal deadline for an event |
| `TC_E09S03_03` | E09-S03 | Verify that an Attendee viewing an event before its registration opening date sh | ✅ active | tests/e2e/e09.spec.ts: TC_E09S03_03 - Verify that an Attendee viewing an event before its registration opening date should see registration as not yet open, with the opening date s |
| `TC_E09S03_04` | E09-S03 | Verify that an Attendee trying to register after the registration closing date h | ✅ active | tests/e2e/e09.spec.ts: TC_E09S03_04 - Verify that an Attendee trying to register after the registration closing date has passed should be refused |
| `TC_E09S03_05` | E09-S03 | Verify that setting a registration closing date that falls after the event has s | ✅ active | backend/tests/eventVisibility.test.ts: TC_E09S03_05 - a closing date after the event starts needs confirming before it is saved; tests/e2e/e09.spec.ts: TC_E09S03_05 - Verify that s |
| `TC_E09S03_06` | E09-S03 | Verify that enabling the waiting list for an event should offer it to Attendees  | ✅ active | tests/e2e/e09.spec.ts: TC_E09S03_06 - Verify that enabling the waiting list for an event should offer it to Attendees once a event becomes full |
| `TC_E09S03_07` | E09-S03 | Verify that registration succeeds at the exact opening timestamp | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S03_07 - Verify that registration succeeds at the exact opening timestamp |
| `TC_E09S03_08` | E09-S03 | Verify that registration still succeeds at the exact closing timestamp | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S03_08 - Verify that registration still succeeds at the exact closing timestamp |
| `TC_E09S03_09` | E09-S03 | One Event-level registration window should apply to all of its selected Sessions | ✅ active | tests/e2e/e09.spec.ts: TC_E09S03_09 - One Event-level registration window should apply to all of its selected Sessions |
| `TC_E09S04_01` | E09-S04 | Joining a full Event-level waiting list should confirm the Attendee’s place in t | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S04_01 - Verify that joining the waiting list for a full event with the list enabled should add the Attendee and confirm their position |
| `TC_E09S04_02` | E09-S04 | Verify that when a place is released in a event with a waiting list, all waitlis | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S04_02 - Verify that when a place is released in a event with a waiting list, all waitlisted Attendees should be notified and the place claimed on a fi |
| `TC_E09S04_03` | E09-S04 | Verify that claiming a released place should remove the Attendee from the waitin | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S04_03 - Verify that claiming a released place should remove the Attendee from the waiting list for that event |
| `TC_E09S04_04` | E09-S04 | Verify that a full event should not offer a waiting list when the Organiser has  | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S04_04 - Verify that a full event should not offer a waiting list when the Organiser has disabled it |
| `TC_E09S04_05` | E09-S04 | Verify that an Attendee should be able to voluntarily leave the waiting list bef | ⚠️ scaffold | tests/e2e/e09.spec.ts: TC_E09S04_05 - Verify that an Attendee should be able to voluntarily leave the waiting list before a place is released |
| `TC_E09S05_01` | E09-S05 | Withdrawing one Event registration should release its places in every selected S | ✅ active | backend/tests/attendeeRegistration.integration.test.ts: E09-S01 and E09-S05: register once for a Confirmed Event, selecting Sessions, then withdraw, on real PostgreSQL (TC_E09S05_0 |
| `TC_E09S05_02` | E09-S05 | Verify that withdrawing from one event before the withdrawal deadline should can | ❌ none | — |
| `TC_E09S05_03` | E09-S05 | Verify that attempting to withdraw after the withdrawal deadline has passed shou | ✅ active | backend/tests/attendeeRegistration.integration.test.ts: E09-S01 and E09-S05: register once for a Confirmed Event, selecting Sessions, then withdraw, on real PostgreSQL (TC_E09S05_0 |
| `TC_E09S05_04` | E09-S05 | Verify that withdrawal succeeds at the exact withdrawal deadline | ✅ active | backend/tests/attendeeRegistration.integration.test.ts: E09-S01 and E09-S05: register once for a Confirmed Event, selecting Sessions, then withdraw, on real PostgreSQL (TC_E09S05_0 |
| `TC_E09S05_05` | E09-S05 | Withdrawing a multi-Session registration should release all selected Session sea | ✅ active | backend/tests/attendeeRegistration.integration.test.ts: E09-S01 and E09-S05: register once for a Confirmed Event, selecting Sessions, then withdraw, on real PostgreSQL (TC_E09S05_0 |
| `TC_E09S06_01` | E09-S06 | Verify that marking a registered Attendee as attended for a event after the even | ✅ active | backend/tests/eventAttendance.integration.test.ts: TC_E09S06_01 TC_E09S06_02 TC_E09S06_04 — real attendance persists independently of five registered places, latest correction and  |
| `TC_E09S06_02` | E09-S06 | Verify that a registered Attendee who did not attend should be shown as register | ✅ active | backend/tests/eventAttendance.integration.test.ts: TC_E09S06_01 TC_E09S06_02 TC_E09S06_04 — real attendance persists independently of five registered places, latest correction and  |
| `TC_E09S06_03` | E09-S06 | Verify that attempting to record attendance before the event is Completed should | ✅ active | backend/tests/eventAttendance.integration.test.ts: TC_E09S06_03 — all non-Completed statuses block writes, server capability matches; missing, foreign and inactive registrations re |
| `TC_E09S06_04` | E09-S06 | Verify that registration and attendance counts should be viewable side by side f | ✅ active | backend/tests/eventAttendance.integration.test.ts: TC_E09S06_01 TC_E09S06_02 TC_E09S06_04 — real attendance persists independently of five registered places, latest correction and  |
| `TC_E09S07_01` | E09-S07 | Verify that opening the registration list for an event with registered Attendees | ✅ active | backend/tests/attendeeCapacity.test.ts: TC_E09S07_01, _02, _04 - registered and waitlisted Attendees are listed apart, with name, email and contact number only; tests/e2e/e09.spec. |
| `TC_E09S07_02` | E09-S07 | Verify that the registration list should show the registered count and remaining | ✅ active | tests/e2e/e09.spec.ts: TC_E09S07_02 - Verify that the registration list should show the registered count and remaining capacity per event |
| `TC_E09S07_03` | E09-S07 | Verify that attempting to open the registration list for an event that does not  | ✅ active | backend/tests/attendeeCapacity.test.ts: TC_E09S07_03 - another organisation; tests/e2e/e09.spec.ts: TC_E09S07_03 - Verify that attempting to open the registration list for an event |
| `TC_E09S07_04` | E09-S07 | Verify that waitlisted Attendees should be shown separately from registered Atte | ✅ active | tests/e2e/e09.spec.ts: TC_E09S07_04 - Verify that waitlisted Attendees should be shown separately from registered Attendees on the registration list; frontend/src/features/organise |

### E10

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_E10S01_01` | E10-S01 | Verify that submitting a change request on an approved or confirmed event should | ✅ active | backend/tests/changeRequests.integration.test.ts: TC_E10S01_01 / TC_E10S01_02 / TC_E10S01_04: pending snapshot leaves Event unchanged; safe apply and outbox are atomic; backend/tes |
| `TC_E10S01_02` | E10-S01 | Verify that viewing an event with a pending change request should still show the | ✅ active | backend/tests/changeRequests.integration.test.ts: TC_E10S01_01 / TC_E10S01_02 / TC_E10S01_04: pending snapshot leaves Event unchanged; safe apply and outbox are atomic; backend/tes |
| `TC_E10S01_03` | E10-S01 | Verify that attempting to directly edit a restricted field after approval should | ✅ active | tests/auth-e2e/changeRequests.spec.ts: TC_E10S01_03: Confirmed readonly field opens its real prefilled form without creating a request; tests/auth-e2e/changeRequests.spec.ts: TC_E1 |
| `TC_E10S01_04` | E10-S01 | Verify that when the Coordinator approves a change request, the event should be  | ✅ active | backend/tests/changeRequests.integration.test.ts: TC_E10S01_01 / TC_E10S01_02 / TC_E10S01_04: pending snapshot leaves Event unchanged; safe apply and outbox are atomic; backend/tes |
| `TC_E10S01_05` | E10-S01 | Verify that when the Coordinator declines a change request, the Organiser should | ✅ active | backend/tests/changeRequests.integration.test.ts: TC_E10S01_05: decline leaves confirmed details unchanged and notifies requester; tests/auth-e2e/changeRequests.spec.ts: TC_E10S01_ |
| `TC_E10S01_06` | E10-S01 | A Pending change request should become Obsolete when the Event is Completed | ✅ active | backend/tests/eventCompletion.integration.test.ts: TC_E10S01_06 TC_E08S05_02 TC_E08S05_03 TC_E08S05_05 manual time gate, durable actor/audit, T-88, and idempotent retries; backend/ |
| `TC_E10S01_07` | E10-S01 | A Pending change request should become Obsolete when the Event is Cancelled | ✅ active | tests/auth-e2e/changeRequests.spec.ts: TC_E10S01_07: real cancelled workflow closes Pending requests as Obsolete and disables decisions |
| `TC_E10S02_01` | E10-S02 | An attendance change should flag only bookings whose governing Session headcount | ✅ active | backend/tests/arrangementImpact.integration.test.ts: TC_E10S02_01: Session A attendance above its capacity flags only Session A\; backend/tests/arrangementImpact.integration.test.t |
| `TC_E10S02_02` | E10-S02 | Verify that editing only the event description on an event with confirmed venue  | ✅ active | backend/tests/arrangementImpact.integration.test.ts: TC_E10S02_02: a description-only save flags nothing, logs nothing for arrangements and tells no staff; backend/tests/arrangemen |
| `TC_E10S02_03` | E10-S02 | Verify that saving a change that affects confirmed arrangements should show whic | ✅ active | backend/tests/arrangementImpact.integration.test.ts: TC_E10S02_03: the preview lists the affected booking and equipment, and saves, flags, logs and notifies nothing; backend/tests/ |
| `TC_E10S02_04` | E10-S02 | Verify that a venue change that reduces a event's capacity below its registratio | ✅ active | backend/tests/arrangementImpact.integration.test.ts: TC_E10S02_04: capacity falling below the registrations warns, and every Attendee stays Registered; backend/tests/arrangementImp |
| `TC_E10S02_05` | E10-S02 | Changing a Session date should flag its booking and equipment reservation for re | ✅ active | backend/tests/arrangementImpact.integration.test.ts: TC_E10S02_05: changing only Session A\; backend/tests/arrangementImpact.integration.test.ts: TC_E10S02_05 and TC_E10S02_06: an  |
| `TC_E10S02_06` | E10-S02 | Verify that when a date or time change flags arrangements for reconfirmation, th | ✅ active | backend/tests/arrangementImpact.integration.test.ts: TC_E10S02_05 and TC_E10S02_06: an Event date change flags the booking and equipment, and tells its Venue Staff and Technical Su |
| `TC_E10S02_07` | E10-S02 | A Session attendance change should flag only bookings over capacity after bookin | ✅ active | backend/tests/arrangementImpact.integration.test.ts: TC_E10S02_07: a booking headcount governs over Session attendance; only the Session-governed booking is flagged (SQL Session ch |
| `TC_E10S02_08` | E10-S02 | An Event-wide date change should flag arrangements for every Session | ✅ active | backend/tests/arrangementImpact.integration.test.ts: TC_E10S02_08: an Event-wide date change flags every Session\; backend/tests/arrangementImpact.integration.test.ts: TC_E10S02_08 |
| `TC_E10S02_09` | E10-S02 | An Event description-only edit should not flag any Session arrangements | ✅ active | backend/tests/arrangementImpact.integration.test.ts: TC_E10S02_09: a description-only save on a two-Session Event flags no Session arrangement |
| `TC_E10S03_01` | E10-S03 | Changing one Session date should flag only that Session’s arrangements | ❌ none | — |
| `TC_E10S03_02` | E10-S03 | An Event-wide reschedule should flag arrangements for every Session | ❌ none | — |
| `TC_E10S03_03` | E10-S03 | Registered Attendees should be notified of the new Event and Session dates | ❌ none | — |
| `TC_E10S03_04` | E10-S03 | Pending change requests should become Obsolete when a rescheduled Event later be | ❌ none | — |
| `TC_E10S04_01` | E10-S04 | Cancelling an Event should release all Session bookings and equipment reservatio | ✅ active | backend/tests/eventCancellation.integration.test.ts: TC_E10S04_01 TC_E10S04_03 TC_E10S04_04 TC_E10S04_05 TC_E10S04_06 all Sessions released, notices, request/history and read-only  |
| `TC_E10S04_03` | E10-S04 | Verify that cancelling a event should notify all of its registered and waitliste | ✅ active | backend/tests/eventCancellation.integration.test.ts: TC_E10S04_01 TC_E10S04_03 TC_E10S04_04 TC_E10S04_05 TC_E10S04_06 all Sessions released, notices, request/history and read-only  |
| `TC_E10S04_04` | E10-S04 | Verify that a cancelled event should be read-only and show its cancellation reas | ✅ active | backend/tests/eventCancellation.integration.test.ts: TC_E10S04_01 TC_E10S04_03 TC_E10S04_04 TC_E10S04_05 TC_E10S04_06 all Sessions released, notices, request/history and read-only  |
| `TC_E10S04_05` | E10-S04 | Verify that an Event Organiser attempting to cancel directly should have the act | ✅ active | backend/tests/eventCancellation.integration.test.ts: TC_E10S04_01 TC_E10S04_03 TC_E10S04_04 TC_E10S04_05 TC_E10S04_06 all Sessions released, notices, request/history and read-only  |
| `TC_E10S04_06` | E10-S04 | Cancelling an Event should close every Pending change request as Obsolete | ✅ active | backend/tests/eventCancellation.integration.test.ts: TC_E10S04_01 TC_E10S04_03 TC_E10S04_04 TC_E10S04_05 TC_E10S04_06 all Sessions released, notices, request/history and read-only  |
| `TC_E10S05_01` | E10-S05 | Verify that when a booked venue is marked unavailable the Coordinator's event sh | ✅ active | backend/tests/lostVenueRecovery.integration.test.ts: TC_E10S05_01 TC_E10S05_02 TC_E10S05_04: real loss preserves arrangements and confirmed venue reaches two Attendees and intercep |
| `TC_E10S05_02` | E10-S05 | Verify that a flagged event should show the reason, period and affected booking, | ✅ active | backend/tests/lostVenueRecovery.integration.test.ts: TC_E10S05_02 TC_E10S05_03 TC_E10S05_04: linked replacement approval publishes and notifies once; original cancellation is expli |
| `TC_E10S05_03` | E10-S05 | Verify that requesting a replacement venue should create a second booking reques | ✅ active | backend/tests/lostVenueRecovery.integration.test.ts: TC_E10S05_02 TC_E10S05_03 TC_E10S05_04: linked replacement approval publishes and notifies once; original cancellation is expli |
| `TC_E10S05_04` | E10-S05 | Verify that the Organiser and registered Attendees should be notified of the ven | ✅ active | backend/tests/eventNotifications.test.ts: TC_E10S05_04: venue change descriptions name the confirmed replacement without changing other messages; backend/tests/lostVenueRecovery.in |

### E11

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_E11S01_01` | E11-S01 | Verify that a user linked to an event should be notified when its status changes | ✅ active | backend/tests/eventNotifications.integration.test.ts: TC_E11S01_01: real status change commits its audit and correct recipients; same status is silent; tests/auth-e2e/notificationI |
| `TC_E11S01_02` | E11-S01 | Verify that effective date, time or venue changes follow the approved recipient  | ✅ active | backend/tests/bookingPrimary.test.ts: TC_E11S01_02 published primary change captures both scoped audiences; self-only audiences emit nothing; backend/tests/bookingSubmission.integr |
| `TC_E11S01_03` | E11-S01 | Verify that a user whose responsibilities are unaffected by a change should not  | ✅ active | backend/tests/bookingSubmission.integration.test.ts: TC_E11S01_02 TC_E11S01_03 published primary switch routes old/new staff and public attendees atomically; tests/e2e/e11.spec.ts: |
| `TC_E11S01_05` | E11-S01 | Verify that a generated notification should appear in the system and also be sen | ⚠️ scaffold | tests/e2e/e11.spec.ts: TC_E11S01_05 - Verify that a generated notification should appear in the system and also be sent to the user |
| `TC_E11S01_06` | E11-S01 | Verify that opening the notification list with several unread notifications shou | ✅ active | backend/tests/notificationInbox.integration.test.ts: TC_E11S01_06 TC_E11S01_07: PostgreSQL inbox ownership, ordering and persistent idempotent read state; backend/tests/staffAssign |
| `TC_E11S01_07` | E11-S01 | Verify that opening an unread notification should mark it as read | ✅ active | backend/tests/notificationInbox.integration.test.ts: TC_E11S01_06 TC_E11S01_07: PostgreSQL inbox ownership, ordering and persistent idempotent read state; backend/tests/notificatio |
| `TC_E11S01_08` | E11-S01 | Verify that an unreachable email provider does not affect the business change or | ⚠️ scaffold | tests/e2e/e11.spec.ts: TC_E11S01_08 - Verify that an unreachable email provider does not affect the business change or the in-app notification |
| `TC_E11S01_09` | E11-S01 | Verify that a rolled-back business transaction publishes no notification | ✅ active | backend/tests/coordinatorNotifications.integration.test.ts: TC_E11S01_09: email-outbox failure rolls back creation, draft submission, reassignment request and each response; backen |
| `TC_E11S01_10` | E11-S01 | Apply the approved role/change recipient matrix | ✅ active | backend/tests/bookingSubmission.integration.test.ts: TC_E06S03_01 TC_E11S01_10: a request notifies only the requested venue\; backend/tests/equipmentNotifications.test.ts: TC_E11S0 |
| `TC_E11S01_11` | E11-S01 | Suppress self-notifications and duplicate recipient links | ✅ active | backend/tests/coordinatorNotifications.integration.test.ts: TC_E03S01_01 TC_E11S01_11: submission and draft submission notify organiser and assigned Coordinator once each with emai |
| `TC_E11S01_12` | E11-S01 | Preserve before/after recipients during cancellation and venue moves | ✅ active | backend/tests/eventNotifications.integration.test.ts: TC_E11S01_12: cancellation notifications retain recipients after registrations and staff are released; backend/tests/eventNoti |
| `TC_E11S01_13` | E11-S01 | Expose missing Venue Staff assignments without an unsafe fallback | ✅ active | backend/tests/eventNotifications.integration.test.ts: TC_E11S01_13: decided_by and unrelated Venue Staff never stand in for assignments; backend/tests/eventNotifications.integratio |
| `TC_E11S01_14` | E11-S01 | Protect attendee notification content and membership boundaries | ✅ active | backend/tests/eventNotifications.integration.test.ts: TC_E11S01_02 TC_E11S01_14: actual date edit notifies active linked users using public attendee content; backend/tests/eventNot |
| `TC_E11S01_15` | E11-S01 | Deduplicate concurrent notification-hook retries | ✅ active | backend/tests/eventNotifications.integration.test.ts: TC_E11S01_15: concurrent retries yield one in-app and email record per recipient |
| `TC_E11S01_16` | E11-S01 | Keep uncommitted notifications invisible and roll back all writes | ✅ active | backend/tests/eventNotifications.integration.test.ts: TC_E11S01_16: uncommitted messages are invisible and rollback leaves no jobs |

### E14

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_E14S02_01` | E14-S02 | Verify that an event status change should be recorded with the actor, action, af | ✅ active | backend/tests/activityLog.integration.test.ts: TC_E14S02_01: a status change is recorded and the assigned Coordinator reads it in the event Activity log; backend/tests/activityLog. |
| `TC_E14S02_02` | E14-S02 | Verify that a denied access attempt should be recorded with the user, target, an | ✅ active | backend/tests/activityLog.integration.test.ts: TC_E14S02_02: a refused event read is recorded with the user, the target and the time; tests/e2e/e14.spec.ts: TC_E14S02_02 - Verify t |
| `TC_E14S02_03` | E14-S02 | [RETIRED — moved to TC_E06S04_05 by T-76] Verify that an approved venue booking  | ⚠️ scaffold | tests/e2e/e14.spec.ts: TC_E14S02_03 - [RETIRED — moved to E06-S04 Scenario 5 by T-76] Verify that an approved venue booking should be recorded with the actor, action, affected reco |
| `TC_E14S02_04` | E14-S02 | Verify that an account deactivation should be recorded in the activity log | ✅ active | backend/tests/activityLog.integration.test.ts: TC_E14S02_04: an account deactivation is recorded with the actor and the time; tests/e2e/e14.spec.ts: TC_E14S02_04 - Verify that an a |
| `TC_E14S02_05` | E14-S02 | Verify that any attempt to edit or delete an activity log entry should be refuse | ✅ active | backend/tests/auditLogImmutability.integration.test.ts: TC_E14S02_05: an activity log entry cannot be edited or deleted, even by the server connection; tests/e2e/e14.spec.ts: TC_E1 |
| `TC_E14S02_06` | E14-S02 | [RETIRED — moved to TC_E06S04_06 by T-76] Verify that a rejected venue booking s | ⚠️ scaffold | tests/e2e/e14.spec.ts: TC_E14S02_06 - [RETIRED — moved to E06-S04 Scenario 5 by T-76] Verify that a rejected venue booking should be recorded with the actor, action, affected recor |
| `TC_E14S02_07` | E14-S02 | [RETIRED — moved to TC_E06S04_07 by T-76] Verify that a released venue booking s | ⚠️ scaffold | tests/e2e/e14.spec.ts: TC_E14S02_07 - [RETIRED — moved to E06-S04 Scenario 5 by T-76] Verify that a released venue booking should be recorded with the actor, action, affected recor |
| `TC_E14S02_08` | E14-S02 | Verify that access-denial entries should not be shown in the event Activity log  | ✅ active | backend/tests/activityLog.integration.test.ts: TC_E14S02_08: access-denial entries and the refused users are not shown in the Coordinator Activity log; tests/e2e/e14.spec.ts: TC_E1 |
| `TC_E14S03_01` | E14-S03 | Organiser reads an edited date/time value in Singapore time | ✅ active | frontend/src/features/events/ActivityLog.singaporeTime.test.tsx: TC_E14S03_01: the Organiser reads an edited start time in Singapore time, not raw UTC |
| `TC_E14S03_02` | E14-S03 | Assigned Coordinator reads existing before/after date/time values in Singapore t | ✅ active | frontend/src/features/events/ActivityLog.singaporeTime.test.tsx: TC_E14S03_02: the assigned Coordinator reads before and after times in Singapore time |
| `TC_E14S03_03` | E14-S03 | Both views convert the calendar date across Singapore midnight | ✅ active | frontend/src/features/events/ActivityLog.singaporeTime.test.tsx: TC_E14S03_03: both views move the calendar date across Singapore midnight, registration dates included |
| `TC_E14S03_04` | E14-S03 | Invalid and missing date/time values retain existing helper and omission behavio | ✅ active | frontend/src/features/events/ActivityLog.singaporeTime.test.tsx: TC_E14S03_04: invalid and missing values keep the formatter\ |
| `TC_E14S03_05` | E14-S03 | Text, status badges and venue hold expiry are preserved | ✅ active | frontend/src/features/events/ActivityLog.singaporeTime.test.tsx: TC_E14S03_05: title text, status changes and hold expiry display as before |
| `TC_E14S03_06` | E14-S03 | Formatting preserves immutable UTC evidence and existing reader access | ✅ active | frontend/src/features/events/ActivityLog.singaporeTime.test.tsx: TC_E14S03_06: formatting changes only what is shown; the entries from the API are read, never rewritten |

### EXX

| TC_ID | Story | Scenario | Status | Where |
| --- | --- | --- | --- | --- |
| `TC_PERF_01` |  | Verify a venue search returns within the 3-second target on a realistic catalogu | ❌ none | — |
| `TC_PERF_02` |  | Verify the venue availability calendar loads within the 3-second target for a bu | ❌ none | — |
| `TC_PERF_03` |  | Verify a registration submission completes within the 3-second target near capac | ❌ none | — |

## Active tests that cover behaviour without an explicit TC reference

The following tests are actively running (not `test.fixme`) but their titles do not embed a TC_ID. They still contribute to Q1/Q2 coverage; they just don't show up in the counts above. Add a TC_XX reference to the test title if you want the auditor to pick it up next run. Blank sections mean every active test in that file already has a TC_ID.

### `backend/tests/arrangementImpact.integration.test.ts`

- the Event capacity E09-S02 reports is the sum of every Confirmed booking, Session by Session

### `backend/tests/arrangementImpact.test.ts`

- attendance raised to exactly the capacity is still sufficient (boundary)
- attendance lowered but still above capacity stays flagged; lowered within capacity does not
- Scenario 1: an attendance change flags a booking whose own headcount is already above capacity
- a Session end-time-only change also counts as a time change
- an Event end-only change is still an Event-wide time change
- a single-session move with too many people lists both reasons once
- arrangements without a known Session move only with the Event
- a Session missing from either snapshot is neither moved nor resized
- governingHeadcount: override, then Session attendance, then unknown
- loadArrangementSnapshot reads live arrangements and converts dates to ISO strings
- loadArrangementSnapshot refuses an unknown Event

### `backend/tests/attendeeCapacity.integration.test.ts`

- E09-S02: Session and Event capacity, Pending requests and manual additions on real PostgreSQL

### `backend/tests/attendeeCapacity.test.ts`

- overCapacity names each full chosen Session, then a full Event, else null
- getEventRegistrations shows capacity per Session and why each Pending request does not fit
- parseAction accepts approve, reject and add, and names what is wrong otherwise
- manageRegistrations rejects a Pending request without a capacity check
- manageRegistrations refuses unknown, decided and unconfirmed cases
- manageRegistrations maps a busy account and a lost unique race, and rethrows other failures
- getEventRegistrations returns the registration period the Organiser set (E09-S03)
- manageRegistrations is for the Event

### `backend/tests/attendeeRegistration.test.ts`

- registrationState: both window ends are inclusive and unset ends are unbounded
- parseSessionIds accepts one to fifty Session ids, de-duplicates them and says why it refuses
- listOpenEvents returns public fields and the signed-in Attendee registration status only
- getRegistrationForm shows Sessions with their own venues, account details and any active registration
- registerForEvent refuses before touching the database when the body or role is wrong
- registerForEvent refuses unconfirmed events and closed or not-yet-open windows (Scenario 4, E09-S03)
- registerForEvent names missing account details and refuses inactive accounts (Scenario 3)
- registerForEvent keeps one active registration and rejects foreign Sessions (Scenario 2)
- registerForEvent maps a lost unique race, a busy account and rethrows other failures
- getRegistrationForm reports full Sessions, a full Event and the waiting-list setting (E09-S02 Scenario 5)
- withdrawRegistration tells nobody when the Event is still full or the row held no place (D82, D88)
- withdrawRegistration answers a missing, repeated or foreign withdrawal without writing (AC 6)
- withdrawRegistration maps a busy account and rethrows other failures
- getRegistrationForm says whether a registration can still be withdrawn, and who to contact (D101, D105)

### `backend/tests/attendeeVisibility.integration.test.ts`

- E01-S03: real PostgreSQL sign-in, published fields, registration isolation and audited planning denial

### `backend/tests/auditLogImmutability.integration.test.ts`

- deleting a draft event keeps its activity log entries and only clears the event link
- deleting a user keeps their activity log entries and only clears the actor

### `backend/tests/bookingPrimary.test.ts`

- primary selection shares origin/authentication HTTP boundary, without submission key

### `backend/tests/bookingState.test.ts`

- each of the 7 booking statuses gets its own BookingState
- every BookingState reports decidability through the shared interface
- an unknown status keeps the old

### `backend/tests/bookingSubmission.integration.test.ts`

- notification failure rolls back request, status, audit and deliveries together
- concurrent direct submissions and retries create only one request and one set of effects
- a direct request and a hold for different events cannot both occupy the same venue
- stale login and ambiguous Session data cannot authorize a new request
- migration preserves legacy rows and enforces optional headcount and confirmed-only primary
- suggested venue replacement keeps rejection, validates links and serializes duplicate switches

### `backend/tests/bookingSubmission.test.ts`

- booking input normalizes instants and optional fields, rejects invalid types/bounds
- authentication/input refusals happen before a transaction
- transactional gates refuse assignment/account/status/session/venue/block/conflicts
- direct retry returns stored request without effects; changed payload is rejected
- expired/missing/non-hold conversion rolls back and reads clock after the hold lock
- write failures roll back; database conflict maps to 409
- request notices target selected venue only; actor excluded; outbox shares transaction
- submission handler enforces method/origin and hides server errors
- replacement input validates rejected provenance and rejects duplicate switches before persistence
- unassigned hold conversion remains forbidden while direct requests conceal event assignment

### `backend/tests/bookingWithdrawal.test.ts`

- withdrawal handler shares POST origin/authentication boundary and needs no submission key

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

### `backend/tests/equipmentReservations.integration.test.ts`

- E07-S04 D37 D45 changing a reservation tops it up to Reserved or reduces it and clears needs review counting its own units as free
- E07-S04 D40 D41 confirmed events refuse every change and other statuses retired equipment and unknown records are refused
- E07-S04 only Technical Support Staff reserve change or release and every refusal is audited with nothing changed
- E07-S04 two reservations made at the same moment cannot commit more units than exist
- E07-S04 no Coordinator notice is sent when the event has no active assigned Coordinator

### `backend/tests/equipmentReservations.test.ts`

- E07-S04 reservation input needs a request or reservation id and a whole quantity of at least 1
- E07-S04 notices write Singapore dates the way the screens do
- E07-S04 event labels and free-quantity sentences read naturally
- E07-S04 reservation writers refuse signed-out callers and other roles before opening a transaction
- E07-S04 invalid input is answered with field errors and no transaction once the caller is Technical Support
- E07-S04 the equipment request route sends reserve changeReservation and releaseReservation to the reservation writers

### `backend/tests/equipmentUnavailability.integration.test.ts`

- E07-S05 D54 only reservations that no longer fit are flagged, and a partial reservation counts
- E07-S05 D53 returning to service clears no flags and sends no notice
- E07-S05 D51 overlapping withdrawals add up but never past the stock, exactly the units in service is accepted
- E07-S05 retired and unknown items are refused, items under maintenance can still be marked, and an ended period cannot be returned
- E07-S05 only Technical Support Staff mark or return and every refusal is audited with nothing changed
- E07-S05 two withdrawals saved at the same moment cannot take out more units than exist
- E07-S05 no notice is sent when the event has no assigned Coordinator or the Coordinator account changed role
- E07-S05 a one-unit withdrawal says 1 unit, and a return that waited while the period was removed is refused

### `backend/tests/equipmentUnavailability.test.ts`

- E07-S05 D51 a withdrawal is whole Singapore days with a trimmed reason, stored as a half-open range
- E07-S05 D51 invalid dates quantities and reasons are refused with field errors
- E07-S05 days and in-service sentences read the way the screens write them
- E07-S05 writers refuse signed-out callers and other roles before opening a transaction, and audit the refusal
- E07-S05 invalid ids and input are answered without a transaction once the caller is Technical Support
- E07-S05 the equipment route sends markUnavailable and returnToService to the writers and lists periods with the item

### `backend/tests/errorPolymorphism.test.ts`

- every AccessError subclass is usable through the shared base
- each AccessError subclass carries its own type-specific field

### `backend/tests/eventAttendance.integration.test.ts`

- E09-S06 authority is rechecked in DB; no cross-Coordinator roster; concurrent retries produce one history/audit row

### `backend/tests/eventAttendance.test.ts`

- E09-S06 only a signed-in active unlocked Coordinator passes attendance authorization
- E09-S06 rejects malformed registration identifiers and non-boolean attendance

### `backend/tests/eventAttendanceRoutes.integration.test.ts`

- E09-S06 live API cookie sessions wire reads, writes, missing id, malformed body and access refusals

### `backend/tests/eventChangePreview.test.ts`

- exactly full is not over-subscribed; one above is (boundary)
- a full Session warns even when the combined Event capacity still holds everyone
- no Confirmed booking means no capacity to compare yet
- loadOverSubscription reads E09-S02 capacity: only Registered places count
- applyArrangementImpact flags each affected arrangement and logs why, once each
- applyArrangementImpact writes nothing when nothing is affected
- a refused edit is refused in preview too, and the savepoint is still rolled back
- an unknown Event or a rejected request is refused before any savepoint
- previewEventChange wraps the preview in its own transaction
- a draft date change sends no generic date notice; an unknown Event is refused
- a capacity-only change notifies the Venue Staff alone, with no date notice

### `backend/tests/eventCompletion.integration.test.ts`

- Completion refuses stale accounts and assignment, wrong statuses, and rolls back audit/status/request changes on outbox failure
- Concurrent manual/automatic evaluation yields one transition; Cancelled wins when committed before evaluation lock
- Evaluation tolerates an event removed after candidate selection

### `backend/tests/eventCompletion.test.ts`

- Completion reads/writes refuse missing, wrong-role, locked/inactive and invalid identifiers before querying
- evaluateCompletions candidate selection query contains LIMIT 50

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

### `backend/tests/eventReadiness.integration.test.ts`

- SCRUM-60: only the assigned Coordinator reads readiness or submits; other callers are refused and audited
- SCRUM-60: an event in Safety Review stays in every read, counts as active, and its arrangements are frozen

### `backend/tests/eventReadiness.test.ts`

- SCRUM-60 D58: a ready event that is not in Planning can be read but not submitted
- SCRUM-60 D64: Safety Review counts as an active event for workload and deactivation (T-52)
- SCRUM-60: a wrong-role submission is refused and audited without opening a transaction; signed-out and blank calls record nothing

### `backend/tests/eventReversion.test.ts`

- revertEventToPlanning refuses unauthenticated and non-coordinator roles
- revertEventToPlanning validates identifier and reason before opening transaction
- revertEventToPlanning refuses unassigned coordinator or non-existent event
- revertEventToPlanning refuses events that are not in Confirmed status
- Scenario 4 / C-132 / T-82: a reverted event in Planning cannot be confirmed directly; it must pass Safety Review again
- revertEventToPlanning falls back to coordinator email if full_name is empty or whitespace
- revertEventToPlanning refuses unassigned events (coordinator_id is null) and draft events

### `backend/tests/eventVisibility.integration.test.ts`

- E01-S02: organisation isolation, colleagues, search, audit and notification delivery

### `backend/tests/eventVisibility.test.ts`

- missing membership and missing event organisation fail closed
- unauthenticated, unlinked, inactive, locked and other roles cannot query organiser data
- a role/organisation denial is audited against the screen, not a specific event
- direct denied access commits actor and attempted event before returning denial
- organiser event detail includes current status date and status history
- SCRUM-37: organiser detail exposes editable fields and full activity log contract
- SCRUM-37: registration setup is listed as editable for the organiser before approval only
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
- E09-S03 - the withdrawal deadline can be cleared, and bad values are refused

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

### `backend/tests/migrationSelection.test.ts`

- the migration selector is optional and accepts one exact available filename
- the migration selector rejects malformed arguments and unknown or path-like filenames
- guarded migration sessions pin and verify the public search path
- the default selection returns every pending file in filename order
- an explicit selection returns only that pending migration
- an explicit selection already in the ledger returns an empty list
- an explicit filename outside the migration directory is rejected
- the runner applies only the selected migration and records only that filename
- guarded migration runner requires an existing ledger and never creates one
- guarded migration runner refuses a selection that is not the next pending migration
- guarded migration runner refuses to start when the advisory lock is held
- guarded migration runner releases the advisory lock when a migration fails
- guarded migration runner rejects an already-applied selected migration
- the runner preserves all-pending behavior without a selector
- an already-applied selected migration reports a no-op without opening a transaction
- an unknown selected filename is rejected before any database query
- a failed migration is rolled back and the error is preserved

### `backend/tests/notificationInbox.integration.test.ts`

- prepared email uses current account email and a provider rejection preserves the inbox
- PR #143: email verification and other eventless notices never enter inbox responses
- PR #143: inbox is capped at the newest 100 event notifications

### `backend/tests/notificationInbox.test.ts`

- rejects anonymous, inactive and locked callers before database access
- rejects cross-origin writes and client supplied identity
- storage errors never disclose database details

### `backend/tests/obsoleteChangeRequests.test.ts`

- No affected Pending requests means no new history (including retries)

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

### `backend/tests/productionMigrationGuard.test.ts`

- production URL guard accepts the configured PostgreSQL target and rejects other targets
- guarded database config ignores URL parameters and forces verified TLS
- precheck accepts only the next pending migration in repository order
- postcheck requires only the selected migration to be newly recorded

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

### `backend/tests/registrationPeriod.integration.test.ts`

- E09-S03: the Organiser sets one Event-level registration period that Attendees are held to

### `backend/tests/repositoryContract.test.ts`

- in-memory EventLifecycleRepository satisfies the shared contract
- PostgresEventLifecycleRepository satisfies the shared contract

### `backend/tests/securityHardening.test.ts`

- currentUser: rejects request with missing session cookie with 401
- currentUser: rejects request with malformed session token with 401
- currentUser: rejects expired or non-existent session with 401
- currentUser: rejects inactive account (isActive = false) with 403
- currentUser: returns user when account is active even if lockedUntil is in the future (does not kill existing session)
- currentUser: rejects account that is both inactive and locked with 403 Account is inactive
- currentUser: returns user when account is active and lock is expired (lockedUntil <= now)
- currentUser: returns user when account is active and never locked (lockedUntil undefined)
- hasInternalSecret: returns false for undefined, empty, or whitespace-only expectedSecret under development and production
- hasInternalSecret: authenticates valid secret via x-internal-secret header
- hasInternalSecret: authenticates valid secret via Bearer token in authorization header
- hasInternalSecret: supports array header values
- hasInternalSecret: rejects when headers are missing or mismatched
- eventsHandler and venuesHandler: reject mutating requests from unauthorized or missing origins with 403
- eventsHandler registrations: rejects mutating request from unauthorized or missing origin with 403 and allows valid origin
- getDatabasePool: evaluates dynamic environment, wraps end idempotently, and drains previous pool on URL change

### `backend/tests/sessions.test.ts`

- increments failed_login_count on wrong password below threshold
- sets locked_until at the fifth consecutive failed attempt
- refuses correct password while the lockout window is still in effect
- auto-unlocks after locked_until has passed and accepts a fresh success
- resets counter and lock on a mid-window correct password
- does not increment counter for an inactive account
- does not increment counter when the account does not exist
- queries candidate password_hash before opening transaction or row-lock

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
- the colleague is locked before the clash check, so two assignments of one person queue up (follow-up to #227)
- a deadlock between two simultaneous assignments is reported as the same clash, not a server error
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
- validateUnavailabilityInput reads a timed, categorised period with a note
- validateUnavailabilityInput leaves the end open when it is missing, null or empty, and the note optional
- validateUnavailabilityInput reads the E05-S04 whole-day form as maintenance
- validateUnavailabilityInput refuses a missing object, bad times, a reversed or zero-length period, an unknown category and a bad note
- block changes require a signed-in Venue Staff member
- listing blocks is limited to the venue catalogue roles
- invalid input is rejected before a transaction opens
- createVenueBlock finds affected bookings on the raw advertised booking range, not the buffered window (T-80)

### `backend/tests/venueBookingDecisions.integration.test.ts`

- a seeded request with no saved assessment reports no advisory result
- only Venue Staff can decide; a refusal is audited and leaves the request pending
- task12: stale Venue Staff identity cannot decide after database account revocation
- a pending request on a Completed or Cancelled event is refused and leaves no trace
- a decided request cannot be decided again
- two Venue Staff deciding the same request at once: one decision wins, the other is refused
- the first approved booking becomes the primary venue; a second Confirmed venue does not
- a rejection leaves the event without a primary venue, and the next approval takes it
- two approvals for one event at the same moment both confirm, with exactly one primary
- the suggested venue must be a different, active venue
- an unknown booking is not found
- Venue Staff see pending requests, soonest first, and each booking with its decision
- Scenario 4: approval over a maintenance block on the venue is blocked and names the block
- Scenario 4: two pending requests that clash after a buffer change cannot both be confirmed; rejecting one frees the other

### `backend/tests/venueBookingDecisions.test.ts`

- decision rechecks the current staff account and rolls back stale or busy authority
- validateDecision accepts an approval as is
- validateDecision needs an object and a known decision
- validateDecision keeps the reason within the limit, at the limit and just above
- validateDecision trims the reason and reads an optional suggested venue
- toBooking shows a decided booking with its reason, suggestion and decider
- a booking with no saved assessment, or a malformed one, reports none
- only Venue Staff reach the decision, the list and the detail; refusals are audited before any read
- an invalid booking id or decision is refused before a transaction opens
- an unknown booking is not found, and the transaction is left without changes
- a booking that is no longer pending cannot be decided, with a reason for each status
- a pending request on a Completed or Cancelled event cannot be decided, and nothing is written
- the suggested venue must differ from the requested one and be active
- an approval makes the booking primary only when its event has no primary yet
- a rejection never makes the booking primary
- a decision locks the event, then the venue, then the booking
- an event with no assigned Coordinator is decided without a notice
- the pending list reads only pending bookings, soonest first
- the booking detail returns one booking
- a rejection without a suggested venue says nothing about an alternative
- a clash names a pending booking or a hold, with or without an event code
- an approval over a maintenance block is blocked and names the block
- an approval over an open-ended unavailability says it lasts until lifted (E05-S06, T-80)
- a rejection is not checked for clashes
- a clash committed by someone else first is refused as
- a booking that disappears before its venue is locked is not found

### `backend/tests/venueBookingRequests.test.ts`

- read reject anonymous, inactive, locked and wrong-role users
- read refuse another Coordinator or unassigned event without loading bookings
- booking-list HTTP handler authenticates, prevents caching, refuses writes and hides internal errors

### `backend/tests/venueBufferConflicts.integration.test.ts`

- buffer conflicts preserve occupancy and confirmed priority, include live holds and exclude history
- new hold and conversion enforce buffered clashes; flags remain visible without private event disclosure
- a retained conflict chain flags every real pair without releasing or flagging the highest-priority booking
- concurrent raw booking writes cannot bypass buffers
- buffer notifications skip missing Coordinators, and clearing flags preserves capacity review

### `backend/tests/venueCalendar.test.ts`

- getVenueCalendar requires a signed-in user
- getVenueCalendar refuses roles other than Venue Staff and Event Coordinators, logging the denial
- getVenueCalendar returns 404 for an unknown venue
- parseCalendarRange lists every Singapore day in an inclusive range
- parseCalendarRange rejects missing, malformed, impossible, reversed and oversized ranges
- an unassigned event is Unavailable to every Coordinator but visible to Venue Staff
- a Conflicting booking shows inside the Blocked period with its unavailability category
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
- validateVenueInput accepts zero and positive whole-minute buffers, rejecting negatives and fractions
- createVenue persists the buffer fields on insert and returns them (E05-S05 Scenario 1)
- createVenue stores zero buffers when none are supplied
- updateVenue returns the updated buffer values (E05-S05 Scenario 1)
- buffer overflow is a 400, other database errors survive, and every failed edit rolls back

### `backend/tests/venueClaimPolicy.integration.test.ts`

- buffered adjacency is accepted while a one-minute buffered overlap is refused
- converting a hold keeps its venue claim active against another request

### `backend/tests/venueHolds.integration.test.ts`

- maintenance blocks notify a live hold\
- two simultaneous holds on one venue and period: exactly one succeeds
- a request that waits on a lock past the expiry is refused; a passed hold cannot be released (review of #245)

### `backend/tests/venueHolds.test.ts`

- a hold holds the venue until it expires; pending and confirmed bookings always do
- every operation refuses signed-out users and the wrong role, and audits the refusal
- ids are checked before any lookup
- validateHoldInput defaults to the event period and a 48-hour expiry
- validateHoldInput reports each bad field, including an expiry outside 1 hour to 14 days
- T-78 (O-29): a hold must lie within the event period
- a hold is refused for another Coordinator\
- Scenario 4: the Coordinator releases a hold and the period is Free again
- expiry is judged at database time read after the locks, not when the request arrived
- an extension locks the venue before the hold, like placing a hold does
- without an injected time the expiry job uses the database clock
- a hold the job has already expired cannot be released
- an extension must be later than now-plus-1-hour, the current expiry and no more than 14 days; an expired hold cannot be extended
- the expiry job with nothing due changes nothing
- the Coordinator lists the event\
- Venue Staff list every live hold, soonest expiry first
- handler: methods, origin and actions
- handler: GET routes to the event or staff list; POST to hold, convert, release or extend
- database buffer-guard refusals become 409 and rollback a hold creation

### `backend/tests/venueSearch.test.ts`

- capacity without layout uses venue maximum and respects separate minimum
- anonymous search is rejected
- inactive coordinator is rejected
- coordinator can load search options
- invalid input identifies fields before venue query

### `backend/tests/venueSuitability.test.ts`

- missing layout is explained; no selected layout uses maximum; absent requirements stay optional
- event assessment uses recorded requirements, ignores client overrides and performs no business writes
- anonymous, wrong-role and inactive users cannot assess venues
- missing identifiers and invalid event requirements are rejected
- missing/draft event and missing/retired venue return not found

### `backend/tests/venueUnavailability.integration.test.ts`

- Scenario 5: removing the end of an unavailability flags bookings far in the future
- Scenario 6: a restored hold whose expiry passed meanwhile becomes Expired, and a replaced booking stays Conflicting
- Scenarios 6 and 7: lifting tells the Coordinator of a replaced booking, which stays Conflicting, and never restores a cancelled one
- #348 review: lifting the first of two unavailabilities over a booking keeps it Conflicting under the second, and lifting the second restores it
- #348 review: lifting the second of two unavailabilities over a booking leaves it Conflicting, and lifting the first restores it
- #348 review: shortening the first of two unavailabilities off a booking hands it to the second
- Scenario 6 with a primary booking: editing over it and lifting restore it Confirmed and still primary

### `backend/tests/venueUnavailability.test.ts`

- Scenarios 2 to 4: creating flags every overlapping booking and hold, returns only the Confirmed event to Planning and tells each Coordinator once
- Scenarios 1 and 5: an open-ended unavailability without a note says
- creating refuses invalid input before a transaction, an overlapping unavailability, and an unknown venue
- a booking that appears after the first read is locked without waiting, and a busy event asks staff to try again
- Scenarios 5 to 7: editing restores bookings it no longer covers, skips replaced ones, flags new ones and keeps history
- editing needs a start, valid input and a free period, and does not hide other restore errors
- E05-S04 shorten still only shortens, keeps the category and note, and now restores what it releases
- Scenarios 6 and 7: lifting keeps the block, restores what it flagged and tells every affected Coordinator once
- #348 review: a booking another unavailability still covers is handed to it, not restored
- E05-S04 remove now lifts and keeps its reply; a lifted or unknown block is not found
- the block list shows an open-ended block with no end and hides lifted ones in its query
- Scenario 7: on request the block list keeps lifted blocks, marked lifted with who lifted them, for Venue Staff only
- Scenario 7: block history returns each create, edit and lift with the earlier and new period, category, note, actor and time
- Scenario 3 support: applyEventStatusChange can skip the generic notices and the audience read

### `backend/tests/venueUnavailabilitySchema.integration.test.ts`

- a block written the pre-0025 way still saves, as maintenance and active
- an unavailability may be open-ended but must have a start, and only a lifted one records who lifted it
- an active unavailability refuses an overlapping booking; a lifted one does not; an open-ended one refuses later dates
- a booking remembers its earlier status and the unavailability that flagged it, for restoring
- the primary booking stays primary while Conflicting and when restored, but no other status may be primary
- unavailability history is append-only, keeps its shape per action, and follows its venue when deleted

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

### `frontend/src/features/attendee/EventRegistration.test.tsx`

- windowText and missingMessage describe the window and missing details in plain words
- Discover lists open events with the registration state and links to each event
- Discover shows an empty state and a retryable error
- the event page marks a registered Attendee’s Sessions and explains a closed or unopened window
- choosing no Session blocks registration without calling the server
- every blank account detail reads Missing, and a Session without a venue says so
- the server’s missing-details refusal is shown when the form had none missing
- an existing registration, a closed window and other refusals are shown before or after submitting
- leaving the form while registering drops the late reply
- a full event with its waiting list off offers only a request for review, on the event page too
- a Pending request is described as waiting for the organiser, on the event page and the form
- a waitlisted registration is described consistently on the event page and form
- an approved place shows the deadline, asks to confirm, then reads as not registered (D100, D101, D102)
- a Pending request can be withdrawn until the event starts, with its own wording (D88, D106)
- a refused withdrawal shows the server sentence in the panel, and Cancel goes back
- withdrawing works under StrictMode, and leaving the page drops a late reply

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

### `frontend/src/features/coordinator/EventAttendance.test.tsx`

- attendance empty state and server read refusal/retry
- server write refusal is visible without changing the attendee
- navigating during save aborts late response and hides the old success
- aborted save rejection on navigation is ignored
- unexpected save response failure is recoverable and shows an error

### `frontend/src/features/coordinator/EventReadiness.test.tsx`

- SCRUM-60: an event in Safety Review, or not yet in Planning, offers nothing to submit
- SCRUM-60: another Coordinator is refused with the server sentence, and the old confirm link opens the readiness page
- SCRUM-60: a submission that fails for another reason shows that sentence and keeps the page
- SCRUM-60: leaving the page while a submission is in flight drops its answer
- SCRUM-60: a late answer for the previous event never replaces the current one
- SCRUM-60: the event page links to readiness in Planning and Safety Review, and never shows a raw id as its eyebrow

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

### `frontend/src/features/coordinator/VenueConflictFlag.test.tsx`

- no flag when no booking is Conflicting
- a refused booking list shows no flag and no error
- an event past the stages where a venue can be lost does not ask for its bookings

### `frontend/src/features/coordinator/VenueHolds.test.tsx`

- the card lists live and expired holds with their expiry, and links to venue search
- with no holds the card explains the 48-hour hold; an event that cannot hold says so and has no link
- a failed or malformed load shows an error with a retry, and the rest of the page still renders
- Scenario 4: release asks first; Keep cancels, Release hold releases
- a refused action shows the server sentence and leaves the list as it was
- a chosen expiry is checked against 1 hour to 14 days and sent when valid
- a changed period outside the event is caught before sending
- a refused release shows the server sentence
- server field errors land next to their fields
- an event that can no longer hold venues shows why, and a failed load offers a retry
- validateHold and expiryProblem enforce the period, the event window and the expiry limits

### `frontend/src/features/events/ActivityLog.test.tsx`

- an event with no recorded activity says so
- a change is described in words for status changes, edits and entries without a field
- an entry whose actor account was removed still shows, without a name
- stored actions are shown in plain words, and other actions as written
- a status change with no previous status shows only the new status
- a booking decision missing its venue or earlier status is still described
- booking entries show hold expiry or a generic booking label without internal IDs

### `frontend/src/features/events/ActivityReleaseReference.test.tsx`

- same-venue releases identify each booking when actor and time coincide
- event and legacy hold entries do not invent a booking reference

### `frontend/src/features/events/EventCompletion.test.tsx`

- Non-Confirmed states and missing event code are displayed without an action
- Loading, refused read, and retry
- Server refusal stays visible and busy submission prevents duplicate clicks
- A late submission response cannot overwrite a different event route

### `frontend/src/features/events/EventDetails.test.tsx`

- renders
- does not render
- does not render
- clicking
- validation requires non-empty reason and blocks submission
- submitting with valid reason calls POST /api/events?revert=1&id=... and hands the success message to the caller
- displays error message when API call fails

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
- registration date inputs describe the validation error after an invalid save

### `frontend/src/features/events/RefusedEdit.navigation.test.tsx`

- Editing a refused draft clears its stale recovery link
- The Coordinator edit form never offers the Organiser-only recovery

### `frontend/src/features/events/changeRequestPrefill.test.ts`

- Field links encode the Event and select only known fields once
- No offer without an explicit server link or a restricted edit
- Every restricted field keeps its typed proposed value; unrelated draft keys are ignored
- Invalid dates do not break the form

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

### `frontend/src/features/organiser/ConfirmedArrangements.test.tsx`

- SCRUM-60 fix (a) - equipment recorded as none required reads

### `frontend/src/features/organiser/EventRegistrations.test.tsx`

- the server refusing an approval is shown and the list is left as it was
- declining asks once more, can be kept, and then declines the request
- a failed decline keeps the confirm step open
- an unconfirmed event, an empty list and a load failure are each explained
- leaving the page while an approval is saving drops the late reply
- empty lists say so, and a closed waiting list says it is off
- a colleague

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

### `frontend/src/features/organiser/RegistrationPeriod.test.tsx`

- periodPatch sends only what changed, both window ends together, and names bad dates
- bad dates are caught before sending, and server refusals are shown
- an event not taking registrations points to a change request; a cancelled one is read-only
- a load failure is explained, and leaving mid-save drops the late reply
- saving only the waiting list keeps the stored window as current

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

### `frontend/src/features/support/EquipmentReservations.test.tsx`

- E07-S04 - changing a reservation starts at the reserved quantity, shows Needs review and saves the new quantity
- E07-S04 - saving an unchanged reservation says there is nothing to save
- E07-S04 - the Coordinator sees each line state and no reservation actions
- E07-S04 - confirmed events offer no reservation actions and cancelled events offer release only
- E07-S04 - the reserve form explains why a line cannot be reserved
- E07-S04 - with nothing free the form warns before the round trip
- E07-S04 - the reserve form works inside StrictMode and keeps the reply
- E07-S04 - a late answer for the previous event never replaces the current reserve form
- E07-S04 - wording helpers match the API sentences and links
- E07-S04 - an event with no code or recorded dates still reads correctly
- E07-S04 - the reserve form shows the API refusal when the line cannot be loaded
- E07-S04 - a second submit while saving sends nothing more, and leaving mid-save drops the late reply
- E07-S04 - retired lines, single units and the read-only Coordinator view are worded for each case
- E07-S04 - a Coordinator who opens the reserve form is told only Technical Support can reserve

### `frontend/src/features/support/EquipmentUnavailability.test.tsx`

- E07-S05 D51 the form checks dates, units and reason before sending anything
- E07-S05 D51 the units default to those in service for the chosen dates until the user types a number
- E07-S05 a server refusal is shown word for word, next to its field
- E07-S05 Coordinators see the periods without actions and are refused the form; retired items have no actions
- E07-S05 a refused return is shown in the panel, and Cancel closes it
- E07-S05 the saved message says which Coordinators were told when some events have none
- E07-S05 the helpers count the peak of overlapping periods and write dates the way the screens do
- E07-S05 one unit reads
- E07-S05 a second submit while saving sends nothing more, and a reply after leaving the page is ignored
- E07-S05 a second confirm while returning sends nothing more, and a reply after leaving the page is ignored
- E07-S05 the form page offers a retry when the item cannot be loaded, and failed saves keep the form

### `frontend/src/features/support/TechnicianStaffing.test.tsx`

- the queue shows requests needing a technician first, with filters for staffed and all
- an empty queue and an empty filter each explain themselves; a failed load can be retried
- a removal the server refuses keeps the panel open with its sentence
- an event that can no longer be staffed explains why, and a request with everyone on it says so
- a request that cannot be loaded shows the refusal with a way back
- a malformed reply is a failed load, not a crash
- an empty schedule explains how assignments arrive; a schedule with only past work says nothing is upcoming
- event names avoid repeating a code the title already starts with

### `frontend/src/features/venue/BookingRequests.test.tsx`

- Venue Staff see pending booking requests, each linking to its request
- an empty queue says nothing is waiting
- a refused queue shows the server message
- a pending request shows its details and a way to decide
- a suitable request, or one with no saved assessment, shows no advisory section
- a rejected request shows who decided, the reason and the suggested venue
- a rejected request with no reason or suggestion on record says so
- a confirmed request shows its decision without a reason, and missing facts read as not recorded
- an unknown request shows the server message and a way back
- a late answer for the previous request never replaces the current one
- the server\
- a request someone else has just decided shows the server refusal, and cancelling clears it
- a decision on an event with no Coordinator says nobody was notified
- the approval message falls back when the Coordinator name is missing
- when the venue list cannot load, the reason can still be sent without a suggestion
- a request that is no longer pending has nothing to decide
- E05-S06: a Conflicting booking says the venue was marked unavailable and offers no decision
- an unknown request on the decision page shows the server message

### `frontend/src/features/venue/LostVenueRecovery.test.tsx`

- empty recovery uses shared state

### `frontend/src/features/venue/TentativeHolds.test.tsx`

- with nothing held the page says so; a failed load offers a retry
- Scenario 8: a later expiry is saved, confirmed and the list reloads
- an earlier or too-distant expiry is refused before sending; Cancel closes the form
- a server refusal or field error is shown on the hold
- validateExtension checks a missing value, the 1-hour floor and the current expiry

### `frontend/src/features/venue/VenueBlockout.test.tsx`

- the end needs both a date and a time, and must be after the start, before any POST is sent
- server field errors show next to their fields, and other failures show the server message
- an overlap with another unavailability is refused and names that unavailability
- removing the end of an unavailability makes it open-ended, and Cancel closes the edit form (Scenario 5)
- an edit that would overlap another unavailability is refused and names it
- lifting goes through ConfirmPanel, lists the restored bookings and reloads the list (Scenario 6)
- an open-ended unavailability lists as until lifted, edits with an empty end, and lifts with nothing to restore (T-80)
- a lift in flight is sent only once, even if the confirmation is submitted again
- a failed lift shows the server message and closes the confirmation
- a lifted row with no recorded lifter, a block with no history yet, and an open-ended entry with no category read clearly
- a history that fails to load offers Try again
- loading state renders while blocks are in flight
- client validation refuses an empty form before any POST is sent

### `frontend/src/features/venue/VenueBookingForm.test.tsx`

- network retry retains the key; changing the payload rotates it
- blank optional values use event attendance; suitable result has no failure list
- invalid dates, reversed/outside periods, purpose and headcount prevent submission
- server field errors and conflict messages remain visible and recoverable
- submission disables controls while waiting and cannot double submit

### `frontend/src/features/venue/VenueBookingRequests.test.tsx`

- empty list, error retry and missing route parameter use shared states
- refused access shows no private event details
- route change ignores a late response for the previous event
- suggested venue switch automatically reloads the Pending replacement and retains rejected history
- existing replacement or ineligible event suppresses the suggested-venue action
- legacy rejected booking prefills blank metadata and uses current event bounds
- a withdrawal in flight disables controls and does not submit twice
- E05-S06: an open-ended unavailability reads until lifted, and missing details still say what is needed

### `frontend/src/features/venue/VenueCalendar.navigation.test.tsx`

- changing the calendar route loads the new venue
- coordinators can reach the calendar from their dashboard

### `frontend/src/features/venue/VenueCalendar.test.tsx`

- loads the current month for the first venue
- labels free, tentative, confirmed and blocked entries distinctly
- shows a maintenance block with its reason and never as a booking
- E05-S06 Scenario 1: a Blocked period shows its reason category before the note
- E05-S06 Scenario 2: a Conflicting booking stays visible inside the Blocked period with its own label and the reason
- E05-S06: the legend lists all six states, Conflicting included
- E05-S06 Scenario 1 (T-80): an open-ended block, clipped by the server to the range, shows as Blocked on every day
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
- buffer segments and review flags are labelled without changing booking state

### `frontend/src/features/venue/VenueForm.navigation.test.tsx`

- venue A\

### `frontend/src/features/venue/VenueSearch.navigation.test.tsx`

- event-scoped results offer Hold this venue only for an available venue

### `frontend/src/features/venue/VenueSuitability.test.tsx`

- shows every failing criterion, comparisons and advisory guidance
- suitable result has no failure section or empty notes alert
- request form is available only for Approved or Planning assessments
- shows server error and retry recovers
- route change discards a late result for the previous venue

### `frontend/src/features/venue/blocksApi.test.ts`

- every reason category has a label (Scenario 1)
- createUnavailability sends the timed body and returns the affected events (Scenarios 1 and 2)
- an empty end is sent as null so the venue stays unavailable until lifted (Scenario 5)
- createUnavailability keeps field errors and replaces a network failure with a service message
- editUnavailability sends edit_block and returns flagged and restored events (Scenarios 5 and 6)
- liftUnavailability sends lift_block and returns the restored events (Scenario 6)
- getBlockHistory reads one block history and refuses safely (Scenario 7)
- listBlocks asks for lifted blocks only when requested (Scenario 7)
- listBlocks passes a refusal through and reads a reply without a list as empty; overlappingBlocks does the same

### `frontend/src/features/venue/calendarDates.test.ts`

- month bounds cover leap and non-leap Februaries
- shifting months crosses year boundaries
- Singapore day keys and times use UTC+8 regardless of browser timezone
- day counts are inclusive and invalid dates are rejected

### `frontend/src/shared/shared.test.tsx`

- shows Singapore time
- decides
- says when a date is missing
- writes stored statuses in sentence case, and Safety Review as design.md section 7 names it
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

### `tests/auth-e2e/changeRequests.spec.ts`

- Dependency regression: real arrangement approval stays unapplied while E10-S02 is absent

### `tests/auth-e2e/loginRecovery.spec.ts`

- invalid and expired reset links guide the user back to recovery

### `tests/e2e/admin.spec.ts`

- admin home shows system-wide counts
- user management filters by role
- role assignment saves a role change
- audit log viewer filters by free-text query

### `tests/e2e/attendee-events.spec.ts`

- empty registrations and expired sessions have useful states

### `tests/e2e/attendee-registration.spec.ts`

- feedback requires a rating

### `tests/e2e/client-events.spec.ts`

- expired sessions prompt for sign-in without exposing cached events

### `tests/e2e/coordinator.spec.ts`

- coordinator dashboard shows live workload counts inside the shared header
- review queue filters assigned events by status
- request detail shows the assigned Coordinator and request details

### `tests/e2e/deactivation.spec.ts`

- explicit confirmation is required and success redirects to signed-out login
- blocked coordinator stays on profile and sees assignments requiring reassignment

### `tests/e2e/e03.spec.ts`

- E03-S07 Scenario 2 - the assigned Coordinator edits an approved event

### `tests/e2e/eventReadiness.spec.ts`

- SCRUM-60 - the old confirm link opens the readiness page, which offers no direct confirmation

### `tests/e2e/landing.spec.ts`

- landing page renders at / and links to login and register
- login page posts to /api/auth/session and surfaces server errors without leaking credentials
- login page redirects to the role home on success
- login page sends an Event Coordinator to the Coordinator workspace

### `tests/e2e/layout-and-focus.spec.ts`

- keyboard focus outline is visible against the page (WCAG 3:1)
- decision page /coordinator/events/EVT-C01/decide is one centred column
- register page /attendee/register/EVT-TECH is one centred column
- fields side by side keep their controls level when only one has a hint

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
- technician staffing lists support requests needing a technician
- legacy conflict route opens live equipment availability

### `tests/e2e/technicalSupport.spec.ts`

- E07-S06 the request form refuses a blank, too-long or reversed request before sending

### `tests/e2e/venue-booking-requests.spec.ts`

- booking list shows an empty state and a safe refusal without event details

### `tests/e2e/venue-booking-submission.spec.ts`

- conflict refusal keeps form available; invalid period prevents a POST
- Confirmed event assessment provides no booking submission controls
- rejected booking switches through a prefilled new Pending request

### `tests/e2e/venue-search.spec.ts`

- search access denial shows safe error and no criteria form
- venue search shows suitable results, field errors and empty states

### `tests/e2e/venue-suitability.spec.ts`

- unauthorised assessment displays a safe error

### `tests/e2e/venue.spec.ts`

- venue dashboard shows pending and confirmed counts
- venue inventory lists every venue with capacity
- inventory search re-fetches venues filtered by the query
- pressing Enter in the layout inputs adds the layout instead of submitting the form
- availability calendar loads the selected venue from the API
- Venue Staff approve a pending booking request

### `tests/e2e/venueHolds.spec.ts`

- the hold list and form fit the screen without sideways scrolling

### `tests/e2e/verify.spec.ts`

- verify success renders confirmation and sign-in link
- verify expired token surfaces expired copy and register link
- verify already-verified token shows the idempotent message
- missing token bypasses the API and shows invalid

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

### `tests/redis/transport.test.ts`

- real Redis preserves legacy bytes while versioned pointers survive peek, defer and acknowledgement
- real Redis Lua enforces the 1000-pointer capacity without deleting retained contents

## Interpretation for the IS212 rubric

1. Every TC_ID in the workbook is at least scaffolded, so requirement traceability is intact. A reviewer can click into any story and find either an active test or a `test.fixme` placeholder waiting for implementation.

2. Scaffold coverage is high because Release 1 is mid-sprint. As features ship, the corresponding `test.fixme` blocks convert to `test(...)` and this audit's Automated column climbs. No new test case is being invented at implementation time; the traceability was written up front from the workbook.

3. The three cases with No test yet are the workbook's cross-cutting rows (performance targets, Definition-of-Done checklists). They do not have a dedicated feature and will not become individual `test()` blocks; their coverage lives inline in the relevant story tests.
