-- Free-text capture for the remaining E02-S01 mandatory request fields.
-- 'none_required' is a sentinel value meaning the organiser explicitly opted out.
ALTER TABLE events ADD COLUMN venue_requirements text;
ALTER TABLE events ADD COLUMN equipment_requirements text;
ALTER TABLE events ADD COLUMN layout_preference text;
ALTER TABLE events ADD COLUMN registration_setup text;
