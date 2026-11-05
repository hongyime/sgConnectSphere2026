---
date: 2026-11-05T23:24:35+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: automated
test_case_version: "051126"
database: real
commit: 0773a72
---

# Clean-clone README verification

An independent fresh local Git clone was checked out at `0773a72`
(`git rev-parse --short=7 HEAD`). No existing node_modules or .env was copied.
Dependencies and Python tooling were installed in the fresh clone. Supported
runtime: Node 22.23.4. Only disposable native loopback PostgreSQL databases
were used; no shared Supabase reset, live email or deployment was performed.
The README is a documentation diff on this unchanged application snapshot.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Fresh clone and tooling setup | PASS | `git clone --no-hardlinks --single-branch --branch main` followed by checkout of 0773a721; `npm ci`; `python scripts/setup.py`; `cp .env.template .env`. Independent clone from local repository object source, not a remote network clone. Initial Node 22.20 emitted locked dependency engine warnings; final supported-runtime install and tests used 22.23.4. |
| MULTIPLE | Local database setup | PASS | `createdb`, CLI migrate, seed and validate passed. Root `node --env-file=.env --import tsx backend/src/database/cli.ts` commands for migrate/seed/validate also passed against a new local database. Native PostgreSQL 17 used a nondefault loopback port and local test role; private connection strings are omitted. |
| MULTIPLE | Backend units | PASS | `npm test --workspace backend`: 735 tests, 734 passed, 1 optional database-contract skip, 0 failed. First sandbox attempt could not create tsx IPC socket; rerun outside sandbox passed. |
| MULTIPLE | Frontend units | PASS | `npm test --workspace frontend`: 851 passed. |
| MULTIPLE | Types and production build | PASS | `npm run typecheck` and `npm run build` passed; existing dynamic-import build warnings retained. |
| MULTIPLE | Runtime | PASS | `npm run test:runtime`: 26 passed. |
| MULTIPLE | Real-stack browser suite | PASS | `npx playwright install chromium`; `TEST_DATABASE_URL=<disposable-loopback-database> npm run test:e2e:auth`: 58 passed, desktop and mobile, 4.9 minutes. Test files started local API port 3006 and frontend port 5176. Provider calls were not live. |
| MULTIPLE | E2E unsafe-name guard | PASS | Initial e2e attempt used a different local database name; guard refused it before browser execution (20 failed setup cases, 38 not run). Reran using the required connectsphere_notification_test prefix; no guard bypass. |
| MULTIPLE | Mutation testing | PASS | `npm run test:mutation` completed: score 72.73%, 288 killed, 97 survived, 11 uncovered, no mutant errors/timeouts. Scope is configured lifecycle service/status only; break threshold 0. Success does not mean 100% mutation coverage. |
| MULTIPLE | Local frontend/API login | PASS | README .env Node API command and npm frontend startup served local HTTP 200; synthetic Organiser login through the proxy returned HTTP 200. Used alternate free ports 3010/5179 to avoid existing user servers. Root npm dev wrapper does not forward alternate flags reliably; the workspace command handled that override. |
| MULTIPLE | Repository hygiene/tooling | PASS | Fresh clone `python scripts/check.py` passed 197 tooling tests. This is not an application test claim. |

## Design-pack verification after authoring

- `docs/design/render.py` ran end to end using pinned npx Mermaid CLI 12.2.0:
  13 SVG/PNG/PDF sets and a 14-page combined PDF. Its page-count self-check passed.
- Every individual PDF and all combined pages were rasterized and inspected;
  PNG and browser-rendered SVG views were inspected. An overlapping context-DFD
  label found in QA was shortened, fully defined in Markdown and rerendered.
  All 14 final combined pages contain text within page bounds.
- Local Markdown link checks passed. `python scripts/check.py` on the
  documentation working diff passed repository hygiene and 197 tooling tests.
  `python scripts/doc_guard.py` passed with 0 errors / 175 existing metadata
  warnings. PostPlan structural check and browser visual review passed.
- Builder rendering is verified end to end rather than by tests duplicating
  the Mermaid CLI. No new application logic or application unit coverage claim.

Generated diagrams, SVG/PNG/PDF inspection and final documentation checks are
recorded in the PR's verification section after authoring. No new manual test
record, human acceptance, deployment result or live-provider verification is claimed.

## Packaging and scanner follow-up (same unmerged session record)

The origin/main archive was created after PR #437 opened: main
`0773a721ff192086fcee66894fa06bffde11083c`, 3,234 entries, 113,354,304 bytes.
Archive inspection found no private .env files, .git directory or node_modules.
The repository's detect-secrets hook (same --no-verify setting and SBOM exclusions)
scanned the extracted archive in batches with zero findings. No secret values
were printed. This is the requested current-main snapshot and must be regenerated
after all teammate PRs merge.

Hosted Semgrep flagged the renderer's XML-library import although it only escaped
plain text. Replaced it with standard html.escape without a suppression; the
complete Mermaid/render builder rerun passed 13 format sets and 14 combined pages.
No application behavior changed.
