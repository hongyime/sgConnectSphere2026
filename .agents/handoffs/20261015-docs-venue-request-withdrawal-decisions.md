# E06-S03 withdrawal decision recording

Record the agreed E06-S03 withdrawal and replacement clarifications after merged #274, without implementing them or changing Jira/database state. Work began 15 October on docs/venue-request-withdrawal-decisions from main 7bfec65; validation finished after midnight on 16 October.

## Decisions and provenance

T-94 records the Product Owner clarification relayed by the story owner: Pending-only withdrawal, separate Confirmed cancellation, and future cancelled-primary clearing/prompting the Organiser without automatic promotion. The existing Coordinator primary-selection permission is not changed by this docs task.

T-95 records E06-S04 owner agreement on Released, venue-before-booking locks, status recheck/409 and booking-specific audit. The story owner confirmed requested-venue staff notifications. E06-S03 owns Pending withdrawal; E06-S05 retains Tentative release/expiry, with no hold resurrection after conversion/withdrawal.

T-96 records story-owner confirmation that Released replacements permit another fresh attempt; Rejected replacements still consume the predecessor's slot. Follow the immediately preceding rejection's own suggestion with no fixed two-attempt maximum. A rejection without a suggestion ends that chain, not the ordinary venue-search journey. The future index must exclude Released only, not all inactive statuses.

## Work completed

BDR decisions/change log/addendum, release/product E06-S03, booking contract, schema follow-up note and testing guide aligned. Clarified TC_E06S03_08; added _09 to _13 for scope/access, races, staff notices/atomicity, withdrawal retry and rejection chains. Generated CAA 151026 backlog/test workbooks and BDR Word export; refreshed legacy testcase compatibility workbook and regenerated tc-coverage. No estimates, sprint allocation, Session scope or migration 0019 edits. No migration number reserved.

## Verification and limits

20261016-000040-jininggg-tooling.md records 359-case export/canonical consistency, reference/inventory checks and whitespace pass. New cases are marked none, not implemented or executed. Required repository check retains existing Windows tooling 3 failures/11 errors among 128 tests. No application test run is claimed. No commits, pushes, PR creation, Jira edits, database changes or teammate messages authorised/performed in this task.

## Next step

Review these docs and coordinate the new replacement-index predicate and withdrawal notification routing with E06-S04 before implementation. Never rewrite applied 0019; add a separately coordinated migration. Implement Pending-to-Released withdrawal, service/UI/index parity and atomic requested-venue staff notices, then execute new automated and human manual cases with fresh records. Future Confirmed cancellation stays outside E06-S03. Keep docs-only branches free of SCRUM keys to avoid accidental Jira completion.


## PR #280 review correction (16 October)

User authorised reviewer fixes and push. Synced reviewed head b4725b6, which
already includes main ef18a96; preserved those upstream changes. Both reviewers
identified #279 as the earlier T-93 claimant. Renumbered our current requirements
and task references to T-94/T-95/T-96, with dated change-log provenance. Historical
immutable records and CAA 151026 exports retain the previous IDs. Regenerated
CAA 161026 backlog, cases and BDR; refreshed legacy testcase input and inventory.

The user asked who should decide case sprint labels; referred scheduling to PO
and Scrum Master. Preserve current Sprint 3 labels and explicitly mark new cases
unimplemented pending planning, rather than assigning Sprint 4/carryover. No new
planning commitment made. #268's reported 354-case assertion is not merged here;
watch integration and do not weaken the valid 359-case catalogue to satisfy it.

Evidence: 20261016-010256-jininggg-tooling.md. All 359 cases match both workbooks;
BDR IDs are unique with T-93 reserved for #279; corrected backlog references and
all five unchanged sprint labels verified. Repository check: 140 tests, existing
Windows worktree 3 failures/11 errors. No code, migrations, database or Jira edits.
Update PR body/PostPlan after pushing the fixes. No reviewer messages or approvals.


## PO confirmation and current-main integration (16 October, latest)

User relayed the PO's explicit instruction: keep the five cases in E06-S03's
current Sprint 3 plan and complete the remaining work, recording anything
unfinished honestly at sprint close. Scheduling is resolved; earlier pending
planning notes above are historical. Recorded the confirmation in T-94, BDR
addendum/change log, both backlog views (including exported checklist criteria)
and testing guide. No delivery or inferred carryover claim.

PO review on #280 required merging current main and regenerating derivatives.
Merged main 62916a9; only conflict was generated tc-coverage.md. Regenerated
backlog/test workbooks and BDR CAA 161026, refreshed compatibility input and
regenerated coverage from combined sources, preserving main's scaffold changes.
No hand-resolved generated contents. T-94/T-95/T-96 preserved. The PO reports
#268's fixed-354 assertion repaired; no related catalogue/tooling change required.

Evidence: 20261016-125227-jininggg-tooling.md. All 359 cases match workbooks;
coverage inventory 179 automated / 139 scaffold / 41 none. New cases still
unimplemented. Required repository check: 146 tests, existing Windows 3 failures
and 11 errors. No local application tests claimed; no new application source,
database or Jira changes. Commit/push and update #280/PostPlan with latest head.


## T-93 ordering conflict resolution (16 October, latest)

User explicitly requested resolving conflicts and keeping T-93 before T-94.
Synced remote f9e9792 first to preserve the teammate's #272 merge; then merged
main 0a86b8d, including #279's T-93. The initial clean merge attempt was aborted
before hand edits solely to fast-forward the newer remote branch safely.
Resolved B-team-decisions.md by preserving main's T-93 and ours T-94/T-95/T-96,
with exact numeric order T-01 through T-96 in one continuous table. Both G-change-log
entries retained, with T-93's 15 October entry before the withdrawal addendum.
Regenerated BDR CAA 161026 and verified all last five IDs share one Word table.
Regenerated combined workbooks/coverage; semantically identical workbooks retain
their committed bytes. Preserved T-93 policy, human evidence and PO Sprint 3 plan.

Evidence: 20261016-134929-jininggg-tooling.md. All 359 cases match; unique ordered
IDs and export table verified. Coverage 179 automated/139 scaffold/41 none;
existing Windows repository check remains 3 failures/11 errors among 146 tests.
No manual run, application implementation/test claim, database or Jira edits.
Push normally after commit; do not force-push or merge/approve the PR.
