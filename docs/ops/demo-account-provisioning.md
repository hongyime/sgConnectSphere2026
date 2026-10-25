# Demo account provisioning

This procedure permits provisioning only the one approved Safety Officer
profile from the repository seed, identified as `safetyOfficer`
(`safety_officer@connectsphere.com`), and only if a read-only precheck confirms
it is missing. It is a targeted account-data operation, not a migration. It
does not authorise resetting, reseeding, adding any other account, or changing
application code.

## Scope and risk boundary

The Product Owner accepts use of the existing public/shared `seedCredential`
only for DEMO ONLY accounts. This acceptance does not establish that the
credential is safe, permit real or personal data, select rotation or access
restrictions, or cover database, API, service or CI secrets. Do not include the
credential's value or any password hash in notes or records.

The main seed already defines both the Safety Officer and Coordinator Lead, as
introduced by PR #232. No seed-code change is needed. The Coordinator Lead is
not in this procedure and must not be provisioned by it. A successful precheck
showing the Safety Officer profile already exists is a no-op, not a reason to
update it.

## Preconditions

1. Confirm this exact one-account scope and Product Owner approval in T-97.
2. Confirm the intended production project and schema using a read-only session.
   Do not put a private project URL or connection string in the record.
3. Compare the current seed definition for `safetyOfficer` with the target
   account profile and verify the repository's approved password-hash helper
   and expected compatible hash format. Never copy a hash into the record.
4. Coordinate the operation with the designated account writer. Do not proceed
   while another writer may be changing the same account data.
5. Perform a case-folded email and identifier precheck. Recheck immediately
   before the write using a race-safe mechanism. If an account with the target
   email or identifier exists with an incompatible profile, stop. Do not
   overwrite or repair it under this approval.

## One-account operation

If the compatible profile already exists, make no change and record the no-op.
If it is missing, obtain review of the exact one-account write mechanism before
execution. In a single targeted transaction, insert zero or one row for the
existing Safety Officer definition only. Do not update existing credentials,
insert related/demo accounts, truncate tables, run a reset or seed command, or
apply schema changes. This is a narrow exception for this one named demo
account, not general production seeding or permission to create other accounts.
If the precondition changes or the transaction cannot prove it inserted no
more than this one profile, abort and investigate.

Afterward, verify the profile fields, account count delta (zero or one), and
that any stored password hash is compatible with the approved helper. Never
display or copy the hash. If an authentication verification session is created,
clean it up when verification is complete.

## Operation record

Record the actual outcome, operator role, date, and sanitized pre/post findings
in the approved operational record. Include no account IDs, hashes, secrets,
credential values, personal data, or private URLs. State whether the operation
was a no-op or inserted the single profile. Do not claim a change if it was not
performed. Any incompatible existing account, failed precheck, uncertain result,
or unexpected row-count change is a stop condition for the deploy owner.
