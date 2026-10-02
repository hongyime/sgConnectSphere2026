// Typed fetch helpers for the venue maintenance blocks API (E05-S04), on the
// shared apiCall (session cookie, ADR-015; safe error messages).
//
// A block is a venue_blocks row stored as the half-open range [from, day after to).
// The server reports `from` and `to` as whole Singapore days (YYYY-MM-DD),
// inclusive, so the UI can send and show them without any timezone maths.
import { apiCall, jsonRequest, type ApiResult } from '../../shared';

export type VenueBlock = {
  id: string;
  venueId: string;
  from: string;
  to: string;
  reason: string;
  startsAt: string;
  endsAt: string;
};

export type BlockInput = { from: string; to: string; reason: string };
export type ShortenBlockInput = { from: string; to: string; reason?: string };

export type ConflictingBooking = {
  eventCode: string | null;
  title: string;
  startsAt: string;
  endsAt: string;
};

// Scenario 1 and 2 of the create case: a server refusal keeps the message the
// server supplied, plus the structured conflict list for the alert.
export type CreateBlockResult = {
  block: VenueBlock;
  notifiedEventCount: number;
};

export async function listBlocks(venueId: string, signal?: AbortSignal): Promise<ApiResult<VenueBlock[]>> {
  const result = await apiCall<{ blocks?: unknown }>(
    `/api/venues?id=${encodeURIComponent(venueId)}&blocks=1`, { signal },
    'The maintenance blocks for this venue could not be loaded.');
  if (!result.ok) return result;
  return { ok: true, data: Array.isArray(result.data.blocks) ? result.data.blocks as VenueBlock[] : [] };
}

export async function createBlock(venueId: string, input: BlockInput): Promise<ApiResult<CreateBlockResult>> {
  const result = await apiCall<CreateBlockResult>(
    '/api/venues', jsonRequest('POST', { action: 'block', id: venueId, ...input }),
    'Please correct the highlighted fields.');
  if (!result.ok) {
    if (result.status === 0) return { ...result, message: 'Service unavailable. Please try again.' };
    return result;
  }
  return { ok: true, data: result.data };
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

// Read the conflictingBookings list the 409 booking_conflict carries, if any.
export function conflictingBookings(details: Record<string, unknown> | undefined): ConflictingBooking[] {
  const list = details?.conflictingBookings;
  return Array.isArray(list) ? list as ConflictingBooking[] : [];
}

// Read the overlappingBlocks list the 409 block_overlap carries, if any.
export function overlappingBlocks(details: Record<string, unknown> | undefined): VenueBlock[] {
  const list = details?.overlappingBlocks;
  return Array.isArray(list) ? list as VenueBlock[] : [];
}
