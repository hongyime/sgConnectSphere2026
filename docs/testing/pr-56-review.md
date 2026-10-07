# PR #56 review: submit an event request

Reviewed PR #56 at `d88cf308703e885c127193708afec866bacc026d` against
`origin/main` at `75423e770a9f5693da744742a9b89eb1923d636f`.
The acceptance criteria are from `docs/backlog/release-1/E02-event-request-submission.md`
and `docs/testing/cases/E02.md`; no product requirements were changed.

## Findings and fixes

| Priority | What went wrong | Fix and regression evidence |
| --- | --- | --- |
| P2 | The HTTP parser rejected missing title/date/attendance before mandatory-field validation, returning a generic payload error instead of identifying every missing field. It also coerced `true` and `[1]` into attendance `1`. | Extracted the parser into `parseRequest.ts`, retained invalid field values for aggregate validation, and required numeric attendance. Backend tests cover an empty request and malformed attendance. |
| P2 | Invalid Date objects are truthy and comparisons with NaN are false, so service callers could bypass date validation and reach persistence. | Check for finite Date timestamps before comparing the range; tests prove invalid start/end dates cause no repository write. |
| P2 | The form treated any nonempty attendance value as complete, including zero, negatives, and fractions. | Match the server's positive-integer rule in form validation; component tests verify submission is disabled and the field is identified. |
| P2 | A rejected access-token lookup left the form stuck in Submitting. This was inherited from the original component. | Catch the lookup failure, display a retryable error, and test that submission becomes available again. |
| P1 | The attendee detail route was absent, causing details and denied deep links to render the landing page. This also exists on main and caused all four failures in the PR's Application Checks run. | Restore `/attendee/events/:id` using the existing access-controlled attendee component. Existing allowed/denied tests plus added reload coverage pass. |
| P2 | E02 success tests used `/prototype`, which reports success without an API request. Fixed calendar dates would also expire. | Exercise `/organiser/new-request` with an explicitly mocked API, assert the POST contract and API success state, and freeze the browser clock. Component tests cover full payload and server rejection. |

Comments beside the changed code explain the cause and intended correction.
The extracted parser keeps malformed top-level payloads rejected and preserves
the existing authenticated organiser/client-organisation boundary.

## Verification

- `npm run typecheck`: passed.
- `npm run build`: passed (frontend production bundle and backend TypeScript).
- `npm test --workspace frontend`: 9 passed, including 6 request-flow regression cases.
- `npm test --workspace backend`: passed, including 17 event lifecycle cases.
- `npm run test:runtime`: passed.
- `npm run test:e2e:scaffold`: 104 passed, 444 existing scaffold cases skipped.
- `python3 scripts/check.py`: repository hygiene and tooling checks passed;
  the workbook roundtrip class was skipped because local tooling lacks openpyxl.
- New review files were also checked explicitly with pre-commit.

## Remaining integration limits

These fixes do not establish live deployment readiness:

- `/organiser/new-request` still receives `mock-token` from App.tsx, inherited
  from the existing route scaffold. It cannot authenticate against real Supabase.
  Wire the agreed real organiser session before claiming E02-S01 works end to end.
  The `/prototype` no-token branch remains a local simulation.
- PostgreSQL persistence of the new request columns was reviewed, but not run
  against a real database in this review. Run a migration/create/read roundtrip
  in an isolated test database before claiming database verification.
- At review time the PR's Vercel status was failure. The underlying deployment
  logs were not inspected; the local build passing does not resolve that status.
- npm reported engine warnings for jsdom and its dependencies on local Node
  22.20.0 (they require newer Node patch versions). Component tests nevertheless
  passed here; use a supported Node version for reproducible CI.
- GitHub checks must run again on the final pushed changes, and a teammate must
  review them. These fixes are proposed separately into the PR #56 branch;
  they do not approve or merge the feature into main.
