# System Hardening, Reliability, Performance, and Cleanup (SCRUM-28 / E01-S01)

Goal: Resolve security, reliability, performance, and dead code issues across backend API endpoints, background workers, and the frontend bundle architecture.

## Done so far

- **Security & Access Control Hardening**:
  - `api/events.ts` and `api/venues/index.ts`: Enforced CSRF origin checks using `isAllowedOrigin()` on all mutating HTTP methods (POST, PATCH, DELETE). Requests without an allowed origin header return HTTP 403 (`Request origin not allowed.`).
  - `backend/src/modules/eventVisibility/runtime.ts`: Updated `currentUser()` to reject inactive accounts (`isActive = false`) and locked accounts (`isAccountLocked(user.lockedUntil)`) with HTTP 403 (`Account is inactive or locked.`).
  - `backend/src/http.ts`: Enforced strict cron authorization in `hasInternalSecret()` requiring a matching bearer/header secret and returning `false` whenever `expectedSecret` is undefined or blank.

- **Database Concurrency and Background Worker Reliability**:
  - `backend/src/modules/accessControl/sessions.ts`: Moved scrypt password verification outside the database transaction row-lock so connection pool resources and table locks are not held during CPU-intensive hashing.
  - `api/cron/outbox-relay.ts`: Scheduled invocation runs `publishCommittedDeliveries` and `dispatchCommittedDeliveries` sequentially to ensure queued notification emails are reliably dispatched.
  - Unified database connection pools: Replaced duplicate `Pool` instances in `backend/src/modules/eventVisibility/runtime.ts` and `api/auth/register.ts` with `getDatabasePool` from `backend/src/database/client.ts`.
  - `backend/src/modules/eventLifecycle/completion.ts`: Added `LIMIT 50` to the candidate query to prevent timeouts on unbounded event rows.

- **Frontend Bundle Optimization & Code Splitting**:
  - `frontend/src/app/routes.tsx`: Converted monolithic static feature view imports to dynamic `React.lazy()` imports.
  - Added lightweight `RouteLoading` fallback component using `Loader2` from `lucide-react` with `.ui-page` and `.ui-spin` styling from `shared.css`.
  - Wrapped route elements in `pub`, `sample`, and `page` constructors with `<Suspense fallback={<RouteLoading />}>`.
  - Reduced main bundle size from 669.43 kB down to 330.46 kB, completely eliminating Vite's `(!) Some chunks are larger than 500 kB after minification` warning.

- **Dead Code Elimination**:
  - Deleted unused scaffold modules: `backend/src/modules/registration/`, `backend/src/modules/auditHistory/`, and `backend/src/providers/redisQueue.ts`.
  - Removed unused module exports `AuditHistory` and `Registration` from `backend/src/modules/index.ts`.
  - Removed obsolete throwing stub `sendBrevoEmail` and `EmailJob` from `backend/src/providers/brevo.ts`.
  - Removed obsolete test assertion from `tests/notifications/providers.test.ts`.

- **Derived Documents**:
  - Regenerated `docs/testing/tc-coverage.md` via `scripts/tc_coverage_audit.py`.
  - Verified `.env.template` via `scripts/generate_env_template.py`.

## Verification Commands & Outcomes

- `python scripts/check.py`: 182 tooling tests, 706 test records validated, pre-commit hygiene clean.
- `npm run typecheck`: Passed cleanly across both frontend and backend workspaces.
- `npm test --workspace frontend`: All 63 test files and 621 vitest tests pass.
- `npm test --workspace backend`: All 538 backend unit tests pass.
- `node --test tests/runtime/api-runtime.test.mjs`: All 23 runtime smoke tests pass.
- `node --import tsx --test tests/notifications/providers.test.ts`: All 11 notification provider tests pass.
- `npm run build`: Both frontend and backend build cleanly with zero chunk size warnings.

## Decisions

- Preserved static imports for small local routing primitives (`ComingSoon`, `HomeRedirect`) while lazy-loading all feature views.
- Used named export translation `import(...).then(m => ({ default: m.Component }))` to maintain compatibility with feature modules' named exports.
- Maintained task notes in `.agents/handoffs/` per AGENTS.md decisions 0013 and 0014 without modifying protected continuity files.

## Next

- Open pull request into `main` with conventional title and body following `.github/pull_request_template.md`.
