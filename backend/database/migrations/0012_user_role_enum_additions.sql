-- T-72: add event_coordinator_lead and safety_officer to the user_role enum.
-- Prerequisite for the T-72 seed accounts in backend/src/database/cli.ts.
-- Safe to re-run: IF NOT EXISTS guards each ADD VALUE.
-- Note: PostgreSQL 12+ permits ALTER TYPE ... ADD VALUE inside a transaction
-- block as long as the new value is not used in the same transaction.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'event_coordinator_lead';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'safety_officer';
