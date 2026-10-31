# E11-S01 current-flow evidence audit - 31 October 2026

E11-S01 / SCRUM-75 and testing subtask SCRUM-227. Source tree: main `4da52a4`
plus this audit/fix diff. Canonical requirements remain in
[the release backlog](../backlog/release-1/E11-notifications-reminders.md) and
[E11 cases](cases/E11.md); T-64 and ADR-006 govern routing/delivery. This audit
updates delivery evidence, not scope, estimates or Jira states.

## Result

Merged E09/E10 callers already use the transactional notification writer.
One real content-boundary bug was reproduced: organiser approval, rejection and
manual addition used the private Event title in attendee notices. Those three
notices now use the publication name. With no publication they generate no
attendee notice, matching the shared recipient policy; no private-title fallback
is allowed. The formatter requires an explicit non-null public name rather
than reading a nullable property itself. Registration/audit writes retain their existing behaviour and
transaction. As noted in review, manual-add acknowledgement currently confirms
the registration without separately warning the Organiser that no attendee
notice was generated when a publication is absent. This is a documented UX
limitation, not a new notice exception or a UI change in this fix. No Done E09 story is reopened by this E11 integration follow-up.

Fresh automated execution: [session record](runs/20261031-174600-jininggg-full-regression.md) (111 combined backend checks,
646 backend units/one existing skip, 25 controlled dispatcher checks, 16 inbox checks).
Changed organiser module coverage is 100% across all four metrics.

## Acceptance-to-evidence matrix

| Case | Current source/evidence | What is established / remaining |
| --- | --- | --- |
| TC_E11S01_01 | [status writer](../../backend/src/modules/eventLifecycle/repository.ts), [real recipient tests](../../backend/tests/eventNotifications.integration.test.ts), completion/readiness integration suites | Business status changes and targeted durable notices; this audit does not claim a new human status walkthrough. |
| TC_E11S01_02 | [new E09-to-E10 flow](../../backend/tests/e11CurrentFlows.integration.test.ts#L56), [date request application](../../backend/tests/changeRequests.integration.test.ts), [primary venue](../../backend/tests/bookingPrimary.integration.test.ts), lost-venue tests | Real registration/waitlist membership receives applied date changes once; existing primary/replacement tests cover effective venue changes. Pending decisions are not treated as public venue changes. |
| TC_E11S01_03 | Same cross-flow test; existing recipient/equipment suites | Acting Coordinator, unrelated and withdrawn Attendees are excluded in the new real-service chain. Existing inactive/ended-assignment checks retain their original scope. |
| TC_E11S01_05 | Durable outbox assertions; [controlled dispatcher tests](../../tests/notifications/postgres.test.ts) | Queued/simulated delivery is automated evidence only. **Actual registered-mailbox receipt is still outstanding**, with the deploy owner. |
| TC_E11S01_06 | [inbox integration](../../backend/tests/notificationInbox.integration.test.ts); historical human records below | Ownership, ordering and unread state tested; no new human screenshots fabricated. |
| TC_E11S01_07 | Same inbox suite; 18 October focused bell/read retest | Idempotent persistent read state and the recorded human live-bell fix; do not repeat unchanged evidence just to replace provenance. |
| TC_E11S01_08 | Inbox provider-rejection test and controlled dispatcher/provider tests | Simulated rejection preserves the in-app notice; bounded retry/uncertain handling tested separately. The exact human booking/unreachable-provider sequence was not executed here. Canonical case still says SMTP/failed, whereas the adapter uses an API and ambiguous transport outcomes can be uncertain; align that execution wording with ADR-006 before claiming the exact sequence, without inventing a new delivery guarantee. |
| TC_E11S01_09 | [organiser outbox-failure regression](../../backend/tests/e11CurrentFlows.integration.test.ts#L114), E10 request/cancellation/recovery rollback tests, dispatcher PostgreSQL rollback test | Business state, audit, notice and delivery roll back together; committed delivery remains separate from provider outcomes. |
| TC_E11S01_10 | [shared routing matrix](../../backend/src/modules/eventNotifications/service.ts), [real waitlist release](../../backend/tests/e11CurrentFlows.integration.test.ts#L80), E09 registration integration | Release after real withdrawal notifies eligible waiting members. Join/claim API behaviours are retained from E09; no automatic promotion inferred. |
| TC_E11S01_11 | New cross-flow/repeated-withdrawal tests, shared recipient suites | One notice per logical change/user; actor exclusion and repeat withdrawal generate no duplicates. Explicit registration confirmations are distinct from routine self-notification suppression. |
| TC_E11S01_12 | Cancellation, primary-venue and lost-venue integration tests | Pre-release recipients and old/new affected staff preserved; these are database tests, not new deployed recipient observations. |
| TC_E11S01_13 | [default assignment resolver](../../backend/src/modules/eventNotifications/service.ts), recipient integration tests | Missing assignments remain explicit with no staff-wide fallback. **Production roster verification waits on SCRUM-195.** |
| TC_E11S01_14 | [organiser notice regressions](../../backend/tests/e11CurrentFlows.integration.test.ts#L34), published/missing-publication cases, new date membership chain | Private planning titles no longer enter the three organiser-managed notices; no-publication paths suppress them; published public content reaches current registered/waitlisted members only. |

## Producer reconciliation

| Flow | Current caller | Evidence boundary |
| --- | --- | --- |
| E09 registration/claim | `attendeeRegistration/service.ts: registerForEvent` | Public event selection, confirmation/outbox; real registration/claim integration tests. |
| E09 approval/rejection/manual add | `attendeeRegistration/organiser.ts: manageRegistrations`, `decide`, `addAttendee` | Privacy fix, reference data and durable outbox in the same transaction. New real tests exercise all three actual actions. |
| E09 place released | `attendeeRegistration/service.ts: withdrawRegistration` | Real join/withdraw chain and current eligible membership; no new notices from waiting-list withdrawal alone. |
| E10 approved Event changes | `changeManagement/requests.ts: decideChangeRequest` and `eventNotifications/informationChange.ts` | Shared preview/revision, atomic application and one Organiser decision plus responsible staff/public notices. Individual Session editing remains owning-story work. |
| E10 cancellation/completion | `eventLifecycle/cancellation.ts`, `completion.ts`, status repository | Existing real integration suites retained and run in this audit. |
| E10 lost venue/replacement | `venueBooking/lostVenueRecovery.ts`, booking primary/decision callers | Effective confirmed replacement/publication and recipient timing covered by owning integration tests. |

## Retained human evidence

- [18 October focused UI retest](runs/20261018-192153-jininggg-frontend-e2e.md): visible details, live unread count and truthful self-action wording; preserve its expressly untested boundaries.
- [24 October publication run](runs/20261024-212800-jininggg-frontend-e2e.md).
- [24 October attendee notice/actor silence](runs/20261024-220741-jininggg-frontend-e2e.md): two human screenshots, not all-role or provider evidence.
- Earlier failed observations remain immutable; their later focused fixes do not rewrite them into PASS.

## Still required before whole-story Done

1. Merge/review this new content-boundary fix and its tests; link the fresh automated session record.
2. Bryan approves the actual production venue/staff pairs under [SCRUM-195](https://theprawnworkspace.atlassian.net/browse/SCRUM-195); the designated deploy owner provisions them, then the story owner verifies behaviour. This audit performs no production reads/writes and does not claim the load happened.
3. Coordinate a controlled actual-mailbox receipt run with the deploy owner for TC_E11S01_05 and the appropriate provider-failure evidence for TC_08. No email enablement, provider/config changes or live sends are authorized by this audit.
4. Complete only genuinely missing human E09/E10 notification observations on the final integrated tree; retain existing valid screenshots. Obtain explicit PO/delegate AC-to-evidence acceptance. SCRUM-75 stays In Progress; SCRUM-227's In Review status is not full-story acceptance.

PR #391 review follow-up: [clean reviewed-head rerun](runs/20261031-185939-jininggg-backend-db.md)
and [post-refactor verification](runs/20261031-190221-jininggg-full-regression.md) preserve the exact
source provenance without rewriting the original run.
