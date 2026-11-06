# Final submission consistency ? paused at user request

Finish the approved final consistency corrections in ONE PR and rebuild the seven-folder external submission after all relevant PRs merge. Source documents and exact remaining confirmations: docs/plans/final-submission-consistency-20261106.md. Follow-up to #437, #439, #440, #442, #443, #449 and #451.

## Resume here

User explicitly requested an ending so another person can take over. Branch: docs/final-submission-consistency, based on origin/main c00b9cb4a3f58b18839b57d7f682533308599601. All task changes are UNCOMMITTED and unstaged. No PR opened, no push, no deletion. Do not discard this working tree. Latest user approvals: Bryan, Amareet, Le Xin, Xiang Ying, Ji Ning corrections approved. Aaron test-workbook changes ON HOLD pending response. Names MUST be Le Xin, Ji Ning, Xiang Ying; Bryan PO+Developer, Amareet SM+Developer, other four Developers.

## Completed source changes

- Five missing backlog estimates restored in E01/E07/E08 Markdown from existing Jira CSV: E01-S12=5, E01-S13=5, E07-S08=5, E07-S09=5, E08-S06=8. 65 stories, 230 known points, seven blanks. Existing backlog PDF already has these points; historical status snapshot preserved.
- Nine S2-S4 sprint Markdown files correct historical E11 estimate to5, date T105 to1Nov, preserve S3 58 scope/24 carry/34 Done, correct current DoD and boundary wording. S2 unresolved13 vs14 stories;11 Done/37pts vs12/40 explicitly CONFIRM. Do not invent totals.
- Dashboard analysis labels Jira-status versus evidence-backed delivery.
- README deployment now Vercel Git integration (#445). Design owner role corrected; diagram02 changed from CLI deploy to Git integration.
- docs/design/render.py resolves npx on Windows and attaches page to PdfWriter before merging for pypdf7 compatibility.
- New scripts/assemble_submission.py + tooling/tests/test_assemble_submission.py; new scripts/export_sprint_docs.py. Review these before commit; packaging script may still need agent's latest integration changes (sprint regeneration, standalone README, --inventory-only). Check actual files, not this note's assumptions.

## External artifacts (not committed)

External folder is named IS212-final under the operator's home directory. It contains the seven numbered folders. _FILE-CHECKLIST.csv lists2083 files:2076 parser PASS,7 UNVERIFIED,zero parser FAIL. _ASSEMBLY-RECEIPT.md marks PROVISIONAL. Code ZIP from origin/main c00b9cb4 is112001812 bytes; compressed docs account105886830 bytes, artifacts3365855. ZIP CRC and forbidden-path checks passed: no submission/, private .env, .git, node_modules. SECRET CONTENT SCAN NOT RUN; do not claim secret-free.

Backlog XLSX regenerated externally. Nine sprint DOCX regenerated preserving original hyperlink targets, but subsequent assembler COPY may have overwritten them with old tracked exports. RERUN export_sprint_docs AFTER assembler unless its latest integration already does so. Root README standalone copy may still be missing. Design13 SVG/PNG/PDF sets+14-page combined PDF generated and visually reviewed as contact sheets; then diagram02 deployment corrected and full render started again. Check whether that LAST render completed; otherwise rerun. Contact sheets in ignored artifacts/final-consistency describe the prior successful render.

## Checks and environment

python scripts/setup.py succeeded after network escalation. Artifact dependencies installed in .venv-tools: python-docx, pypdf, reportlab, pymupdf/Pillow. Mermaid CLI12.2.0 works through npx. Initial check.py failed on read-only precommit cache; elevated rerun reached hooks but detect-secrets said files changed (agents edited concurrently), so no passing full check yet. Run after all edits stop. doc_guard fails pending valid commit trailer because new tooling tests do not alter product test cases; use Docs-Impact: none ? submission tooling does not change product acceptance scenarios. Then rerun guard after commit. git diff --check passed. Record final checks in NEW T65 tooling record before commit, actual HEAD and runner jininggg; no application tests run.

Packaged render_docx.py fails missing pdf2image. Microsoft Word COM rendering stalled without producing PDFs; the exact task-created Word process was stopped. DOCX structural/hyperlink checks are not visual verification. Do not claim all files open visually. No unrelated worktrees removed.

## Outstanding next steps

1. Read status/diff and current agent edits. Slide agent was asked to stop/save; determine whether slide files changed. Coordinate with open PR452; do not overwrite its newer figures. Live GitHub also had450,453,454 open (Lead workflow/migration). Need final merged main before final archive.
2. Finish assembler integration, regenerate corrected sprint exports and standalone README, collect every CONFIRM with file/section in external _CONFIRM-final-consistency.md. Keep Aaron workbook unchanged.
3. Finish design render/visual check; README local targets all existed and live site returned HTTP200. Verify standalone rewritten links and recording access separately.
4. Run archive secret-content scan (installed scanner in precommit cache; find detect-secrets.exe, capture findings without printing secret values). Do not read/print local .env.
5. Stage intended text files, run check.py/doc_guard and new-script tests, write observed T65 evidence, commit conventional docs(submission) title and Docs-Impact trailer, one draft PR with all four template headings and full final-report sections. No binary commits per user instruction. PR requires human review; never self-merge/bypass checks.
6. After ALL relevant PRs merge, pull/rebuild external folder and code ZIP, rerun scan/inventory. Final manual steps: visual Word review, human CONFIRM resolutions, Canva transfer, Google Drive upload and course eLearn ZIP submission.

Assumptions: approval authorizes corrections, not human review or meeting/acceptance evidence. Existing historical sources and customer material preserved. No source deletions. PR body must list changes, deletions(none), assumptions, CONFIRM, issues for owners and exact external file inventory via checklist.

## PR455 CI/security repair

The user requested a fix for the pushed handoff PR. Replace the assembler's
native XML parser with already-pinned defusedxml and cover valid/entity-bearing
SVG and Office XML. All four focused tests and 211 repository tooling tests
pass. New immutable tooling record is included. Use the supported reasoned
Docs-Impact trailer: these are submission tooling tests, not product acceptance
case changes. Verify doc_guard after the trailer is committed; do not disable
its rule or edit the acceptance catalogue just to satisfy it.

The broader assembly/rebuild remains the handoff's outstanding work; no final
seven-folder rebuild, visual approval, secret scan or human confirmation is
claimed by this narrow CI repair. Existing source changes are preserved.
