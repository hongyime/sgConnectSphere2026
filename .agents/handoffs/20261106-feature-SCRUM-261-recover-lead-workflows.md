# Recover Lead workflows absent from main

Recover the missing Release 1 Lead functionality for SCRUM-153, SCRUM-154 and SCRUM-155 into current `main` under technical enabler SCRUM-261, without rewriting the Done history of the original stories.

## Evidence and scope

- The historical commits `0a849522`, `83e1f022`, `c3ba22a9` and `3754a729` are on a pushed branch with no GitHub pull request and are not reachable from `main`.
- Re-integrate only the missing Lead queue, reassignment and oversight behaviour. Do not bring across the historical Safety/role code that current main already supersedes.

## Next step

Port the smallest compatible implementation onto current main, run focused and full checks, then open a reviewed recovery PR.
