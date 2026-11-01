-- E02-S05: a copied draft keeps a valid database range while requiring the
-- organiser to enter fresh Event and Session dates before saving/submission.
ALTER TABLE events ADD COLUMN dates_pending boolean NOT NULL DEFAULT false;
ALTER TABLE sessions ADD COLUMN dates_pending boolean NOT NULL DEFAULT false;
