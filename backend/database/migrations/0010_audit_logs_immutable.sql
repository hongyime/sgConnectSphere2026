-- E14-S02 Scenario 5 (SCRUM-86): activity log entries cannot be edited or deleted.

-- 0001 revokes UPDATE and DELETE on audit_logs from PUBLIC and from the
-- optional connectsphere_app role, but the server connects as the table owner
-- (see 0002), and a REVOKE never binds the owner. Until now the application's
-- own connection could still rewrite or remove any entry. This trigger refuses
-- both for every role, the owner included.
--
-- One update is still allowed: the ON DELETE SET NULL actions on actor_id and
-- event_id. Deleting a draft event (E02-S02) or a user would otherwise fail
-- because their entries could not drop the link. That case is recognised by
-- running inside the foreign key's own trigger (pg_trigger_depth() > 1) and by
-- changing nothing except clearing those two columns; who did what, to which
-- record, and when stay exactly as written.
--
-- TRUNCATE is deliberately not blocked: db:seed:test and db:reset clear every
-- managed table on disposable and development databases.
--
-- Safe to re-run: the function is replaced and the trigger recreated.
CREATE OR REPLACE FUNCTION audit_logs_refuse_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND pg_trigger_depth() > 1
     AND (NEW.actor_id IS NULL OR NEW.actor_id = OLD.actor_id)
     AND (NEW.event_id IS NULL OR NEW.event_id = OLD.event_id)
     AND to_jsonb(NEW) - 'actor_id' - 'event_id' = to_jsonb(OLD) - 'actor_id' - 'event_id' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Activity log entries cannot be edited or deleted.'
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_immutable ON audit_logs;
CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_refuse_change();
