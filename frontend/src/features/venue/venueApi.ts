// Typed fetch helpers for the venue catalogue API (E05-S01, E05-S02), on the
// shared apiCall (session cookie, ADR-015; safe error messages).
import { apiCall, jsonRequest, type ApiResult } from '../../shared';

export type VenueLayout = { label: string; capacity: number };

export type Venue = {
  id: string;
  name: string;
  location: string;
  max_capacity: number;
  opens_at: string;
  closes_at: string;
  facilities: string[];
  accessibility_features: string[];
  supported_layouts: VenueLayout[];
};

export type VenueInput = {
  name: string;
  location: string;
  max_capacity: number;
  opens_at: string;
  closes_at: string;
  facilities: string[];
  accessibility_features: string[];
  supported_layouts: VenueLayout[];
};

// The 100-row cap on GET /api/venues: the inventory says when it is reached.
export const VENUE_LIST_LIMIT = 100;

export async function listVenues(search = '', signal?: AbortSignal): Promise<ApiResult<Venue[]>> {
  const result = await apiCall<{ venues?: unknown }>(
    `/api/venues?q=${encodeURIComponent(search)}`, { signal }, 'Venues could not be loaded.');
  if (!result.ok) return result;
  return { ok: true, data: Array.isArray(result.data.venues) ? result.data.venues as Venue[] : [] };
}

export async function getVenue(id: string, signal?: AbortSignal): Promise<ApiResult<Venue>> {
  const result = await apiCall<{ venue?: Venue }>(
    `/api/venues?id=${encodeURIComponent(id)}`, { signal }, 'The venue could not be loaded.');
  if (!result.ok) return result;
  return result.data.venue ? { ok: true, data: result.data.venue } : { ok: false, status: 404, message: 'Venue not found.' };
}

// A refused save keeps the server's per-field messages in `fieldErrors`.
async function submitVenue(body: Record<string, unknown>): Promise<ApiResult<Venue>> {
  const result = await apiCall<{ venue: Venue }>('/api/venues', jsonRequest('POST', body), 'Please correct the highlighted fields.');
  if (!result.ok) {
    if (result.code === 'name_in_use') return { ...result, message: 'A venue with this name already exists.' };
    if (result.status === 0) return { ...result, message: 'Service unavailable. Please try again.' };
    return result;
  }
  return { ok: true, data: result.data.venue };
}

export function createVenue(input: VenueInput) {
  return submitVenue({ action: 'create', ...input });
}

export function updateVenue(id: string, input: VenueInput) {
  return submitVenue({ action: 'update', id, ...input });
}

export type BlockingBooking = { eventCode: string | null; title: string; startsAt: string };

export type RetireOutcome = { retired: true } | { retired: false; blockingBookings: BlockingBooking[] };

// E05-S01 Scenario 4: a venue with future bookings is not retired, and the
// 409 lists the bookings in the way.
export async function retireVenue(id: string): Promise<ApiResult<RetireOutcome>> {
  const result = await apiCall<{ retired: true }>('/api/venues', jsonRequest('POST', { action: 'retire', id }), 'The venue could not be retired.');
  if (result.ok) return { ok: true, data: { retired: true } };
  if (result.status === 409 && result.code === 'future_bookings_exist') {
    const blocking = result.details?.blockingBookings;
    return { ok: true, data: { retired: false, blockingBookings: Array.isArray(blocking) ? blocking as BlockingBooking[] : [] } };
  }
  return result;
}
