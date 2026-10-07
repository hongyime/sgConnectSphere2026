# ci/sprint-2-retro-pr-evidence

Goal: the two Sprint 2 retrospective actions not covered by #195 (merge queue)
and #196 (handoff files): make test evidence in PRs explicit and labelled, and
stop preview deployments on draft PRs. Based on main; independent of the Week 7
stack. No Jira key: process change, cites the Sprint 2 retrospective.

Done: PR template Verification text now asks for command, commit, outcome and
environment per cited run plus a mocked-or-real-database label, and says
persistence or cross-feature acceptance criteria need real-database or
end-to-end evidence; the "Application tests pass" checklist line carries those
three evidence slots. CONTRIBUTING Definition of Done says the same. Execution
records gain a `database: mocked | real | none` frontmatter field (README,
TEMPLATE; earlier records omit it). `vercel-deploy.yml` adds
`ready_for_review` to the trigger and a job-level `if` that skips drafts;
decision 0010 gains a dated amendment and reversibility note;
`docs/deploying-and-debugging.md` build triggers updated.

Decisions without team sign-off: `database` is a new required field rather
than an optional one, with the cut-off stated in the README instead of a
validator (no script validates run records today). Drafts are gated with
`if:` rather than by removing `synchronize`, so a non-draft PR still deploys
on every push.

Not done: no validator for run-record frontmatter; `docs/deploying-and-
debugging.md` still describes the `Vercel` status check from the retired git
integration beyond the two bullets changed here.
