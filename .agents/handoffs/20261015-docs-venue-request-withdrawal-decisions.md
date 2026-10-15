# E06-S03 withdrawal decision recording

Record the agreed E06-S03 withdrawal and replacement clarifications after merged #274, without implementing them or changing Jira/database state. Work began 15 October on docs/venue-request-withdrawal-decisions from main 7bfec65; validation finished after midnight on 16 October.

## Decisions and provenance

T-93 records the Product Owner clarification relayed by the story owner: Pending-only withdrawal, separate Confirmed cancellation, and future cancelled-primary clearing/prompting the Organiser without automatic promotion. The existing Coordinator primary-selection permission is not changed by this docs task.

T-94 records E06-S04 owner agreement on Released, venue-before-booking locks, status recheck/409 and booking-specific audit. The story owner confirmed requested-venue staff notifications. E06-S03 owns Pending withdrawal; E06-S05 retains Tentative release/expiry, with no hold resurrection after conversion/withdrawal.

T-95 records story-owner confirmation that Released replacements permit another fresh attempt; Rejected replacements still consume the predecessor's slot. Follow the immediately preceding rejection's own suggestion with no fixed two-attempt maximum. A rejection without a suggestion ends that chain, not the ordinary venue-search journey. The future index must exclude Released only, not all inactive statuses.

## Work completed

BDR decisions/change log/addendum, release/product E06-S03, booking contract, schema follow-up note and testing guide aligned. Clarified TC_E06S03_08; added _09 to _13 for scope/access, races, staff notices/atomicity, withdrawal retry and rejection chains. Generated CAA 151026 backlog/test workbooks and BDR Word export; refreshed legacy testcase compatibility workbook and regenerated tc-coverage. No estimates, sprint allocation, Session scope or migration 0019 edits. No migration number reserved.

## Verification and limits

20261016-000040-jininggg-tooling.md records 359-case export/canonical consistency, reference/inventory checks and whitespace pass. New cases are marked none, not implemented or executed. Required repository check retains existing Windows tooling 3 failures/11 errors among 128 tests. No application test run is claimed. No commits, pushes, PR creation, Jira edits, database changes or teammate messages authorised/performed in this task.

## Next step

Review these docs and coordinate the new replacement-index predicate and withdrawal notification routing with E06-S04 before implementation. Never rewrite applied 0019; add a separately coordinated migration. Implement Pending-to-Released withdrawal, service/UI/index parity and atomic requested-venue staff notices, then execute new automated and human manual cases with fresh records. Future Confirmed cancellation stays outside E06-S03. Keep docs-only branches free of SCRUM keys to avoid accidental Jira completion.
