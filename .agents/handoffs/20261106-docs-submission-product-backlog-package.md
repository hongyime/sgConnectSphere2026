# Product backlog package into the submission package

**Goal.** Add the final Jira exports (final and pre-audit CSVs), the generated Product Backlog PDF, and the confirmation checklist to `submission/1. PRODUCT BACKLOG/` — the graded deliverables that correspond to the audited Release 1 backlog merged via #442. Follow-up to #442, now that `submission/` and its 50 MB allowance are on main (#444).

**Scope.** Touches only the Bryan-owned `submission/1. PRODUCT BACKLOG/` subfolder (per `submission/README.md` ownership table). Files added:
- `Jira-backlog-final-20261106.csv` (~4.58 MB)
- `Jira-backup-pre-audit-20261106.csv` (~4.55 MB)
- `ConnectSphere-Release-1-Product-Backlog-20261106.pdf` (~145 KB)
- `_CONFIRM-product-backlog.md` (~1.4 KB)

All files are well under the 50 MB per-file submission cap.

**Why a separate PR.** #442 was prepared and merged with external-only generated artifacts to avoid large binaries prior to the submission folder's 50 MB allowance. This PR places the full package directly into `submission/1. PRODUCT BACKLOG/`.
