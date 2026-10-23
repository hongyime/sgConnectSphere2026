# Production demo-account provisioning run - Safety Officer

- Recorded (UTC): 2026-10-16T08:22:55Z
- Operator role: authorized demo-account writer
- Product Owner approval: T-97 (recorded in the PO decision PR); DEMO ONLY shared-seed risk accepted
- Coordination: designated writer confirmed by Product Owner; exact scope posted to PR #283 before the write
- Source `main`: `8599ad285d86daf7fc781b688f07dd5fc1995b2e`
- Seed source: `backend/src/database/cli.ts`, existing `safetyOfficer` definition
- Project/schema precheck: PASS; configured database matched configured Supabase project; schema `public`
- Migration ledger precheck: PASS; 20 entries matched all 20 source migration files; no migration run
- Target precheck: PASS; no target email or stable seed ID row existed inside the write transaction
- Operation: one parameterized insert for the existing Safety Officer seed profile only; conflict path does not update a row
- Outcome: PASS; exactly 1 row inserted
- Postchecks: PASS; one target row, expected seed profile and active state, seed-helper hash compatibility verified in memory
- Authentication smoke: PASS; one live API login (HTTP 200), whoami (HTTP 200, Safety Officer role), and logout (HTTP 200); owned session cleanup confirmed
- Scope boundary: no Coordinator Lead or other account, roster, venue assignment, reset, seed command, migration, existing credential change, or unrelated user-row query/write
- Sanitization: no account ID, password/hash, database/private URL, contact data, or other account data recorded

## Safe aborted precheck attempt

An initial transaction rolled back before the target lookup or insert because the local verifier expected an exact catalog text rendering of the normalized unique index. A separate read-only diagnostic confirmed the named unique expression and the target remained absent. The corrected verifier then rechecked all prerequisites in a fresh transaction before the single insert above. No write occurred in the aborted attempt.

## Limits

The auth verification was API-only and does not prove the Safety Officer workspace, safety queue, complete E01-S13 acceptance, PR #283 readiness, deployment, or other application behavior. This is a targeted account-data operation, not a migration or a general seed run.
