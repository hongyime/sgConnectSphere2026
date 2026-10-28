# System Hardening, Reliability, Performance, and Cleanup (SCRUM-127 / E00 Technical Enabler)

Goal: Resolve security, reliability, performance, and dead code issues across backend API endpoints, background workers, and the frontend bundle architecture.

## Done so far

- **Security & Access Control Hardening**:
  - `api/events.ts` and `api/venues/index.ts`: Enforced strict, fail-closed CSRF origin checks using `isAllowedOrigin()` on mutating HTTP methods (POST, PATCH, DELETE) and `handleRegistrations`, rejecting missing or disallowed `Origin` headers with HTTP 403 (`Request origin not allowed.`), matching `main` and write routes in `api/attendee/events.ts`, `api/auth/session.ts`, and `backend/src/config.ts`.
  - `backend/src/modules/eventVisibility/runtime.ts`: Updated `currentUser()` to reject inactive accounts (`isActive = false`) with HTTP 403 (`Account is inactive.`). Per Aaron's review, dropped the active session lockout check to prevent third parties from terminating active attendee sessions.
  - `backend/src/http.ts`: Enforced strict cron authorization in `hasInternalSecret()` requiring a matching bearer/header secret and returning `false` whenever `expectedSecret` is undefined or blank.

- **Database Concurrency and Background Worker Reliability**:
  - `backend/src/modules/accessControl/sessions.ts`: Moved scrypt password verification outside the database transaction row-lock so connection pool resources and table locks are not held during CPU-intensive hashing. Direct `pool.query` used without mock branches.
  - `api/cron/outbox-relay.ts`: Default cron run performs publication only (`publishCommittedDeliveries`), keeping email dispatch guarded under the worker task and delivery switch.
  - Unified database connection pool: Replaced separate `Pool` instances with `getDatabasePool` from `backend/src/database/client.ts`. Per Amareet's review, `getDatabasePool` reads `process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL` dynamically on first use/recreation so integration tests and dynamic env setups do not fail with 503. Wrapped `pool.end()` so multiple closures across consumers (e.g. `eventReadinessRoutes.integration.test.ts`) are safely idempotent, scoped to `instance` rather than module-global state, drain superseded pools when switching connection strings, and preserve open/ending pool instances when test teardown unsets environment variables.
  - `api/events.ts`: Evaluated `currentUser(request)` before database pool acquisition in `handleRegistrations`, `attendance`, and `cancellation` so unauthenticated requests answer 401 without touching the database pool.
  - `backend/src/modules/eventLifecycle/completion.ts`: Added `LIMIT 50` to the candidate query to prevent timeouts on unbounded event rows.

- **Frontend Bundle Optimization & Code Splitting**:
  - `frontend/src/app/routes.tsx`: Converted monolithic static feature view imports to dynamic `React.lazy()` imports.
  - Added lightweight `RouteLoading` fallback component using `Loader2` from `lucide-react` with `.ui-page` and `.ui-spin` styling from `shared.css`.
  - Wrapped route elements in `pub`, `sample`, and `page` constructors with `<Suspense fallback={<RouteLoading />}>`.
  - Reduced main bundle size from 669.43 kB down to 330.24 kB, completely eliminating Vite's `(!) Some chunks are larger than 500 kB after minification` warning.
  - Synced with `main` to resolve route conflict with PR #361.

- **Dead Code Elimination**:
  - Deleted unused scaffold modules: `backend/src/modules/registration/`, `backend/src/modules/auditHistory/`, and `backend/src/providers/redisQueue.ts`.
  - Removed unused module exports `AuditHistory` and `Registration` from `backend/src/modules/index.ts`.
  - Removed obsolete throwing stub `sendBrevoEmail` and `EmailJob` from `backend/src/providers/brevo.ts`.
  - Removed obsolete test assertion from `tests/notifications/providers.test.ts`.

- **Test Alignment & Tooling**:
  - Added `backend/tests/securityHardening.test.ts` to `backend/package.json` `"test"` script so tests run in CI.
  - Updated test requests in `tests/runtime/api-runtime.test.mjs`, `backend/tests/changeRequests.test.ts`, `backend/tests/eventAttendanceRoutes.integration.test.ts`, and `backend/tests/eventReadinessRoutes.integration.test.ts` to supply an allowed Origin header and configure test origins, simulating valid browser clients.
  - Added explicit test cases in `backend/tests/securityHardening.test.ts` and `tests/runtime/api-runtime.test.mjs` verifying that missing and unauthorized Origin headers are rejected with 403 on mutating routes (`POST`, `PATCH`, `DELETE`).
  - Fixed Windows `os.rmdir` mock in `tooling/tests/test_worktree_hygiene.py`.
  - Regenerated `docs/testing/tc-coverage.md` via `scripts/tc_coverage_audit.py`.
  - Verified `.env.template` via `scripts/generate_env_template.py`.

## Verification Commands & Outcomes

- `python scripts/check.py`: 182 tooling tests, 711 test records validated, pre-commit hygiene clean.
- `npm run typecheck`: Passed cleanly across both frontend and backend workspaces.
- `npm test --workspace backend`: All 553 backend unit tests pass (including 16 tests in `securityHardening.test.ts`).
- `npm run test:runtime`: All 26 runtime smoke tests pass (including explicit CSRF origin rejection for missing and disallowed origins).
- `node --import tsx --test tests/notifications/providers.test.ts`: All 11 notification provider tests pass.
- `node --import tsx --test backend/tests/securityHardening.test.ts`: All 16 security hardening tests pass.
- `node --import tsx --test backend/tests/sessions.test.ts`: All 8 session tests pass.
- `npm run build`: Both frontend and backend build cleanly with zero chunk size warnings (main bundle 330.24 kB).

## Decisions

- Re-classified the work as technical enabler under E00 (SCRUM-127) per Aaron's feedback and `docs/jira-ticket-classification.md`, dropping the SCRUM-28 link.
- `getDatabasePool()` evaluates `process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL` dynamically when constructing or recreating the pool, preventing 503 failures in integration test suites that set `DATABASE_URL` dynamically.
- `pool.end()` is guarded to be idempotent and scoped to `instance` so test suites that clean up both `runtime.databasePool()` and `client.getDatabasePool()` do not throw `'Called end on pool more than once'`.
- Preserved static imports for small local routing primitives (`ComingSoon`, `HomeRedirect`) while lazy-loading all feature views.
- Maintained task notes in `.agents/handoffs/` per AGENTS.md decisions 0013 and 0014 without modifying protected continuity files.

## Next

- Push commit to `origin/fix/system-hardening-and-cleanup` and verify CI pass.
