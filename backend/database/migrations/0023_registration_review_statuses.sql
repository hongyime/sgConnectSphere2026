-- E09-S02 (SCRUM-64): registration statuses for the Organiser's capacity
-- review (C-98, T-85).
--
-- A registration that would exceed a selected Session's layout capacity or
-- the combined Event capacity is saved as 'pending' and does not hold an
-- approved seat. The Organiser then approves it (it becomes 'registered')
-- or rejects it ('rejected'). 'withdrawn' stays the Attendee's own choice.
--
-- Migration order: 0021 is reserved by E06-S06 (#308) and 0022 by E10-S04
-- (#319). This file only adds enum values, so it does not depend on either.
-- 0024 uses these values and must be applied after this one.
--
-- Migration-only PR, merged and applied before the code that uses the values
-- (docs/ops/production-migrations.md, "Release sequence"). Adding enum values
-- changes nothing the deployed application reads or writes. PostgreSQL won't
-- let a new enum value be used in the transaction that adds it, so nothing
-- else goes in this file (as 0013 and 0017 do).

ALTER TYPE registration_status ADD VALUE IF NOT EXISTS 'pending' AFTER 'waitlisted';
ALTER TYPE registration_status ADD VALUE IF NOT EXISTS 'rejected' AFTER 'pending';
