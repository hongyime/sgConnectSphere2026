// Typed fetch helpers for the venue catalogue API (E05-S01, E05-S02).
// Every request sends the session cookie (credentials: 'same-origin');
// there is no separate auth token, matching ADR-015.

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

export type VenueFieldErrors = Record<string, string[]>;

export type ListVenuesResult =
  | { ok: true; venues: Venue[] }
  | { ok: false; message: string };

export async function listVenues(search = ''): Promise<ListVenuesResult> {
  let response: Response;
  try {
    response = await fetch(`/api/venues?q=${encodeURIComponent(search)}`, { credentials: 'same-origin' });
  } catch {
    return { ok: false, message: 'Venues could not be loaded.' };
  }
  if (response.status === 401 || response.status === 403) {
    return { ok: false, message: 'Sign in as venue staff to manage the catalogue.' };
  }
  if (!response.ok) {
    return { ok: false, message: 'Venues could not be loaded.' };
  }
  const body = await response.json().catch(() => null);
  return { ok: true, venues: Array.isArray(body?.venues) ? body.venues : [] };
}

export type GetVenueResult =
  | { ok: true; venue: Venue }
  | { ok: false; message: string };

export async function getVenue(id: string): Promise<GetVenueResult> {
  let response: Response;
  try {
    response = await fetch(`/api/venues?id=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
  } catch {
    return { ok: false, message: 'The venue could not be loaded.' };
  }
  if (response.status === 401 || response.status === 403) {
    return { ok: false, message: 'Sign in as venue staff to manage the catalogue.' };
  }
  if (!response.ok) {
    return { ok: false, message: response.status === 404 ? 'Venue not found.' : 'The venue could not be loaded.' };
  }
  const body = await response.json().catch(() => null);
  if (!body?.venue) return { ok: false, message: 'Venue not found.' };
  return { ok: true, venue: body.venue };
}

export type SaveVenueResult =
  | { ok: true; venue: Venue }
  | { ok: false; errors: VenueFieldErrors; message: string };

async function submitVenue(body: Record<string, unknown>): Promise<SaveVenueResult> {
  let response: Response;
  try {
    response = await fetch('/api/venues', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, errors: {}, message: 'Service unavailable. Please try again.' };
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return { ok: false, errors: {}, message: 'Sign in as venue staff to manage the catalogue.' };
    }
    if (payload?.error === 'name_in_use') {
      return { ok: false, errors: payload.errors ?? {}, message: 'A venue with this name already exists.' };
    }
    return { ok: false, errors: payload?.errors ?? {}, message: 'Please correct the highlighted fields.' };
  }
  return { ok: true, venue: payload.venue };
}

export function createVenue(input: VenueInput) {
  return submitVenue({ action: 'create', ...input });
}

export function updateVenue(id: string, input: VenueInput) {
  return submitVenue({ action: 'update', id, ...input });
}

export type BlockingBooking = { eventCode: string | null; title: string; startsAt: string };

export type RetireVenueResult =
  | { ok: true; retired: true }
  | { ok: true; retired: false; blockingBookings: BlockingBooking[] }
  | { ok: false; message: string };

export async function retireVenue(id: string): Promise<RetireVenueResult> {
  let response: Response;
  try {
    response = await fetch('/api/venues', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'retire', id }),
    });
  } catch {
    return { ok: false, message: 'Service unavailable. Please try again.' };
  }
  const payload = await response.json().catch(() => null);
  if (response.status === 409 && payload?.error === 'future_bookings_exist') {
    return { ok: true, retired: false, blockingBookings: Array.isArray(payload.blockingBookings) ? payload.blockingBookings : [] };
  }
  if (!response.ok) {
    return {
      ok: false,
      message: response.status === 401 || response.status === 403
        ? 'Sign in as venue staff to manage the catalogue.'
        : 'The venue could not be retired.',
    };
  }
  return { ok: true, retired: true };
}
