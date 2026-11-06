# 20261106-docs-release-1-backlog-estimates-reconciliation

Reconcile Release 1 and Product Backlog estimates, backfill closed Sprint 5 allocations from Jira, resolve customer ambiguity under Team Decision T-80, and export snapshot workbooks.

## What and why

- Restored verified source estimates for E01-S12 (5), E01-S13 (5), E07-S08 (5), E07-S09 (5), and E08-S06 (8) totaling 28 points.
- Estimated the remaining 7 unestimated backlog stories based on peer story sizing and Product Owner direction: E03-S08 (5), E03-S09 (3), E03-S10 (3), E03-S11 (3), E03-S12 (1), E06-S07 (5), and E14-S03 (2) totaling 22 points. Release 1 scope now totals exactly 65 stories and 252 story points with 0 unestimated stories.
- Queried live Jira to verify sprint allocations: backfilled `Sprint 5` for stories completed in Sprint 5 (`E02-S05`, `E02-S07`, `E04-S02`, `E07-S08`, `E07-S09`).
- Confirmed resolution of C-111 vs C-119 customer conflict on venue unavailability blocks under Team Decision T-80: the application, backend API and PostgreSQL range constraints support both bounded and open-ended maintenance blocks until lifted.
- Enhanced `scripts/export_backlog_xlsx.py` with timestamped snapshot exports, visible Excel oddHeader and A1 comments, dynamic aggregation, and dedicated `JIRA SNAPSHOT` worksheet. Re-exported snapshot workbooks to `docs/` and `submission/1. PRODUCT BACKLOG/`.

## Verification

- `python scripts/check.py`: Passed repository hygiene, pre-commit hooks, secrets detection, and all tooling tests.
- `python scripts/doc_guard.py origin/main`: Passed with 0 errors.
- Programmatic verification with `openpyxl`: exactly 65 stories in Release 1, 252 total points, 0 unestimated stories.

## Review fixes (Aaron, 6 Nov)

- `scripts/export_backlog_xlsx.py`: `--snapshot-note` now defaults to none, so a plain run adds no snapshot header or sheet; the JIRA SNAPSHOT sheet keeps only values computed from the Markdown (the hard-coded 6 Nov date, CSV name, status counts and estimate lists went stale in every later export). The `try/except TypeError` around `_output_path` became a plain condition.
- Audit doc: the Points and Sprint table rows now say what changed on 6 Nov; the Sprint `[CONFIRM]` line now matches the Jira snapshot (E01-S12, E01-S13 and E03-S08/S09/S10 are not in Sprint 3 in Jira); E03-S08's 5 vs SCRUM-153's 8 is a new `[CONFIRM]`.
- `submission/1. PRODUCT BACKLOG/_CONFIRM-product-backlog.md` and the requirements register updated to match. The PDF in that folder was not regenerated.
- Workbooks regenerated with `--date 061126 --time 0744 --snapshot-note "..."`.

## Learnings

- `tooling/tests/test_backlog_roundtrip.py` replaces `_output_path` with a one-argument lambda; call it with one argument when no `--time` is given.
