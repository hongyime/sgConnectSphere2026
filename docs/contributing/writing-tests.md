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
