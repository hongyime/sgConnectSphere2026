// Typed fetch helpers for the venue maintenance blocks API (E05-S04), on the
// shared apiCall (session cookie, ADR-015; safe error messages).
//
// A block is a venue_blocks row stored as the half-open range [from, day after to).
// The server reports `from` and `to` as whole Singapore days (YYYY-MM-DD),
// inclusive, so the UI can send and show them without any timezone maths.
//
// E05-S06 (SCRUM-152) adds timed unavailability: an exact start, an optional
// end (none = until lifted, T-80), a reason category and a note; edit, lift
// and the history of each change (T-91). `to` and `endsAt` are null for an
// open-ended block.
import { apiCall, jsonRequest, type ApiResult } from '../../shared';

export const REASON_CATEGORIES = ['maintenance', 'equipment_failure', 'renovation', 'safety_concern', 'other'] as const;
export type ReasonCategory = typeof REASON_CATEGORIES[number];

export const CATEGORY_LABELS: Record<ReasonCategory, string> = {
  maintenance: 'Maintenance', equipment_failure: 'Equipment failure', renovation: 'Renovation',
  safety_concern: 'Safety concern', other: 'Other',
};

export type VenueBlock = {
  id: string;
  venueId: string;
  from: string;
  to: string | null;
  reasonCategory: ReasonCategory;
  reason: string;
  startsAt: string;
  endsAt: string | null;
  // Only on the list with lifted blocks kept (Venue Staff, Scenario 7).
  liftedAt?: string | null;
  liftedBy?: string | null;
};

export type ShortenBlockInput = { from: string; to: string; reason?: string };

export async function listBlocks(venueId: string, signal?: AbortSignal, options: { includeLifted?: boolean } = {}): Promise<ApiResult<VenueBlock[]>> {
  const lifted = options.includeLifted ? '&lifted=1' : '';
  const result = await apiCall<{ blocks?: unknown }>(
    `/api/venues?id=${encodeURIComponent(venueId)}&blocks=1${lifted}`, { signal },
    'The maintenance blocks for this venue could not be loaded.');
  if (!result.ok) return result;
  return { ok: true, data: Array.isArray(result.data.blocks) ? result.data.blocks as VenueBlock[] : [] };
}

export async function shortenBlock(venueId: string, blockId: string, input: ShortenBlockInput): Promise<ApiResult<VenueBlock>> {
  const body: Record<string, unknown> = { action: 'shorten_block', id: venueId, block_id: blockId, from: input.from, to: input.to };
  if (input.reason !== undefined) body.reason = input.reason;
  const result = await apiCall<{ block: VenueBlock }>(
    '/api/venues', jsonRequest('POST', body),
    'The block could not be shortened.');
  if (!result.ok) return result;
  return { ok: true, data: result.data.block };
}

export async function removeBlock(venueId: string, blockId: string): Promise<ApiResult<true>> {
  const result = await apiCall<{ removed: boolean }>(
    '/api/venues', jsonRequest('POST', { action: 'remove_block', id: venueId, block_id: blockId }),
    'The block could not be removed.');
  if (!result.ok) return result;
  return { ok: true, data: true };
}

// Read the overlappingBlocks list the 409 block_overlap carries, if any.
export function overlappingBlocks(details: Record<string, unknown> | undefined): VenueBlock[] {
  const list = details?.overlappingBlocks;
  return Array.isArray(list) ? list as VenueBlock[] : [];
}

// E05-S06 Scenarios 1 and 5: `endsAt` empty or null keeps the venue
// unavailable until lifted. Times are ISO strings with an offset.
export type UnavailabilityInput = {
  startsAt: string;
  endsAt: string | null;
  reasonCategory: ReasonCategory;
  reason: string;
};

// Scenario 2: an event whose booking or hold became Conflicting.
export type AffectedEvent = {
  eventId: string;
  eventCode: string | null;
  title: string;
  returnedToPlanning: boolean;
  coordinatorNotified: boolean;
};

// Scenario 6: an event whose booking was restored on shorten or lift.
export type RestoredEvent = {
  eventId: string;
  eventCode: string | null;
  title: string;
  coordinatorNotified: boolean;
};

export type SavedUnavailability = { block: VenueBlock; affectedEvents: AffectedEvent[]; restoredEvents: RestoredEvent[] };
export type LiftedUnavailability = { block: VenueBlock; restoredEvents: RestoredEvent[] };

export type HistoryState = { startsAt: string; endsAt: string | null; reasonCategory: ReasonCategory | null; reason: string | null };

// Scenario 7: one create, edit or lift with who made it and when.
export type HistoryEntry = {
  action: 'created' | 'edited' | 'lifted';
  changedAt: string;
  actor: string | null;
  previous: HistoryState | null;
  next: HistoryState | null;
};

function unavailabilityBody(input: UnavailabilityInput) {
  return {
    starts_at: input.startsAt,
    ends_at: input.endsAt ? input.endsAt : null,
    reason_category: input.reasonCategory,
    reason: input.reason,
  };
}

function eventList<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function serviceDown<T>(result: ApiResult<T>): ApiResult<T> {
  return !result.ok && result.status === 0 ? { ...result, message: 'The service is unavailable. Try again.' } : result;
}

export async function createUnavailability(venueId: string, input: UnavailabilityInput): Promise<ApiResult<SavedUnavailability>> {
  const result = await apiCall<{ block: VenueBlock; affectedEvents?: unknown }>(
    '/api/venues', jsonRequest('POST', { action: 'block', id: venueId, ...unavailabilityBody(input) }),
    'Correct the highlighted fields.');
  if (!result.ok) return serviceDown(result);
  return { ok: true, data: { block: result.data.block, affectedEvents: eventList<AffectedEvent>(result.data.affectedEvents), restoredEvents: [] } };
}

export async function editUnavailability(venueId: string, blockId: string, input: UnavailabilityInput): Promise<ApiResult<SavedUnavailability>> {
  const result = await apiCall<{ block: VenueBlock; affectedEvents?: unknown; restoredEvents?: unknown }>(
    '/api/venues', jsonRequest('POST', { action: 'edit_block', id: venueId, block_id: blockId, ...unavailabilityBody(input) }),
    'The unavailability could not be changed.');
  if (!result.ok) return serviceDown(result);
  return { ok: true, data: {
    block: result.data.block,
    affectedEvents: eventList<AffectedEvent>(result.data.affectedEvents),
    restoredEvents: eventList<RestoredEvent>(result.data.restoredEvents),
  } };
}

export async function liftUnavailability(venueId: string, blockId: string): Promise<ApiResult<LiftedUnavailability>> {
  const result = await apiCall<{ block: VenueBlock; restoredEvents?: unknown }>(
    '/api/venues', jsonRequest('POST', { action: 'lift_block', id: venueId, block_id: blockId }),
    'The unavailability could not be lifted.');
  if (!result.ok) return serviceDown(result);
  return { ok: true, data: { block: result.data.block, restoredEvents: eventList<RestoredEvent>(result.data.restoredEvents) } };
}

export async function getBlockHistory(venueId: string, blockId: string, signal?: AbortSignal): Promise<ApiResult<HistoryEntry[]>> {
  const result = await apiCall<{ history?: unknown }>(
    `/api/venues?id=${encodeURIComponent(venueId)}&blocks=1&history=${encodeURIComponent(blockId)}`, { signal },
    'The history of this unavailability could not be loaded.');
  if (!result.ok) return result;
  return { ok: true, data: eventList<HistoryEntry>(result.data.history) };
}
