# Prospective Definition of Done and source-of-truth clarification

Prepare a clean main-based replacement for PR #312 that records the PO's adoption decision while keeping the proposed policy prospective and awaiting independent team review.

## Scope and decisions

- Port the 18 October exact-quote audit and concise prospective policy proposal from PR #312 without rewriting Sprint 3 records or repository policy.
- PO confirmed adoption on 21 October 2026. The proposal remains prospective and does not take effect until this reviewed PR merges.
- No Jira status, sprint, estimate, or acceptance criteria changes are included.
- The prior PR targeted another documentation branch and included that branch's history; this branch is based on current `main` for a narrow replacement. Keep #312 open until this replacement is pushed and verified, then close #312 in favor of it.

## Verification

- Before committing, run `python scripts/check.py` and record the observed outcome in a new immutable T-65 tooling record if cited as evidence.
- Confirm the PR diff against `main` contains only this handoff, the proposal, the supporting audit, and any new test-run record.
- Keep `.agents/STATE.md` and `.agents/JOURNAL.md` unchanged.

## Remaining

- Add the PO adoption confirmation to the proposal, preserving the requirement for independent team review and merge before policy takes effect.
- Push the branch, open the replacement PR into `main` with all four required PR sections and accurate verification, then close #312 as superseded only after the replacement PR exists.
- Independent team review and required checks remain outstanding; do not merge without them.
