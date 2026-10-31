# docs/slides-supabase-reset-caveat

Goal: Follow up merged PR #374 by updating slide 6 to distinguish Claude's recorded local database reset from the unrecorded shared-Supabase-wipe claim, preserve T-59's documented rationale, and state the reset guard's override caveat.

## Findings and decisions

- PR #374 is already merged, so this is a separate documentation follow-up PR.
- The 28 October E06-S04 run record says Claude reset and seeded local `connectsphere_dev_stack` on loopback PostgreSQL; the local API used `DATABASE_URL` only, with no `DATABASE_POOLER_URL`.
- T-59 records the free-tier slot and second database URL rotation as the reason for using the shared project's `test` schema. It does not record an AI-caused shared Supabase reset.
- The reset guard rejects the shared Supabase `postgres` target by default. `ALLOW_DATABASE_RESET=I_UNDERSTAND` bypasses that guard, and reset drops the `public` schema. The only supported Supabase database test uses transaction rollback.
- No Jira issue is needed: this corrects evidence wording in the already-merged presentation and makes no product or backlog change.

## Verification

- Rendered the full presentation to PDF with LibreOffice: 17 slides. Inspected slide 6; the updated row fits the table.
- `git diff --check` passed.
- `python scripts/setup.py` installed the pinned repository tooling for this worktree.
- `python scripts/check.py` passed 186 tooling tests, hooks, and repository checks; its run record is `docs/testing/runs/20261031-105122-bryanseah234-tooling.md`. It warned about the two existing review worktrees and this task worktree; the warning is non-blocking.
- No application tests or manual acceptance steps apply to this presentation wording change.

## Branch and PR

- The slide change was committed as `fd6fe4b1` and pushed on `docs/slides-supabase-reset-caveat`.
- Draft follow-up PR #387 is open against `main`; its required checks are running and independent review is required.

## Next steps

- Wait for green checks and teammate review on the latest PR head. Keep it in draft until those gates are satisfied.
