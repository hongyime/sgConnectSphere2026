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

// E10-S02 (SCRUM-71): the Session venue bookings and equipment reservations an
// edit affects, and any over-subscription, from the Coordinator's save and from
// its `&preview=1` dry run (#376). Shapes match docs/api-changes-week7.md.
export type ImpactReason = 'time' | 'capacity';
export type AffectedBooking = {
  id: string; sessionId: string | null; venueId: string; venueName: string;
  reasons: ImpactReason[]; governingHeadcount: number | null; capacity: number;
};
export type AffectedReservation = { id: string; sessionId: string | null; equipmentId: string; equipmentName: string; reasons: ImpactReason[] };
export type OverSubscription = { scope: 'session' | 'event'; sessionId: string | null; registered: number; capacity: number };
// `revision` fingerprints what the preview listed; the save sends it back so
// the server can refuse when the arrangements changed meanwhile (#380 review).
export type ChangeCheck = {
  impact: { affected: boolean; bookings: AffectedBooking[]; reservations: AffectedReservation[] };
  overSubscription: OverSubscription[];
  revision?: string;
};
type ChangeCheckBody = Partial<ChangeCheck>;

const checkFrom = (body: ChangeCheckBody): ChangeCheck => ({
  impact: body.impact ?? { affected: false, bookings: [], reservations: [] },
  overSubscription: body.overSubscription ?? [],
  ...(typeof body.revision === 'string' ? { revision: body.revision } : {}),
});

// The save was refused because what it affects changed since the preview:
// the refusal carries the fresh list to review again.
export function changedCheck(result: ApiFailure): ChangeCheck | null {
  return result.status === 409 && result.code === 'arrangements_changed' && result.details ? checkFrom(result.details as ChangeCheckBody) : null;
}

// Something for the Coordinator to look at before the change takes effect.
export function needsReview(check: ChangeCheck) {
  return check.impact.affected || check.overSubscription.length > 0;
}

export type EditResult =
  | ({ ok: true; fields: string[] } & ChangeCheck)
  | ApiFailure;

export async function updateEventInformation(eventId: string, patch: EventPatch, reviewed?: string): Promise<EditResult> {
  const result = await apiCall<{ fields?: string[] } & ChangeCheckBody>(
    `/api/events?edit=1&id=${encodeURIComponent(eventId)}${reviewed === undefined ? '' : `&reviewed=${encodeURIComponent(reviewed)}`}`,
    jsonRequest('PATCH', patch),
    'Unable to save your changes.');
  return result.ok ? { ok: true, fields: result.data.fields ?? Object.keys(patch), ...checkFrom(result.data) } : result;
}

// The same edit checked without saving; refused exactly as the save would be.
export async function previewEventInformation(eventId: string, patch: EventPatch): Promise<({ ok: true } & ChangeCheck) | ApiFailure> {
  const result = await apiCall<ChangeCheckBody>(
    `/api/events?edit=1&id=${encodeURIComponent(eventId)}&preview=1`,
    jsonRequest('PATCH', patch),
    'Unable to check what this change affects.');
  return result.ok ? { ok: true, ...checkFrom(result.data) } : result;
}
