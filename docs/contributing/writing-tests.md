# Writing tests

Conventions for every kind of automated test in this repository. Applies
equally to human contributors and AI agents. If a test does not follow
these conventions, expect a reviewer to send it back.

## Where tests live

| Kind | Location | Runner |
| --- | --- | --- |
| Backend unit / integration | `backend/tests/*.test.ts` | `tsx --test` (via `npm run test --workspace backend`) |
| Backend runtime smoke | `tests/runtime/*.test.mjs` | Node built-in test runner |
| Notification / queue integration | `tests/notifications/*.test.ts`, `tests/redis/*.test.ts` | `tsx --test` |
| Frontend component | `frontend/src/**/*.test.tsx` | Vitest under jsdom (via `npm run test --workspace frontend`) |
| End-to-end (Playwright) | `tests/e2e/*.spec.ts` | Playwright |

## File-level comment (required)

Every test file starts with a comment block explaining:

1. What story or module the tests cover.
2. Which mock or fixture files they depend on.
3. What the tests are trying to prove that other layers cannot cheaply
   prove instead.

Example (from `tests/e2e/coordinator.spec.ts`):

```typescript
// Playwright tests for /coordinator/* routes (SCRUM-96). Each test exercises a
// user-visible flow — dashboard rendering, queue filtering, decision-panel
// validation, readiness gating — against the mock data in
// frontend/src/features/coordinator/mocks.ts. No backend is hit; these tests
// confirm that the mock-data functional screens satisfy the acceptance
// criteria captured in E03-S01, E03-S03, and E06-S03 without depending on
// implementation of the coordinator API endpoints.
import { test, expect } from '@playwright/test';
```

Explanation of every field is not needed. The comment is meant to answer
"why does this file exist" for the reviewer.

## Per-test comment (required for non-obvious tests)

If a test's assertion sequence tells the whole story, no per-test comment
is needed. If any of the following is true, the test needs a comment:

- The test title does not name the acceptance criterion or TC_ID it
  covers.
- The test asserts on something a reviewer would need to reverse-engineer
  from the code (accessibility state, race conditions, negative-cache
  behaviour, timing).
- The test uses a mock or stub that departs from the default in a
  material way (delayed fetch, forced 401, throttled response).

The comment sits above the `test(` call and explains what the test is
checking and why the assertion belongs at this layer:

```typescript
test('disables the submit button while the request is in flight', async () => {
  // Prevents accidental double-submit. The Playwright suite cannot easily
  // assert on this because the browser hits the response too quickly; here
  // the fetch stub can be deliberately slow.
  //
  // We hold the fetch promise open with an external resolver, assert the
  // in-flight state, resolve the fetch, then await the settled state so
  // React can flush the resulting state update inside its own act boundary.
  ...
});
```

## Test titles

- Titles that map to a workbook TC_ID **must** carry the TC_ID literally.
  See [writing-a-test-case.md](./writing-a-test-case.md) for why.
- Titles are behavioural, not implementation-detail. `rejects duplicate
  email` beats `calls upsert with lower-cased email`.
- Prefer one clear assertion per test where possible; multi-assertion
  tests need a comment stating why they belong together.

## Fake data

- Passwords in test data are synthetic. Put an inline
  `// pragma: allowlist secret - synthetic test credential` comment on
  the same line so `detect-secrets` does not flag them.
- Emails use `@example.com`, `@example.test`, or `@school.edu.sg`. Never
  a real domain.
- Fixture identifiers are stable across the file so a reviewer can
  follow one thing (`EVT-C01` for the coordinator dashboard event, etc.).

## Playwright specifics

- `page.route` intercepts backend calls where possible. Backend
  dependencies are the enemy of stable e2e tests.
- Assert on `role`-based locators (`page.getByRole('button', { name: 'Sign in' })`)
  over CSS selectors. Better for accessibility, better for stability.
- Every mutating action either records a mock success state
  (`role="status"`) or a mock error state (`role="alert"`). Assert on
  the state, not on `console.log` calls.

## Vitest specifics

- Component tests use `@testing-library/react`. Assert on visible text,
  `aria-invalid`, and roles rather than internal state.
- Async assertions use `await waitFor(...)`. React state updates from
  timers or resolved promises need to happen inside `act(...)` — if you
  are calling `.mockResolvedValue()` on a stub and then asserting on the
  next render, wrap the resolution in `await act(async () => { ... })`.
- Reset stubs between tests: `vi.restoreAllMocks()` in `beforeEach`,
  `vi.unstubAllGlobals()` in `afterEach`.

## Backend unit / integration specifics

- Backend unit tests use a hand-rolled fixture that satisfies the
  minimum interface the code needs (see
  `backend/tests/sessions.test.ts` for a Pool double). Do NOT introduce
  a heavyweight mocking library.
- Backend integration tests use `TEST_DATABASE_URL` pointing at a
  disposable Postgres and create their own schemas. Never touch the
  shared `public` schema.
- Assert on side effects (rows inserted, rows updated, audit entries
  present) rather than internal function calls.

## No shared state

Every test must be independent. If you find yourself relying on test
order, the harness has a bug — fix the harness, not the test.

## Verify before requesting review

Run the appropriate suite before opening a PR:

```
npm run test --workspace backend
npm run test:runtime
npm run test --workspace frontend
npx playwright test --project=desktop
```

Cite the actual exit codes and test counts in the PR body. `all good`
is not a verification statement.

## Four-question test quality checklist (mandatory)

Every test — unit, integration, or e2e — must answer these four questions.
Reviewers reject tests that cannot.

1. **Setup** — what state is created before the action?
   Example: "insert a user with `failed_login_count = 4`"
2. **Action** — what single operation is being tested?
   Example: "attempt login with wrong password"
3. **Expected result** — what observable outcome, justified independently of
   the code?
   Example: "`locked_until` is set to now + 30 minutes per ADR-016"
4. **Would a plausible wrong implementation pass this test?** If yes, the
   test is decorative — strengthen it or delete it.
   Example: if someone changed `LOCKOUT_THRESHOLD` from 5 to 10 and the
   test still passed, the test is decorative.

### What makes a test decorative

A test is decorative when it passes regardless of whether the feature
works correctly. Common patterns:

- Asserts against mock data instead of real behaviour (`Admin.tsx`
  `AuditLogViewer` reads from `mocks.ts`, not the database)
- Uses `test.fixme` with no plan to un-skip (acceptable as scaffold, not
  as coverage)
- Checks that a component renders without asserting the *right* content
- Asserts a status code without checking the response body or side effects

### Expected values must be independently justified

The expected value in an assertion must come from a source other than the
code under test:

- **Good**: `expect(lockedUntil).toBe(now + 30 * 60 * 1000)` — justified
  by ADR-016 (30-minute lockout policy)
- **Good**: `expect(result.status).toBe('Submitted')` — justified by
  E02-S01 Scenario 1 acceptance criterion
- **Bad**: `expect(result).toEqual(whatTheCodeReturns)` — circular; if the
  code is wrong, the test is wrong too

### Tests must be deterministic and non-vacuous

- **Deterministic**: same input always produces same result. No
  `Date.now()` in expected values without mocking time. No random data
  without seeded generators. No network calls without stubs.
- **Non-vacuous**: the test exercises the path it claims to test. A test
  that catches an exception and asserts `true` is vacuous. A test that
  asserts `array.length > 0` when the array is hardcoded is vacuous.

## Coverage tools

Three coverage tools are configured for the three test runtimes:

| Runtime | Tool | Command |
| --- | --- | --- |
| Backend Node (tsx --test) | **c8** | `npm run test --workspace backend` (c8 wraps all test scripts) |
| Frontend Vitest | **@vitest/coverage-v8** | `npm run test:coverage --workspace frontend` |
| Python tooling (pytest) | **coverage.py** | `npm run test:coverage:tooling` (or `.venv-tools/bin/python -m coverage run -m pytest tooling/tests/`) |
| All three | — | `npm run test:coverage` (runs all three sequentially) |

Coverage reports are written to:
- `backend/coverage/` (c8 lcov + json-summary)
- `frontend/coverage/` (v8 lcov + json-summary)
- `htmlcov/` (coverage.py HTML)

Do not commit coverage output directories — they are gitignored.

## Mutation testing (Stryker)

Mutation testing verifies that tests catch real bugs by systematically
modifying (mutating) the source code and checking that at least one test
fails for each mutation. A surviving mutant means a test gap exists.

Stryker runs against Node's built-in test runner via the `tap` test runner
plugin (`@stryker-mutator/tap-runner`), not the generic `command` runner.
The `command` runner re-executes the *entire* backend suite for every single
mutant with no coverage narrowing — measured at ~3+ hours for 686 mutants
across 3 files. The `tap` runner gets real per-test-file coverage analysis
(Node's test runner already emits TAP when given `--test-reporter=tap`), so
each mutant only re-runs the test files that actually cover the mutated line.
First real run: 686 mutants across the full configured scope in ~4 minutes
instead of ~3+ hours — roughly a 45x speedup.

**Critical gotcha if you touch `stryker.config.json`'s `tap.nodeArgs`:**
Node's default (non-explicit) console output on this project's Node version
is NOT TAP-compliant even when piped to a child process — Stryker's tap-runner
then can only tell "exit code 0 (survived)" from "exit code non-zero (error)",
and can never report a clean "Killed" status. If a mutation run shows a 0%
score with a large `# errors` column and zero `# killed`, this is almost
certainly the cause. Fix: `nodeArgs` MUST include both
`--test-reporter=tap` and `--test-reporter-destination=stdout` alongside
`--import tsx`. Verify by running the exact node invocation manually first
(`node --import tsx --test-reporter=tap --test-reporter-destination=stdout
<test-file>`) and confirming the first line of output is `TAP version 13`.

`tap.testFiles` must list exact file paths, not a glob with `!`-negation.
Unlike the `mutate` option, `tap.testFiles` does not honor negation globs —
a pattern like `!backend/tests/*.integration.test.ts` will not exclude
anything, and integration/db test files requiring a live database will get
picked up and error out. List the plain unit-test files explicitly.

Run mutation testing with:

```
npm run test:mutation
```

This is still not instant (minutes, not seconds) because Stryker sandboxes
and re-runs relevant tests per mutant. Run it:
- After completing a story's tests, to verify they catch real bugs
- Before Sprint reviews, to measure test suite strength
- NOT on every commit or in CI (still too slow for a required check)

`stryker.config.json`'s `mutate` scope is intentionally narrow (one module
at a time) rather than the whole backend. Widen it deliberately, one module
per PR, so each run stays fast and its report stays reviewable. First real
score on `eventLifecycle/service.ts` + `eventLifecycle/status.ts`: **71.03%**
(255 killed, 93 survived, 11 no-coverage, 0 errors, 0 timeouts). The
`status.ts` sub-score (33.33%) is the weakest spot — several status-transition
array mutations survive because no test asserts the exact allowed-transition
list contents, only that specific transitions succeed or fail.

A mutation score below 60% on a module means the tests are likely
decorative for that module. Strengthen them before marking the story Done.

## Red-Green-Refactor discipline (Sprint 2 onwards)

For any story that touches persistence or business logic, follow the
test-driven development cycle. The `test.fixme` scaffolds from the
workbook are your Red starters — un-skip them, watch them fail, then
implement.

1. **Red commit**: un-skip the relevant `test.fixme` scaffold(s) OR write
   a new `test(...)` that asserts the expected behaviour. Run it. It must
   fail for the right reason (missing feature, not syntax error). Commit:
   `test: red — TC_EXXSXX_YY <what the test asserts>`.
2. **Green commit**: implement just enough code to make the test pass.
   Commit: `feat: green — TC_EXXSXX_YY <what was implemented>`.
3. **Refactor** (optional): clean up without breaking the test. Commit:
   `refactor: TC_EXXSXX_YY <what improved>`.

The git log must show Red before Green for any story-linked test.
Reviewers check this during PR review — a PR where the implementation
commit precedes its failing test commit will be sent back.

### Why this matters

Sprint 1 shipped tests alongside implementations in the same commits.
This meant nobody could verify that the tests were actually testing the
right thing — a test written after the code passes trivially and may
not catch regressions. The Red-Green-Refactor cycle forces the test to
fail first, proving it actually exercises the behaviour it claims to.
