# QA audit — ConnectSphere against the Agile Testing Quadrants

Date: 2026-09-16 · Sprint 1 (in flight)

> Historical mid-sprint audit. Its estimates and "not implemented" statements
> are superseded by the [20 September delivery ledger](../backlog/sprint-1-delivery.md).
> At the actual Sprint 1 cutoff, 55 of 230 TC_IDs have active title references;
> login/recovery, deactivation, submission/drafts, accessibility and venue work
> have since merged. The catalogue contains 71 distinct product stories in total,
> including 47 Release 1 stories. Use the ledger for actual completion and
> contributor attribution; this document preserves the earlier reasoning.

This document is an internal audit of ConnectSphere's automated test
coverage against the Agile Testing Quadrants framework and against the
ConnectSphere Release 1 backlog. It answers: what do our tests actually
prove, what do they leave uncovered, and where do we need to invest
before the release demo.

It is not a plan. It records evidence and gaps. The plan for closing the
gaps lives in the product backlog (SCRUM-93 for verification tokens,
SCRUM-94 for lockout, and future Sprint 2/3 stories).

## Agile Testing Quadrants recap

| Quadrant | Facing | Purpose | Typical tests |
| --- | --- | --- | --- |
| Q1 | Technology | Supporting the team | Unit tests, component tests, API contract tests |
| Q2 | Business    | Supporting the team | Functional acceptance tests, story tests, examples |
| Q3 | Business    | Critiquing the product | Exploratory testing, usability review, UAT |
| Q4 | Technology  | Critiquing the product | Performance, load, security, chaos |

Q1 answers "did the developer build it right." Q2 answers "did we build
the right thing for the story we agreed to." Q3 and Q4 poke at the built
system to find what nobody thought to specify. All four are necessary;
none replaces another.

## Current test inventory (on `main` at 2026-09-16)

Counts include only tests that actually run. Playwright specs are
inventoried separately because most of them are scaffolded but skipped.

| Test suite | Files | Active tests | Skipped / fixme |
| --- | --- | --- | --- |
| `backend/tests/*.test.ts` (Node test runner) | 9 | 30 | 0 |
| `tests/runtime/api-runtime.test.mjs` | 1 | 11 | 0 |
| `tests/notifications/*.test.ts` | 2 | ~24 | 0 |
| `tests/redis/*.test.ts` | 1 | ~8 | 0 |
| `tests/e2e/*.spec.ts` — implemented flows | 5 | ~12 | 0 |
| `tests/e2e/e01.spec.ts` .. `e14.spec.ts` — scaffold | 12 | 0 | 238 |
| **Total** | 30 | **≈85** | 238 |

The 238 skipped e2e cases are the workbook-derived test case scaffold
(`TC_E01S01_01` .. `TC_E14S02_09`) sitting in `test.fixme()` blocks,
waiting for backend endpoints to exist. That is by design: they were
added upfront so the traceability is visible even before the code exists.

## Quadrant categorisation

### Q1 — Technology-facing, supporting the team

**What we have:**

- `backend/tests/registration.test.ts` (30 cases): password policy,
  email normalisation, duplicate rejection, whitespace handling. Pure
  unit style using a fixture repository.
- `backend/tests/profile.test.ts`: forbidden-field overrides
  (`role`, `is_active`, `locked_until`, `password_hash`, etc.), missing
  or disabled identity guard, duplicate-email-on-update.
- `backend/tests/eventVisibility.test.ts`: unauthenticated /
  unlinked / inactive / lockout-guard / cross-role access refusal.
- `tests/runtime/api-runtime.test.mjs`: every deployed API handler
  compiles under Node, boots without provider credentials, and refuses
  unauthenticated calls with the expected status code. Blocks outgoing
  fetch so a leaky provider dependency would fail loudly.
- `tests/notifications/postgres.test.ts`: outbox transaction semantics,
  RLS, migration preservation. Uses a disposable Postgres 17 database.
- `tests/redis/transport.test.ts`: Lua-script queue behaviour, capacity
  limits, legacy-byte preservation. Uses a disposable Redis service.

**Verdict:** Solid Q1 coverage for the features that exist. The Node
`--test` runner, isolated fixtures and disposable services give
reproducible results, and the runtime smoke test guarantees that no
handler regresses to "crashes on load."

**Gap:** No component-level tests for the frontend feature slices
(`AttendeeEvents`, `ClientEvents`, `OrganiserRequestFlow`, `RegisterForm`,
`ProfileForm`, and the four Sprint 2 role screens introduced in
SCRUM-96..99). Playwright covers user-visible behaviour but not
component-level state, prop contracts, or accessibility invariants.
Adding a lightweight Vitest + Testing Library harness would close this
gap without switching test runners.

### Q2 — Business-facing, supporting the team

**What we have:**

- `backend/tests/*.integration.test.ts` (5 files): end-to-end backend
  flows that assert on the actual API response shape, cookie session
  behaviour, and PostgreSQL side-effects. These are the strongest Q2
  evidence in the repo today. They are behaviour-scoped, not
  implementation-scoped, so they survive refactors.
- `tests/e2e/attendee-events.spec.ts`, `client-events.spec.ts`,
  `registration.spec.ts`, `profile.spec.ts`, `landing.spec.ts` (added
  by SCRUM-95): five active Playwright flows that assert on rendered
  UI plus intercepted network calls. Covers the signed-out landing,
  registration validation, login success and failure, attendee event
  discovery, and organiser event visibility.
- Sprint 2 branch (PR #53) adds four more spec files covering
  Coordinator, Venue Staff, Technical Support, and Admin role home
  screens with 19 additional active tests. Not yet on `main`.

**Verdict:** The stories that have shipped code (registration,
profile update, event visibility, attendee visibility, venue catalogue)
have real Q2 evidence. The AI-assisted QA quiz gap that started this
discussion — "high coverage does not equal business-requirement
coverage" — is answered concretely: our tests exercise duplicate
emails (Scenario 2 of E01-S08), cross-client access refusal (E01-S02),
attendee visibility restrictions (E01-S03), and profile
forbidden-field enforcement. None of those are captured by pure line
coverage of the happy path.

**Gap — stories with no Q2 evidence yet:**

| Story | State | Notes |
| --- | --- | --- |
| E01-S01 Log in to the system | Backend service `login()` exists; no Q2 integration or e2e that exercises the full login flow end-to-end. |
| E01-S04 Update account details | Backend integration test exists (`profile.integration.test.ts`); e2e (`profile.spec.ts`) exists but only 1 active case. |
| E01-S08 Create an account | Backend + e2e exist. |
| E01-S11 Deactivate my account | No implementation, no tests. |
| E02-S01 Submit an event request | Frontend `OrganiserRequestFlow.tsx` exists; e2e is scaffolded but skipped. No backend endpoint. |
| E02-S02 Save a draft event request | No implementation, no tests. |
| E02-S03 Match accessibility requirements to venue features | No implementation, no tests. |
| E05-S01 Maintain the venue catalogue | Backend integration test exists. No e2e. |
| E05-S02 Match layout requirements to venue capacity | No implementation, no tests. |
| E14-S02 Record significant actions | No implementation, no tests. |

Twelve Sprint 1 stories carry story points but only five of them have
Q2 evidence. That is the concrete AI-QA gap the class quiz points at:
line coverage on the shipped code is high, but the *business*
requirement coverage across the sprint is under half.

### Q3 — Business-facing, critiquing the product

**What we have:** Nothing automated. No exploratory testing sessions
are recorded. No usability review evidence. No UAT walkthrough
transcripts.

**Verdict:** This is the biggest gap in the audit and the one AI
cannot fix. Q3 is human work: a stakeholder walks through the shipped
UI on real devices, tries to break it, and notes what surprises them.

**Recommendation:** Schedule at least one Q3 pass per sprint before the
increment is considered done. Bryan or a teammate takes the deployed
Vercel preview, runs through the Definition of Done acceptance
criteria for each shipped story, and files observations. Twenty
minutes per sprint would catch the class of bug that automated tests
by construction cannot see.

### Q4 — Technology-facing, critiquing the product

**What we have:**

- `.github/workflows/lfs-guard.yml` — repository hygiene against a
  specific failure mode (accidentally storing large binaries).
- `tests/notifications/postgres.test.ts` — exercises real transaction
  boundaries and lock behaviour. This has a Q4 flavour because it
  probes concurrency, not just success.
- `tests/redis/transport.test.ts` — queue capacity, capacity limits,
  legacy-byte preservation. Same reasoning.

**Verdict:** Some Q4 coverage exists at the transport layer, none at
the application layer. There is no:

- Performance benchmark against BDR T-51 (three-second target for
  venue search, availability calendar, and registration submission).
  The test case scaffold has `TC_PERF_01` recorded but it does not
  run.
- Load test that shows the system holds under the ADR-001 target of
  ~500 internal staff.
- Automated security scan beyond `detect-secrets` and
  `detect-private-key` at commit time.
- Authorisation regression matrix that fuzzes every endpoint against
  every role.

**Recommendation:** The Q4 gap is real but low urgency for the
coursework release. Prioritise T-51 performance measurement once the
venue search endpoint exists (Sprint 3 per BDR C-60). Consider
introducing an authorisation matrix test that iterates roles against
endpoints and asserts the expected 401/403/200 pattern.

## Coverage against the Release 1 backlog

The Release 1 backlog (now in `docs/backlog/release-1/`) holds 47
stories. Story-level coverage as of today:

| Coverage state | Story count | Comment |
| --- | --- | --- |
| Shipped code, has Q1 + Q2 evidence | 5 | E01-S02, E01-S03, E01-S04, E01-S08, E05-S01 |
| Shipped code, has Q1 only | 0 | (none isolated to Q1) |
| Shipped code, has Q2 only | 0 | (none isolated to Q2) |
| Not shipped, has Q2 e2e scaffold (test.fixme) | ~40 | All e01–e14 scaffold cases |
| Not shipped, no Q2 evidence at all | ~2 | Cross-cutting items |
| Total | 47 | |

The five stories with real end-to-end evidence are the ones with
merged pull requests. The twelve stories accepted into Sprint 1 that
still sit in "In Review" or "To Do" have no automated Q2 evidence
because their implementation is not on `main`.

## Coverage against the workbook test-case catalogue

The migrated `docs/testing/cases/*.md` catalogue holds 230 test
cases. Of those:

- 5 cases are covered by Playwright active flows on `main` (mainly
  E01-S01 dashboard redirect, E01-S02 own-client-only listing,
  E01-S03 internal-planning refusal, E01-S04 profile update
  scenarios, E01-S08 create-account scenarios).
- 12 additional cases are covered by backend integration tests
  (duplicate-email 409, forbidden-field 400, cross-client 403, etc).
- The other ~213 cases are scaffolded (`test.fixme` in `e01.spec.ts`
  through `e14.spec.ts`) but not implemented.

Automation ratio today: ~17 / 230 = 7.4%. Cited so the number is
concrete rather than aspirational.

## Cross-cutting gaps

1. **Login lockout state machine (E01-S01 Scenario 3).** The users
   table carries `failed_login_count` and `locked_until` and the guard
   refuses signin when either is set. What is missing is the
   *transition*: nothing writes `locked_until` when the counter hits
   the threshold. SCRUM-94 tracks the fix. Automated evidence for
   this scenario cannot exist until the feature does.
2. **Email verification token flow (implied by E01-S08 acceptance
   criterion 4).** No verification table, no expiry model, no endpoint.
   SCRUM-93 tracks the fix. Without the feature, the class-quiz
   "expired verification tokens" gap is a feature gap and only shows
   up as an unautomated test case, not a broken test.
3. **Frontend component tests.** No Vitest + Testing Library harness
   exists. The Playwright suite is the only frontend layer with
   assertions.
4. **Q3 exploratory / usability evidence.** Nothing recorded. This is
   the single biggest gap in this audit that automation cannot close.
5. **Q4 performance evidence against BDR T-51.** The three-second
   target is documented as an acceptance criterion at the Definition
   of Done level but nothing measures it.

## Recommended near-term actions

- Sprint 1 close-out: implement SCRUM-93 and SCRUM-94 so the two
  outstanding class-quiz gaps have a feature to test against.
- Sprint 2 spike: introduce Vitest + Testing Library for component-
  level tests. Start with the four role-home components landing in
  SCRUM-96..99.
- Sprint 2 spike: adopt a lightweight authorisation matrix test that
  iterates roles against endpoints. Would catch the "one missed
  guard is a data leak" risk documented in ADR-008.
- End of Sprint 1: 20-minute Q3 exploratory session against the
  deployed Vercel preview, notes captured as a follow-up in this
  document.
- End of Sprint 3: measure the venue-search response time against
  BDR T-51 on a realistic catalogue (50 venues, 200 bookings).

## What this audit does not tell you

- Coverage of the Product Backlog (71 stories beyond Release 1). Out
  of scope; those stories are not being implemented this term.
- Coverage against a specific quality attribute like accessibility
  compliance (WCAG). No accessibility audit is in the repo. Adding
  one requires a separate exercise.
- Whether the tests we do have are *good* tests. The audit counted
  test files and cases; it did not review individual assertions for
  triviality or over-fitting to implementation. That is a code-review
  concern, not an audit concern.
