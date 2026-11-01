# Test-case drift audit, 1 November 2026

Point-in-time check of all **383** test cases in `docs/testing/cases/` against the
canonical backlog, the shipped code and the automation inventory. Written after a
suspected stale case turned out not to be stale; the method is recorded so the
next person can re-run it rather than trust this page.

## Method

1. Every `### TC_...` heading in `docs/testing/cases/E*.md` was parsed for its
   TC_ID, story, Sprint and **AC reference**.
2. Each AC reference was resolved against the scenario headings in
   `docs/backlog/release-1/` and `docs/backlog/product/`, recording whether the
   scenario is marked `[Superseded ...]`.
3. Automation status per case came from `docs/testing/tc-coverage.md`, which
   `scripts/tc_coverage_audit.py` regenerates from the test titles themselves.
4. Jira status per story came from the SCRUM project, so "no coverage on a Done
   story" could be separated from "no coverage on unbuilt work".
5. Test titles were scanned for TC_IDs; anything carrying more than one was
   counted separately.

## Findings

| Measure | Count |
|---|---|
| Total test cases | 383 |
| Retired | 7 |
| With a live automated test | 308 |
| Scaffold only (`test.fixme` / `test.skip`) | 54 |
| No test anywhere | 21 |
| **AC references pointing at a scenario the backlog does not contain** | **0** |
| **Stories with any superseded scenario** | **1** |

### The backlog is clean

Only one story in the whole project has superseded scenarios: **E03-S01 Scenarios 1
and 2**, superseded by E03-S08 under C-69. Every other supersession has already
been handled by retiring the matching case:

| Retired case | Reason recorded in its title |
|---|---|
| `TC_E03S01_03` | contradicted Scenarios 3 and 4; superseded by `TC_E03S01_07` |
| `TC_E09S01_02` | T-79 restores Sessions under one Event |
| `TC_E09S02_01` | T-85 uses approved Session layout and combined Event capacities |
| `TC_E09S02_02` | T-85 replaces the single lower-of-limit rule |
| `TC_E14S02_03` | moved to `TC_E06S04_05` by T-76 |
| `TC_E14S02_06` | moved to `TC_E06S04_06` by T-76 |
| `TC_E14S02_07` | moved to `TC_E06S04_07` by T-76 |

No retirement found in this audit was wrong.

### The two E03-S01 cases must not be retired yet

`TC_E03S01_01` and `TC_E03S01_02` reference superseded scenarios, which makes them
look like retire candidates. They are not, and retiring them would delete real
coverage:

- **E03-S08 is `To Do`.** The unassigned-queue replacement has not been built.
- `backend/src/modules/eventLifecycle/coordinatorAssignment.ts` still implements
  automatic assignment and fewest-active-events on submission, and says so in its
  own header comment.

So the cases describe what ships today. The backlog is marking a *plan*, not a
fact. **Retire them in the same PR that ships E03-S08**, and make
`TC_E03S08_01` and `TC_E03S08_03` live at the same time.

### 25 cases on Done stories have no automated test

These belong to stories already marked Done but carry only a scaffold. Nothing has
ever executed them. Recorded here rather than fixed, because each needs a real
test written against shipped behaviour.

| Story | Cases |
|---|---|
| E01-S11 Deactivate my account | `TC_E01S11_01`, `_02`, `_03`, `_04`, `_05` |
| E08-S03 Confirm an event | `TC_E08S03_01`, `_02`, `_06`, `_07` |
| E01-S02 Restrict event visibility | `TC_E01S02_01`, `_05`, `_06` |
| E01-S08 Create an account | `TC_E01S08_05`, `_06` |
| E09-S03 Control the registration period | `TC_E09S03_07`, `_08` |
| E01-S04 | `TC_E01S04_04` |
| E02-S03 | `TC_E02S03_03` |
| E03-S01 | `TC_E03S01_02` (see above, also pending replacement) |
| E03-S07 | `TC_E03S07_02` |
| E05-S05 | `TC_E05S05_06` |
| E06-S03 | `TC_E06S03_03` |
| E06-S04 | `TC_E06S04_07` |
| E06-S05 | `TC_E06S05_02` |
| E09-S02 | `TC_E09S02_03` |

### 21 cases have no test at all

Most are legitimately untestable today because the story is not built: E10-S03 (4),
E07-S08 (4), E02-S05 (3), E10-S02 (4, in progress). Three are the 3-second
performance targets `TC_PERF_01` to `_03`, which sit outside the Definition of Done
by design. Two are already retired. The remainder was `TC_E09S05_02`, now covered
by a new test in this change.

### 87 test titles carry more than one TC_ID

One assertion block can be credited with many cases. The extreme is
`backend/tests/venueCatalogue.integration.test.ts`, where a single title claims
**15** cases (`TC_E05S01_01` to `_07` plus `TC_E05S02_01` to `_08`).

Whoever quotes "308 of 383 automated" should say that. The number counts case IDs,
not independent tests, and a title covering fifteen cases fails as one test.

## Why the drift happens

Drift is not carelessness; it is the predictable result of three things this
repository does on purpose.

1. **The backlog is the source of truth and it is meant to change.** C-69, T-76,
   T-79 and T-85 all replaced behaviour after stories were written. Every
   replacement edits scenarios, and every edited scenario orphans the case that
   cited it. There is no mechanical link, so the case only moves when a human
   remembers.
2. **Scenarios and cases are updated in different PRs by different people.** The
   story owner edits `docs/backlog/`; the tester edits `docs/testing/cases/`. T-76
   was done correctly because one PR did both. C-69 was not: the story moved, the
   cases did not.
3. **A `test.fixme` scaffold looks like coverage.** `tc_coverage_audit.py` reports
   scaffold separately, but a Done story with 54 scaffolds still reads as "has
   cases" to anyone skimming the epic file. Nothing fails.

Added to that, the AC reference line is prose, so nothing validates it. A scenario
that is deleted rather than renamed produces no error anywhere.

## How to prevent it

Ordered by cost, cheapest first. The first three are cheap enough to do this sprint.

1. **Make the AC reference machine-checkable.** It already has the shape
   `E03-S01 - Scenario 1 (...)`. Add a check to `scripts/check.py` that parses it
   and fails when the story or scenario number does not exist in the backlog. That
   catches deletions and renumbering, which today are silent. This audit found zero
   stale references, so it would start green.
2. **Fail when a superseded scenario has a live case.** Same parser: if a scenario
   heading contains `[Superseded`, every case citing it must either be retired or
   be listed in a small allowlist with the story that will replace it. E03-S01 would
   need a two-line allowlist entry pointing at E03-S08, and it disappears the day
   E03-S08 lands.
3. **Retire and create in one PR.** Establish the rule T-76 already followed: a PR
   that changes a scenario's meaning must retire or replace the affected case IDs in
   the same diff. Add it to `CONTRIBUTING.md` next to the existing derived-doc rules,
   because it is the same class of obligation.
4. **Report coverage per story, not per epic.** `tc-coverage.md` is epic-level. A
   per-story line, with scaffold and no-test called out, makes "Done with no
   executed test" visible instead of buried in 383 rows.
5. **One TC_ID per test title.** Cheap going forward, no retrofitting. It stops a
   single failure from being mistaken for fifteen passes.
6. **Do not count a scaffold as coverage** in any statement used as evidence. The
   audit script labels it; reports should quote the scaffold number beside the
   automated one.

## What this audit does not cover

- Whether the 308 automated cases assert what their titles claim. Only the naming
  was checked, not the assertions.
- E2E cases under `tests/e2e/` that are not part of the required CI gate, so a live
  playbook test can pass or rot without blocking a merge.
- Backlog scenarios with no case at all. That is the inverse gap and needs the same
  parser to answer.
