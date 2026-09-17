-- SCRUM-93: email verification token flow.
--
-- verification_tokens holds one-shot tokens issued for account confirmation,
-- password reset, and any other flow that needs "prove you own this email"
-- semantics. Row-level details:
-- - id: surrogate primary key.
-- - user_id: which account this token belongs to. Cascades on delete so a
--   deactivated account's outstanding tokens are cleaned up automatically.
-- - token_hash: SHA-256 of the raw token string, hex-encoded. The raw token
--   is only handed to the user (via email); we compare hashes to avoid
--   storing anything that could unlock the account if the row leaks.
-- - purpose: string enum. 'email_verification' is Sprint 1; other purposes
--   can reuse the same table. Enforced by CHECK so an unknown purpose
--   surfaces as a database error rather than silent misrouting.
-- - expires_at / consumed_at: nullable timestamps. A token becomes valid at
--   creation and invalid at either the expiry moment or when consumed,
--   whichever comes first. Both must be checked at consumption time.

CREATE TABLE verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  purpose varchar(32) NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (purpose IN ('email_verification', 'password_reset')),
  CHECK (expires_at > created_at)
);

CREATE INDEX verification_tokens_user_id_idx ON verification_tokens (user_id, purpose);

ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON verification_tokens FROM PUBLIC;

-- users.email_verified_at records when the account confirmed its email
-- through the flow above. Null means "unverified"; a timestamp means
-- "verified at this instant". Signing in remains permitted while unverified
-- so we do not block Release 1 on a feature that only just landed; a
-- follow-up decision (see BDR) can promote email verification to a signin
-- prerequisite.

ALTER TABLE users ADD COLUMN email_verified_at timestamptz;
