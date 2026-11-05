# README command verification

Source snapshot: main `0773a721`, 5 November 2026. The immutable
[execution record](../testing/runs/20261105-232435-xiangyingg-full-regression.md) records commands, counts, safeguards
and failed setup attempts. The clone was independent, created from the local
repository object source and checked out at the same main commit; it did not
reuse installed dependencies or private configuration.

| Command / workflow | Observed result |
| --- | --- |
| Fresh clone, npm ci, Python setup, copy .env.template | Completed. Supported Node used for final install/testing: 22.23.4. |
| Native PostgreSQL create, migration, seed, validation | Passed on separate disposable loopback databases; never shared Supabase. |
| Explicit Node --env-file=.env API/CLI commands | Passed. Bare npm backend dev does not load the root env file. |
| Frontend npm dev and API proxy/login | HTTP 200, seeded login HTTP 200; verification used alternate free ports. |
| npm run typecheck; npm run build | Passed, with existing build warnings. |
| npm test --workspace backend | 734 passed, 1 optional skip, no failures. |
| npm test --workspace frontend | 851 passed. |
| npm run test:runtime | 26 passed. |
| npx playwright install chromium; npm run test:e2e:auth | 58 passed, desktop/mobile, real PostgreSQL. |
| npm run test:mutation | Completed; 72.73% mutation score, not whole-application coverage. |
| python scripts/check.py | Passed 197 repository tooling tests. |

Initial e2e setup was refused because the database name did not match the fixture's
required prefix. A new correctly named disposable database fixed the setup;
the guard was never bypassed. Initial Node 22.20 dependency warnings motivated the
README's explicit 22.22.2+ prerequisite. Initial sandbox tsx socket rejection
was resolved by running the same command with authorized local networking.

The deployment section describes the existing workflow; no deployment command
was executed. The broad acceptance scaffold command is contextual documentation,
not a claim that every fixme case is implemented. These runs are automated,
not replacements for the team's required hand-taken manual evidence.
