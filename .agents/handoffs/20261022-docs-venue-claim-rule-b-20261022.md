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

Draft PR [#339](https://github.com/hongyime/sgConnectSphere2026/pull/339) is published to main, initially at `6af29e24bd64cfdfae7a9441180b0ef9d26ed06e`. The paired executable proof is draft [#340](https://github.com/hongyime/sgConnectSphere2026/pull/340), initially at `3078cd8514540fe82bd53ba8011a2b10cb3949af`, stacked on #334; it retains its older CAA 161026 catalogue until canonical adoption. Final local record validation passed with 440 records and 158 tooling tests. Hosted checks were still running at publication; refresh their exact current-head results rather than treating this note as a passing CI receipt.

Fresh standalone [PostPlan version 1](https://epv7ptn4c6i9.postplan.dev/v/1) was uploaded and publicly read back. Its SHA-256 matches the uploaded content hash `4b4b3e3da6e5593b6dced531e048a35dfa84ecd7c4822db02abcc19d0faa583f`. Structural checks and independent visual review passed on fresh phone/desktop captures; this derivative review is not manual T-93 evidence. The older #338 report and hosted recovery snapshot remain unchanged. The first docs push failed in GitHub's remote pack storage; a normal retry succeeded without history rewriting.

Next: human review of criteria/test validity, current hosted checks, canonical adoption and later runtime traceability reconciliation. Keep both PRs draft and unmerged until their separate gates are met. No Jira status, story completion or production authorization follows from publication.

## Learnings

Product-policy agreement, valid real-service proof, human acceptance and reviewed-main adoption are separate gates. A conflicting active fixture must arise through a legitimate later buffer edit, never by disabling the booking guards.

## Final consistency diagnosis: C-109 review flags

Confirmed on 22 October before the correction: the revised TC_E06S06_06 step and matching scaffold incorrectly required both retained requests to carry `buffer_conflict`; TC_E06S06_01 scaffold wording similarly implied both flags. Existing `backend/src/modules/venueBooking/catalogue.ts:369` gives Confirmed priority over Pending over live Tentative, then flags the later equal-status booking, retaining both and notifying affected Coordinators. Existing `backend/tests/venueBufferConflicts.integration.test.ts:182` explicitly expects Pending true / Confirmed false; the chain case at line 278 preserves the highest-priority booking unflagged. These existing tests passed in the paired 11/11 real-database buffer/search run. The draft wording confused retention of both claims with a requirement to set both reason-specific flags.

Corrected only the two case/scaffold descriptions to preserve existing flag priority while still refusing both approvals until explicit resolution. Regenerated testcase exports and compatibility input; the coverage generator produced no inventory content diff. Fresh payload audit verified exactly TC_E06S06_01 and TC_E06S06_06 changed from prior publication `137a68b`, with all 376 IDs/planning fields preserved; relative to main, only the original seven E06-S06 rows differ. Both workbooks have SHA-256 `3eb8d5d812a0992c2490c5ac3253fe4faeb142a5913911059e0469896b47b992`. Independent bounded delta review returned APPROVE with no blockers after comparing existing priority code, tests and changed payload fields. Full original repository checks passed 158 tooling tests at 18:46 Singapore time, validating 440 existing records. Fresh record: `docs/testing/runs/20261022-184630-bryanseah234-tooling.md`.

No runtime change, new flag policy, requirement weakening or new passing canonical-case claim is introduced. The prior payload record remains immutable and describes its earlier snapshot. The published PostPlan's general retain/flag description remains applicable; its version 1 is not rewritten. Human acceptance and current-head hosted checks remain pending rather than inferred from earlier results.
