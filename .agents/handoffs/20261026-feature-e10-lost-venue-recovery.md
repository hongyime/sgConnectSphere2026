Implement E10-S05 / SCRUM-74 recovery under subtasks228backend/229frontend/230tests, preserving the owning E05-S06 trigger. User authorised implementation26October and asked about estimate; clarified original3pts remains unchanged, no re-estimation applied. Isolated branch from b0145df3; root staged review notes untouched.

Read README/CONTRIBUTING/DoD/setup/STATE/source-of-truth/instructor guidance and handoffs. Main has0025schema but LeXin348/349application unmerged; inspect shared contract, do not duplicate trigger. Planned: expose lost-booking context; link replacement via replaces_booking_id; transfer primary/publication and effective notices only at real approval; explicit old cancellation after confirmed replacement. Reuse current routes/search/booking/notifications. No new route function/schema planned. Formal E05-S06 human integration remains dependent. Native isolated loopback DB only; no production/email actions. No parent/subtask completion claim.


Implementation now includes conflict context, dedicated recovery route, source-linked search/form submission, approval primary/publication transfer and atomic E11 effects, plus explicit cancellation after a Confirmed eligible replacement. No new schema or trigger duplication. Existing single-Session booking restriction retained.

Verification: backend units497PASS; focused real-PostgreSQL regression56PASS (including3new recovery tests); dedicated recovery UI5PASS plus existing venue UI24PASS; both typechecksPASS. Coverage gap remains for new SQL orchestration unit branches (real DB tests are used instead, no100%claim). Test records:
- 20261026-213116-jininggg-backend-db.md
- 20261026-213116-jininggg-frontend-vitest.md
- 20261026-213116-jininggg-backend-unit.md

Next: finish repository checks, commit/publish draft, inspect CI and dependency integration. Do not mark parent/subtasks Done. Final human E05-S06 trigger-to-recovery run and lift interaction require dependency integration; current DB tests begin with Conflicting fixture and prove no E05 trigger. Estimate remains3points; suggested5notapplied. Intentional worktree retained for review/manual work. Root staged notes untouched.

Repository check completed: hygiene, secret scan and record validation passed; tooling suite163tests had3failures11errors in Windows worktree tests. Do not claim repository-check success. Both application typechecks passed again. Jira parent74and subtasks228/229/230moved In Progress; none Done.
