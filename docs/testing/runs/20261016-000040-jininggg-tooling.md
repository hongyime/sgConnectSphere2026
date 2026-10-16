---
date: 2026-10-16T00:00:40+08:00
runner: jininggg
scope: tooling
environment: local
run_type: regression
test_case_version: 151026
database: none
commit: 7bfec65
---

Documentation-only E06-S03 withdrawal decision recording, branch
docs/venue-request-withdrawal-decisions. HEAD is the baseline plus uncommitted
decision/backlog/contract/test-case documentation and generated exports. The
decisions and exports were recorded on 15 October; this validation session
finished after midnight. No application implementation or human E2E is claimed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Export/catalogue consistency | PASS | Tooling Python checked all 359 unique canonical test cases against both generated CAA 151026 and legacy compatibility workbooks, cell by cell. Only TC_E06S03_09 to _13 were added, with no prior case IDs removed. |
| MULTIPLE | Decision traceability | PASS | Parsed release/product E06-S03 retains T-93/T-94/T-95 references and withdrawal/chain criteria. Generated BDR contains all three decisions. |
| MULTIPLE | Requirement versus execution separation | PASS | Regenerated tc-coverage inventory shows all five new case IDs as none, not automated or passing. No test bodies or application files changed. |
| MULTIPLE | Diff whitespace | PASS | git diff --check passed. |
| MULTIPLE | Repository validation | FAIL | python scripts/check.py passed tracked-file hygiene and env-template checks; 128 tooling tests retained the existing Windows worktree-fixture 3 failures and 11 errors. No hooks bypassed. |

Generators: export_backlog_xlsx.py --date 151026,
export_testcases_xlsx.py --date 151026, BDR-only export through
export_adr_bdr_docx.py's _export/_iter_bdr_files functions, then
tc_coverage_audit.py after refreshing the legacy workbook from the generated
dated workbook. Earlier dated exports were retained; no unrelated ADR export.
The one-off validation script is ignored under artifacts/. Its first exploratory
inventory lookup omitted Markdown backticks; correcting that lookup produced the
final passing checks above. No code, database, Jira, commits, pushes or PR changes.
