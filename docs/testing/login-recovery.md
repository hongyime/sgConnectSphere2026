# E01-S01 — Login and password recovery

Implementation branch: `feature/e01-s01-login-recovery`.
Requirements: [release-1 E01-S01](../backlog/release-1/E01-access-identity.md),
[acceptance cases](cases/E01.md), and [ADR-016](../adr/ADR-016-thirty-minute-login-lockout.md).

## Behaviour and acceptance mapping

| Case | Behaviour | Automated evidence |
| --- | --- | --- |
| TC_E01S01_01 | Registered credentials, trimmed/case-insensitive email, server-derived role, secure session and organiser event landing | Database/API suite and desktop/mobile browser suite |
| TC_E01S01_02 | Identical error for incorrect password, unknown email, inactive account; no password hash returned | Database/API suite and desktop/mobile browser suite |
| TC_E01S01_03, TC_E01S01_07 | Fifth failure locks for 30 minutes; correct password is refused while locked; generic reset guidance | Database/API suite and desktop/mobile browser suite |
| TC_E01S01_04 | Reset request queues email without disclosing account existence | Real outbox/provider-adapter test with intercepted HTTP; browser suite captures worker email |
| TC_E01S01_05 | Single-use, 15-minute link replaces password and clears lock; old password fails | Database/API suite and desktop/mobile browser suite |
| TC_E01S01_06 | One timestamped lockout audit entry; later attempts do not duplicate it | Database assertions in both suites |

Additional database tests cover concurrent failed logins, simultaneous token
redemption, transactional rollback, expired/invalid tokens, password policy,
stale email recipients, deactivated recipients, session revocation, legacy
password hashes, and cross-origin rejection.

## Implementation choices

- Registration's `password.ts` is the canonical Node scrypt implementation.
  Login previously read only the older colon-separated hash format, while
  registration wrote a dollar-separated format. The shared verifier now reads
  both; new and reset passwords use registration's existing stronger format.
  Unknown accounts also incur the same scrypt derivation cost.
- All failed logins get the same error and recovery instructions. This explains
  the five-attempt/30-minute rule without confirming that an account exists or
  disclosing its individual lock state.
- A recovery request queues a non-sensitive notification and delivery in one
  PostgreSQL transaction. The existing ADR-006 relay and worker deliver it.
  The worker generates the random token when it claims the email for sending,
  stores only its SHA-256 digest in `password_reset_tokens`, and sets expiry
  exactly 15 minutes after the database issuance timestamp. Queue delays do not
  shorten the link lifetime. The raw token is added only to the in-memory email
  payload; neither retained notification HTML nor Redis pointers contain it.
- The email links to `/reset-password#token=...`. The browser removes the
  fragment from its address bar and retains the token only in component memory;
  it submits the token in the POST body. Reloading that form requires reopening
  the email link. Passwords and reset links are excluded from browser traces.
- Reset locks the user row before consuming a token and updating the password,
  using the same user-first lock order as login and issuance. It also invalidates
  other outstanding reset tokens and existing sessions, so recovery cannot be
  undone with an earlier link/session. No automatic login occurs on reset.
- The worker rechecks that the account is active and its email has not changed
  since the request. Provider throttling follows existing bounded retries;
  each new sending attempt issues a fresh 15-minute token. Uncertain delivery
  outcomes keep the existing no-automatic-resend behaviour.
- Role landing routes retain existing conventions: attendees use
  `/attendee/events`; organisers use the live, protected `/events` view.
  Other staff retain the existing `/events` fallback; their role-specific
  screens currently use prototype fixtures and are not promoted to live
  dashboards by this story. The technical-support role spelling now matches
  the backend's `technical_support_staff`.

## Deployment and remaining verification

1. Apply migrations through `0007_password_reset_delivery.sql` before deploying
   this code (`npm run db:migrate` in the configured deployment environment).
2. Configure the existing server-only database connection and `APP_URL` to the
   exact frontend origin. Email links use this trusted configured origin.
3. Configure existing Brevo sender/key, Redis transport and cron authentication.
   Enable `NOTIFICATION_RELAY_ENABLED` and `NOTIFICATION_DELIVERY_ENABLED`
   following the notification rollout process. Both the relay and worker must
   be running. The current Vercel configuration schedules only a daily relay;
   timely recovery depends on the separately configured worker/relay cadence.
   This change does not add a service or change that deployment schedule.
4. Verify one real inbox delivery and complete the recovery journey in the
   team's deployed environment. Local tests intercept provider HTTP and never
   send to real recipients.
5. Obtain teammate review and integrate through the reviewed PR workflow.

The lockout duration ambiguity is resolved by ADR-016. No new business-rule
ambiguity was found. Live email delivery and the Definition of Done's human
review/deployment checks remain external to the local test results; do not mark
those checks complete based on these automated tests alone.

## Running the checks

Set `TEST_DATABASE_URL` to a disposable **loopback** PostgreSQL 17 database named
`connectsphere_notification_test` (or that name with an underscore suffix).
The suites refuse non-loopback addresses. Each creates and drops only its own
random schema; they never reset application data. Test email addresses use
reserved domains.

```sh
npm test --workspace backend
npm run test:auth:db --workspace backend
npm run test:e2e:auth
npm run test:notifications
npm run typecheck
npm run build
npm run test:runtime
python3 scripts/check.py
```

The browser command starts Vite on port 5176 and a real local API on port 3006.
It runs four workflows in Chromium at desktop and Pixel 7 mobile sizes, backed
by PostgreSQL. Mail delivery uses the real worker/store with an intercepted
sender; the separate database suite exercises the Brevo adapter with intercepted
provider HTTP. Existing notification tests also cover delivery leases and retries.

## Files changed

Local verification on 18 September 2026:

- Backend unit/regression suite: 113 passed.
- Auth database/API suite: 12 scenarios passed (13 reported tests including the parent suite).
- Desktop/mobile real-browser suite: 8 passed.
- Notification/store/provider regression suite: 26 passed.
- Compiled API runtime suite: 15 passed.
- Application typecheck and production build passed.

These results use isolated local PostgreSQL and intercepted email delivery;
they do not assert a successful deployed inbox delivery or teammate approval.

| File | Change |
| --- | --- |
| `api/auth/session.ts` | Reset request/consume actions and active-session validation |
| `backend/database/migrations/0007_password_reset_delivery.sql` | Delivery purpose, reset-token indexes and server-only access |
| `backend/src/modules/accessControl/password.ts` | Shared policy and registration/legacy verification |
| `backend/src/modules/accessControl/passwords.ts` | Compatibility re-export of the canonical implementation |
| `backend/src/modules/accessControl/registration.ts` | Reuse shared password validation |
| `backend/src/modules/accessControl/passwordReset.ts` | Queue recovery and atomically replace password/unlock |
| `backend/src/modules/accessControl/passwordResetDelivery.ts` | Issue hashed 15-minute token and render transient email link |
| `backend/src/modules/accessControl/sessions.ts` | Generic recovery guidance and database-clock lock deadline |
| `backend/src/modules/notificationDispatcher/postgres.ts` | Prepare reset emails within the existing send claim |
| `backend/src/dev.ts` | Match deployed auth rewrites; configurable local API port |
| `frontend/src/features/accessControl/PasswordRecovery.tsx` | Request/reset forms, validation and accessible status messages |
| `frontend/src/features/accessControl/LoginPage.tsx` | Recovery link, role spelling, session-fetch error handling |
| `frontend/src/features/organiser/ClientEvents.tsx` | Recovery link on inline sign-in form |
| `frontend/src/App.tsx` | Recovery routes with separate form state |
| `frontend/vite.config.ts` | Configurable proxy target for isolated browser tests |
| `vercel.json` | Reset endpoint rewrites to existing function; no extra lambda |
| `backend/tests/helpers/loginDatabase.ts` | Disposable-schema test harness |
| `backend/tests/loginRecovery.integration.test.ts` | Real PostgreSQL/API/provider acceptance and concurrency tests |
| `tests/auth-e2e/loginRecovery.spec.ts` | Seven acceptance cases across desktop/mobile workflows |
| `playwright.auth.config.ts` | Isolated live-auth browser suite |
| `tests/e2e/e01.spec.ts` | Replace obsolete login fixmes with pointer to live suite |
| `tests/notifications/postgres.test.ts` | Include new additive migration in existing regression fixtures |
| `backend/package.json` | Include login/verification unit tests and add database-auth command |
| `package.json` | Browser-auth test command |
| `.github/workflows/application-checks.yml` | Run backend and real auth database/browser checks in CI |
| `docs/adr/ADR-016-thirty-minute-login-lockout.md` | Link historical implementation status to this evidence |
| `docs/db_schema.md` | Document delivery purpose |
| `docs/testing/README.md` | Link this test plan |
| `docs/testing/tc-coverage.md` | Regenerate acceptance-case automation mapping |
| `docs/testing/login-recovery.md` | This implementation, rollout and verification record |
