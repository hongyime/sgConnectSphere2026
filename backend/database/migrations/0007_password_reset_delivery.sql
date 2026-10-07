-- Reset capabilities are generated in memory when the existing worker sends.
ALTER TABLE notification_deliveries ADD COLUMN delivery_purpose text NOT NULL
  DEFAULT 'notification' CHECK (delivery_purpose IN ('notification', 'password_reset'));
CREATE UNIQUE INDEX password_reset_tokens_hash_idx ON password_reset_tokens (token_hash);
CREATE INDEX password_reset_tokens_user_idx ON password_reset_tokens (user_id);

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON password_reset_tokens FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON password_reset_tokens FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON password_reset_tokens FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'connectsphere_app') THEN
    GRANT SELECT, INSERT, UPDATE ON password_reset_tokens TO connectsphere_app;
    CREATE POLICY password_reset_tokens_server_access ON password_reset_tokens
      TO connectsphere_app USING (true) WITH CHECK (true);
  END IF;
END $$;
