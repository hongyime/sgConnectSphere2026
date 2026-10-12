# Week 9 customer Q&A archive and reconciliation

Goal: archive the customer-provided project materials in the repository, record the Week 9 customer answers in the canonical BDR Markdown using the existing clarification format, and reconcile answered items in the open-question register without presenting team assumptions as customer requirements.

## Done so far

- Read the repository contribution, source-of-truth, BDR, and handoff guidance.
- Copied eight supplied source materials into `docs/bdr/customer-sources/`; all copies matched their originals by SHA-256.
- Inspected the Week 9 clarification workbook. It contains 66 Q&A rows; the answers are recorded as C-71 to C-136 in workbook order.
- Updated O-01, O-03, O-04, O-06, O-07 and O-10, reconciled O-20 to O-44, and added residual items O-45 to O-49. Conflicts and partial answers remain explicit.
- Updated the BDR README and change log to version 7 and refreshed the source-of-truth export references.
- Regenerated the ADR and BDR Word exports from Markdown.
- Created branch `docs/week9-customer-qna`.

## Not done / next step

- Downstream backlog and architecture reconciliation remains separate work, especially O-10, O-23, O-24, O-40 and O-42.
- Any follow-up PR must leave `.agents/STATE.md` and `.agents/JOURNAL.md` to the repository owner's consolidation workflow.

## Decisions for reviewer

- Keep original customer wording in the answer column; summarize its effect separately.
- Preserve the answer workbook's question order and label team-owned choices as delegated rather than as customer decisions.
- Leave Week 9 conflicts open: C-107 versus C-62/T-48 on sessions, C-111 versus C-119 on open-ended blocks, and C-120/C-132/C-134 versus earlier team defaults.
- Do not edit `.agents/STATE.md` or `.agents/JOURNAL.md`.

## Verification

- Confirmed C-71 to C-136 match all 66 source workbook rows; clarification IDs C-01 to C-136 and open-question IDs O-01 to O-49 are contiguous.
- Confirmed all eight source copies are byte-identical to their originals.
- Validated `BACKLOG DECISION REVIEW CAA 121026.docx` against the prior export with the DOCX XSD validator (`python -X utf8 ... --original ...`): passed with no new validation errors.
- Rendered-preview check could not run because LibreOffice `soffice` is unavailable on this host.
- `pre-commit run --files ... --show-diff-on-failure` passed on this task's files.
- `python scripts/check.py` ran but returned 1 because the mixed-line-ending hook found session-start edits in protected `.agents/STATE.md` and `.agents/JOURNAL.md`. Those files remain unstaged; the check did not proceed to its later environment-template and tooling-test steps.
