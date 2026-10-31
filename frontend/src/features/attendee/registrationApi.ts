// E09-S01/S02 attendee registration API (api/attendee/events.ts). See
// docs/api-changes-week7.md for the endpoint shapes.
import { apiCall, jsonRequest } from '../../shared';

export type RegistrationState = 'open' | 'not_yet_open' | 'closed';

export type PublicEvent = {
  id: string;
  eventCode: string | null;
  name: string;
  startsAt: string;
  endsAt: string;
  venueName: string;
  venueLocation: string;
  registrationState: RegistrationState;
  opensAt: string | null;
  closesAt: string | null;
  withdrawalDeadline: string | null;
};

export type OpenEvent = PublicEvent & { myRegistrationStatus: string | null };

export type SessionChoice = {
  id: string;
  title: string | null;
  startsAt: string;
  endsAt: string;
  venueName: string | null;
  venueLocation: string | null;
};

export type Registration = { id: string; status: string; registeredAt: string; sessionIds: string[] };

export type RegistrationForm = {
  event: PublicEvent;
  sessions: SessionChoice[];
  details: { name: string | null; email: string | null; contactNumber: string | null };
  missingDetails: string[];
  registration: Registration | null;
  // E09-S02: a full Session or Event still takes a request, which waits for the Organiser.
  capacity: { eventFull: boolean; waitlistEnabled: boolean; fullSessionIds: string[] };
  // E09-S05: set with a registration; the contact is given once withdrawal has closed.
  withdrawal: { open: boolean; contact: string | null } | null;
};

export type RegisterResult = { registration: Registration; event: PublicEvent; sessions: SessionChoice[] };

// Links use the event code when there is one, otherwise the id; the API accepts either.
export function eventRef(event: Pick<PublicEvent, 'id' | 'eventCode'>) {
  return event.eventCode ?? event.id;
}

export function listOpenEvents(signal?: AbortSignal) {
  return apiCall<{ events: OpenEvent[] }>('/api/attendee/events?open=1', { signal }, 'Unable to load events.');
}

export function getRegistrationForm(ref: string, signal?: AbortSignal) {
  return apiCall<RegistrationForm>(`/api/attendee/events?registration=1&id=${encodeURIComponent(ref)}`, { signal },
    'Unable to load this event.');
}

export function register(ref: string, sessionIds: string[], claimWaitlist = false) {
  return apiCall<RegisterResult>(`/api/attendee/events?registration=1&id=${encodeURIComponent(ref)}`,
    jsonRequest('POST', { sessionIds, ...(claimWaitlist ? { claimWaitlist: true } : {}) }), 'Unable to register. Please try again.');
}

export function joinWaitingList(ref: string) {
  return apiCall<{ registration: Registration; event: PublicEvent }>(
    `/api/attendee/events?waitlist=1&id=${encodeURIComponent(ref)}`,
    jsonRequest('POST', {}), 'Unable to join the waiting list. Please try again.');
}

export function withdraw(ref: string) {
  return apiCall<{ registration: { id: string; status: string; withdrawnAt: string } }>(
    `/api/attendee/events?registration=1&withdraw=1&id=${encodeURIComponent(ref)}`,
    jsonRequest('POST'), 'Unable to withdraw. Please try again.');
}
