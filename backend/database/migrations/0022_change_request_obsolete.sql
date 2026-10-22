-- SCRUM-73 / E10-S04 prerequisite; 0021 is reserved by E06-S06.
-- Commit before using this enum value in dependent application transactions.
ALTER TYPE change_status ADD VALUE IF NOT EXISTS 'obsolete';
