// E09-S02/S03 Organiser registrations API (api/events.ts ?registrations=1 and ?edit=1). See
// docs/api-changes-week7.md for the endpoint shapes.
import { apiCall, jsonRequest } from '../../shared';
import type { SessionChoice } from '../attendee/registrationApi';

export type SessionPlaces = SessionChoice & { capacity: number; registered: number };

export type PendingRequest = {
  id: string;
  name: string | null;
  email: string;
  requestedAt: string;
  sessionIds: string[];
  // Why approving now would pass a limit, or null when it fits.
  overCapacity: string | null;
};

export type EventRegistrations = {
  event: {
    id: string; eventCode: string | null; name: string; status: string; waitlistEnabled: boolean;
    // E09-S03 registration period.
    startsAt: string; endsAt: string; registrationEnabled: boolean;
    opensAt: string | null; closesAt: string | null; withdrawalDeadline: string | null;
  };
  capacity: { capacity: number; registered: number };
  sessions: SessionPlaces[];
  pending: PendingRequest[];
};

export type RegistrationAction =
  | { action: 'approve' | 'reject'; registrationId: string }
  | { action: 'add'; email: string; sessionIds: string[] };

const url = (ref: string) => `/api/events?registrations=1&id=${encodeURIComponent(ref)}`;

export function getEventRegistrations(ref: string, signal?: AbortSignal) {
  return apiCall<EventRegistrations>(url(ref), { signal }, 'Unable to load registrations.');
}

// E09-S03: the period is saved through the E03-S07 edit route. A closing date
// after the event starts comes back as 428 until resent with confirmLateClose.
export type PeriodPatch = {
  registrationDates?: { opensAt: string; closesAt: string };
  withdrawalDeadline?: string | null;
  waitlistEnabled?: boolean;
  confirmLateClose?: true;
};

export function saveRegistrationPeriod(ref: string, patch: PeriodPatch) {
  return apiCall<{ fields: string[] }>(`/api/events?edit=1&id=${encodeURIComponent(ref)}`, jsonRequest('PATCH', patch),
    'Unable to save the registration period.');
}

export function manageRegistrations(ref: string, action: RegistrationAction) {
  return apiCall<EventRegistrations>(url(ref), jsonRequest('POST', action), 'Unable to save. Please try again.');
}
