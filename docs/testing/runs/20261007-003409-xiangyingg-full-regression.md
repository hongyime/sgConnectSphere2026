---
date: 2026-10-07T00:34:09+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: regression
test_case_version: '031026'
database: none
commit: ccb32b6
---

Command: `npm run build`. Timestamp captured immediately after command
completion. Run on the uncommitted reviewer follow-up working tree based on HEAD
ccb32b6; the commit field is not a claim the working tree was already committed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | SCRUM-53 equipment availability regression | PASS | Observed exit code 0; scope and command above. |

Final output:

```text
dist/assets/index-DRFi7jo_.js   548.93 kB │ gzip: 153.94 kB

✓ built in 201ms
[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.

> @connectsphere/backend@0.1.0 build
> tsc -p tsconfig.json --noEmit

```
