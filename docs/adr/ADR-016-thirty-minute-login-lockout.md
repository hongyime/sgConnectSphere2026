# ADR-016 — Thirty-minute login lockout after five failures

- **Status:** Accepted
- **Date:** 18 September 2026
- **Related BDR:** C-30, T-38, O-02
- **Related stories:** E01-S01, E14-S02

### Context

E01-S01 requires an account to be locked after five consecutive incorrect
passwords, guidance on resetting the password, recovery through an emailed
reset link, and an activity-log entry. BDR T-38 and O-02 established the
threshold and reset-link recovery but did not specify a timed lock duration.

The existing implementation in `backend/src/modules/accessControl/sessions.ts`
uses a 30-minute lock. This record documents the team's confirmation on
18 September 2026 that this duration and automatic expiry are the intended
policy. It is a team decision, not a customer-specified duration.

### Decision

- The fifth consecutive incorrect password for an active, unlocked account
  sets `failed_login_count` to five and `locked_until` to 30 minutes after
  that failure, using the database clock.
- During this period, login is refused even with the correct password.
  Further attempts do not extend the deadline or create additional lockout
  audit entries.
- On the first login attempt at or after `locked_until`, clear the expired
  lock and reset the failure count before checking that attempt. Expiry
  permits another attempt; it does not authenticate the user or reactivate
  an inactive account.
- A successful login before the fifth failure resets the consecutive count.
- Password reset remains an alternative recovery path before the 30 minutes
  have elapsed. A successful reset clears the lock and failure count and
  permits login with the new password.
- Reset links expire 15 minutes after issuance and are single-use. This is
  separate from the 30-minute account lock duration.
- Record one `Account Locked` activity-log entry when the fifth failure
  triggers the lock. Update the account and audit log in the same transaction,
  serializing attempts for the same account.
- Keep failed-login responses generic and provide password-reset guidance
  without revealing whether an email address is registered.

### Alternatives considered

- Lock until a successful password reset, with no automatic expiry. Rejected
  in favour of a bounded waiting period while retaining reset-based recovery.
- Extend the lock on every subsequent attempt. Rejected because repeated
  attempts could keep another user's account locked indefinitely.

### What this buys us

- A precise, testable meaning for `locked_until` that matches the existing
  30-minute implementation.
- Users can retry after a bounded delay or recover earlier through password
  reset once that flow is implemented.

### What it costs

- An attacker can resume attempts after expiry; this policy alone does not
  prevent repeated cycles of password guessing or temporary denial of access.
- Automatic expiry and reset-based recovery both need test coverage.

### Implementation and verification status

The session service already implements the threshold, timed expiry,
transactional row locking, and lockout audit entry. Its seven existing unit
tests passed during the 18 September 2026 review, using a mocked database.
They do not establish real-database concurrency behaviour.

At the time this decision was recorded, password-reset endpoints, reset-email
delivery, reset forms, and login-screen guidance were unfinished. Follow-up
implementation and verification are tracked in [E01-S01 login and recovery](../testing/login-recovery.md).
This decision does not itself mark E01-S01 complete or remove its reset
acceptance criteria.
