# 0009 - Repository security scanners

## Status

Proposed in PR #145; acceptance requires team review through the protected PR.
No additional required check, paid subscription or public Scorecard publishing
is authorized by this proposal.

## Context

These five workflow files are new to main, not restored repository policy.
The original PR copied an external template labelled `sourcerepo` and claimed
fleet enforcement and daily synchronization. Those claims are not evidence of
an accepted ConnectSphere decision. This repository's Markdown and reviewed
PRs remain authoritative under `docs/source-of-truth.md`.

No external synchronization job is introduced or authorized here. Its existence,
owner and permissions have not been verified. If an outside job proposes later
changes, review them as ordinary PRs; do not overwrite repository decisions.

## Decision proposed

| Scanner | Purpose | Execution and result policy |
| --- | --- | --- |
| CodeQL | Data-flow analysis of TypeScript/JavaScript and Python | Relevant PR/push changes, weekly and manual; errors fail its job |
| Semgrep OSS | Additional community static-analysis rules | PR/push, weekly and manual; findings go to SARIF, scanner errors fail |
| TruffleHog | Inspect changed Git history for credential patterns | All PR/push changes including docs, plus manual full history; findings/errors fail |
| Dependency review | Newly introduced dependency advisories | PRs; moderate or higher fails its advisory job |
| OpenSSF Scorecard | Repository configuration and supply-chain posture | Monthly/manual, GitHub SARIF only; public publishing disabled |

None becomes a required branch-protection check in this PR. A failed advisory
job is still visible evidence for reviewers; it is not a passing scan. Any future
required-check change needs a separate decision and settings update after noise,
runtime and fork behaviour have been assessed. Dependency review deliberately
flags moderate advisories without itself blocking the protected merge gate.

The existing `detect-secrets` and `detect-private-key` hooks remain the fast
local/current-file checks. TruffleHog adds history scanning; it does not replace
them. Credential verification is disabled so candidate secrets are not sent to
providers. False positives must be investigated without printing candidate values
in comments or committing blanket exceptions. A scan finding is not evidence
that a credential is live.

Semgrep uses a versioned OSS container and downloads community rules from the
Semgrep registry with metrics disabled; rules can change upstream. No Semgrep
account, token or hosted dashboard is configured. CodeQL, dependency review and
SARIF use GitHub services. Scorecard does not publish results to the OpenSSF API
and needs no OIDC write permission. Public-repository artifacts remain public;
never add private scan exports to PostPlans.

## Tradeoffs and validation

Five scanners overlap and consume CI time. Keep them advisory while collecting
useful results; removing a noisy/duplicative scanner is preferable to suppressing
all errors. Jobs have timeouts and scoped permissions. Actions are pinned to
commits; scanner versions are explicit. TruffleHog fetches full history because
two commits cannot guarantee that both PR endpoints are present.

Workflow syntax and repository checks are necessary but do not prove a scanner
ran. CodeQL and Scorecard require their actual scheduled/manual execution before
claiming scan coverage. Review each final-head check and distinguish findings,
errors and unsupported-repository skips.

## Sources

- `AGENTS.md`, `docs/repository-setup.md`, `docs/source-of-truth.md`.
- Peer review on PR #145, 28 September 2026.
- [TruffleHog action inputs](https://github.com/trufflesecurity/trufflehog/blob/f714bf454f350590f4a24c3ddb1aef02c35bf5b6/action.yml).
- [Semgrep CLI reference](https://semgrep.dev/docs/cli-reference).
- [Scorecard publishing](https://github.com/ossf/scorecard-action#publishing-results).
