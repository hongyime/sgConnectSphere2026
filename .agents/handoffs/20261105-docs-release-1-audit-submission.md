# Release 1 audit and submission handoff

Audit Release 1 against the original customer sources, course methods, live Jira and current `main`; correct traceability defects and prepare the external seven-folder submission package (source: `docs/source-of-truth.md`).

## Done so far

- Read the customer archive in date order, lecture slides, repository workflow,
  instructor guidance and canonical backlog/testing material.
- Queried Jira read-only and verified the current team-name mapping without
  recording account identifiers.
- Kept the audit separate from the canonical backlog and TC-coverage source:
  those files are carried by the product-backlog and test-case owners.
- Added `docs/plans/release-1-audit-20261105.md`, including provenance, factual
  gaps and package limits.
- Diagnosed the latest `main` CI failure as an asynchronous focus assertion in
  `SessionEditor.test.tsx`; the test now waits for the existing focus effect.
- Stabilised the two observed asynchronous component assertions locally without
  changing global Vitest or Testing Library timeouts. The initial full frontend
  coverage run passed 851/851 tests; the backend unit coverage suite and
  repository check also passed.
- Prepared audit findings and an external confirmation checklist. Slide-deck
  content remains with its designated owner.
- Committed the audit as `72e84b27 chore(release): audit Release 1 evidence`,
  pushed `docs/release-1-audit-submission`, and opened PR #436.

## Next steps

- Wait for PR #436 CI and the required human review before describing the
  branch as merged or deployed. The branch is intentionally reduced to
  audit-only scope; #442 carries the canonical backlog and #439 owns the deck.

## Decisions for review

- This branch reports, rather than silently implements, the material E03 Lead
  assignment and E06 tentative-hold lifecycle gaps. The latter needs a Product
  Owner decision on whether an unconfigured requested hold reserves a venue.
- Historic Done stories are preserved; later customer behaviour is documented
  as follow-up work in accordance with T-74.

## Commands run

- `python scripts/setup.py` — passed.
- `npm run test:coverage:frontend` — 851/851 passed across 76 files, frontend
  V8 statements 84.13%; recorded in the new frontend test-session record.
- `npm run test:coverage:backend` — passed; recorded in the new backend unit
  test-session record.
- `npm run typecheck` and `npm run build` — passed.
- `python scripts/check.py` — passed with intentional-secondary-worktree
  warnings; recorded in the new tooling test-session record.
- Read-only GitHub Actions inspection found the latest `main` application-checks
  job failed one focus assertion (850/851 frontend tests passed).

## Blockers and [CONFIRM]

- The local lecture archive does not contain the official final-deck template.
- Existing materials do not substantiate missing Sprint 2–4 ceremony minutes,
  general normal-Inbox/timeliness notification evidence, or Product Owner
  acceptance.
