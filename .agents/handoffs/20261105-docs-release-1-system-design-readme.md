Prepare the Release 1 system-design sources and rendered submission pack, verify a rewritten README from a clean clone, and package origin/main for the code submission. Source of truth: actual main code at 0773a721, canonical backlog and lecture slides. No application changes, Jira transitions or deployment operations are in scope.

In progress: audit current modules, lecture pages, schema and Jira. Separate accepted target architecture from implemented code. Preserve original decision history; publish a current reconciliation rather than silently changing past decisions. Submission output is local, not committed. A fresh independent clone is used for setup/test verification. Existing user changes in the primary checkout remain untouched.

## Completed preparation

Thirteen lecture-backed/supplementary Mermaid sources and explanation pages, scope/discrepancy inventory, as-built reconciliation and full README rewrite. Reproducible renderer builds 39 individual files plus 14-page combined PDF; visual QA repaired context-DFD label overlap. Historical diagrams outside owned paths remain provenance and are explicitly replaced in the submission catalogue. No new product decision.

Fresh independent clone: 734 backend unit passes/1 optional skip, 851 frontend passes, 26 runtime passes, 58 real PostgreSQL desktop/mobile browser passes, typechecks/build pass; mutation score 72.73%. Tooling setup/check passed 197 tests. Initial sandbox IPC and guarded database-name refusal are disclosed in the immutable run record. Native loopback PostgreSQL only.

Ponytail review against origin/main and affected setup/runtime callers found no blocker after correcting physical ERD optionality, method signatures, initial-safety-entry wording and label clipping. Large renders/code zip are GitHub assets, not committed binaries. Next: stage/check/commit, open PR, then archive origin/main and scan it; upload draft submission assets. Final archive must be regenerated after all team PRs merge.
