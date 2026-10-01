// Client for E03-S07 (SCRUM-37) event-information edits:
// PATCH /api/events?edit=1&id=<event id or code>, implemented in #132
// (updateEventInformation in backend/src/modules/eventVisibility/service.ts).
// The server applies the role rules: an Organiser may edit any field before
// approval and only title/description/purpose/registration dates after it
// (409 otherwise); only the assigned Coordinator may edit, and only once the
// event is approved (403 otherwise). Every applied field is audited.

export type EditableField =
  | 'title' | 'description' | 'purpose' | 'startAt' | 'endAt' | 'expectedAttendance'
  | 'venueRequirements' | 'accessibilityNote' | 'equipmentRequirements' | 'layoutPreference';

export type EventPatch = Partial<Record<Exclude<EditableField, 'expectedAttendance'>, string> & { expectedAttendance: number }>;

export type EditResult =
  | { ok: true; fields: string[] }
  | { ok: false; status: number; message: string };

export async function updateEventInformation(eventId: string, patch: EventPatch): Promise<EditResult> {
  let response: Response;
  try {
    response = await fetch(`/api/events?edit=1&id=${encodeURIComponent(eventId)}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    });
  } catch {
    return { ok: false, status: 0, message: 'Unable to save your changes. Check your connection and try again.' };
  }
  const body = await response.json().catch(() => ({})) as { error?: string; fields?: string[] };
  if (!response.ok) return { ok: false, status: response.status, message: body.error ?? 'Unable to save your changes.' };
  return { ok: true, fields: body.fields ?? Object.keys(patch) };
}
