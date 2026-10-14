# Equipment stock reduction with dated withdrawals

Fix E07-S01 catalogue stock-reduction review raised by Bl0oper in PR #249. Keep completed SCRUM-51 Done; deliver a separately tracked follow-up with regression evidence and peer-reviewed PR. Base main 979cc08.

The current SQL counts simultaneous active reservations but omits dated withdrawals. Add withdrawal demand and its start boundaries to the same snapshot, limiting checks to each reservation's remaining period. Preserve half-open adjacency, atomic flags/notices/outbox and the existing equipment-row lock protocol. No dependency on the unmerged E07-S05 writer: withdrawal table already exists.

## Verification and tracking

- GitHub follow-up #264; canonical E07-S09 added to product/release-1, with TC_E07S09_01–03. Sprint and estimate unset; Jira creation follows source merge. SCRUM-51 remains Done.
- Three selected regressions FAIL against the original query, demonstrating they detect the reported bug; original code replaced with the fix afterward. Immutable deliberate-failure record preserved.
- Catalogue/availability/reservations real PostgreSQL: 21/21 PASS. Backend unit suite: 373/373 PASS. Backend typecheck PASS. Repository hygiene and 128 tooling tests PASS.
- New dated 141026 exports generated and legacy audit input refreshed from the generated workbook; coverage regenerated, all three new cases active.
- DoD unit-only coverage exception: changed behavior is SQL temporal overlap/peak aggregation and transactional notification rollback. PostgreSQL tests, rather than SQL-shaped mocks, prove these paths. No 100% unit-only or human manual validation claim. No frontend, schema or migration changes required.
- Manual acceptance remains pending for the follow-up story. A peer-reviewed backend fix may merge separately; no automatic closure of #264 or existing Jira story.

Next: commit, push and open review-ready follow-up PR; link PostPlan and comment on #249. No approvals or Request changes reviews.
