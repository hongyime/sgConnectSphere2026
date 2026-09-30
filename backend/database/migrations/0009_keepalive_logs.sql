-- Keepalive ledger for the Supabase free tier (SCRUM-109 follow-up).

-- Supabase pauses a free project after seven days without activity.
-- `.github/workflows/supabase-keepalive.yml` runs daily and writes one row
-- here through the REST API using the anon key, then deletes rows older than
-- seven days so the table cannot grow without bound.
--
-- This table already exists in the live database. It was created by hand in
-- the Supabase SQL editor, and the workflow's own error message still points
-- at `supabase/migrations/001_keepalive.sql`, a file that has never existed in
-- this repository. The consequence is that any database built purely from
-- these migrations -- a local clone, the CI service container, or the `test`
-- schema -- has no `keepalive_logs`, so the workflow would fail against it
-- and the schemas are not equivalent. This migration closes that gap.
--
-- Every statement is written to be safe against the live database, where the
-- table and its policies are already present.
CREATE TABLE IF NOT EXISTS keepalive_logs (
  id bigserial PRIMARY KEY,
  source text,
  pinged_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE keepalive_logs ENABLE ROW LEVEL SECURITY;

-- The keepalive runs with the anon key, so the browser roles need explicit
-- access. This is deliberate and is safe only because the table holds no
-- personal or business data: a source label and a timestamp. Do not copy this
-- policy shape onto any table that holds real data.
--
-- The DELETE policy is unrestricted because the workflow prunes by age with a
-- `pinged_at` filter supplied in the request, not by a policy predicate.
--
-- `anon` and `authenticated` exist only in Supabase. A local PostgreSQL, the
-- CI service container, and a bare test schema have neither, so each grant is
-- guarded on the role existing, matching the pattern already used by
-- migrations 0002 and 0008. `CREATE POLICY` has no `IF NOT EXISTS` form, so
-- each policy is checked against `pg_policies` first to keep this migration
-- repeatable against the live database.
DO $$
DECLARE
  target_schema text := current_schema();
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT SELECT, INSERT, DELETE ON keepalive_logs TO anon;
    GRANT USAGE, SELECT ON SEQUENCE keepalive_logs_id_seq TO anon;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = target_schema
        AND tablename = 'keepalive_logs'
        AND policyname = 'anon_insert'
    ) THEN
      CREATE POLICY anon_insert ON keepalive_logs
        FOR INSERT TO anon WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = target_schema
        AND tablename = 'keepalive_logs'
        AND policyname = 'anon_select'
    ) THEN
      CREATE POLICY anon_select ON keepalive_logs
        FOR SELECT TO anon USING (true);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = target_schema
        AND tablename = 'keepalive_logs'
        AND policyname = 'anon_delete'
    ) THEN
      CREATE POLICY anon_delete ON keepalive_logs
        FOR DELETE TO anon USING (true);
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT, INSERT, DELETE ON keepalive_logs TO authenticated;
    GRANT USAGE, SELECT ON SEQUENCE keepalive_logs_id_seq TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'connectsphere_app') THEN
    GRANT SELECT, INSERT, DELETE ON keepalive_logs TO connectsphere_app;
    GRANT USAGE, SELECT ON SEQUENCE keepalive_logs_id_seq TO connectsphere_app;
  END IF;
END $$;
