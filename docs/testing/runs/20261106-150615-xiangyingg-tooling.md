---
date: 2026-11-06T15:06:15+08:00
runner: xiangyingg
scope: tooling
environment: local
run_type: automated
test_case_version: "051126"
database: none
commit: 17d1503
pr: 437
---

# Remaining design/README review comments

Tested working diff on 17d1503, incorporating approved main dbf85722 without
rewriting branch history. Remove the PR-only HTML and all .gitignore changes;
add instructions to archive canonical sources rather than maintain a tracked
submission mirror. Earlier immutable run records are unchanged.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Required setup | PASS | `python scripts/setup.py` completed. |
| MULTIPLE | Repository hygiene and tooling | PASS | `python scripts/check.py`: hygiene and 200 tooling tests passed after incorporating main's approved guardrail update. Existing secondary-worktree warnings remain. |
| MULTIPLE | Documentation guard | PASS | `python scripts/doc_guard.py`: zero errors, 174 existing front-matter warnings. |
| MULTIPLE | Canonical-source packaging commands | PASS | Documented `git archive --format=zip ... HEAD docs/design/ docs/architecture.md docs/decisions/release-1-as-built-reconciliation.md design.md` and `python -m zipfile -c ...` completed in temporary output. All 13 archived .mmd files byte-match canonical sources; outer ZIP contains the source archive. HEAD here is the prior committed source snapshot; Mermaid sources are unchanged and the archive does not yet include the new packaging prose. |

PR444 was still open at review; its policy is not assumed active. The earlier
scope repair already removed tracked submission mirrors, blanket .shellignore
exemption, shared guard configuration and skeleton copies. This follow-up adds
no new submission output, runtime behavior, dependency or guard-policy change.
No application suite or diagram render was rerun; previous evidence remains
historical, with the same explicit acceptance boundaries. Independent review
and PO acceptance remain human gates.
