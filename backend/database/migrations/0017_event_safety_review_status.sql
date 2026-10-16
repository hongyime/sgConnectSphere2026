-- SCRUM-184 (E08-S03 / SCRUM-60): the Safety Review event status (C-70, T-71).
--
-- When an event's arrangements are complete, the assigned Coordinator submits
-- it, and it moves Planning -> Safety Review. Only the Safety Officer's
-- approval (E08-S06) then sets Confirmed. The value sits between 'planning'
-- and 'confirmed' so enum ordering matches the lifecycle.
--
-- Migration order: 0016 is the venue buffer write guard (#261), 0018 the
-- venue staff assignments (#271), 0019 the shared booking contract (#274),
-- 0017 this one. It adds one enum value only, so it does not depend on any of
-- them and can be applied in any order relative to them.
--
-- Migration-only PR, merged and applied before the code that uses the value
-- (docs/ops/production-migrations.md, "Release sequence"). Adding an enum
-- value changes nothing the deployed application reads or writes, so it is
-- safe to apply before that code ships. PostgreSQL won't let a new enum value
-- be used in the transaction that adds it, so nothing else goes in this file
-- (as 0013 does).

ALTER TYPE event_status ADD VALUE IF NOT EXISTS 'safety_review' AFTER 'planning';
