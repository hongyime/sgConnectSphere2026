# README command verification

Source snapshot: `main` `0773a72`. This page records what was actually executed
when preparing the Release 1 README and System Design pack, and keeps verified
results separate from results that still need an independent re-run.

## Verified in this submission pass

Run by `xiangyingg` on 6 November 2026, recorded in the immutable
[tooling execution record](../testing/runs/20261106-012007-xiangyingg-tooling.md).

| Command / workflow | Observed result |
| --- | --- |
| `python scripts/check.py` | PASS. 197 repository tooling tests passed; final line "PASS: repository hygiene and tooling tests." |
| `python docs/design/render.py --output "submission/3. SYSTEM DESIGNS"` | PASS. Reproduced 13 SVG/PNG/PDF sets and the 14-page combined PDF from the committed `docs/design/*.mmd` sources (Mermaid CLI 12.2.0). Builder printed "Verified 13 SVG/PNG/PDF sets and 14 combined pages"; page count confirmed as 14. |

The Python check covers repository hygiene and tooling only. It does not run
application lint, build, tests or deployment, and a green tooling run is not
proof of any application behaviour or story acceptance.

## Application suites — pending independent re-verification

The figures below were reported by an earlier preparation session against the
same `main` commit. They are **not** re-attested here: the application suites
(backend, frontend, Playwright and mutation) were not re-run in this submission
pass, so they are carried as a [CONFIRM] item rather than as verified evidence.
A teammate should re-run them and record the outcome in a new immutable
`docs/testing/runs/` record before the figures are cited as acceptance evidence.

| Command / workflow | Earlier-reported result (unverified in this pass) |
| --- | --- |
| Fresh clone, `npm ci`, Python setup, copy `.env.template` | Reported completed on Node 22.23.4. |
| Native PostgreSQL create, migration, seed, validation | Reported passed on disposable loopback databases; never shared Supabase. |
| `npm run typecheck`; `npm run build` | Reported passed, with existing build warnings. |
| `npm test --workspace backend` | Reported 734 passed, 1 optional skip. |
| `npm test --workspace frontend` | Reported 851 passed. |
| `npm run test:runtime` | Reported 26 passed. |
| `npm run test:e2e:auth` | Reported 58 passed, desktop/mobile, real PostgreSQL. |
| `npm run test:mutation` | Reported completed; 72.73% mutation score (module-scoped, not whole-application). |

These application runs are automated and are never a substitute for the team's
required hand-taken manual evidence (T-93). The deployment section of the README
describes the existing workflow; no deployment command and no live email send was
executed in this pass.
