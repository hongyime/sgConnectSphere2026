Record the bounded E11-S01 production notification probe without editing the historical venue-staff handoff already merged by PR #425.

## Current status

- PR #433 contains the operator-only production notification probe and its T-65 run record.
- The pre-existing notification backlog was drained before the probe.
- Six synthetic notifications and six durable delivery rows were committed atomically; all six finished `sent`/`done` with provider acceptance recorded.
- Provider acceptance is not mailbox-receipt evidence. Human mailbox observations are recorded separately.

## Safety correction

- Execute mode now uses the repository's exact production database guard and verified TLS client configuration before any database connection, write, relay call, or worker call.
- The broad Supabase-host check was removed; an unexpected host, port, account, or database is rejected.
- No secrets, recipient addresses, message contents, or tokens are recorded in this handoff.
