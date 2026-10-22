# Venue claim rule B canonical reconciliation

Reconcile E06-S06 / SCRUM-50 with the Product Owner's 22 October approval of first accepted active claim semantics, preserving customer provenance and historical evidence. This branch is based on main `56d7117`; it is a focused documentation proposal, not story completion or a production authorization.

## Scope and decisions

- T-100 records a PO interpretation, not a new customer quote. The first successfully accepted hold/request claims its buffered venue slot; later overlapping claims are refused while active. Approval rechecks current availability, concurrency and buffers.
- Pending, Confirmed and unexpired Tentative bookings are active claims. Conversion preserves the same claim. C-109 retains and flags conflicts caused by later buffer edits; explicit rejection or authorized withdrawal/replanning resolves them. There is no FIFO queue or first-approval winner.
- Reconcile only E06-S06 in both backlog views, its seven existing cases, the shared contract and matching scaffold wording. Preserve IDs, estimates, sprint/owner fields, Done flags and E06-S03 multi-venue semantics.
- Add CAA 221026 BDR/backlog/testcase exports using existing generators; refresh the compatibility testcase workbook and generated inventory. Older dated exports and all existing T-65 records remain unchanged. The ADR export is unchanged.
- The earlier open choice in #338 is superseded prospectively. #308's first-approval proposal and migration 0021 are not adopted; applied migration 0016 remains untouched.

## Verification and review

- Payload audit found identical E06-S06 criteria/checklists between views, unchanged original planning metadata, 376 unique case IDs and exactly seven changed testcase rows. The pre-existing product Sprint field remains blank while Release 1 remains Sprint 3.
- Exported backlog counts are 64 Release 1 and 84 product stories. The compatibility testcase workbook equals the generated CAA 221026 workbook byte-for-byte. All E06-S06 scaffold fixme states remain unchanged; inventory is not a test pass rate.
- Initial independent review found the docs consistent but rejected the paired runtime concurrency proof for missing loser-specific side-effect assertions and distinct assigned Coordinators. The test branch corrected both and passed a fresh run. Independent technical delta rereview returned APPROVE with high confidence and no blockers; this is not human review or full story acceptance. A broader rereview attempt timed out without a verdict and was not counted as approval.
- Fresh payload audit at 17:39 Singapore time reconfirmed the parity findings. Full original repository checks at 17:40 passed all 158 tooling tests and validated 439 existing run records; see `docs/testing/runs/20261022-174045-bryanseah234-tooling.md`. Only the installed tooling-interpreter locator was bound in memory; no check was skipped or suppressed.
- No human T-93 run, human code/test-case review, main adoption, Jira transition or migration apply is claimed.

## Next

Publish a draft PR to main after the already-passing final record checks. The paired executable proof is `test/SCRUM-50-venue-claim-rule-b-20261022`, stacked on #334; it retains its older CAA 161026 catalogue until canonical adoption. Final record validation passed with 440 records and 158 tooling tests; publication and hosted checks are not yet claimed here.

## Learnings

Product-policy agreement, valid real-service proof, human acceptance and reviewed-main adoption are separate gates. A conflicting active fixture must arise through a legitimate later buffer edit, never by disabling the booking guards.
