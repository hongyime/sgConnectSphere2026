// Client for E03-S07 (SCRUM-37) event-information edits:
// PATCH /api/events?edit=1&id=<event id or code>, implemented in #132
// (updateEventInformation in backend/src/modules/eventVisibility/service.ts).
// The server applies the role rules: an Organiser may edit any field before
// approval and only title/description/purpose/registration dates after it
// (409 otherwise); only the assigned Coordinator may edit, and only once the
// event is approved (403 otherwise). Every applied field is audited.
import { apiCall, jsonRequest, type ApiFailure } from '../../shared';

export type EditableField =
  | 'title' | 'description' | 'purpose' | 'startAt' | 'endAt' | 'expectedAttendance'
  | 'venueRequirements' | 'accessibilityNote' | 'equipmentRequirements' | 'layoutPreference' | 'registrationSetup' | 'registrationDates';

export type EventPatch = Partial<Record<Exclude<EditableField, 'expectedAttendance' | 'registrationDates'>, string> & {
  expectedAttendance: number;
  registrationDates: { opensAt: string; closesAt: string };
}>;

export type EditResult =
  | { ok: true; fields: string[] }
  | ApiFailure;

export async function updateEventInformation(eventId: string, patch: EventPatch): Promise<EditResult> {
  const result = await apiCall<{ fields?: string[] }>(
    `/api/events?edit=1&id=${encodeURIComponent(eventId)}`,
    jsonRequest('PATCH', patch),
    'Unable to save your changes.');
  return result.ok ? { ok: true, fields: result.data.fields ?? Object.keys(patch) } : result;
}
