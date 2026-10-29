// E06-S05 (SCRUM-49, frontend SCRUM-143) tentative holds, against
// backend/src/modules/venueBooking/holdsHandler.ts (routed through
// api/venues/index.ts). Field names follow docs/contracts/venue-bookings.md.
import { apiCall, jsonRequest, type ApiResult } from '../../shared';

export type HoldStatus = 'tentative' | 'expired';
export type Hold = {
  id: string; venueId: string; venueName: string; eventId: string; eventCode: string | null; eventTitle: string;
  startsAt: string; endsAt: string; status: HoldStatus; expiresAt: string | null;
};
// Venue Staff only see live holds, which always carry an expiry.
export type LiveHold = Omit<Hold, 'status' | 'expiresAt'> & { status: 'tentative'; expiresAt: string };
export type EventHolds = {
  event: { id: string; eventCode: string | null; title: string; status: string; startsAt: string; endsAt: string };
  holds: Hold[];
  canHold: boolean;
};
export type HoldInput = { startsAt: string; endsAt: string; expiresAt?: string; sessionId?: string };

// The server's rules and sentences (holds.ts), repeated so a form can say
// what's wrong before sending.
export const DEFAULT_HOLD_HOURS = 48;
export const HOLD_MESSAGES = {
  startsAt: 'Enter when the hold starts.',
  endsAt: 'Enter when the hold ends.',
  endBeforeStart: 'The hold must end after it starts.',
  expiresAt: 'Enter when the hold expires.',
  tooShort: 'A hold must last at least 1 hour from now.',
  tooLong: 'A hold can last at most 14 days from now.',
  notLater: 'Choose a later expiry than the current one.',
  notHoldable: 'Venues can only be held while an approved event is being planned.',
};

const HOUR_MS = 60 * 60 * 1000;
// O-31: an expiry from 1 hour to 14 days ahead of `now`.
export function expiryProblem(expires: Date | null, now = new Date()) {
  if (!expires || Number.isNaN(expires.getTime())) return HOLD_MESSAGES.expiresAt;
  const ahead = expires.getTime() - now.getTime();
  if (ahead < HOUR_MS) return HOLD_MESSAGES.tooShort;
  if (ahead > 14 * 24 * HOUR_MS) return HOLD_MESSAGES.tooLong;
  return null;
}

const LOAD_FAILED = 'Venue holds could not be loaded.';
const url = (query = '') => `/api/venues?task=holds${query}`;

// A reply without a holds list is treated as a failed load, so the card never
// takes the event page down with it.
function checked<T extends { holds?: unknown }>(result: ApiResult<T>): ApiResult<T> {
  if (result.ok && !Array.isArray(result.data?.holds)) return { ok: false, status: 502, message: LOAD_FAILED };
  return result;
}

export async function getEventHolds(event: string, signal?: AbortSignal) {
  return checked(await apiCall<EventHolds>(url(`&event=${encodeURIComponent(event)}`), { signal }, LOAD_FAILED));
}

export async function getLiveHolds(signal?: AbortSignal) {
  return checked(await apiCall<{ holds: LiveHold[] }>(url(), { signal }, LOAD_FAILED));
}

export function placeHold(event: string, venue: string, input: HoldInput) {
  return apiCall<{ hold: { id: string; venueName: string; status: 'tentative'; expiresAt: string } }>('/api/venues',
    jsonRequest('POST', {
      action: 'hold', event_id: event, venue_id: venue, starts_at: input.startsAt, ends_at: input.endsAt,
      ...(input.sessionId ? { session_id: input.sessionId } : {}),
      ...(input.expiresAt ? { expires_at: input.expiresAt } : {}),
    }), 'The venue could not be held.');
}

export function convertHold(bookingId: string) {
  return apiCall<{ booking: { id: string; status: 'pending' } }>('/api/venues',
    jsonRequest('POST', { action: 'convert_hold', booking_id: bookingId }), 'The booking request could not be submitted.');
}

export function releaseHold(bookingId: string) {
  return apiCall<{ released: true }>('/api/venues',
    jsonRequest('POST', { action: 'release', booking_id: bookingId }), 'The hold could not be released.');
}

export function extendHold(bookingId: string, expiresAt: string) {
  return apiCall<{ hold: { id: string; expiresAt: string } }>('/api/venues',
    jsonRequest('POST', { action: 'extend_hold', booking_id: bookingId, expires_at: expiresAt }), 'The expiry could not be changed.');
}
