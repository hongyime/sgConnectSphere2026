import type { ApiFailure } from '../../shared';
import type { EventPatch } from './eventEditApi';

// The fields in the direct-edit form which become restricted after approval.
// This only prepares a draft; the server still authorizes and validates it.
export const restrictedEditFields = [
  'startAt', 'endAt', 'expectedAttendance', 'venueRequirements', 'accessibilityNote',
  'equipmentRequirements', 'layoutPreference', 'registrationSetup',
] as const;
export type RestrictedEditField = typeof restrictedEditFields[number];
type PrefillChanges = Partial<Pick<EventPatch, RestrictedEditField>>;
export type ChangeRequestPrefill = { fields: RestrictedEditField[]; changes: PrefillChanges };
export const changeRequestPath = (eventId: string, fields: readonly RestrictedEditField[]) =>
  `/change-requests/new?${new URLSearchParams({ event: eventId, fields: fields.join(',') })}`;

export function refusedEditOffer(failure: ApiFailure, eventId: string, patch: EventPatch) {
  const target = failure.details?.changeRequestUrl;
  // Only follow the server's explicit refusal offer, for this Event and route.
  // Rebuild a relative URL rather than trusting origins or extra query data.
  if (failure.status !== 409 || typeof target !== 'string' || !target.startsWith('/change-requests/new?')) return null;
  const url = new URL(target, 'https://internal.invalid');
  if (url.pathname !== '/change-requests/new' || url.searchParams.get('event') !== eventId) return null;
  const fields = restrictedEditFields.filter(field => Object.hasOwn(patch, field));
  if (!fields.length) return null;
  const changes = Object.fromEntries(fields.map(field => [field, patch[field]]));
  return {
    to: changeRequestPath(eventId, fields),
    // Proposed details stay out of the URL; no storage or automatic submission.
    state: { changeRequestPrefill: { eventId, changes } },
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function readChangeRequestPrefill(params: URLSearchParams, state: unknown, eventId: string): ChangeRequestPrefill {
  const requested = (params.get('fields') ?? '').split(',');
  const fields = restrictedEditFields.filter(field => requested.includes(field));
  const changes: PrefillChanges = {};
  const draft = record(state) ? state.changeRequestPrefill : undefined;
  if (!record(draft) || draft.eventId !== eventId || !record(draft.changes)) return { fields, changes };
  for (const field of fields) {
    const value = draft.changes[field];
    if (field === 'expectedAttendance') {
      if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) changes[field] = value;
    } else if (typeof value === 'string' && value.trim() && value.length <= 4000) {
      if ((field === 'startAt' || field === 'endAt') && !Number.isFinite(Date.parse(value))) continue;
      changes[field] = value;
    }
  }
  return { fields, changes };
}
