---
date: 2026-11-06T11:38:27+08:00
runner: xiangyingg
scope: tooling
environment: local
run_type: automated
test_case_version: "051126"
database: none
commit: 58236a6
pr: 437
---

# PR 437 guardrail scope repair

Verification covers the working diff on 58236a6, removing the later submission
import and duplicate configuration while retaining the canonical design/README
sources. No application behavior or diagram source changed. Earlier immutable
application and render records are preserved and were not rerun.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Required setup | PASS | `python scripts/setup.py` completed. |
| MULTIPLE | Repository hygiene and tooling | PASS | `python scripts/check.py`: hygiene and 197 tooling tests passed. Existing secondary worktrees warned. |
| MULTIPLE | Documentation guard | PASS | `python scripts/doc_guard.py`: zero errors, 174 existing front-matter warnings. |
| MULTIPLE | Diff whitespace | PASS | `git diff --check` returned zero. |
| MULTIPLE | Preserve external submission package | PASS | All 80 tracked submission file blobs were byte-checked against the preserved backup archive. Existing external submission folder remains intact. The former draft release could not be found on readback; no current remote asset availability is claimed. A preliminary comparison found local SVG bytes differ from imported versions; therefore this record claims exact backup preservation, not local-pack byte identity. Original plain git archive excluded submission by its export-ignore attribute; reran backup with --worktree-attributes after restoring original attributes. |

The unchanged size-policy helper accepted the reduced working diff. A final
size check includes this record before commit/push; hosted pr-guardrails is the
merge gate. No guard exemption, limit change, new asset PR, Jira transition,
manual acceptance or production test is claimed. Reviewer feedback says to keep
the as-built reconciliation unnumbered and Jira explicitly point-in-time.
