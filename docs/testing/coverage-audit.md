# Coverage audit — September 2026

A point-in-time audit of the three coverage tools wired up in
[PR #105](https://github.com/hongyime/sgConnectSphere2026/pull/105), refined
by [PR #111](https://github.com/hongyime/sgConnectSphere2026/pull/111) and
[PR #113](https://github.com/hongyime/sgConnectSphere2026/pull/113). This
doc records what each tool currently measures, calls out gaps that are
genuinely broken versus deliberate deferrals, and lists recommended
follow-up work without introducing a new enforced gate.

Nothing here removes or replaces the existing `c8` / `@vitest/coverage-v8` /
`coverage.py` setup; the audit's job is to make the shape of what they
measure legible.

## Snapshot

| Runtime | Tool | Config | Verdict |
| --- | --- | --- | --- |
| Backend Node (`tsx --test`) | `c8` | Defaults only (no `.c8rc.json`) | **Two gaps** — see §1 and §2 |
| Frontend Vitest | `@vitest/coverage-v8` | `frontend/vite.config.ts` | **Fine** — explicit include/exclude, matches source layout |
| Python tooling | `coverage.py` | `.coveragerc` | **Fine** — `source = scripts/` matches where the code actually lives |
| Aggregate | `npm run test:coverage` | `package.json` script chain | **One mild gap** — see §3 |
| Enforced thresholds | — | Not configured on any of the three | **Deliberate deferral** — see §4 |

## 1. Gap: backend `c8` runs on `test` only, missing integration and auxiliary suites

`backend/package.json` wraps `c8` around the `test` script only:

```json
"test":    "c8 tsx --test tests/registration.test.ts tests/eventVisibility.test.ts ...",
"test:db": "c8 tsx --test tests/registration.db.test.ts tests/eventVisibility.integration.test.ts ...",
"test:profile":    "c8 tsx --test tests/profile.test.ts",
"test:profile:db": "c8 tsx --test tests/profile.integration.test.ts",
"test:auth:db":    "c8 tsx --test tests/loginRecovery.integration.test.ts",
"test:coverage":   "c8 report --reporter=text --reporter=lcov --reporter=json-summary"
```

Each `c8` invocation writes to `backend/coverage/tmp/`, but every fresh run
overwrites the last. When `npm run test:coverage:backend` from the root runs
the `test` script and then the `test:coverage` script emits the report,
that report reflects **only the files loaded by `test`**. Integration tests
under `test:db`, `test:profile:db`, and `test:auth:db` never contribute
to the aggregate report even though they exercise real code paths.

This is not "wrong" in isolation — the `test` suite is the intended
unit-test coverage gate — but the report's headline percentage understates
what the full suite exercises. Two remediations, either is fine:

- Merge the integration/DB runs into a single `c8` invocation (`c8 --merge`
  or a shell chain that keeps `--report-dir` stable).
- Rename the metric so the report title makes clear it is unit-test
  coverage only.

Neither is applied in this PR because the choice needs product-side input
on what "backend coverage" should mean for the assessment rubric.

## 2. Gap: `api/` files invisible when no test imports them

`c8` has no `include` or `--all` flag set, so it only records coverage
for files actually loaded by the Node process during the test run. The
Vercel serverless handlers under `api/` (11 files as of this audit) are
imported by exactly three backend tests today:

| Test file | api/ file loaded |
| --- | --- |
| `backend/tests/registration.test.ts` | `api/auth/register.ts` (via the exported handler factory) |
| `backend/tests/profile.test.ts` | `api/account/profile.ts` |
| `backend/tests/deactivation.test.ts` | `api/account/deactivate.ts` (if present) |

The remaining `api/` files (`events.ts`, `health.ts`, `attendee/events.ts`,
`auth/session.ts`, `cron/outbox-relay.ts`, `events/publish.ts`,
`internal/planning.ts`, `notifications/send.ts`, `venues/index.ts`) are
never loaded by any test in the current `test` set, so `c8` neither
reports them as 0% nor lists them at all. They are **silently unmeasured**,
which is a legitimate reporting bug: a rubric-driven reader looking at
the coverage output would not know these files exist.

The minimal fix is a `.c8rc.json` at `backend/` root:

```jsonc
{
  "all": true,
  "src": ["src", "../api"],
  "exclude": ["**/*.d.ts", "**/*.test.ts", "**/*.integration.test.ts"]
}
```

This surfaces every source file — including untested `api/` handlers — as
0% in the report. It does **not** change any test behaviour or add an
enforced gate. It is not applied in this PR because it will produce a
noticeably longer coverage report the first time it runs, and the team
should look at the number cold before deciding whether to also carve out
a Vercel-cron-only exception (`api/cron/outbox-relay.ts` is not
straightforwardly testable without a Vercel scheduler).

## 3. Gap: no unified summary from `npm run test:coverage`

`npm run test:coverage` chains the three per-tool commands sequentially:

```
npm run test:coverage:backend  &&  npm run test:coverage:frontend  &&  npm run test:coverage:tooling
```

Each tool prints its own summary line to stdout (c8's text reporter,
Vitest's text reporter, `coverage.py`'s `report` output), but a reader
still has to eyeball three separate blocks and mentally combine them.
Each tool also emits a machine-readable summary (`json-summary` for c8
and v8; `coverage json -o coverage-tooling.json` is available for
`coverage.py`), so a small aggregator that prints one three-line table
would be straightforward to add.

Not fixed in this PR. Filed here so it stays visible; feel free to open
a follow-up like `chore(ci): aggregate coverage summary output` if a
reviewer wants it.

## 4. Deliberate: no enforced thresholds

`docs/repository-setup.md:256` records the deliberate decision to defer
threshold choice:

> Coverage numbers on their own are not proof of correctness. Choose
> thresholds after seeing the real code and its shape.

Nothing in `docs/decisions/` overrides this. `docs/plans/sprint-1-retrospective.md`
and `docs/testing/qa-audit-agile-quadrants.md` both discuss coverage
qualitatively without prescribing a numerical gate.

This audit **does not** propose a threshold. Doing so unilaterally would
add a CI gate that could reject unrelated future PRs on a number the team
never agreed to. If a coursework-rubric target ("100% coverage unless not
possible and stated why", per the frontend verification plan's rubric
quote) hardens into a team decision, it belongs in `docs/decisions/`
first, then wired into the three tools' configs in a follow-up.

## 5. Fine as-is (explicitly)

- **Frontend Vitest / v8** — `frontend/vite.config.ts` sets
  `coverage.provider = 'v8'`, `include: ['src/**/*.{ts,tsx}']`, and
  excludes `src/testing/**` and `*.test.{ts,tsx}`. This is a complete,
  correct configuration for the current frontend layout.
- **Python `coverage.py`** — `.coveragerc` has `source = scripts/` and
  omits `scripts/one_shot/*` and `scripts/setup.py`. `tooling/` contains
  only `requirements.txt` and `tests/` (no source code to measure), so
  `source = scripts/` is exactly right. `omit` of `setup.py` is correct
  because that script runs once at clone time and is not exercised by
  the tooling test suite.
- **`scripts/coverage_tooling.py`** — uses the shared
  `scripts/tooling_env.python_path()` pattern, so it works identically
  on local `.venv-tools/` clones and on the Windows network-share cache.

## Summary of recommended follow-up

None of these are enforced by this PR. Track separately if the team
wants them:

1. Decide backend-coverage scope: unit-only (rename it in docs) or
   combined unit+integration (`c8 --merge` across `test`, `test:db`,
   `test:profile:db`, `test:auth:db`, `test:deactivation:db`).
2. Add `backend/.c8rc.json` with `all: true` + `src: ["src", "../api"]`
   so `api/` handlers show up in reports even when no test imports
   them.
3. Optional: `scripts/coverage_summary.py` that reads the three
   `coverage-summary.json` files and prints one aggregated table.
4. Threshold choice, if any, gets a `docs/decisions/` entry first —
   not a config-file surprise.

## Provenance

Audit conducted against `main` at commit `439d12c` (test(backend):
SCRUM-110 -- live PostgreSQL roundtrip for migration 0005, #115).
Evidence gathered from:

- `backend/package.json`, `frontend/vite.config.ts`, `.coveragerc`
- `scripts/coverage_tooling.py`, `scripts/tooling_env.py`,
  `scripts/check.py`
- `docs/repository-setup.md`, `docs/contributing/writing-tests.md`,
  `docs/decisions/`, `docs/plans/sprint-1-retrospective.md`
- `git grep` for imports from `api/` under `backend/tests/`
- Local runs of `npm run sbom` (unrelated PR #125) confirming npm 12.0.2
  and the `.venv-tools/` interpreter path both resolve correctly.
