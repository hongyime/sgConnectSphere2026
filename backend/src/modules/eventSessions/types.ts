import type { EventStatus } from '../eventLifecycle/status.js';

// E04-S02 (T-79): a Session is a child of an Event. The Event keeps its
// overall planning envelope and attendance total; each Session carries the
// date/time and requirements its own venue bookings and equipment are checked
// against. `sessions.event_range` is a tstzrange, so callers get plain Dates.
export type SessionRecord = {
  id: string;
  eventId: string;
  title?: string;
  startAt: Date;
  endAt: Date;
  expectedAttendance: number;
  layoutId?: string;
  venueRequirements?: string;
  accessibilityNote?: string;
  equipmentRequirements?: string;
  layoutPreference?: string;
  // Venue search reads these join tables, not the free-text notes above.
  accessibilityFeatureIds?: string[];
  facilityIds?: string[];
};

export type SessionOption = { id: string; label: string };
export type SessionOptions = { layouts: SessionOption[]; accessibility: SessionOption[]; facilities: SessionOption[] };

// Everything an Organiser can write. `session_id` and `event_id` are owned by
// the row, never by the request body.
export type SessionInput = Omit<SessionRecord, 'id' | 'eventId'>;

// The minimum the authoring rules need: who owns the Event and whether it can
// still be edited. A draft is the only window in this increment; booking release
// on delete needs the Event to be in Planning, which is the follow-up slice.
export type SessionEditScope = { organiserId: string; status: EventStatus };
