# 0008 — Migrate main branch protection to GitHub Rulesets

## Status

Accepted — landed with this PR. Supersedes the classic branch protection
configured by PR #1 and maintained via `.github/settings/main-protection.json`.

## Context

The repository's branch protection for `main` was implemented as a classic GitHub
branch protection rule, managed settings-as-code via
`scripts/configure_github.py` and `.github/settings/main-protection.json`. The
script already anticipated Rulesets: it checked `GET /rulesets` and refused to
apply classic protection if any rulesets were detected.

Several factors made this a good moment to migrate:

1. **The path-filter pain point (ADR 0007) remains unsolved by Rulesets — but
   is also not made worse.** The companion skip workflow is still necessary.
   Rulesets apply the same "named check must be present and passing" contract as
   classic protection; there is no native path-scoped required-check feature on
   the free GitHub plan. This is a neutral point: migration is not a regression
   here.

2. **Bypass lists replace the all-or-nothing `enforce_admins` boolean.** Classic
   protection's `enforce_admins: true` allows no one to bypass. Rulesets encode
   this via an explicit `bypass_actors` list; an empty list is equivalent. In the
   future the team can grant Dependabot a bypass role for automated merges without
   weakening rules for human contributors.

3. **Enforcement status toggle.** A Ruleset can be temporarily set to `disabled`
   without deleting it — useful when a CI change needs to be tested before the
   new check name is required.

4. **Visibility.** Any collaborator with read access can inspect active Rulesets
   in the GitHub UI (Settings → Rules → Rulesets), without needing admin
   credentials. Classic protection is visible only to admins.

5. **GitHub's investment has shifted.** New features (code scanning gates, merge
   queue, commit-message patterns, required deployment environments) are only
   available via Rulesets. Classic protection receives no new capabilities.

6. **Clean state.** No Rulesets existed on the repository at the time of this
   migration (`GET /rulesets` returned `[]`), so there was no conflict to
   resolve.

## Decision

Migrate `main` branch protection from the classic API
(`PUT /branches/main/protection`) to a Repository Ruleset
(`POST /repos/{owner}/{repo}/rulesets`).

The new settings file is `.github/settings/main-ruleset.json`. The script
`scripts/configure_github.py` is updated to POST/PUT a Ruleset by name and
DELETE classic protection as a one-time transition step. The old file
`.github/settings/main-protection.json` is retained as a historical record of
the prior configuration but is no longer read by the script.

The Ruleset replicates every active classic-protection setting exactly, with two
deliberate improvements:

- `conditions.ref_name.include` uses `~DEFAULT_BRANCH` rather than a literal
  `refs/heads/main`, so the protection automatically follows a future default
  branch rename.
- `bypass_actors` is an explicit empty list, documenting the intent (nobody
  bypasses) rather than relying on a default.

## Transition safety

During `--apply`, the script:

1. Creates (or updates) the named Ruleset — at this point both classic
   protection and the Ruleset coexist. GitHub layers them and enforces the most
   restrictive version of each rule, so there is no protection gap.
2. Deletes classic branch protection, completing the migration.

The `not_found_ok=True` parameter on the DELETE call makes the step idempotent:
if classic protection was already absent (e.g., the script is re-run after a
partial run), the DELETE silently succeeds.

## Alternatives considered

- **Keep classic protection.** Rejected: the script already had a rulesets guard
  anticipating this migration, and the capability advantages of Rulesets (bypass
  lists, enforcement status, transparency, future features) outweigh the cost of
  the one-time script update.

- **Run both classic protection and a Ruleset permanently.** Rejected:
  double-enforcement is confusing, produces redundant UI noise, and creates
  drift risk if the two sources diverge. A single source of truth is cleaner.

- **Wait until Rulesets solve the path-filter/skip-workflow problem.** Rejected:
  Rulesets do not solve it on the free GitHub plan, and there is no indication
  this will change. Waiting indefinitely on a feature that may never arrive is
  not a sound reason to forgo the current benefits.

- **Use the `workflows` rule type instead of `required_status_checks`.** Rejected:
  the `workflows` rule type references workflow files by path and repository ID.
  It has the same "workflow must run and pass" contract as named status checks,
  so it does not resolve the path-filter issue, and it introduces hard coupling
  to a specific file path and repository ID integer.

## Consequences

- `scripts/configure_github.py` now manages a Ruleset instead of classic
  protection. The old `main-protection.json` is no longer read by the script.
- When the administrator next runs `--apply`, classic protection is removed and
  replaced by the Ruleset atomically (with a brief overlap period, not a gap).
- Future required-check changes: update `main-ruleset.json`, then run the
  script. The flow is identical to the previous process except the settings file
  name changed.
- The companion skip workflow (`application-checks-skip.yml`, ADR 0007) remains
  necessary and unchanged; Rulesets provide no native improvement here.

## References

- `.github/settings/main-ruleset.json` — the new Ruleset payload.
- `.github/settings/main-protection.json` — retained as historical reference;
  no longer used by the script.
- `scripts/configure_github.py` — updated settings-as-code script.
- ADR 0007 — companion skip workflow for path-filter/required-check gap.
- GitHub REST API: `POST /repos/{owner}/{repo}/rulesets`.
- GitHub documentation: "About rulesets" and "Available rules for rulesets".
